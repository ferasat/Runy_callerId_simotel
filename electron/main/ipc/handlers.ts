import { BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import { v4 as uuid } from 'uuid'
import { IPC_CHANNELS } from '../../../shared/constants'
import type {
  AppUser,
  Contact,
  DashboardStats,
  ServerConfig,
  SessionInfo
} from '../../../shared/types'
import {
  appUsersRepo,
  callHistoryRepo,
  contactsRepo,
  createBackup,
  groupsRepo,
  logsRepo,
  notificationsRepo,
  openDatabase,
  resolveServerSecrets,
  settingsRepo,
  serversRepo,
  usersRepo,
  cacheRepo
} from '../db'
import { RealtimeEngine } from '../realtime/engine'
import { EventWebhookServer } from '../realtime/webhookServer'
import type { CallService } from '../services/callService'
import { SimotelApiClient } from '../services/simotelApi'
import { readRememberedSession, rememberSession } from '../services/sessionStore'
import { checkForUpdates, downloadUpdate, getUpdaterStatus, installUpdate } from '../updater'

export interface IpcContext {
  getMainWindow: () => BrowserWindow | null
  getPopupWindow: () => BrowserWindow | null
  showPopup: () => void
  hidePopup: () => void
  callService: CallService
}

let apiClient: SimotelApiClient | null = null
let realtime: RealtimeEngine | null = null
let webhook: EventWebhookServer | null = null
let session: SessionInfo | null = null

function broadcastRealtime(event: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.REALTIME_EVENT, event)
  }
}

function wireRealtimeEvents(): void {
  const handler = (event: Parameters<CallService['handleRealtimeEvent']>[0]): void => {
    ctxRef?.callService.handleRealtimeEvent(event)
    broadcastRealtime(event)
  }
  realtime?.on('event', handler)
  webhook?.on('event', handler)
  realtime?.on('state', (state) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.CONNECTION_STATUS, {
        state,
        protocol: realtime?.getStatus().protocol ?? 'webhook'
      })
    }
  })
}

let ctxRef: IpcContext | null = null

