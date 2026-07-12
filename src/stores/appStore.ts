import { create } from 'zustand'
import type {
  ActiveCall,
  AppSettings,
  ConnectionState,
  Contact,
  QueueInfo,
  RealtimeProtocol,
  ServerConfig,
  SessionInfo,
  UserProfile
} from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/constants'

interface AppState {
  ready: boolean
  settings: AppSettings
  servers: ServerConfig[]
  session: SessionInfo | null
  user: UserProfile | null
  connection: { state: ConnectionState; protocol: RealtimeProtocol | null }
  activeCall: ActiveCall | null
  contacts: Contact[]
  queues: QueueInfo[]
  toast: { id: string; message: string; tone: 'info' | 'success' | 'error' } | null
  searchQuery: string
  setReady: (v: boolean) => void
  setSettings: (s: AppSettings) => void
  setServers: (s: ServerConfig[]) => void
  setSession: (s: SessionInfo | null) => void
  setUser: (u: UserProfile | null) => void
  setConnection: (c: AppState['connection']) => void
  setActiveCall: (c: ActiveCall | null) => void
  setContacts: (c: Contact[]) => void
  setQueues: (q: QueueInfo[]) => void
  setSearchQuery: (q: string) => void
  showToast: (message: string, tone?: 'info' | 'success' | 'error') => void
  clearToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  settings: DEFAULT_SETTINGS,
  servers: [],
  session: null,
  user: null,
  connection: { state: 'disconnected', protocol: null },
  activeCall: null,
  contacts: [],
  queues: [],
  toast: null,
  searchQuery: '',
  setReady: (ready) => set({ ready }),
  setSettings: (settings) => set({ settings }),
  setServers: (servers) => set({ servers }),
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setConnection: (connection) => set({ connection }),
  setActiveCall: (activeCall) => set({ activeCall }),
  setContacts: (contacts) => set({ contacts }),
  setQueues: (queues) => set({ queues }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  showToast: (message, tone = 'info') => set({ toast: { id: String(Date.now()), message, tone } }),
  clearToast: () => set({ toast: null })
}))
