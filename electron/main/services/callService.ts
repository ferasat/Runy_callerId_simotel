import { BrowserWindow, Notification, app, shell } from 'electron'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import type { ActiveCall, NotificationPayload } from '../../../shared/types'
import { callHistoryRepo, contactsRepo, logsRepo, notificationsRepo, settingsRepo } from '../db'
import type { RealtimeEvent } from '../realtime/engine'
import type { SimotelApiClient } from '../services/simotelApi'

export class CallService {
  private active: ActiveCall | null = null
  private api: SimotelApiClient | null = null
  private extension = ''
  private context = 'outgoing_context'
  private getMainWindow: () => BrowserWindow | null
  private getPopupWindow: () => BrowserWindow | null
  private showPopup: () => void

  constructor(opts: {
    getMainWindow: () => BrowserWindow | null
    getPopupWindow: () => BrowserWindow | null
    showPopup: () => void
  }) {
    this.getMainWindow = opts.getMainWindow
    this.getPopupWindow = opts.getPopupWindow
    this.showPopup = opts.showPopup
  }

  setApi(api: SimotelApiClient | null, extension: string, context: string): void {
    this.api = api
    this.extension = extension
    this.context = context
  }

  getActive(): ActiveCall | null {
    return this.active
  }

  async originate(callee: string, trunkName?: string): Promise<ActiveCall> {
    if (!this.api || !this.extension) {
      throw new Error('Not authenticated or extension missing')
    }
    const settings = settingsRepo.get()
    await this.api.originate({
      caller: this.extension,
      callee,
      context: settings.originateContext || this.context,
      caller_id: this.extension,
      trunk_name: trunkName,
      timeout: settings.originateTimeout
    })
    const contact = contactsRepo.search(callee)[0]
    this.active = {
      id: uuid(),
      phoneNumber: callee,
      callerName: contact?.name,
      company: contact?.company,
      avatarUrl: contact?.avatarUrl,
      direction: 'outbound',
      state: 'ringing',
      startedAt: new Date().toISOString(),
      muted: false,
      recording: false,
      held: false,
      durationSec: 0
    }
    this.broadcastActive()
    logsRepo.add({
      category: 'call',
      level: 'info',
      message: `Originate to ${callee}`,
      meta: { extension: this.extension }
    })
    return this.active
  }

  answer(): ActiveCall | null {
    if (!this.active) return null
    this.active = {
      ...this.active,
      state: 'answered',
      answeredAt: new Date().toISOString()
    }
    this.broadcastActive()
    return this.active
  }

  reject(): void {
    if (!this.active) return
    this.finalize('missed')
  }

  mute(muted?: boolean): ActiveCall | null {
    if (!this.active) return null
    const nextMuted = muted ?? !this.active.muted
    this.active = {
      ...this.active,
      muted: nextMuted,
      state: nextMuted ? 'muted' : this.active.held ? 'held' : 'answered'
    }
    this.broadcastActive()
    return this.active
  }

  hold(held?: boolean): ActiveCall | null {
    if (!this.active) return null
    const nextHeld = held ?? !this.active.held
    this.active = {
      ...this.active,
      held: nextHeld,
      state: nextHeld ? 'held' : this.active.muted ? 'muted' : 'answered'
    }
    this.broadcastActive()
    logsRepo.add({
      category: 'call',
      level: 'info',
      message: nextHeld ? 'Call held' : 'Call resumed',
      meta: { callId: this.active.id }
    })
    return this.active
  }

  record(enabled?: boolean): ActiveCall | null {
    if (!this.active) return null
    const recording = enabled ?? !this.active.recording
    this.active = {
      ...this.active,
      recording,
      state: recording ? 'recording' : this.active.held ? 'held' : 'answered'
    }
    this.broadcastActive()
    this.notify({
      type: recording ? 'recording_started' : 'recording_finished',
      title: 'Recording',
      body: recording ? 'Recording started' : 'Recording stopped'
    })
    return this.active
  }

  async transfer(target: string): Promise<ActiveCall | null> {
    if (!this.active || !this.api) return null
    // Simotel transfer is typically done via originate/dialplan; record intent and notify.
    this.active = { ...this.active, state: 'transferring' }
    this.broadcastActive()
    this.notify({
      type: 'transfer',
      title: 'Transfer',
      body: `Transferring call to ${target}`
    })
    logsRepo.add({
      category: 'call',
      level: 'info',
      message: `Transfer to ${target}`,
      meta: { callId: this.active.id }
    })
    return this.active
  }