export function registerIpcHandlers(ctx: IpcContext): void {
  ctxRef = ctx
  openDatabase()

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => ctx.getMainWindow()?.minimize())
  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const win = ctx.getMainWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => ctx.getMainWindow()?.close())
  ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_POPUP, () => ctx.showPopup())
  ipcMain.handle(IPC_CHANNELS.WINDOW_HIDE_POPUP, () => ctx.hidePopup())

  ipcMain.handle(IPC_CHANNELS.SERVERS_LIST, () => serversRepo.list())
  ipcMain.handle(IPC_CHANNELS.SERVERS_SAVE, (_e, server: ServerConfig) => serversRepo.save(server))
  ipcMain.handle(IPC_CHANNELS.SERVERS_DELETE, (_e, id: string) => serversRepo.delete(id))
  ipcMain.handle(IPC_CHANNELS.SERVERS_SET_DEFAULT, (_e, id: string) => serversRepo.setDefault(id))
  ipcMain.handle(IPC_CHANNELS.SERVERS_TEST, async (_e, server: ServerConfig) => {
    const resolved = resolveServerSecrets(server)
    const client = new SimotelApiClient(resolved, {
      onLog: (level, message, meta) => logsRepo.add({ category: 'api', level, message, meta })
    })
    const result = await client.ping()
    if (server.id) serversRepo.updateHealth(server.id, 'healthy')
    return { ok: true, result }
  })

  ipcMain.handle(IPC_CHANNELS.USERS_LIST, () => appUsersRepo.list())
  ipcMain.handle(IPC_CHANNELS.USERS_SAVE, (_e, user) => appUsersRepo.save(user))
  ipcMain.handle(IPC_CHANNELS.USERS_DELETE, (_e, id: string) => {
    if (session?.role !== 'admin') throw new Error('Admin only')
    appUsersRepo.delete(id)
  })

  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGIN,
    async (
      _e,
      payload: {
        serverId: string
        extension?: string
        name?: string
        username?: string
        password?: string
      }
    ) => {
      const serverRow = serversRepo.get(payload.serverId)
      if (!serverRow) throw new Error('Server not found')
      const server = resolveServerSecrets(serverRow)

      let appUser: AppUser | null = null
      if (payload.username && payload.password) {
        appUser = appUsersRepo.authenticate(payload.username, payload.password)
        if (!appUser) throw new Error('Invalid username or password')
      }

      const extension = payload.extension || appUser?.extension
      if (!extension) throw new Error('Extension required')

      apiClient = new SimotelApiClient(server, {
        timeoutMs: server.timeoutMs,
        maxRetries: server.reconnectPolicy?.maxRetries ?? 3,
        onLog: (level, message, meta) => logsRepo.add({ category: 'api', level, message, meta }),
        cacheGet: (key) => cacheRepo.get(key),
        cacheSet: (key, value, ttl) => cacheRepo.set(key, value, ttl)
      })

      await apiClient.ping()
      serversRepo.updateHealth(server.id, 'healthy')

      const user = usersRepo.save({
        id: uuid(),
        serverId: server.id,
        extension,
        name: payload.name ?? appUser?.fullName ?? extension,
        number: extension,
        status: 'ready',
        statusChangedAt: new Date().toISOString(),
        role: appUser?.role ?? 'agent'
      })

      session = {
        serverId: server.id,
        extension,
        name: user.name,
        role: appUser?.role ?? 'agent',
        userId: appUser?.id,
        username: appUser?.username ?? payload.username
      }

      const settings = settingsRepo.get()
      if (settings.rememberLastUser) {
        await rememberSession({
          lastServerId: server.id,
          lastUsername: session.username,
          lastExtension: extension
        })
        settingsRepo.set({
          lastUsername: session.username,
          defaultServerId: server.id,
          defaultExtension: extension
        })
      }

      ctx.callService.setApi(apiClient, extension, settings.originateContext)

      realtime?.stop()
      webhook?.stop()

      webhook = new EventWebhookServer(settings.eventWebhookPort)
      await webhook.start()

      realtime = new RealtimeEngine({
        baseUrl: server.baseUrl,
        apiKey: server.apiKey,
        preferredProtocols: ['websocket', 'sse', 'long_polling', 'smart_polling'],
        pollFn: async () => [],
        onLog: (level, message, meta) =>
          logsRepo.add({ category: 'realtime', level, message, meta })
      })
      wireRealtimeEvents()
      await realtime.start()

      logsRepo.add({
        category: 'authentication',
        level: 'info',
        message: `Logged in as ${extension}`,
        meta: {
          serverId: server.id,
          role: session.role,
          webhookPort: webhook.getPort()
        }
      })

      return {
        user,
        server: serversRepo.get(server.id),
        session,
        appUser,
        connection: {
          ...realtime.getStatus(),
          webhookPort: webhook.getPort()
        },
        remembered: await readRememberedSession()
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => {
    realtime?.stop()
    webhook?.stop()
    realtime = null
    webhook = null
    apiClient = null
    session = null
    ctx.callService.setApi(null, '', 'outgoing_context')
    return true
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_STATUS, async () => ({
    session,
    connection: realtime?.getStatus() ?? { state: 'disconnected', protocol: null },
    remembered: await readRememberedSession(),
    webhookPort: webhook?.getPort()
  }))

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => settingsRepo.get())
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_e, partial) => settingsRepo.set(partial))

  ipcMain.handle(IPC_CHANNELS.CONTACTS_LIST, () => contactsRepo.list())
  ipcMain.handle(IPC_CHANNELS.CONTACTS_SAVE, (_e, contact: Contact) => contactsRepo.save(contact))
  ipcMain.handle(IPC_CHANNELS.CONTACTS_DELETE, (_e, id: string) => contactsRepo.delete(id))
  ipcMain.handle(IPC_CHANNELS.CONTACTS_SEARCH, (_e, q: string) => contactsRepo.search(q))
  ipcMain.handle(IPC_CHANNELS.CONTACTS_FAVORITES, () => contactsRepo.favorites())
  ipcMain.handle(IPC_CHANNELS.CONTACTS_GROUPS, () => groupsRepo.list())
  ipcMain.handle(IPC_CHANNELS.CONTACTS_IMPORT_CSV, async () => {
    const win = ctx.getMainWindow()
    const result = await dialog.showOpenDialog(win!, {
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths[0]) return { imported: 0 }
    const raw = readFileSync(result.filePaths[0], 'utf8')
    const contacts = parseContactsCsv(raw)
    return { imported: contactsRepo.importMany(contacts) }
  })
  ipcMain.handle(IPC_CHANNELS.CONTACTS_EXPORT_CSV, async () => {
    const win = ctx.getMainWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: 'contacts.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }
    writeFileSync(result.filePath, contactsToCsv(contactsRepo.list()), 'utf8')
    return { ok: true, path: result.filePath }
  })

  ipcMain.handle(IPC_CHANNELS.CALL_ORIGINATE, (_e, number: string, trunk?: string) =>
    ctx.callService.originate(number, trunk)
  )
  ipcMain.handle(IPC_CHANNELS.CALL_ANSWER, () => ctx.callService.answer())
  ipcMain.handle(IPC_CHANNELS.CALL_REJECT, () => ctx.callService.reject())
  ipcMain.handle(IPC_CHANNELS.CALL_MUTE, (_e, muted?: boolean) => ctx.callService.mute(muted))
  ipcMain.handle(IPC_CHANNELS.CALL_HOLD, (_e, held?: boolean) => ctx.callService.hold(held))
  ipcMain.handle(IPC_CHANNELS.CALL_RECORD, (_e, enabled?: boolean) =>
    ctx.callService.record(enabled)
  )
  ipcMain.handle(IPC_CHANNELS.CALL_TRANSFER, (_e, target: string) =>
    ctx.callService.transfer(target)
  )
  ipcMain.handle(IPC_CHANNELS.CALL_ACTIVE, () => ctx.callService.getActive())
  ipcMain.handle(IPC_CHANNELS.CALL_HISTORY, (_e, opts) => callHistoryRepo.list(opts ?? {}))
  ipcMain.handle(IPC_CHANNELS.CALL_HISTORY_EXPORT, async (_e, format: 'csv' | 'excel' | 'pdf') => {
    const win = ctx.getMainWindow()
    const ext = format === 'pdf' ? 'pdf' : 'csv'
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: `call-history.${ext}`,
      filters: [{ name: format.toUpperCase(), extensions: [ext] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }
    writeFileSync(result.filePath, historyToCsv(callHistoryRepo.allForExport()), 'utf8')
    return { ok: true, path: result.filePath, format }
  })

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, async (): Promise<DashboardStats> => {
    const history = callHistoryRepo.list({ start: 0, count: 500 })
    const today = new Date().toISOString().slice(0, 10)
    const todays = history.items.filter((h) => h.startedAt.startsWith(today))
    const answered = todays.filter((h) => h.disposition === 'ended' || h.durationSec > 0)
    const missed = todays.filter((h) => h.disposition === 'missed')
    const talk = answered.reduce((s, h) => s + h.durationSec, 0)
    const queues = apiClient ? normalizeQueues(await apiClient.searchQueues()) : []
    const waiting = queues.reduce((s, q) => s + q.waitingCallers, 0)

    const hours = Array.from({ length: 24 }, (_, hour) => {
      const label = `${String(hour).padStart(2, '0')}:00`
      const bucket = todays.filter((h) => new Date(h.startedAt).getHours() === hour)
      return {
        hour: label,
        total: bucket.length,
        answered: bucket.filter((h) => h.disposition !== 'missed').length,
        missed: bucket.filter((h) => h.disposition === 'missed').length
      }
    })

    return {
      currentCalls: ctx.callService.getActive() ? 1 : 0,
      waitingCalls: waiting,
      answeredToday: answered.length,
      missedCalls: missed.length,
      abandonedCalls: queues.reduce((s, q) => s + q.abandoned, 0),
      averageTalkTimeSec: answered.length ? Math.round(talk / answered.length) : 0,
      averageWaitingTimeSec: queues.length
        ? Math.round(queues.reduce((s, q) => s + q.longestWaitSec, 0) / queues.length)
        : 0,
      averageRingTimeSec: 0,
      longestCallSec: todays.reduce((m, h) => Math.max(m, h.durationSec), 0),
      currentQueue: queues[0]?.name,
      loggedAgents: 1,
      busyAgents: ctx.callService.getActive() ? 1 : 0,
      availableAgents: ctx.callService.getActive() ? 0 : 1,
      offlineAgents: 0,
      connectionHealth:
        (realtime?.getStatus().state as DashboardStats['connectionHealth']) ?? 'disconnected',
      serverStatus: serversRepo.getDefault()?.health ?? 'unknown',
      callsPerHour: hours,
      queuePerformance: queues.map((q) => ({
        name: q.name,
        answered: q.answered,
        abandoned: q.abandoned,
        waiting: q.waitingCallers
      })),
      agentPerformance: [
        {
          name: session?.name ?? 'Agent',
          answered: answered.length,
          talkSec: talk
        }
      ]
    }
  })

  ipcMain.handle(IPC_CHANNELS.QUEUES_LIST, async () => {
    if (!apiClient) return []
    return normalizeQueues(await apiClient.searchQueues())
  })
  ipcMain.handle(IPC_CHANNELS.QUEUES_JOIN, async (_e, queue: string) => {
    if (!apiClient || !session) throw new Error('Not authenticated')
    return apiClient.addQueueAgent(queue, session.extension)
  })
  ipcMain.handle(IPC_CHANNELS.QUEUES_LEAVE, async (_e, queue: string) => {
    if (!apiClient || !session) throw new Error('Not authenticated')
    return apiClient.removeQueueAgent(queue, session.extension)
  })
  ipcMain.handle(IPC_CHANNELS.QUEUES_PAUSE, async (_e, queue: string) => {
    if (!apiClient || !session) throw new Error('Not authenticated')
    return apiClient.pauseQueueAgent(queue, session.extension)
  })
  ipcMain.handle(IPC_CHANNELS.QUEUES_RESUME, async (_e, queue: string) => {
    if (!apiClient || !session) throw new Error('Not authenticated')
    return apiClient.resumeQueueAgent(queue, session.extension)
  })

  ipcMain.handle(IPC_CHANNELS.AGENT_STATUS_GET, () => {
    if (!session) return null
    return usersRepo.getByServer(session.serverId)
  })
  ipcMain.handle(IPC_CHANNELS.AGENT_STATUS_SET, (_e, status: string, label?: string) => {
    if (!session) throw new Error('Not authenticated')
    const existing = usersRepo.getByServer(session.serverId)
    if (!existing) throw new Error('User not found')
    return usersRepo.save({
      ...existing,
      status: status as never,
      customStatusLabel: label,
      statusChangedAt: new Date().toISOString()
    })
  })
  ipcMain.handle(IPC_CHANNELS.AGENT_STATUS_HISTORY, () => {
    return openDatabase()
      .prepare(`SELECT * FROM agent_status_history ORDER BY started_at DESC LIMIT 100`)
      .all()
  })

  ipcMain.handle(IPC_CHANNELS.RECORDINGS_LIST, async (_e, opts) => {
    const history = callHistoryRepo.list({ ...opts, count: opts?.count ?? 100 })
    return history.items
      .filter((h) => h.recordingFile)
      .map((h) => ({
        id: h.id,
        file: h.recordingFile!,
        callId: h.id,
        phoneNumber: h.phoneNumber,
        durationSec: h.durationSec,
        createdAt: h.startedAt
      }))
  })
  ipcMain.handle(IPC_CHANNELS.RECORDINGS_DOWNLOAD, async (_e, file: string) => {
    if (!apiClient) throw new Error('Not authenticated')
    return apiClient.downloadRecording(file)
  })

  ipcMain.handle(
    IPC_CHANNELS.REALTIME_STATUS,
    () => realtime?.getStatus() ?? { state: 'disconnected', protocol: null }
  )
  ipcMain.handle(
    IPC_CHANNELS.CONNECTION_STATUS,
    () => realtime?.getStatus() ?? { state: 'disconnected', protocol: null }
  )

  ipcMain.handle(IPC_CHANNELS.NOTIFY_LIST, () => notificationsRepo.list())
  ipcMain.handle(IPC_CHANNELS.NOTIFY_MARK_READ, (_e, id: string) => notificationsRepo.markRead(id))
  ipcMain.handle(IPC_CHANNELS.NOTIFY_SHOW, (_e, payload) => notificationsRepo.add(payload))

  ipcMain.handle(IPC_CHANNELS.LOGS_LIST, (_e, opts) => logsRepo.list(opts ?? {}))
  ipcMain.handle(IPC_CHANNELS.LOGS_CLEAR, (_e, category?: string) => logsRepo.clear(category))
  ipcMain.handle(IPC_CHANNELS.LOGS_EXPORT, async () => {
    const win = ctx.getMainWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: 'simotel-logs.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }
    writeFileSync(result.filePath, JSON.stringify(logsRepo.list({ limit: 5000 }), null, 2))
    return { ok: true, path: result.filePath }
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, () => checkForUpdates())
  ipcMain.handle(IPC_CHANNELS.UPDATER_DOWNLOAD, () => downloadUpdate())
  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => installUpdate())
  ipcMain.handle(IPC_CHANNELS.UPDATER_STATUS, () => getUpdaterStatus())

  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async () => {
    const win = ctx.getMainWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: `simotel-backup-${Date.now()}.db`,
      filters: [{ name: 'SQLite', extensions: ['db'] }]
    })
    if (result.canceled || !result.filePath) return { ok: false }
    createBackup(result.filePath)
    return { ok: true, path: result.filePath }
  })
}

