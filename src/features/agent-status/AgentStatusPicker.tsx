import { useAppStore } from '@/stores/appStore'
import { api } from '@/api/client/bridge'
import { useI18n } from '@/i18n'
import type { AgentStatus } from '@shared/types'

export function AgentStatusPicker() {
  const { t } = useI18n()
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const showToast = useAppStore((s) => s.showToast)
  const session = useAppStore((s) => s.session)

  const statuses: { value: AgentStatus; label: string }[] = [
    { value: 'ready', label: t.agentStatus.ready },
    { value: 'busy', label: t.agentStatus.busy },
    { value: 'break', label: t.agentStatus.break },
    { value: 'lunch', label: t.agentStatus.lunch },
    { value: 'meeting', label: t.agentStatus.meeting },
    { value: 'after_call_work', label: t.agentStatus.after_call_work },
    { value: 'offline', label: t.agentStatus.offline },
    { value: 'custom', label: t.agentStatus.custom }
  ]

  if (!session) return null

  return (
    <label className="flex flex-col gap-1.5 text-sm text-[var(--color-muted)]">
      {t.agentStatus.title}
      <select
        className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none"
        value={user?.status ?? 'offline'}
        onChange={async (e) => {
          try {
            const status = e.target.value as AgentStatus
            const updated = await api.bridge.agent.setStatus(status)
            setUser(updated)
            showToast(
              `${t.common.status}: ${statuses.find((s) => s.value === status)?.label ?? status}`,
              'success'
            )
          } catch (err) {
            showToast(err instanceof Error ? err.message : t.common.empty, 'error')
          }
        }}
      >
        {statuses.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  )
}
