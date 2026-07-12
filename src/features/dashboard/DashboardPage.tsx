import { useEffect, useState } from 'react'
import { ClickToCall } from '@/features/click-to-call/ClickToCall'
import { useAppStore } from '@/stores/appStore'
import { api } from '@/api/client/bridge'

export function DashboardPage() {
  const session = useAppStore((s) => s.session)
  const queues = useAppStore((s) => s.queues)
  const setQueues = useAppStore((s) => s.setQueues)
  const contacts = useAppStore((s) => s.contacts)
  const activeCall = useAppStore((s) => s.activeCall)
  const [recent, setRecent] = useState<Array<{ phoneNumber: string; contactName?: string; startedAt: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [q, history] = await Promise.all([
          api.bridge.queues.list().catch(() => []),
          api.bridge.call.history({ start: 0, count: 8 })
        ])
        if (cancelled) return
        setQueues(q)
        setRecent(history.items ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setQueues])

  const waiting = queues.reduce((sum, q) => sum + (q.waitingCallers || 0), 0)

  return (
    <div className="stack">
      <div className="panel">
        <h1>Dashboard</h1>
        <p className="muted">
          Welcome{session ? `, ${session.name}` : ''}. Monitor queues, dial quickly, and stay call-ready.
        </p>
      </div>

      <div className="grid-3">
        <div className="stat">
          <span className="muted">Contacts</span>
          <strong>{contacts.length}</strong>
        </div>
        <div className="stat">
          <span className="muted">Queues</span>
          <strong>{queues.length}</strong>
        </div>
        <div className="stat">
          <span className="muted">Waiting callers</span>
          <strong>{waiting}</strong>
        </div>
      </div>

      <div className="grid-2">
        <ClickToCall />
        <div className="panel stack">
          <h2>Active Call</h2>
          {!activeCall && <div className="empty">No active call</div>}
          {activeCall && (
            <>
              <div className="avatar">{(activeCall.callerName ?? activeCall.phoneNumber).slice(0, 1)}</div>
              <div style={{ textAlign: 'center' }}>
                <strong>{activeCall.callerName ?? activeCall.phoneNumber}</strong>
                <div className="muted">{activeCall.company ?? activeCall.queue ?? activeCall.state}</div>
              </div>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button type="button" className="btn btn-primary" onClick={() => void api.bridge.call.answer()}>
                  Answer
                </button>
                <button type="button" className="btn btn-danger" onClick={() => void api.bridge.call.reject()}>
                  Reject
                </button>
                <button type="button" className="btn" onClick={() => void api.bridge.call.mute()}>
                  Mute
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Recent Calls</h2>
        {loading && (
          <div className="stack" style={{ marginTop: 12 }}>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        )}
        {!loading && recent.length === 0 && <div className="empty">No recent calls yet</div>}
        {!loading && recent.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Number</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={`${r.phoneNumber}-${i}`}>
                  <td>{new Date(r.startedAt).toLocaleString()}</td>
                  <td>{r.phoneNumber}</td>
                  <td>{r.contactName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
