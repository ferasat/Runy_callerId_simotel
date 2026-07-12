import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import type { CallHistoryEntry } from '@shared/types'

export function HistoryPage() {
  const searchQuery = useAppStore((s) => s.searchQuery)
  const showToast = useAppStore((s) => s.showToast)
  const [items, setItems] = useState<CallHistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [start, setStart] = useState(0)
  const [sortBy, setSortBy] = useState('started_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const count = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.bridge.call.history({
        start,
        count,
        search: searchQuery,
        sortBy,
        sortDir
      })
      setItems(result.items ?? [])
      setTotal(result.total ?? 0)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load history', 'error')
    } finally {
      setLoading(false)
    }
  }, [start, searchQuery, sortBy, sortDir, showToast])

  useEffect(() => {
    void load()
  }, [load])

  const pages = Math.max(1, Math.ceil(total / count))
  const page = Math.floor(start / count) + 1

  return (
    <div className="stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Call History</h1>
          <p className="muted">Pagination, filtering, sorting, and export.</p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => void api.bridge.call.exportHistory('csv')}>
            Export CSV
          </button>
          <button type="button" className="btn" onClick={() => void api.bridge.call.exportHistory('excel')}>
            Export Excel
          </button>
          <button type="button" className="btn" onClick={() => void api.bridge.call.exportHistory('pdf')}>
            Export PDF
          </button>
        </div>
      </div>

      <div className="panel row">
        <label className="label" style={{ minWidth: 160 }}>
          Sort by
          <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="started_at">Started</option>
            <option value="duration_sec">Duration</option>
            <option value="phone_number">Number</option>
            <option value="contact_name">Name</option>
          </select>
        </label>
        <label className="label" style={{ minWidth: 120 }}>
          Direction
          <select
            className="select"
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </label>
        <div className="muted" style={{ marginInlineStart: 'auto' }}>
          {total} records
        </div>
      </div>

      <div className="panel">
        {loading ? (
          <div className="stack">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : items.length === 0 ? (
          <div className="empty">No call history</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Number</th>
                <th>Name</th>
                <th>Company</th>
                <th>Queue</th>
                <th>Direction</th>
                <th>Duration</th>
                <th>Disposition</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.startedAt).toLocaleString()}</td>
                  <td>{h.phoneNumber}</td>
                  <td>{h.contactName ?? '—'}</td>
                  <td>{h.company ?? '—'}</td>
                  <td>{h.queue ?? '—'}</td>
                  <td>{h.direction}</td>
                  <td>{formatDuration(h.durationSec)}</td>
                  <td>{h.disposition ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn"
            disabled={page <= 1}
            onClick={() => setStart(Math.max(0, start - count))}
          >
            Prev
          </button>
          <span className="badge">
            Page {page} / {pages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={page >= pages}
            onClick={() => setStart(start + count)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
