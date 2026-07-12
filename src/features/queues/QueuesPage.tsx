import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client/bridge'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/input'
import type { QueueInfo } from '@shared/types'

export function QueuesPage() {
  const { t } = useI18n()
  const setQueues = useAppStore((s) => s.setQueues)
  const showToast = useAppStore((s) => s.showToast)

  const {
    data: queues = [],
    isLoading,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => {
      const list = (await api.bridge.queues.list()) as QueueInfo[]
      setQueues(list)
      return list
    },
    refetchInterval: 8000
  })

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between gap-3">
        <div>
          <CardTitle>{t.queues.title}</CardTitle>
          <CardDescription>{t.queues.subtitle}</CardDescription>
        </div>
        <Button
          onClick={() =>
            void refetch().catch((err) =>
              showToast(err instanceof Error ? err.message : t.queues.loadFailed, 'error')
            )
          }
        >
          {isFetching ? t.common.loading : t.common.refresh}
        </Button>
      </Card>

      {isLoading && queues.length === 0 && (
        <Card className="flex flex-col gap-3">
          <div className="skeleton h-6" />
          <div className="skeleton h-6" />
          <div className="skeleton h-6" />
        </Card>
      )}

      {!isLoading && queues.length === 0 && (
        <Card className="py-12 text-center text-[var(--color-muted)]">{t.queues.none}</Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {queues.map((q) => (
          <Card key={q.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>{q.name}</CardTitle>
                <div className="text-sm text-[var(--color-muted)]" dir="ltr">
                  #{q.number}
                </div>
              </div>
              <Badge tone={q.waitingCallers > 0 ? 'warn' : 'ok'}>
                {q.waitingCallers} {t.queues.waiting}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <div className="text-xs text-[var(--color-muted)]">{t.queues.longestWait}</div>
                <strong>{q.longestWaitSec}ث</strong>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <div className="text-xs text-[var(--color-muted)]">{t.queues.answered}</div>
                <strong>{q.answered}</strong>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
                <div className="text-xs text-[var(--color-muted)]">{t.queues.abandoned}</div>
                <strong>{q.abandoned}</strong>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm text-[var(--color-muted)]">
                {t.queues.members} ({q.members?.length ?? 0})
              </div>
              {(q.members ?? []).length === 0 ? (
                <div className="text-sm text-[var(--color-muted)]">{t.queues.noMembers}</div>
              ) : (
                <ul className="m-0 list-disc pe-5">
                  {q.members.map((m, i) => (
                    <li key={`${m.agent}-${i}`}>
                      {m.name ?? m.agent} · {m.paused ? t.queues.pause : m.status}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() =>
                  void api.bridge.queues
                    .join(q.number)
                    .then(() => {
                      showToast(`${t.queues.joined}: ${q.name}`, 'success')
                      return refetch()
                    })
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                {t.queues.join}
              </Button>
              <Button
                onClick={() =>
                  void api.bridge.queues
                    .leave(q.number)
                    .then(() => {
                      showToast(`${t.queues.left}: ${q.name}`, 'info')
                      return refetch()
                    })
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                {t.queues.leave}
              </Button>
              <Button
                onClick={() =>
                  void api.bridge.queues
                    .pause(q.number)
                    .then(() => showToast(t.queues.paused, 'info'))
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                {t.queues.pause}
              </Button>
              <Button
                onClick={() =>
                  void api.bridge.queues
                    .resume(q.number)
                    .then(() => showToast(t.queues.resumed, 'success'))
                    .catch((e) => showToast(e.message, 'error'))
                }
              >
                {t.queues.resume}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
