/**
 * Lightweight persistent prefs via electron-store (last user / last server).
 * Secrets stay in SQLite + safeStorage — never in this store.
 */

type SessionPrefs = {
  lastServerId?: string
  lastUsername?: string
  lastExtension?: string
}

let store: {
  get: (k: keyof SessionPrefs) => string | undefined
  set: (k: keyof SessionPrefs, v: string) => void
} | null = null

async function getStore() {
  if (store) return store
  try {
    const Store = (await import('electron-store')).default
    const instance = new Store<SessionPrefs>({ name: 'session-prefs' })
    store = {
      get: (k) => instance.get(k),
      set: (k, v) => instance.set(k, v)
    }
  } catch {
    const memory: SessionPrefs = {}
    store = {
      get: (k) => memory[k],
      set: (k, v) => {
        memory[k] = v
      }
    }
  }
  return store
}

export async function rememberSession(prefs: SessionPrefs): Promise<void> {
  const s = await getStore()
  if (prefs.lastServerId) s.set('lastServerId', prefs.lastServerId)
  if (prefs.lastUsername) s.set('lastUsername', prefs.lastUsername)
  if (prefs.lastExtension) s.set('lastExtension', prefs.lastExtension)
}

export async function readRememberedSession(): Promise<SessionPrefs> {
  const s = await getStore()
  return {
    lastServerId: s.get('lastServerId'),
    lastUsername: s.get('lastUsername'),
    lastExtension: s.get('lastExtension')
  }
}
