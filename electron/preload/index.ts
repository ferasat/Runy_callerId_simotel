import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants'
import type {
  ActiveCall,
  AgentStatus,
  AppSettings,
  Contact,
  NotificationPayload,
  ServerConfig
} from '../../shared/types'

const api = {
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    showPopup: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_POPUP),
    hidePopup: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_HIDE_POPUP)
  },
  servers: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.SERVERS_LIST) as Promise<ServerConfig[]>,
    save: (server: ServerConfig) => ipcRenderer.invoke(IPC_CHANNELS.SERVERS_SAVE, server),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SERVERS_DELETE, id),
    test: (server: ServerConfig) => ipcRenderer.invoke(IPC_CHANNELS.SERVERS_TEST, server)
  },
  auth: {
    login: (payload: { serverId: string; extension: string; name?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, payload),
    logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    status: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_STATUS)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET) as Promise<AppSettings>,
    set: (partial: Partial<AppSettings>) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, partial)
  },
  contacts: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_LIST) as Promise<Contact[]>,
    save: (contact: Contact) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_SAVE, contact),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_DELETE, id),
    search: (q: string) => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_SEARCH, q) as Promise<Contact[]>,
    favorites: () => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_FAVORITES) as Promise<Contact[]>,
    groups: () => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_GROUPS),
    importCsv: () => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_IMPORT_CSV),
    exportCsv: () => ipcRenderer.invoke(IPC_CHANNELS.CONTACTS_EXPORT_CSV)
  },
  call: {
    originate: (number: string, trunk?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CALL_ORIGINATE, number, trunk),
    answer: () => ipcRenderer.invoke(IPC_CHANNELS.CALL_ANSWER),
    reject: () => ipcRenderer.invoke(IPC_CHANNELS.CALL_REJECT),
    mute: (muted?: boolean) => ipcRenderer.invoke(IPC_CHANNELS.CALL_MUTE, muted),
    transfer: (target: string) => ipcRenderer.invoke(IPC_CHANNELS.CALL_TRANSFER, target),
    active: () => ipcRenderer.invoke(IPC_CHANNELS.CALL_ACTIVE) as Promise<ActiveCall | null>,
    history: (opts?: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.CALL_HISTORY, opts),
    exportHistory: (format: 'csv' | 'excel' | 'pdf') =>
      ipcRenderer.invoke(IPC_CHANNELS.CALL_HISTORY_EXPORT, format),
    onActiveChanged: (cb: (call: ActiveCall | null) => void) => {
      const listener = (_: Electron.IpcRendererEvent, call: ActiveCall | null): void => cb(call)
      ipcRenderer.on('call:active-changed', listener)
      return () => {
        ipcRenderer.removeListener('call:active-changed', listener)
      }
    }
  },
  queues: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.QUEUES_LIST),
    join: (queue: string) => ipcRenderer.invoke(IPC_CHANNELS.QUEUES_JOIN, queue),
    leave: (queue: string) => ipcRenderer.invoke(IPC_CHANNELS.QUEUES_LEAVE, queue),
    pause: (queue: string) => ipcRenderer.invoke(IPC_CHANNELS.QUEUES_PAUSE, queue),
    resume: (queue: string) => ipcRenderer.invoke(IPC_CHANNELS.QUEUES_RESUME, queue)
  },
  agent: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.AGENT_STATUS_GET),
    setStatus: (status: AgentStatus, label?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_STATUS_SET, status, label)
  },
  recordings: {
    list: (opts?: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.RECORDINGS_LIST, opts),
    download: (file: string) => ipcRenderer.invoke(IPC_CHANNELS.RECORDINGS_DOWNLOAD, file)
  },
  realtime: {
    status: () => ipcRenderer.invoke(IPC_CHANNELS.REALTIME_STATUS),
    onEvent: (cb: (event: unknown) => void) => {
      const listener = (_: Electron.IpcRendererEvent, event: unknown): void => cb(event)
      ipcRenderer.on(IPC_CHANNELS.REALTIME_EVENT, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.REALTIME_EVENT, listener)
      }
    },
    onConnection: (cb: (status: unknown) => void) => {
      const listener = (_: Electron.IpcRendererEvent, status: unknown): void => cb(status)
      ipcRenderer.on(IPC_CHANNELS.CONNECTION_STATUS, listener)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.CONNECTION_STATUS, listener)
      }
    }
  },
  notifications: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.NOTIFY_LIST) as Promise<NotificationPayload[]>,
    markRead: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.NOTIFY_MARK_READ, id),
    onPushed: (cb: (n: NotificationPayload) => void) => {
      const listener = (_: Electron.IpcRendererEvent, n: NotificationPayload): void => cb(n)
      ipcRenderer.on('notify:pushed', listener)
      return () => {
        ipcRenderer.removeListener('notify:pushed', listener)
      }
    }
  },
  logs: {
    list: (opts?: { category?: string; limit?: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.LOGS_LIST, opts),
    clear: (category?: string) => ipcRenderer.invoke(IPC_CHANNELS.LOGS_CLEAR, category),
    export: () => ipcRenderer.invoke(IPC_CHANNELS.LOGS_EXPORT)
  },
  updater: {
    check: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
    download: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_DOWNLOAD),
    install: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),
    status: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_STATUS),
    onStatus: (cb: (status: unknown) => void) => {
      const listener = (_: Electron.IpcRendererEvent, status: unknown): void => cb(status)
      ipcRenderer.on('updater:status', listener)
      return () => {
        ipcRenderer.removeListener('updater:status', listener)
      }
    }
  },
  backup: {
    create: () => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE)
  }
}

contextBridge.exposeInMainWorld('simotel', api)

export type SimotelPreloadApi = typeof api
