import { useEffect, useRef, useState } from 'react'
import { Download, Pause, Play, Trash2 } from 'lucide-react'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import type { RecordingMeta } from '@shared/types'

function WaveformPreview({ active }: { active: boolean }) {
  return (
    <div className="flex h-7 items-end gap-0.5">
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: active ? 8 + ((i * 7) % 18) : 6 + (i % 5) * 2,
            borderRadius: 2,
            background: active ? 'var(--color-accent)' : 'var(--color-border)',
            transition: 'height 0.2s ease'
          }}
        />
      ))}
    </div>
  )
}

export function RecordingsPage() {
  const { t, lang } = useI18n()
  const showToast = useAppStore((s) => s.showToast)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const [items, setItems] = useState<RecordingMeta[]>([])
  const [playing, setPlaying] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    void api.bridge.recordings
      .list({ count: 100 })
      .then((list) => setItems(list as RecordingMeta[]))
      .catch((e) => showToast(e.message, 'error'))
  }, [showToast])

  const filtered = items.filter((r) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return r.file.toLowerCase().includes(q) || (r.phoneNumber ?? '').includes(q)
  })

  async function play(file: string): Promise<void> {
    try {
      await api.bridge.recordings.download(file)
      setPlaying(file)
      setPaused(false)
      showToast(t.recordings.downloadRequested, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.recordings.playbackFailed, 'error')
    }
  }

  const locale = lang === 'fa' ? 'fa-IR' : undefined

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t.recordings.title}</CardTitle>
        <CardDescription>{t.recordings.subtitle}</CardDescription>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-[var(--color-muted)]">{t.recordings.none}</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="border-b border-[var(--color-border)] p-2">{t.recordings.file}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.number}</th>
                <th className="border-b border-[var(--color-border)] p-2">
                  {t.recordings.duration}
                </th>
                <th className="border-b border-[var(--color-border)] p-2">
                  {t.recordings.created}
                </th>
                <th className="border-b border-[var(--color-border)] p-2">
                  {t.recordings.waveform}
                </th>
                <th className="border-b border-[var(--color-border)] p-2">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                    {r.file}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-2" dir="ltr">
                    {r.phoneNumber ?? '—'}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-2">
                    {r.durationSec != null ? `${r.durationSec}ث` : '—'}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-2">
                    {new Date(r.createdAt).toLocaleString(locale)}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-2">
                    <WaveformPreview active={playing === r.file && !paused} />
                  </td>
                  <td className="border-b border-[var(--color-border)] p-2">
                    <div className="flex gap-2">
                      <Button size="icon" onClick={() => void play(r.file)}>
                        <Play size={14} />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => {
                          setPaused(true)
                          audioRef.current?.pause()
                        }}
                      >
                        <Pause size={14} />
                      </Button>
                      <Button size="icon" onClick={() => void play(r.file)}>
                        <Download size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        size="icon"
                        onClick={() => {
                          setItems((prev) => prev.filter((x) => x.id !== r.id))
                          showToast(t.recordings.removed, 'info')
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <audio ref={audioRef} hidden />
    </div>
  )
}
