import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import type { QueueInfo } from '@shared/types'

export function QueuesPage() {
  const queues = useAppStore((s) => s.queues)
  const setQueues = useAppStore((s) => s.setQueues)
  const showToast = useAppStore((s) => s.showToast)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = (await api.bridge.queues.list()) as QueueInfo[]
      setQueues(list)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load queues', 'error')
    } finally {
      setLoading(false)
    }
  }, [setQueues, showToast])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), 8000)
    return () => clearInterval(id)
  }, [refresh])

  return (
    <div className="stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Queue Management</h1>
          <p className="muted">Members, waiting callers, join/leave, and realtime refresh.</p>
        </div>
        <button type="button" className="btn" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {loading && queues.length === 0 && (
        <div className="panel stack">
          <div className="skeleton" style={{ height: 24 }} />
          <div className="skeleton" style={{ height: 24 }} />
          <div className="skeleton" style={{ height: 24 }} />
        </div>
      )}

      {!loading && queues.length === 0 && <div className="panel empty">No queues available</div>}

      <div className="grid-2">
        {queues.map((q) => (
          <div key={q.id} className="panel stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h2>{q.name}</h2>
                <div className="muted">#{q.number}</div>
              </div>
              <span className={`badge ${q.waitingCallers > 0 ? 'warn' : 'ok'}`}>
                {q.waitingCallers} waiting
              </span>
            </div>
            <div className="grid-3">
              <div className="stat">
                <span className="muted">Longest wait</span>
                <strong>{q.longestWaitSec}s</strong>
              </div>
              <div className="stat">
                <span className="muted">Answered</span>
                <strong>{q.answered}</strong>
              </div>
              <div className="stat">
                <span className="muted">Abandoned</span>
                <strong>{q.abandoned}</strong>
              </div>
            </div>
            <div>
              <div className="muted" style={{ marginBottom: 8 }}>
                Members ({q.members?.length ?? 0})
              </div>
              {(q.members ?? []).length === 0 ? (
                <div className="muted">No member details in payload</div>
              ) : (
                <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                  {q.members.map((m, i) => (
                    <li key={`${m.agent}-${i}`}>
                      {m.name ?? m.agent} · {m.paused ? 'paused' : m.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  void api.bridge.queues
                    .join(q.number)
                    .then(() => {
                      showToast(`Joined ${q.name}`, 'success')
                      return refresh()
                    })
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                Join
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  void api.bridge.queues
                    .leave(q.number)
                    .then(() => {
                      showToast(`Left ${q.name}`, 'info')
                      return refresh()
                    })
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                Leave
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  void api.bridge.queues
                    .pause(q.number)
                    .then(() => showToast('Paused', 'info'))
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                Pause
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  void api.bridge.queues
                    .resume(q.number)
                    .then(() => showToast('Resumed', 'success'))
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                Resume
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
