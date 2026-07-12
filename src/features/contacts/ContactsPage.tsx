import { useMemo, useState } from 'react'
import { Star, Phone, Trash2, Download, Upload } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { api } from '@/api/client/bridge'
import { contactSchema } from '@/api/validation/schemas'
import { useAppStore } from '@/stores/appStore'
import type { Contact } from '@shared/types'

export function ContactsPage() {
  const contacts = useAppStore((s) => s.contacts)
  const setContacts = useAppStore((s) => s.setContacts)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const showToast = useAppStore((s) => s.showToast)
  const [tab, setTab] = useState<'all' | 'favorites' | 'recent'>('all')
  const [editing, setEditing] = useState<Partial<Contact> | null>(null)

  const filtered = useMemo(() => {
    let list = contacts
    if (tab === 'favorites') list = list.filter((c) => c.isFavorite)
    const q = searchQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        c.numbers.some((n) => n.number.includes(q)) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [contacts, searchQuery, tab])

  async function refresh(): Promise<void> {
    setContacts(await api.bridge.contacts.list())
  }

  async function saveContact(): Promise<void> {
    if (!editing) return
    const parsed = contactSchema.safeParse({
      ...editing,
      numbers: editing.numbers?.length
        ? editing.numbers
        : [{ label: 'mobile', number: '', primary: true }]
    })
    if (!parsed.success) {
      showToast(parsed.error.errors[0]?.message ?? 'Invalid contact', 'error')
      return
    }
    const payload: Contact = {
      id: editing.id ?? uuid(),
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email || undefined,
      address: parsed.data.address,
      numbers: parsed.data.numbers,
      tags: parsed.data.tags,
      notes: parsed.data.notes,
      groupIds: parsed.data.groupIds,
      isFavorite: parsed.data.isFavorite,
      source: parsed.data.source,
      createdAt: editing.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    await api.bridge.contacts.save(payload)
    await refresh()
    setEditing(null)
    showToast('Contact saved', 'success')
  }

  return (
    <div className="stack">
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Contacts</h1>
          <p className="muted">Local contacts, favorites, tags, notes, and CSV import/export.</p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => void api.bridge.contacts.importCsv().then(refresh)}>
            <Upload size={16} /> Import CSV
          </button>
          <button type="button" className="btn" onClick={() => void api.bridge.contacts.exportCsv()}>
            <Download size={16} /> Export CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              setEditing({
                name: '',
                numbers: [{ label: 'mobile', number: '', primary: true }],
                tags: [],
                groupIds: [],
                isFavorite: false,
                source: 'local'
              })
            }
          >
            New Contact
          </button>
        </div>
      </div>

      <div className="row">
        {(['all', 'favorites', 'recent'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn${tab === t ? ' btn-primary' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {editing && (
        <div className="panel stack">
          <h2>{editing.id ? 'Edit Contact' : 'New Contact'}</h2>
          <div className="grid-2">
            <label className="label">
              Name
              <input className="input" value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label className="label">
              Company
              <input className="input" value={editing.company ?? ''} onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
            </label>
            <label className="label">
              Number
              <input
                className="input"
                value={editing.numbers?.[0]?.number ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    numbers: [{ label: 'mobile', number: e.target.value, primary: true }]
                  })
                }
              />
            </label>
            <label className="label">
              Email
              <input className="input" value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            </label>
            <label className="label">
              Address
              <input className="input" value={editing.address ?? ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
            </label>
            <label className="label">
              Tags (comma separated)
              <input
                className="input"
                value={(editing.tags ?? []).join(', ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  })
                }
              />
            </label>
          </div>
          <label className="label">
            Notes
            <textarea
              className="input"
              rows={3}
              value={editing.notes ?? ''}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            />
          </label>
          <label className="row" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(editing.isFavorite)}
              onChange={(e) => setEditing({ ...editing, isFavorite: e.target.checked })}
            />
            Favorite
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => void saveContact()}>
              Save
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty">No contacts found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>Company</th>
                <th>Number</th>
                <th>Tags</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const number = c.numbers.find((n) => n.primary)?.number ?? c.numbers[0]?.number
                return (
                  <tr key={c.id}>
                    <td>{c.isFavorite ? <Star size={14} color="var(--warning)" /> : null}</td>
                    <td>{c.name}</td>
                    <td>{c.company ?? '—'}</td>
                    <td>{number}</td>
                    <td>{c.tags.join(', ') || '—'}</td>
                    <td>
                      <div className="row">
                        <button
                          type="button"
                          className="btn btn-primary"
                          title="Click to call"
                          onClick={() => void api.bridge.call.originate(number)}
                          disabled={!number}
                        >
                          <Phone size={14} />
                        </button>
                        <button type="button" className="btn" onClick={() => setEditing(c)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() =>
                            void api.bridge.contacts.delete(c.id).then(async () => {
                              await refresh()
                              showToast('Deleted', 'info')
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
