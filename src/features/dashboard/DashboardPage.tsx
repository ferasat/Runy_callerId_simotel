import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { Phone } from 'lucide-react'
import { api } from '@/api/client/bridge'
import { ClickToCall } from '@/features/click-to-call/ClickToCall'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/input'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import type { DashboardStats } from '@shared/types'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

export function DashboardPage() {
  const { t } = useI18n()
  const session = useAppStore((s) => s.session)
  const activeCall = useAppStore((s) => s.activeCall)
  const contacts = useAppStore((s) => s.contacts)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 10000)
    return () => clearInterval(id)
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats', tick],
    queryFn: () => api.bridge.dashboard.stats(),
    refetchInterval: 10000
  })

  const stats: DashboardStats | undefined = data

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>{t.dashboard.title}</CardTitle>
        <CardDescription>
          {t.dashboard.welcome}
          {session ? `، ${session.name}` : ''}. {t.dashboard.welcomeHint}
        </CardDescription>
      </Card>

      {isLoading && !stats ? (
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t.dashboard.currentCalls} value={stats?.currentCalls ?? 0} />
          <Stat label={t.dashboard.waitingCalls} value={stats?.waitingCalls ?? 0} />
          <Stat label={t.dashboard.answeredToday} value={stats?.answeredToday ?? 0} />
          <Stat label={t.dashboard.missedCalls} value={stats?.missedCalls ?? 0} />
          <Stat label={t.dashboard.abandoned} value={stats?.abandonedCalls ?? 0} />
          <Stat label={t.dashboard.avgTalk} value={`${stats?.averageTalkTimeSec ?? 0}ث`} />
          <Stat label={t.dashboard.avgWait} value={`${stats?.averageWaitingTimeSec ?? 0}ث`} />
          <Stat label={t.dashboard.longestCall} value={`${stats?.longestCallSec ?? 0}ث`} />
          <Stat label={t.dashboard.loggedAgents} value={stats?.loggedAgents ?? 0} />
          <Stat label={t.dashboard.busyAgents} value={stats?.busyAgents ?? 0} />
          <Stat label={t.dashboard.availableAgents} value={stats?.availableAgents ?? 0} />
          <Stat label={t.dashboard.contacts} value={contacts.length} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-80">
          <CardTitle>{t.dashboard.callsPerHour}</CardTitle>
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.callsPerHour ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
                <XAxis dataKey="hour" hide />
                <YAxis allowDecimals={false} stroke="var(--color-muted)" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-accent)"
                  fill="rgb(45 212 160 / 0.2)"
                />
                <Area
                  type="monotone"
                  dataKey="answered"
                  stroke="var(--color-accent-2)"
                  fill="rgb(56 189 248 / 0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="h-80">
          <CardTitle>{t.dashboard.queuePerformance}</CardTitle>
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.queuePerformance ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
                <XAxis dataKey="name" stroke="var(--color-muted)" />
                <YAxis allowDecimals={false} stroke="var(--color-muted)" />
                <Tooltip />
                <Legend />
                <Bar dataKey="answered" fill="var(--color-accent)" radius={6} />
                <Bar dataKey="abandoned" fill="var(--color-danger)" radius={6} />
                <Bar dataKey="waiting" fill="var(--color-warning)" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ClickToCall />
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t.dashboard.activeCall}</CardTitle>
            <Badge tone={stats?.connectionHealth === 'connected' ? 'ok' : 'warn'}>
              {stats?.connectionHealth ?? t.common.unknown} · {t.dashboard.server}{' '}
              {stats?.serverStatus}
            </Badge>
          </div>
          {!activeCall && (
            <div className="py-10 text-center text-[var(--color-muted)]">
              {t.dashboard.noActiveCall}
            </div>
          )}
          {activeCall && (
            <>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-xl font-bold text-[#041016] [animation:pulse-soft_1.8s_ease_infinite]">
                {(activeCall.callerName ?? activeCall.phoneNumber).slice(0, 1)}
              </div>
              <div className="text-center">
                <div className="font-semibold">
                  {activeCall.callerName ?? activeCall.phoneNumber}
                </div>
                <div className="text-sm text-[var(--color-muted)]">
                  {[activeCall.company, activeCall.queue, activeCall.state]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={() => void api.bridge.call.answer()}>
                  <Phone size={16} /> {t.call.answer}
                </Button>
                <Button variant="danger" onClick={() => void api.bridge.call.reject()}>
                  {t.call.reject}
                </Button>
                <Button onClick={() => void api.bridge.call.mute()}>{t.call.mute}</Button>
                <Button onClick={() => void api.bridge.call.hold()}>{t.call.hold}</Button>
                <Button onClick={() => void api.bridge.call.record()}>{t.call.record}</Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
