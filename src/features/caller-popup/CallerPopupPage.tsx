import { useEffect, useState } from 'react'
import { PhoneOff, Phone, MicOff, ArrowRightLeft } from 'lucide-react'
import { api } from '@/api/client/bridge'
import type { ActiveCall } from '@shared/types'

export function CallerPopupPage() {
  const [call, setCall] = useState<ActiveCall | null>(null)
  const [transferTo, setTransferTo] = useState('')

  useEffect(() => {
    void api.bridge.call.active().then(setCall)
    const off = api.bridge.call.onActiveChanged(setCall)
    return off
  }, [])

  if (!call) {
    return (
      <div className="popup-shell">
        <div className="empty">Waiting for incoming call…</div>
      </div>
    )
  }

  const initial = (call.callerName ?? call.phoneNumber).slice(0, 1).toUpperCase()

  return (
    <div className="popup-shell">
      <div className="muted" style={{ textAlign: 'center', marginBottom: 8 }}>
        {call.direction === 'inbound' ? 'Incoming Call' : 'Active Call'}
      </div>
      <div className="avatar">{initial}</div>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.35rem' }}>{call.phoneNumber}</h1>
        <div style={{ fontSize: '1.05rem' }}>{call.callerName ?? 'Unknown caller'}</div>
        <div className="muted" style={{ marginTop: 6 }}>
          {[call.company, call.queue].filter(Boolean).join(' · ') || call.state}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
        {call.state === 'ringing' && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => void api.bridge.call.answer()}>
              <Phone size={16} /> Answer
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void api.bridge.call.reject()}>
              <PhoneOff size={16} /> Reject
            </button>
          </>
        )}
        {call.state !== 'ringing' && (
          <>
            <button type="button" className="btn" onClick={() => void api.bridge.call.mute()}>
              <MicOff size={16} /> {call.muted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => void api.bridge.call.reject()}>
              <PhoneOff size={16} /> Hang up
            </button>
          </>
        )}
      </div>

      <div className="stack" style={{ marginTop: 20 }}>
        <input
          className="input"
          placeholder="Transfer to extension / number"
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
        />
        <button
          type="button"
          className="btn"
          disabled={!transferTo.trim()}
          onClick={() => void api.bridge.call.transfer(transferTo.trim())}
        >
          <ArrowRightLeft size={16} /> Transfer
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void api.bridge.window.hidePopup()}>
          Hide
        </button>
      </div>
    </div>
  )
}
