import type { AppSettings } from '../types'

export const APP_NAME = 'سیموتل سافت‌فون'
export const APP_ID = 'com.runy.simotel-softphone'
export const DEFAULT_API_PATH = 'api/v4'

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  language: 'fa',
  autoStart: false,
  startWithWindows: false,
  minimizeToTray: true,
  desktopNotifications: true,
  soundNotifications: true,
  rememberLastUser: true,
  originateContext: 'outgoing_context',
  originateTimeout: 30,
  autoCheckUpdates: true,
  eventWebhookPort: 3939,
  logLevel: 'info'
}

export const ADMIN_PERMISSIONS = [
  'users.manage',
  'servers.manage',
  'calls.view_all',
  'queues.view_all',
  'reports.view',
  'settings.system'
] as const

export const AGENT_PERMISSIONS = [
  'calls.personal',
  'calls.click_to_call',
  'status.manage',
  'contacts.manage',
  'history.personal'
] as const

export const SIMOTEL_EVENTS = [
  'IncomingCall',
  'OutgoingCall',
  'NewState',
  'Transfer',
  'Cdr',
  'CdrQueue',
  'ExtenAdded',
  'ExtenRemoved',
  'IncomingFax',
  'VoiceMail',
  'VoiceMailEmail',
  'Survey',
  'Ping'
] as const

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
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_SHOW_POPUP: 'window:show-popup',
  WINDOW_HIDE_POPUP: 'window:hide-popup',

  SERVERS_LIST: 'servers:list',
  SERVERS_SAVE: 'servers:save',
  SERVERS_DELETE: 'servers:delete',
  SERVERS_TEST: 'servers:test',
  SERVERS_SET_DEFAULT: 'servers:set-default',

  USERS_LIST: 'users:list',
  USERS_SAVE: 'users:save',
  USERS_DELETE: 'users:delete',

  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_STATUS: 'auth:status',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  CONTACTS_LIST: 'contacts:list',
  CONTACTS_SAVE: 'contacts:save',
  CONTACTS_DELETE: 'contacts:delete',
  CONTACTS_SEARCH: 'contacts:search',
  CONTACTS_IMPORT_CSV: 'contacts:import-csv',
  CONTACTS_EXPORT_CSV: 'contacts:export-csv',
  CONTACTS_GROUPS: 'contacts:groups',
  CONTACTS_FAVORITES: 'contacts:favorites',

  CALL_ORIGINATE: 'call:originate',
  CALL_ANSWER: 'call:answer',
  CALL_REJECT: 'call:reject',
  CALL_MUTE: 'call:mute',
  CALL_HOLD: 'call:hold',
  CALL_TRANSFER: 'call:transfer',
  CALL_RECORD: 'call:record',
  CALL_ACTIVE: 'call:active',
  CALL_HISTORY: 'call:history',
  CALL_HISTORY_EXPORT: 'call:history-export',

  DASHBOARD_STATS: 'dashboard:stats',

  QUEUES_LIST: 'queues:list',
  QUEUES_JOIN: 'queues:join',
  QUEUES_LEAVE: 'queues:leave',
  QUEUES_PAUSE: 'queues:pause',
  QUEUES_RESUME: 'queues:resume',

  AGENT_STATUS_GET: 'agent:status-get',
  AGENT_STATUS_SET: 'agent:status-set',
  AGENT_STATUS_HISTORY: 'agent:status-history',

  RECORDINGS_LIST: 'recordings:list',
  RECORDINGS_DOWNLOAD: 'recordings:download',
  RECORDINGS_DELETE: 'recordings:delete',

  REALTIME_STATUS: 'realtime:status',
  REALTIME_EVENT: 'realtime:event',
  CONNECTION_STATUS: 'connection:status',

  NOTIFY_SHOW: 'notify:show',
  NOTIFY_LIST: 'notify:list',
  NOTIFY_MARK_READ: 'notify:mark-read',

  LOGS_LIST: 'logs:list',
  LOGS_EXPORT: 'logs:export',
  LOGS_CLEAR: 'logs:clear',

  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_STATUS: 'updater:status',

  TRAY_QUIT: 'tray:quit',

  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