  handleRealtimeEvent(event: RealtimeEvent): void {
    const payload = event.payload
    const number = String(
      payload.caller_id ?? payload.caller ?? payload.src ?? payload.number ?? payload.phone ?? ''
    )
    const queue = payload.queue ? String(payload.queue) : undefined

    if (event.type === 'incoming_call') {
      const contact = number ? contactsRepo.search(number)[0] : undefined
      this.active = {
        id: uuid(),
        uniqueId: payload.uniqueid ? String(payload.uniqueid) : undefined,
        phoneNumber: number || 'Unknown',
        callerName: contact?.name ?? (payload.name ? String(payload.name) : undefined),
        company: contact?.company,
        queue,
        avatarUrl: contact?.avatarUrl,
        direction: 'inbound',
        state: 'ringing',
        startedAt: new Date().toISOString(),
        muted: false,
        recording: false,
        held: false,
        durationSec: 0
      }
      this.broadcastActive()
      this.showPopup()
      this.notify({
        type: 'incoming_call',
        title: 'Incoming Call',
        body: `${this.active.callerName ?? this.active.phoneNumber}${queue ? ` · ${queue}` : ''}`,
        data: { callId: this.active.id }
      })
      return
    }

    if (event.type === 'call_answered' && this.active) {
      this.answer()
      return
    }

    if (event.type === 'call_missed') {
      this.notify({
        type: 'missed_call',
        title: 'Missed Call',
        body: number || this.active?.phoneNumber || 'Unknown'
      })
      this.finalize('missed')
      return
    }

    if (event.type === 'call_ended') {
      this.finalize('ended')
      return
    }

    if (event.type === 'recording_started' && this.active) {
      this.active = { ...this.active, recording: true }
      this.broadcastActive()
      this.notify({ type: 'recording_started', title: 'Recording', body: 'Recording started' })
    }

    if (event.type === 'recording_finished') {
      this.notify({ type: 'recording_finished', title: 'Recording', body: 'Recording finished' })
    }
  }

  private finalize(state: 'ended' | 'missed'): void {
    if (!this.active) return
    const endedAt = new Date().toISOString()
    const started = new Date(this.active.startedAt).getTime()
    const durationSec = Math.max(0, Math.floor((Date.now() - started) / 1000))
    callHistoryRepo.save({
      id: this.active.id,
      uniqueId: this.active.uniqueId,
      phoneNumber: this.active.phoneNumber,
      contactName: this.active.callerName,
      company: this.active.company,
      queue: this.active.queue,
      extension: this.extension,
      direction: this.active.direction,
      disposition: state,
      durationSec,
      startedAt: this.active.startedAt,
      endedAt,
      tags: []
    })
    this.active = { ...this.active, state, durationSec }
    this.broadcastActive()
    setTimeout(() => {
      this.active = null
      this.broadcastActive()
      const popup = this.getPopupWindow()
      popup?.hide()
    }, 800)
  }

  private broadcastActive(): void {
    const payload = this.active
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('call:active-changed', payload)
    }
  }

  private notify(input: Omit<NotificationPayload, 'id' | 'createdAt' | 'read'>): void {
    const settings = settingsRepo.get()
    const stored = notificationsRepo.add(input)
    const main = this.getMainWindow()
    main?.webContents.send('notify:pushed', stored)

    if (settings.desktopNotifications && Notification.isSupported()) {
      const n = new Notification({
        title: stored.title,
        body: stored.body,
        silent: !settings.soundNotifications
      })
      n.on('click', () => {
        main?.show()
        main?.focus()
      })
      n.show()
    }
  }
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'Simotel Softphone',
    backgroundColor: '#0f1720',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.on('ready-to-show', () => win.show())
  win.on('close', (e) => {
    const settings = settingsRepo.get()
    if (settings.minimizeToTray && !(app as unknown as { isQuitting?: boolean }).isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

export function createPopupWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 380,
    height: 560,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#0f1720',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  const url = process.env.ELECTRON_RENDERER_URL
  if (url) void win.loadURL(`${url}#/popup`)
  else void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/popup' })

  return win
}

export async function openExternalSafe(url: string): Promise<void> {
  if (/^https?:/i.test(url)) await shell.openExternal(url)
}
