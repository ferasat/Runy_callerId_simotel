import { useMemo, useState } from 'react'
import { Star, Phone, Trash2, Download, Upload } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { api } from '@/api/client/bridge'
import { contactSchema } from '@/api/validation/schemas'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import type { Contact } from '@shared/types'

export function ContactsPage() {
  const { t } = useI18n()
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
        c.tags.some((tag) => tag.toLowerCase().includes(q))
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
      showToast(parsed.error.errors[0]?.message ?? t.contacts.invalid, 'error')
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
    showToast(t.contacts.saved, 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{t.contacts.title}</CardTitle>
          <CardDescription>{t.contacts.subtitle}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void api.bridge.contacts.importCsv().then(refresh)}>
            <Upload size={16} /> {t.contacts.importCsv}
          </Button>
          <Button onClick={() => void api.bridge.contacts.exportCsv()}>
            <Download size={16} /> {t.contacts.exportCsv}
          </Button>
          <Button
            variant="primary"
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
            {t.contacts.newContact}
          </Button>
        </div>
      </Card>

      <div className="flex gap-2">
        {(
          [
            ['all', t.common.all],
            ['favorites', t.common.favorites],
            ['recent', t.common.recent]
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? 'primary' : 'default'}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {editing && (
        <Card className="flex flex-col gap-3">
          <CardTitle>{editing.id ? t.contacts.editContact : t.contacts.newContact}</CardTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <Label>
              {t.common.name}
              <Input
                value={editing.name ?? ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Label>
            <Label>
              {t.common.company}
              <Input
                value={editing.company ?? ''}
                onChange={(e) => setEditing({ ...editing, company: e.target.value })}
              />
            </Label>
            <Label>
              {t.common.number}
              <Input
                dir="ltr"
                className="text-left"
                value={editing.numbers?.[0]?.number ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    numbers: [{ label: 'mobile', number: e.target.value, primary: true }]
                  })
                }
              />
            </Label>
            <Label>
              {t.common.email}
              <Input
                dir="ltr"
                className="text-left"
                value={editing.email ?? ''}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
            </Label>
            <Label>
              {t.common.address}
              <Input
                value={editing.address ?? ''}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
              />
            </Label>
            <Label>
              {t.contacts.tagsHint}
              <Input
                value={(editing.tags ?? []).join('، ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    tags: e.target.value
                      .split(/[,،]/)
                      .map((x) => x.trim())
                      .filter(Boolean)
                  })
                }
              />
            </Label>
          </div>
          <Label>
            {t.common.notes}
            <textarea
              className="min-h-20 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none"
              value={editing.notes ?? ''}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            />
          </Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(editing.isFavorite)}
              onChange={(e) => setEditing({ ...editing, isFavorite: e.target.checked })}
            />
            {t.contacts.favorite}
          </label>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void saveContact()}>
              {t.common.save}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t.common.cancel}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-muted)]">{t.contacts.noContacts}</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="border-b border-[var(--color-border)] p-2" />
                <th className="border-b border-[var(--color-border)] p-2">{t.common.name}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.company}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.number}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.tags}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const number = c.numbers.find((n) => n.primary)?.number ?? c.numbers[0]?.number
                return (
                  <tr key={c.id}>
                    <td className="border-b border-[var(--color-border)] p-2">
                      {c.isFavorite ? <Star size={14} color="var(--color-warning)" /> : null}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2">{c.name}</td>
                    <td className="border-b border-[var(--color-border)] p-2">
                      {c.company ?? '—'}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                      {number}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2">
                      {c.tags.join('، ') || '—'}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2">
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="icon"
                          disabled={!number}
                          onClick={() => void api.bridge.call.originate(number!)}
                        >
                          <Phone size={14} />
                        </Button>
                        <Button onClick={() => setEditing(c)}>{t.common.edit}</Button>
                        <Button
                          variant="danger"
                          size="icon"
                          onClick={() =>
                            void api.bridge.contacts.delete(c.id).then(async () => {
                              await refresh()
                              showToast(t.contacts.deleted, 'info')
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
