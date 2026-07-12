import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select, Badge } from '@/components/ui/input'
import { useState } from 'react'
import type { CallHistoryEntry } from '@shared/types'

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function HistoryPage() {
  const { t, lang } = useI18n()
  const searchQuery = useAppStore((s) => s.searchQuery)
  const showToast = useAppStore((s) => s.showToast)
  const [start, setStart] = useState(0)
  const [sortBy, setSortBy] = useState('started_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const count = 25

  const { data, isLoading } = useQuery({
    queryKey: ['call-history', start, count, searchQuery, sortBy, sortDir],
    queryFn: async () => {
      try {
        return await api.bridge.call.history({
          start,
          count,
          search: searchQuery,
          sortBy,
          sortDir
        })
      } catch (err) {
        showToast(err instanceof Error ? err.message : t.history.loadFailed, 'error')
        return { items: [], total: 0 }
      }
    }
  })

  const items: CallHistoryEntry[] = data?.items ?? []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / count))
  const page = Math.floor(start / count) + 1
  const locale = lang === 'fa' ? 'fa-IR' : undefined

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{t.history.title}</CardTitle>
          <CardDescription>{t.history.subtitle}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void api.bridge.call.exportHistory('csv')}>
            {t.history.exportCsv}
          </Button>
          <Button onClick={() => void api.bridge.call.exportHistory('excel')}>
            {t.history.exportExcel}
          </Button>
          <Button onClick={() => void api.bridge.call.exportHistory('pdf')}>
            {t.history.exportPdf}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-wrap items-end gap-3">
        <Label className="min-w-40">
          {t.history.sortBy}
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="started_at">{t.history.started}</option>
            <option value="duration_sec">{t.history.duration}</option>
            <option value="phone_number">{t.common.number}</option>
            <option value="contact_name">{t.common.name}</option>
          </Select>
        </Label>
        <Label className="min-w-28">
          {t.history.direction}
          <Select value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}>
            <option value="desc">{t.history.desc}</option>
            <option value="asc">{t.history.asc}</option>
          </Select>
        </Label>
        <div className="ms-auto text-sm text-[var(--color-muted)]">
          {total} {t.history.records}
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-muted)]">{t.history.none}</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="border-b border-[var(--color-border)] p-2">{t.history.started}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.number}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.name}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.company}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.history.queue}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.history.direction}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.history.duration}</th>
                <th className="border-b border-[var(--color-border)] p-2">
                  {t.history.disposition}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
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
                  <td className="border-b border-[var(--color-border)] p-2">{h.company ?? '—'}</td>
                  <td className="border-b border-[var(--color-border)] p-2">{h.queue ?? '—'}</td>
                  <td className="border-b border-[var(--color-border)] p-2">{h.direction}</td>
                  <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                    {formatDuration(h.durationSec)}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-2">
                    {h.disposition ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button disabled={page <= 1} onClick={() => setStart(Math.max(0, start - count))}>
            {t.common.prev}
          </Button>
          <Badge>
            {t.common.page} {page} / {pages}
          </Badge>
          <Button disabled={page >= pages} onClick={() => setStart(start + count)}>
            {t.common.next}
          </Button>
        </div>
      </Card>
    </div>
  )
}
