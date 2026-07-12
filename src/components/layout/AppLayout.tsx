import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  History,
  LayoutDashboard,
  Phone,
  Settings,
  Users,
  ListOrdered,
  Mic,
  Search
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { Toast } from '@/components/common/Toast'
import { ConnectionBadge } from '@/components/common/ConnectionBadge'
import { AgentStatusPicker } from '@/features/agent-status/AgentStatusPicker'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/queues', label: 'Queues', icon: ListOrdered },
  { to: '/history', label: 'History', icon: History },
  { to: '/recordings', label: 'Recordings', icon: Mic },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/settings', label: 'Settings', icon: Settings }
]

export function AppLayout() {
  const location = useLocation()
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const session = useAppStore((s) => s.session)
  const activeCall = useAppStore((s) => s.activeCall)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <strong>Simotel Softphone</strong>
          <span>Desktop CTI</span>
        </div>
        <nav className="stack" style={{ gap: 4 }}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }} className="stack">
          {activeCall && (
            <div className="panel" style={{ padding: 12 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                Active call
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <Phone size={16} />
                <strong style={{ fontSize: 13 }}>
                  {activeCall.callerName ?? activeCall.phoneNumber}
                </strong>
              </div>
            </div>
          )}
          <AgentStatusPicker />
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="row" style={{ flex: 1 }}>
            <input
              className="input"
              style={{ maxWidth: 420 }}
              placeholder="Search number, name, company, extension, queue…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="row">
            <ConnectionBadge />
            {session && (
              <span className="badge">
                Ext {session.extension}
              </span>
            )}
            <span className="muted" style={{ fontSize: 13 }}>
              {links.find((l) =>
                l.to === '/' ? location.pathname === '/' : location.pathname.startsWith(l.to)
              )?.label ?? 'Simotel'}
            </span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  )
}
