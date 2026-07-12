import type { AppSettings } from '../types'

export const APP_NAME = 'Simotel Softphone'
export const APP_ID = 'com.runy.simotel-softphone'
export const DEFAULT_API_PATH = 'api/v4'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  language: 'en',
  autoStart: false,
  startWithWindows: false,
  minimizeToTray: true,
  desktopNotifications: true,
  soundNotifications: true,
  originateContext: 'outgoing_context',
  originateTimeout: 30,
  autoCheckUpdates: true,
  logLevel: 'info'
}

export const REALTIME_PRIORITY = [
  'websocket',
  'sse',
  'webhook',
  'long_polling',
  'smart_polling'
] as const

export const AGENT_STATUSES = [
  'ready',
  'busy',
  'break',
  'lunch',
  'meeting',
  'offline',
  'after_call_work',
  'custom'
] as const

export const IPC_CHANNELS = {
  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_SHOW_POPUP: 'window:show-popup',
  WINDOW_HIDE_POPUP: 'window:hide-popup',

  // Auth / servers
  SERVERS_LIST: 'servers:list',
  SERVERS_SAVE: 'servers:save',
  SERVERS_DELETE: 'servers:delete',
  SERVERS_TEST: 'servers:test',
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_STATUS: 'auth:status',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Contacts
  CONTACTS_LIST: 'contacts:list',
  CONTACTS_SAVE: 'contacts:save',
  CONTACTS_DELETE: 'contacts:delete',
  CONTACTS_SEARCH: 'contacts:search',
  CONTACTS_IMPORT_CSV: 'contacts:import-csv',
  CONTACTS_EXPORT_CSV: 'contacts:export-csv',
  CONTACTS_GROUPS: 'contacts:groups',
  CONTACTS_FAVORITES: 'contacts:favorites',

  // Calls
  CALL_ORIGINATE: 'call:originate',
  CALL_ANSWER: 'call:answer',
  CALL_REJECT: 'call:reject',
  CALL_MUTE: 'call:mute',
  CALL_TRANSFER: 'call:transfer',
  CALL_ACTIVE: 'call:active',
  CALL_HISTORY: 'call:history',
  CALL_HISTORY_EXPORT: 'call:history-export',

  // Queues
  QUEUES_LIST: 'queues:list',
  QUEUES_JOIN: 'queues:join',
  QUEUES_LEAVE: 'queues:leave',
  QUEUES_PAUSE: 'queues:pause',
  QUEUES_RESUME: 'queues:resume',

  // Agent
  AGENT_STATUS_GET: 'agent:status-get',
  AGENT_STATUS_SET: 'agent:status-set',
  AGENT_STATUS_HISTORY: 'agent:status-history',

  // Recordings
  RECORDINGS_LIST: 'recordings:list',
  RECORDINGS_DOWNLOAD: 'recordings:download',
  RECORDINGS_DELETE: 'recordings:delete',

  // Realtime / connection
  REALTIME_STATUS: 'realtime:status',
  REALTIME_EVENT: 'realtime:event',
  CONNECTION_STATUS: 'connection:status',

  // Notifications
  NOTIFY_SHOW: 'notify:show',
  NOTIFY_LIST: 'notify:list',
  NOTIFY_MARK_READ: 'notify:mark-read',

  // Logs
  LOGS_LIST: 'logs:list',
  LOGS_EXPORT: 'logs:export',
  LOGS_CLEAR: 'logs:clear',

  // Updater
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_STATUS: 'updater:status',

  // Tray
  TRAY_QUIT: 'tray:quit',

  // Backup
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
