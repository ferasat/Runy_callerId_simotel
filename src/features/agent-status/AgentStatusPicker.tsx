import { useAppStore } from '@/stores/appStore'
import { api } from '@/api/client/bridge'
import type { AgentStatus } from '@shared/types'

const statuses: { value: AgentStatus; label: string }[] = [
  { value: 'ready', label: 'Ready' },
  { value: 'busy', label: 'Busy' },
  { value: 'break', label: 'Break' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'after_call_work', label: 'After Call Work' },
  { value: 'offline', label: 'Offline' },
  { value: 'custom', label: 'Custom' }
]

export function AgentStatusPicker() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const showToast = useAppStore((s) => s.showToast)
  const session = useAppStore((s) => s.session)

  if (!session) return null

  return (
    <label className="label">
      Agent status
      <select
        className="select"
        value={user?.status ?? 'offline'}
        onChange={async (e) => {
          try {
            const status = e.target.value as AgentStatus
            const updated = await api.bridge.agent.setStatus(status)
            setUser(updated)
            showToast(`Status: ${status}`, 'success')
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Status update failed', 'error')
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
