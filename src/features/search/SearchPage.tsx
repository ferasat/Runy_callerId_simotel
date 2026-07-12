import { useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import type { CallHistoryEntry, Contact, QueueInfo } from '@shared/types'

type SearchTab = 'all' | 'number' | 'name' | 'company' | 'extension' | 'queue' | 'agent' | 'history' | 'contacts'

export function SearchPage() {
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const contacts = useAppStore((s) => s.contacts)
  const [tab, setTab] = useState<SearchTab>('all')
  const [history, setHistory] = useState<CallHistoryEntry[]>([])
  const [queues, setQueues] = useState<QueueInfo[]>([])

  useEffect(() => {
    void api.bridge.call.history({ start: 0, count: 100, search: searchQuery }).then((r) => setHistory(r.items ?? []))
    void api.bridge.queues.list().then((q) => setQueues(q as QueueInfo[])).catch(() => setQueues([]))
  }, [searchQuery])

  const q = searchQuery.trim().toLowerCase()

  const contactHits = useMemo(() => {
    if (!q) return contacts.slice(0, 20)
    return contacts.filter((c) => matchContact(c, q, tab)).slice(0, 50)
  }, [contacts, q, tab])

  const historyHits = useMemo(() => {
    if (tab === 'contacts') return []
    return history.filter((h) => matchHistory(h, q, tab)).slice(0, 50)
  }, [history, q, tab])

  const queueHits = useMemo(() => {
    if (tab !== 'all' && tab !== 'queue') return []
    if (!q) return queues.slice(0, 20)
    return queues.filter((item) => item.name.toLowerCase().includes(q) || item.number.includes(q))
  }, [queues, q, tab])

  return (
    <div className="stack">
      <div className="panel">
        <h1>Search</h1>
        <p className="muted">Instant search across numbers, names, companies, extensions, queues, agents, history, and contacts.</p>
        <input
          className="input"
          style={{ marginTop: 12 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type to search…"
          autoFocus
        />
        <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {(
            [
              'all',
              'number',
              'name',
              'company',
              'extension',
              'queue',
              'agent',
              'history',
              'contacts'
            ] as SearchTab[]
          ).map((t) => (
            <button key={t} type="button" className={`btn${tab === t ? ' btn-primary' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {(tab === 'all' || tab === 'contacts' || tab === 'name' || tab === 'company' || tab === 'number') && (
        <div className="panel">
          <h2>Contacts</h2>
          {contactHits.length === 0 ? (
            <div className="empty">No contact matches</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Number</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contactHits.map((c) => {
                  const number = c.numbers[0]?.number
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.company ?? '—'}</td>
                      <td>{number}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={!number}
                          onClick={() => void api.bridge.call.originate(number!)}
                        >
                          Call
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(tab === 'all' || tab === 'history' || tab === 'agent' || tab === 'extension' || tab === 'number') && (
        <div className="panel">
          <h2>History</h2>
          {historyHits.length === 0 ? (
            <div className="empty">No history matches</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Number</th>
                  <th>Name</th>
                  <th>Agent</th>
                  <th>Queue</th>
                </tr>
              </thead>
              <tbody>
                {historyHits.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.startedAt).toLocaleString()}</td>
                    <td>{h.phoneNumber}</td>
                    <td>{h.contactName ?? '—'}</td>
                    <td>{h.agent ?? h.extension ?? '—'}</td>
                    <td>{h.queue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(tab === 'all' || tab === 'queue') && (
        <div className="panel">
          <h2>Queues</h2>
          {queueHits.length === 0 ? (
            <div className="empty">No queue matches</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Number</th>
                  <th>Waiting</th>
                </tr>
              </thead>
              <tbody>
                {queueHits.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.number}</td>
                    <td>{item.waitingCallers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function matchContact(c: Contact, q: string, tab: SearchTab): boolean {
  if (tab === 'name') return c.name.toLowerCase().includes(q)
  if (tab === 'company') return (c.company ?? '').toLowerCase().includes(q)
  if (tab === 'number') return c.numbers.some((n) => n.number.includes(q))
  return (
    c.name.toLowerCase().includes(q) ||
    (c.company ?? '').toLowerCase().includes(q) ||
    c.numbers.some((n) => n.number.includes(q)) ||
    c.tags.some((t) => t.toLowerCase().includes(q))
  )
}

function matchHistory(h: CallHistoryEntry, q: string, tab: SearchTab): boolean {
  if (!q) return true
  if (tab === 'number') return h.phoneNumber.includes(q)
  if (tab === 'extension') return (h.extension ?? '').includes(q)
  if (tab === 'agent') return (h.agent ?? '').toLowerCase().includes(q) || (h.extension ?? '').includes(q)
  if (tab === 'name') return (h.contactName ?? '').toLowerCase().includes(q)
  return (
    h.phoneNumber.includes(q) ||
    (h.contactName ?? '').toLowerCase().includes(q) ||
    (h.company ?? '').toLowerCase().includes(q) ||
    (h.queue ?? '').toLowerCase().includes(q) ||
    (h.agent ?? '').toLowerCase().includes(q) ||
    (h.extension ?? '').includes(q)
  )
}
