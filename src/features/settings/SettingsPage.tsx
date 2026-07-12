import { useEffect, useState } from 'react'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import type { AppSettings, LogEntry } from '@shared/types'

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const showToast = useAppStore((s) => s.showToast)
  const [draft, setDraft] = useState<AppSettings>(settings)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [updater, setUpdater] = useState<unknown>(null)

  useEffect(() => setDraft(settings), [settings])
  useEffect(() => {
    void api.bridge.logs.list({ limit: 100 }).then(setLogs)
    void api.bridge.updater.status().then(setUpdater)
  }, [])

  async function save(): Promise<void> {
    const next = await api.bridge.settings.set(draft)
    setSettings(next)
    document.documentElement.setAttribute(
      'data-theme',
      next.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : next.theme
    )
    showToast('Settings saved', 'success')
  }

  return (
    <div className="stack">
      <div className="panel">
        <h1>Settings</h1>
        <p className="muted">General, theme, notifications, audio, security, logs, backup, and updates.</p>
      </div>

      <div className="grid-2">
        <div className="panel stack">
          <h2>General</h2>
          <label className="label">
            Theme
            <select
              className="select"
              value={draft.theme}
              onChange={(e) => setDraft({ ...draft, theme: e.target.value as AppSettings['theme'] })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <label className="label">
            Language
            <select
              className="select"
              value={draft.language}
              onChange={(e) => setDraft({ ...draft, language: e.target.value as AppSettings['language'] })}
            >
              <option value="en">English</option>
              <option value="fa">فارسی</option>
            </select>
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={draft.autoStart}
              onChange={(e) => setDraft({ ...draft, autoStart: e.target.checked })}
            />
            Auto start
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={draft.startWithWindows}
              onChange={(e) => setDraft({ ...draft, startWithWindows: e.target.checked })}
            />
            Start with Windows
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={draft.minimizeToTray}
              onChange={(e) => setDraft({ ...draft, minimizeToTray: e.target.checked })}
            />
            Minimize to tray
          </label>
        </div>

        <div className="panel stack">
          <h2>Notifications & Audio</h2>
          <label className="row">
            <input
              type="checkbox"
              checked={draft.desktopNotifications}
              onChange={(e) => setDraft({ ...draft, desktopNotifications: e.target.checked })}
            />
            Desktop notifications
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={draft.soundNotifications}
              onChange={(e) => setDraft({ ...draft, soundNotifications: e.target.checked })}
            />
            Sound notifications
          </label>
          <label className="label">
            Custom ringtone path
            <input
              className="input"
              value={draft.customRingtonePath ?? ''}
              onChange={(e) => setDraft({ ...draft, customRingtonePath: e.target.value })}
            />
          </label>
          <label className="label">
            Originate context
            <input
              className="input"
              value={draft.originateContext}
              onChange={(e) => setDraft({ ...draft, originateContext: e.target.value })}
            />
          </label>
          <label className="label">
            Originate timeout (sec)
            <input
              className="input"
              type="number"
              value={draft.originateTimeout}
              onChange={(e) => setDraft({ ...draft, originateTimeout: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel stack">
          <h2>Advanced</h2>
          <label className="label">
            Log level
            <select
              className="select"
              value={draft.logLevel}
              onChange={(e) => setDraft({ ...draft, logLevel: e.target.value as AppSettings['logLevel'] })}
            >
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={draft.autoCheckUpdates}
              onChange={(e) => setDraft({ ...draft, autoCheckUpdates: e.target.checked })}
            />
            Auto-check updates
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => void save()}>
              Save Settings
            </button>
            <button type="button" className="btn" onClick={() => void api.bridge.backup.create()}>
              Backup
            </button>
          </div>
        </div>

        <div className="panel stack">
          <h2>Updates</h2>
          <pre className="muted" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(updater, null, 2)}
          </pre>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => void api.bridge.updater.check().then(setUpdater)}
            >
              Check updates
            </button>
            <button type="button" className="btn" onClick={() => void api.bridge.updater.download()}>
              Download
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void api.bridge.updater.install()}>
              Restart & Install
            </button>
          </div>
        </div>
      </div>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Logs</h2>
          <div className="row">
            <button type="button" className="btn" onClick={() => void api.bridge.logs.export()}>
              Export
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() =>
                void api.bridge.logs.clear().then(async () => {
                  setLogs(await api.bridge.logs.list({ limit: 100 }))
                  showToast('Logs cleared', 'info')
                })
              }
            >
              Clear
            </button>
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="empty">No logs</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Category</th>
                <th>Level</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                  <td>{l.category}</td>
                  <td>{l.level}</td>
                  <td>{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
