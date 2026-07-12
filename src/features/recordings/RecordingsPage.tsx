import { useEffect, useRef, useState } from 'react'
import { Download, Pause, Play, Trash2 } from 'lucide-react'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import type { RecordingMeta } from '@shared/types'

export function RecordingsPage() {
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
    return (
      r.file.toLowerCase().includes(q) ||
      (r.phoneNumber ?? '').includes(q)
    )
  })

  async function play(file: string): Promise<void> {
    try {
      // Prefer local playback URL if bridge returns blob/base64 later; for now notify + mark playing.
      await api.bridge.recordings.download(file)
      setPlaying(file)
      setPaused(false)
      showToast('Recording download requested', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Playback failed', 'error')
    }
  }

  return (
    <div className="stack">
      <div className="panel">
        <h1>Recordings</h1>
        <p className="muted">
          Play, pause, download, and search Simotel call recordings when available on the PBX.
        </p>
      </div>

      <div className="panel">
        {filtered.length === 0 ? (
          <div className="empty">No recordings found</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Number</th>
                <th>Duration</th>
                <th>Created</th>
                <th>Waveform</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.file}</td>
                  <td>{r.phoneNumber ?? '—'}</td>
                  <td>{r.durationSec != null ? `${r.durationSec}s` : '—'}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>
                    <WaveformPreview active={playing === r.file && !paused} />
                  </td>
                  <td>
                    <div className="row">
                      <button type="button" className="btn" onClick={() => void play(r.file)}>
                        <Play size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setPaused(true)
                          audioRef.current?.pause()
                        }}
                      >
                        <Pause size={14} />
                      </button>
                      <button type="button" className="btn" onClick={() => void play(r.file)}>
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => {
                          setItems((prev) => prev.filter((x) => x.id !== r.id))
                          showToast('Removed from local list', 'info')
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <audio ref={audioRef} hidden />
    </div>
  )
}

function WaveformPreview({ active }: { active: boolean }) {
  return (
    <div className="row" style={{ gap: 2, height: 28, alignItems: 'flex-end' }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: active ? 8 + ((i * 7) % 18) : 6 + (i % 5) * 2,
            borderRadius: 2,
            background: active ? 'var(--accent)' : 'var(--border)',
            transition: 'height 0.2s ease'
          }}
        />
      ))}
    </div>
  )
}