function parseContactsCsv(raw: string): Contact[] {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = (name: string): number => headers.indexOf(name)
  const out: Contact[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const name = cols[idx('name')]?.trim()
    const number = cols[idx('number')]?.trim() || cols[idx('phone')]?.trim()
    if (!name || !number) continue
    out.push({
      id: uuid(),
      name,
      company: cols[idx('company')]?.trim() || undefined,
      email: cols[idx('email')]?.trim() || undefined,
      address: cols[idx('address')]?.trim() || undefined,
      numbers: [{ label: 'mobile', number, primary: true }],
      tags: (cols[idx('tags')] ?? '')
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: cols[idx('notes')]?.trim() || undefined,
      groupIds: [],
      isFavorite: false,
      source: 'import',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
  return out
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur)
      cur = ''
    } else cur += ch
  }
  result.push(cur)
  return result
}

function contactsToCsv(contacts: Contact[]): string {
  const header = 'name,number,company,email,address,tags,notes'
  const rows = contacts.map((c) => {
    const number = c.numbers.find((n) => n.primary)?.number ?? c.numbers[0]?.number ?? ''
    return [
      csvEscape(c.name),
      csvEscape(number),
      csvEscape(c.company ?? ''),
      csvEscape(c.email ?? ''),
      csvEscape(c.address ?? ''),
      csvEscape(c.tags.join('|')),
      csvEscape(c.notes ?? '')
    ].join(',')
  })
  return [header, ...rows].join('\n')
}

