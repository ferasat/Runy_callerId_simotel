import { useAppStore } from '@/stores/appStore'

export function ConnectionBadge() {
  const connection = useAppStore((s) => s.connection)
  const cls =
    connection.state === 'connected'
      ? 'ok'
      : connection.state === 'reconnecting' || connection.state === 'connecting'
        ? 'warn'
        : 'err'
  return (
    <span className={`badge ${cls}`}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'currentColor',
          display: 'inline-block'
        }}
      />
      {connection.state}
      {connection.protocol ? ` · ${connection.protocol}` : ''}
    </span>
  )
}
