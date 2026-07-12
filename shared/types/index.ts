/** Shared domain types used by main and renderer processes. */

export type Environment = 'development' | 'testing' | 'production'

export type AgentStatus =
  | 'ready'
  | 'busy'
  | 'break'
  | 'lunch'
  | 'meeting'
  | 'offline'
  | 'after_call_work'
  | 'custom'

export type CallDirection = 'inbound' | 'outbound' | 'internal' | 'unknown'
export type CallState =
  | 'idle'
  | 'ringing'
  | 'answered'
  | 'held'
  | 'muted'
  | 'transferring'
  | 'ended'
  | 'missed'

export type RealtimeProtocol =
  | 'websocket'
  | 'sse'
  | 'webhook'
  | 'long_polling'
  | 'smart_polling'

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AppLanguage = 'en' | 'fa'

export interface ServerConfig {
  id: string
  name: string
  baseUrl: string
  apiPath: string
  apiKey: string
  username?: string
  password?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  serverId: string
  extension: string
  name: string
  number: string
  email?: string
  avatarUrl?: string
  status: AgentStatus
  customStatusLabel?: string
  statusChangedAt?: string
}

export interface ContactNumber {
  label: string
  number: string
  primary?: boolean
}

export interface Contact {
  id: string
  name: string
  company?: string
  email?: string
  address?: string
  avatarUrl?: string
  numbers: ContactNumber[]
  tags: string[]
  notes?: string
  groupIds: string[]
  isFavorite: boolean
  source: 'local' | 'import' | 'crm' | 'simotel'
  createdAt: string
  updatedAt: string
}

export interface ContactGroup {
  id: string
  name: string
  color?: string
  createdAt: string
}

export interface ActiveCall {
  id: string
  uniqueId?: string
  phoneNumber: string
  callerName?: string
  company?: string
  queue?: string
  avatarUrl?: string
  direction: CallDirection
  state: CallState
  startedAt: string
  answeredAt?: string
  muted: boolean
  recording: boolean
  durationSec: number
}

export interface CallHistoryEntry {
  id: string
  uniqueId?: string
  phoneNumber: string
  contactName?: string
  company?: string
  queue?: string
  agent?: string
  extension?: string
  direction: CallDirection
  disposition?: string
  durationSec: number
  startedAt: string
  endedAt?: string
  recordingFile?: string
  notes?: string
  tags: string[]
}

export interface RecordingMeta {
  id: string
  file: string
  callId?: string
  phoneNumber?: string
  durationSec?: number
  createdAt: string
  localPath?: string
}

export interface QueueInfo {
  id: string
  name: string
  number: string
  members: QueueMember[]
  waitingCallers: number
  longestWaitSec: number
  answered: number
  abandoned: number
  joined: boolean
}

export interface QueueMember {
  agent: string
  name?: string
  status: AgentStatus | 'paused' | 'available'
  paused: boolean
  callsTaken: number
}

export interface WaitingCaller {
  id: string
  phoneNumber: string
  queue: string
  waitSec: number
  position: number
}

export interface AppSettings {
  theme: ThemeMode
  language: AppLanguage
  autoStart: boolean
  startWithWindows: boolean
  minimizeToTray: boolean
  desktopNotifications: boolean
  soundNotifications: boolean
  customRingtonePath?: string
  defaultServerId?: string
  defaultExtension?: string
  originateContext: string
  originateTimeout: number
  autoCheckUpdates: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

export interface NotificationPayload {
  id: string
  type:
    | 'incoming_call'
    | 'missed_call'
    | 'transfer'
    | 'recording_started'
    | 'recording_finished'
    | 'connection_lost'
    | 'reconnect_success'
    | 'queue_warning'
    | 'info'
  title: string
  body: string
  data?: Record<string, unknown>
  createdAt: string
  read: boolean
}

export interface Pagination {
  start: number
  count: number
  sorting?: Record<string, 'asc' | 'desc'>
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  start: number
  count: number
}

export interface ApiErrorShape {
  code: string
  message: string
  status?: number
  details?: unknown
}

export interface LogEntry {
  id: string
  category:
    | 'error'
    | 'api'
    | 'realtime'
    | 'connection'
    | 'authentication'
    | 'call'
    | 'system'
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  meta?: Record<string, unknown>
  createdAt: string
}
