import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  History,
  LayoutDashboard,
  ListOrdered,
  Mic,
  Phone,
  Search,
  Settings,
  Users,
  UserCog
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { Toast } from '@/components/common/Toast'
import { ConnectionBadge } from '@/components/common/ConnectionBadge'
import { AgentStatusPicker } from '@/features/agent-status/AgentStatusPicker'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'

export function AppLayout() {
  const { t } = useI18n()
  const location = useLocation()
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const session = useAppStore((s) => s.session)
  const activeCall = useAppStore((s) => s.activeCall)

  const links = [
    { to: '/', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/contacts', label: t.nav.contacts, icon: Users },
    { to: '/queues', label: t.nav.queues, icon: ListOrdered },
    { to: '/history', label: t.nav.history, icon: History },
    { to: '/recordings', label: t.nav.recordings, icon: Mic },
    { to: '/search', label: t.nav.search, icon: Search },
    { to: '/settings', label: t.nav.settings, icon: Settings },
    ...(session?.role === 'admin' ? [{ to: '/users', label: t.nav.users, icon: UserCog }] : [])
  ]

  return (
    <div className="grid h-full min-h-0 grid-cols-[240px_1fr] max-[960px]:grid-cols-[72px_1fr]">
      <aside className="flex flex-col gap-2 border-e border-[var(--color-border)] bg-gradient-to-b from-[rgb(18_26_43/0.95)] to-[rgb(11_18_32/0.98)] p-4 backdrop-blur">
        <div className="animate-fade-up px-3 pb-4">
          <div className="mb-2.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] font-bold text-[#041016] shadow-[0_8px_24px_rgb(45_212_160/0.25)]">
            {t.brandShort}
          </div>
          <strong className="block font-[family-name:var(--font-display)] text-[1.15rem] tracking-tight max-[960px]:hidden">
            {t.appName}
          </strong>
          <span className="text-xs text-[var(--color-muted)] max-[960px]:hidden">
            {t.appTagline}
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[var(--color-muted)] transition hover:bg-[rgb(148_163_184/0.08)] hover:text-[var(--color-fg)]',
                  isActive &&
                    'bg-gradient-to-r from-[rgb(45_212_160/0.16)] to-[rgb(56_189_248/0.08)] text-[var(--color-fg)]'
                )
              }
            >
              <Icon size={18} />
              <span className="max-[960px]:hidden">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          {activeCall && (
            <Card className="p-3">
              <div className="text-xs text-[var(--color-muted)]">{t.activeCallSidebar}</div>
              <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
                <Phone size={16} />
                {activeCall.callerName ?? activeCall.phoneNumber}
              </div>
            </Card>
          )}
          <AgentStatusPicker />
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[rgb(18_26_43/0.55)] px-5 py-3.5 backdrop-blur">
          <Input
            className="max-w-md"
            placeholder={t.search.topPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <ConnectionBadge />
            {session && (
              <span className="rounded-full bg-[rgb(148_163_184/0.12)] px-2.5 py-1 text-xs text-[var(--color-muted)]">
                {session.role === 'admin' ? t.common.admin : t.common.agent} · {t.ext}{' '}
                {session.extension}
              </span>
            )}
            <span className="text-sm text-[var(--color-muted)]">
              {links.find((l) =>
                l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to)
              )?.label ?? t.appName}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-5">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  )
}
