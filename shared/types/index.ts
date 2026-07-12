/** Shared domain types used by main and renderer processes. */

export type Environment = 'development' | 'testing' | 'production'

export type ApiAuthMode = 'basic' | 'token' | 'both'

export type UserRole = 'admin' | 'agent'

export type AgentStatus =
  'ready' | 'busy' | 'break' | 'lunch' | 'meeting' | 'offline' | 'after_call_work' | 'custom'

export type CallDirection = 'inbound' | 'outbound' | 'internal' | 'unknown'
export type CallState =
  | 'idle'
  | 'ringing'
  | 'answered'
  | 'held'
  | 'muted'
  | 'transferring'
  | 'recording'
  | 'ended'
  | 'missed'

export type RealtimeProtocol = 'websocket' | 'sse' | 'webhook' | 'long_polling' | 'smart_polling'

export type ConnectionState =
  'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'offline'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AppLanguage = 'en' | 'fa'

export type SimotelEventName =
  | 'IncomingCall'
  | 'OutgoingCall'
  | 'NewState'
  | 'Transfer'
  | 'Cdr'
  | 'CdrQueue'
  | 'ExtenAdded'
  | 'ExtenRemoved'
  | 'IncomingFax'
  | 'VoiceMail'
  | 'VoiceMailEmail'
  | 'Survey'
  | 'Ping'

export interface ServerConfig {
  id: string
  name: string
  baseUrl: string
  /** Optional explicit host parts (derived into baseUrl when provided). */
  host?: string
  port?: number
  https?: boolean
  apiPath: string
  apiAuth: ApiAuthMode
  apiKey: string
  username?: string
  /** Plaintext only in-memory / forms; persisted as encryptedPassword. */
  password?: string
  encryptedPassword?: string
  encryptedApiKey?: string
  timeoutMs: number
  reconnectPolicy: {
    enabled: boolean
    maxRetries: number
    baseDelayMs: number
  }
  isDefault: boolean
  health?: 'unknown' | 'healthy' | 'degraded' | 'down'
  lastHealthAt?: string
  createdAt: string
  updatedAt: string
}

export interface AppUser {
  id: string
  fullName: string
  username: string
  /** Never returned from IPC in plaintext after save. */
  hasPassword: boolean
  extension: string
  agentId?: string
  queueMembership: string[]
  role: UserRole
  avatarUrl?: string
  theme: ThemeMode
  language: AppLanguage
  permissions: string[]
  serverId?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  active: boolean
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
  role?: UserRole
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
  agent?: string
  extension?: string
  avatarUrl?: string
  direction: CallDirection
  state: CallState
  startedAt: string
  answeredAt?: string
  muted: boolean
  held: boolean
  recording: boolean
  durationSec: number
  crmData?: Record<string, unknown>
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

export interface DashboardStats {
  currentCalls: number
  waitingCalls: number
  answeredToday: number
  missedCalls: number
  abandonedCalls: number
  averageTalkTimeSec: number
  averageWaitingTimeSec: number
  averageRingTimeSec: number
  longestCallSec: number
  currentQueue?: string
  loggedAgents: number
  busyAgents: number
  availableAgents: number
  offlineAgents: number
  connectionHealth: ConnectionState
  serverStatus: 'unknown' | 'healthy' | 'degraded' | 'down'
  callsPerHour: Array<{ hour: string; total: number; answered: number; missed: number }>
  queuePerformance: Array<{ name: string; answered: number; abandoned: number; waiting: number }>
  agentPerformance: Array<{ name: string; answered: number; talkSec: number }>
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
  lastUsername?: string
  rememberLastUser: boolean
  originateContext: string
  originateTimeout: number
  autoCheckUpdates: boolean
  eventWebhookPort: number
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
  category: 'error' | 'api' | 'realtime' | 'connection' | 'authentication' | 'call' | 'system'
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  meta?: Record<string, unknown>
  createdAt: string
}

export interface SessionInfo {
  serverId: string
  extension: string
  name: string
  role: UserRole
  userId?: string
  username?: string
}
