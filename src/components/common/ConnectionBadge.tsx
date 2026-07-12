import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import type { ConnectionState } from '@shared/types'

export function ConnectionBadge() {
  const { t } = useI18n()
  const connection = useAppStore((s) => s.connection)
  const labels: Record<ConnectionState, string> = {
    connected: t.connection.connected,
    connecting: t.connection.connecting,
    reconnecting: t.connection.reconnecting,
    disconnected: t.connection.disconnected,
    offline: t.connection.offline
  }
  const cls =
    connection.state === 'connected'
      ? 'ok'
      : connection.state === 'reconnecting' || connection.state === 'connecting'
        ? 'warn'
        : 'err'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
        cls === 'ok'
          ? 'bg-[rgb(45_212_160/0.15)] text-[var(--color-accent)]'
          : cls === 'warn'
            ? 'bg-[rgb(251_191_36/0.15)] text-[var(--color-warning)]'
            : 'bg-[rgb(248_113_113/0.15)] text-[var(--color-danger)]'
      }`}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'currentColor',
          display: 'inline-block'
        }}
      />
      {labels[connection.state]}
      {connection.protocol ? ` · ${connection.protocol}` : ''}
    </span>
  )
}
