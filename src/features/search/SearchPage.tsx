import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { CallHistoryEntry, Contact, QueueInfo } from '@shared/types'

type SearchTab =
  'all' | 'number' | 'name' | 'company' | 'extension' | 'queue' | 'agent' | 'history' | 'contacts'

export function SearchPage() {
  const { t, lang } = useI18n()
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const contacts = useAppStore((s) => s.contacts)
  const [tab, setTab] = useState<SearchTab>('all')

  const { data: history = [] } = useQuery({
    queryKey: ['search-history', searchQuery],
    queryFn: async () => {
      const r = await api.bridge.call.history({ start: 0, count: 100, search: searchQuery })
      return (r.items ?? []) as CallHistoryEntry[]
    }
  })

  const { data: queues = [] } = useQuery({
    queryKey: ['search-queues'],
    queryFn: async () => {
      try {
        return (await api.bridge.queues.list()) as QueueInfo[]
      } catch {
        return [] as QueueInfo[]
      }
    }
  })

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

  const tabs: SearchTab[] = [
    'all',
    'number',
    'name',
    'company',
    'extension',
    'queue',
    'agent',
    'history',
    'contacts'
  ]
  const locale = lang === 'fa' ? 'fa-IR' : undefined

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t.search.title}</CardTitle>
        <CardDescription>{t.search.subtitle}</CardDescription>
        <Input
          className="mt-3"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.search.placeholder}
          autoFocus
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((key) => (
            <Button
              key={key}
              variant={tab === key ? 'primary' : 'default'}
              onClick={() => setTab(key)}
            >
              {t.search.tabs[key]}
            </Button>
          ))}
        </div>
      </Card>

      {(tab === 'all' ||
        tab === 'contacts' ||
        tab === 'name' ||
        tab === 'company' ||
        tab === 'number') && (
        <Card>
          <CardTitle>{t.nav.contacts}</CardTitle>
          {contactHits.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-muted)]">{t.search.noContacts}</div>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-muted)]">
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.name}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.company}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.number}</th>
                  <th className="border-b border-[var(--color-border)] p-2" />
                </tr>
              </thead>
              <tbody>
                {contactHits.map((c) => {
                  const number = c.numbers[0]?.number
                  return (
                    <tr key={c.id}>
                      <td className="border-b border-[var(--color-border)] p-2">{c.name}</td>
                      <td className="border-b border-[var(--color-border)] p-2">
                        {c.company ?? '—'}
                      </td>
                      <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                        {number}
                      </td>
                      <td className="border-b border-[var(--color-border)] p-2">
                        <Button
                          variant="primary"
                          disabled={!number}
                          onClick={() => void api.bridge.call.originate(number!)}
                        >
                          {t.common.call}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {(tab === 'all' ||
        tab === 'history' ||
        tab === 'agent' ||
        tab === 'extension' ||
        tab === 'number') && (
        <Card>
          <CardTitle>{t.nav.history}</CardTitle>
          {historyHits.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-muted)]">{t.search.noHistory}</div>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-muted)]">
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.when}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.number}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.name}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.history.agent}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.history.queue}</th>
                </tr>
              </thead>
              <tbody>
                {historyHits.map((h) => (
                  <tr key={h.id}>
                    <td className="border-b border-[var(--color-border)] p-2">
                      {new Date(h.startedAt).toLocaleString(locale)}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                      {h.phoneNumber}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2">
                      {h.contactName ?? '—'}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2">
                      {h.agent ?? h.extension ?? '—'}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2">{h.queue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {(tab === 'all' || tab === 'queue') && (
        <Card>
          <CardTitle>{t.nav.queues}</CardTitle>
          {queueHits.length === 0 ? (
            <div className="py-8 text-center text-[var(--color-muted)]">{t.search.noQueues}</div>
          ) : (
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-muted)]">
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.name}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.common.number}</th>
                  <th className="border-b border-[var(--color-border)] p-2">{t.search.waiting}</th>
                </tr>
              </thead>
              <tbody>
                {queueHits.map((item) => (
                  <tr key={item.id}>
                    <td className="border-b border-[var(--color-border)] p-2">{item.name}</td>
                    <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                      {item.number}
                    </td>
                    <td className="border-b border-[var(--color-border)] p-2">
                      {item.waitingCallers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
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
    c.tags.some((tag) => tag.toLowerCase().includes(q))
  )
}

function matchHistory(h: CallHistoryEntry, q: string, tab: SearchTab): boolean {
  if (!q) return true
  if (tab === 'number') return h.phoneNumber.includes(q)
  if (tab === 'extension') return (h.extension ?? '').includes(q)
  if (tab === 'agent')
    return (h.agent ?? '').toLowerCase().includes(q) || (h.extension ?? '').includes(q)
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
