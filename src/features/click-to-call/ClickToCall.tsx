import { useMemo, useState } from 'react'
import { Phone } from 'lucide-react'
import { api } from '@/api/client/bridge'
import { originateSchema } from '@/api/validation/schemas'
import { useAppStore } from '@/stores/appStore'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

export function ClickToCall({ initialNumber = '' }: { initialNumber?: string }) {
  const [number, setNumber] = useState(initialNumber)
  const [busy, setBusy] = useState(false)
  const showToast = useAppStore((s) => s.showToast)
  const setActiveCall = useAppStore((s) => s.setActiveCall)
  const session = useAppStore((s) => s.session)

  const valid = useMemo(() => originateSchema.safeParse({ number }).success, [number])

  async function call(): Promise<void> {
    const parsed = originateSchema.safeParse({ number })
    if (!parsed.success) {
      showToast(parsed.error.errors[0]?.message ?? 'Invalid number', 'error')
      return
    }
    if (!session) {
      showToast('Login required', 'error')
      return
    }
    setBusy(true)
    try {
      const active = await api.bridge.call.originate(parsed.data.number)
      setActiveCall(active)
      showToast(`Calling ${parsed.data.number}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Originate failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialer panel">
      <h2>Click to Call</h2>
      <p className="muted">Dial from your Simotel extension via originate API.</p>
      <input
        className="input"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Number"
        inputMode="tel"
      />
      <div className="dial-pad">
        {KEYS.map((k) => (
          <button key={k} type="button" className="dial-key" onClick={() => setNumber((n) => n + k)}>
            {k}
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => setNumber((n) => n.slice(0, -1))}>
          ⌫
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setNumber('')}>
          Clear
        </button>
        <button type="button" className="btn btn-primary" disabled={!valid || busy} onClick={() => void call()}>
          <span className="row">
            <Phone size={16} /> Call
          </span>
        </button>
      </div>
    </div>
  )
}