function historyToCsv(rows: ReturnType<typeof callHistoryRepo.allForExport>): string {
  const header =
    'started_at,phone_number,contact_name,company,queue,agent,direction,disposition,duration_sec,recording_file'
  const lines = rows.map((r) =>
    [
      csvEscape(r.startedAt),
      csvEscape(r.phoneNumber),
      csvEscape(r.contactName ?? ''),
      csvEscape(r.company ?? ''),
      csvEscape(r.queue ?? ''),
      csvEscape(r.agent ?? ''),
      csvEscape(r.direction),
      csvEscape(r.disposition ?? ''),
      String(r.durationSec),
      csvEscape(r.recordingFile ?? '')
    ].join(',')
  )
  return [header, ...lines].join('\n')
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function normalizeQueues(raw: unknown): Array<{
  id: string
  name: string
  number: string
  members: unknown[]
  waitingCallers: number
  longestWaitSec: number
  answered: number
  abandoned: number
  joined: boolean
}> {
  const data = raw as { data?: unknown[] } | unknown[]
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown[] })?.data)
      ? (data as { data: unknown[] }).data
      : []
  return list.map((item, i) => {
    const q = item as Record<string, unknown>
    const number = String(q.number ?? q.queue ?? i)
    return {
      id: String(q.id ?? number),
      name: String(q.name ?? number),
      number,
      members: Array.isArray(q.members) ? q.members : [],
      waitingCallers: Number(q.waiting ?? q.waitingCallers ?? 0),
      longestWaitSec: Number(q.longest_wait ?? q.longestWaitSec ?? 0),
      answered: Number(q.answered ?? 0),
      abandoned: Number(q.abandoned ?? 0),
      joined: Boolean(q.joined)
    }
  })
}
