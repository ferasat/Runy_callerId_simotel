import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { api } from '@/api/client/bridge'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toast } from '@/components/common/Toast'
import { LoginPage } from '@/features/auth/LoginPage'
import { CallerPopupPage } from '@/features/caller-popup/CallerPopupPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { QueuesPage } from '@/features/queues/QueuesPage'
import { RecordingsPage } from '@/features/recordings/RecordingsPage'
import { SearchPage } from '@/features/search/SearchPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { useAppStore } from '@/stores/appStore'

function useBootstrap(): boolean {
  const ready = useAppStore((s) => s.ready)
  const setReady = useAppStore((s) => s.setReady)
  const setSettings = useAppStore((s) => s.setSettings)
  const setServers = useAppStore((s) => s.setServers)
  const setSession = useAppStore((s) => s.setSession)
  const setUser = useAppStore((s) => s.setUser)
  const setConnection = useAppStore((s) => s.setConnection)
  const setContacts = useAppStore((s) => s.setContacts)
  const setActiveCall = useAppStore((s) => s.setActiveCall)
  const showToast = useAppStore((s) => s.showToast)

  useEffect(() => {
    const unsubs: Array<() => void> = []
    ;(async () => {
      if (!api.isAvailable()) {
        setReady(true)
        return
      }
      const [settings, servers, auth, contacts] = await Promise.all([
        api.bridge.settings.get(),
        api.bridge.servers.list(),
        api.bridge.auth.status(),
        api.bridge.contacts.list()
      ])
      setSettings(settings)
      setServers(servers)
      setContacts(contacts)
      if (auth.session) {
        setSession(auth.session)
        setUser(await api.bridge.agent.getStatus())
      }
      setConnection(auth.connection)

      const theme =
        settings.theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : settings.theme
      document.documentElement.setAttribute('data-theme', theme)

      unsubs.push(
        api.bridge.call.onActiveChanged(setActiveCall),
        api.bridge.realtime.onConnection((status) =>
          setConnection(status as { state: never; protocol: never })
        ),
        api.bridge.notifications.onPushed((n) => showToast(n.title, 'info'))
      )
      setReady(true)
    })().catch((err) => {
      console.error(err)
      setReady(true)
    })

    return () => unsubs.forEach((u) => u())
  }, [
    setReady,
    setSettings,
    setServers,
    setSession,
    setUser,
    setConnection,
    setContacts,
    setActiveCall,
    showToast
  ])

  return ready
}

function ProtectedRoutes(): ReactNode {
  const session = useAppStore((s) => s.session)
  if (!session) return <LoginPage />
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/recordings" element={<RecordingsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  const ready = useBootstrap()

  if (!ready) {
    return (
      <div className="content">
        <div className="panel stack">
          <div className="skeleton" style={{ height: 28, width: 220 }} />
          <div className="skeleton" style={{ height: 14 }} />
          <div className="skeleton" style={{ height: 14, width: '70%' }} />
        </div>
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/popup" element={<CallerPopupPage />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
      <Toast />
    </HashRouter>
  )
}
