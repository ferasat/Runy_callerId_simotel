import { useEffect, useState } from 'react'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { applyDocumentDirection, useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import type { AppSettings, LogEntry } from '@shared/types'

export function SettingsPage() {
  const { t } = useI18n()
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const showToast = useAppStore((s) => s.showToast)
  const [draft, setDraft] = useState<AppSettings | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [updater, setUpdater] = useState<unknown>(null)
  const form = draft ?? settings

  useEffect(() => {
    void api.bridge.logs.list({ limit: 100 }).then(setLogs)
    void api.bridge.updater.status().then(setUpdater)
  }, [])

  async function save(): Promise<void> {
    const next = await api.bridge.settings.set(form)
    setSettings(next)
    setDraft(null)
    document.documentElement.setAttribute(
      'data-theme',
      next.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : next.theme
    )
    applyDocumentDirection(next.language)
    document.title = next.language === 'fa' ? 'سیموتل سافت‌فون' : 'Simotel Softphone'
    showToast(t.settings.saved, 'success')
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t.settings.title}</CardTitle>
        <CardDescription>{t.settings.subtitle}</CardDescription>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle>{t.settings.general}</CardTitle>
          <Label>
            {t.settings.theme}
            <Select
              value={form.theme}
              onChange={(e) => setDraft({ ...form, theme: e.target.value as AppSettings['theme'] })}
            >
              <option value="light">{t.settings.themeLight}</option>
              <option value="dark">{t.settings.themeDark}</option>
              <option value="system">{t.settings.themeSystem}</option>
            </Select>
          </Label>
          <Label>
            {t.settings.language}
            <Select
              value={form.language}
              onChange={(e) =>
                setDraft({ ...form, language: e.target.value as AppSettings['language'] })
              }
            >
              <option value="fa">فارسی</option>
              <option value="en">English</option>
            </Select>
          </Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoStart}
              onChange={(e) => setDraft({ ...form, autoStart: e.target.checked })}
            />
            {t.settings.autoStart}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.startWithWindows}
              onChange={(e) => setDraft({ ...form, startWithWindows: e.target.checked })}
            />
            {t.settings.startWithWindows}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.minimizeToTray}
              onChange={(e) => setDraft({ ...form, minimizeToTray: e.target.checked })}
            />
            {t.settings.minimizeToTray}
          </label>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>{t.settings.notificationsAudio}</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.desktopNotifications}
              onChange={(e) => setDraft({ ...form, desktopNotifications: e.target.checked })}
            />
            {t.settings.desktopNotifications}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.soundNotifications}
              onChange={(e) => setDraft({ ...form, soundNotifications: e.target.checked })}
            />
            {t.settings.soundNotifications}
          </label>
          <Label>
            {t.settings.customRingtone}
            <Input
              dir="ltr"
              className="text-left"
              value={form.customRingtonePath ?? ''}
              onChange={(e) => setDraft({ ...form, customRingtonePath: e.target.value })}
            />
          </Label>
          <Label>
            {t.settings.originateContext}
            <Input
              dir="ltr"
              className="text-left"
              value={form.originateContext}
              onChange={(e) => setDraft({ ...form, originateContext: e.target.value })}
            />
          </Label>
          <Label>
            {t.settings.originateTimeout}
            <Input
              type="number"
              value={form.originateTimeout}
              onChange={(e) => setDraft({ ...form, originateTimeout: Number(e.target.value) })}
            />
          </Label>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardTitle>{t.settings.advanced}</CardTitle>
          <Label>
            {t.settings.logLevel}
            <Select
              value={form.logLevel}
              onChange={(e) =>
                setDraft({ ...form, logLevel: e.target.value as AppSettings['logLevel'] })
              }
            >
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </Select>
          </Label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoCheckUpdates}
              onChange={(e) => setDraft({ ...form, autoCheckUpdates: e.target.checked })}
            />
            {t.settings.autoCheckUpdates}
          </label>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void save()}>
              {t.settings.saveSettings}
            </Button>
            <Button onClick={() => void api.bridge.backup.create()}>{t.settings.backup}</Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>{t.settings.updates}</CardTitle>
          <pre className="whitespace-pre-wrap text-xs text-[var(--color-muted)]" dir="ltr">
            {JSON.stringify(updater, null, 2)}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void api.bridge.updater.check().then(setUpdater)}>
              {t.settings.checkUpdates}
            </Button>
            <Button onClick={() => void api.bridge.updater.download()}>
              {t.settings.download}
            </Button>
            <Button variant="primary" onClick={() => void api.bridge.updater.install()}>
              {t.settings.restartInstall}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{t.settings.logs}</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => void api.bridge.logs.export()}>{t.settings.export}</Button>
            <Button
              variant="danger"
              onClick={() =>
                void api.bridge.logs.clear().then(async () => {
                  setLogs(await api.bridge.logs.list({ limit: 100 }))
                  showToast(t.settings.logsCleared, 'info')
                })
              }
            >
              {t.settings.clear}
            </Button>
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="py-8 text-center text-[var(--color-muted)]">{t.settings.noLogs}</div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-xs text-[var(--color-muted)]">
                <th className="border-b border-[var(--color-border)] p-2">{t.settings.time}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.settings.category}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.settings.level}</th>
                <th className="border-b border-[var(--color-border)] p-2">{t.settings.message}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="border-b border-[var(--color-border)] p-2">
                    {new Date(l.createdAt).toLocaleString('fa-IR')}
                  </td>
                  <td className="border-b border-[var(--color-border)] p-2">{l.category}</td>
                  <td className="border-b border-[var(--color-border)] p-2">{l.level}</td>
                  <td className="border-b border-[var(--color-border)] p-2">{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
