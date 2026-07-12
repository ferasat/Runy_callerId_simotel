import { useMemo, useState } from 'react'
import { Phone } from 'lucide-react'
import { api } from '@/api/client/bridge'
import { originateSchema } from '@/api/validation/schemas'
import { useAppStore } from '@/stores/appStore'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

export function ClickToCall({ initialNumber = '' }: { initialNumber?: string }) {
  const { t } = useI18n()
  const [number, setNumber] = useState(initialNumber)
  const [busy, setBusy] = useState(false)
  const showToast = useAppStore((s) => s.showToast)
  const setActiveCall = useAppStore((s) => s.setActiveCall)
  const session = useAppStore((s) => s.session)
  const valid = useMemo(() => originateSchema.safeParse({ number }).success, [number])

  async function call(): Promise<void> {
    const parsed = originateSchema.safeParse({ number })
    if (!parsed.success) {
      showToast(parsed.error.errors[0]?.message ?? t.common.required, 'error')
      return
    }
    if (!session) {
      showToast(t.call.loginRequired, 'error')
      return
    }
    setBusy(true)
    try {
      const active = await api.bridge.call.originate(parsed.data.number)
      setActiveCall(active)
      showToast(`${t.call.calling} ${parsed.data.number}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.call.originateFailed, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle>{t.call.clickToCall}</CardTitle>
      <CardDescription>{t.call.clickToCallHint}</CardDescription>
      <Input
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder={t.call.dialNumber}
        inputMode="tel"
        dir="ltr"
        className="text-left"
      />
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className="h-[52px] rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] text-lg font-semibold transition active:scale-[0.97]"
            onClick={() => setNumber((n) => n + k)}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => setNumber((n) => n.slice(0, -1))}>
          ⌫
        </Button>
        <Button variant="ghost" onClick={() => setNumber('')}>
          {t.common.clear}
        </Button>
        <Button variant="primary" disabled={!valid || busy} onClick={() => void call()}>
          <Phone size={16} /> {t.common.call}
        </Button>
      </div>
    </Card>
  )
}
