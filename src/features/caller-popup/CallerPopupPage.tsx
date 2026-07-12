import { useEffect, useState } from 'react'
import { ArrowRightLeft, Copy, Mic, MicOff, Pause, Phone, PhoneOff, UserRound } from 'lucide-react'
import { api } from '@/api/client/bridge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import type { ActiveCall, Contact } from '@shared/types'

export function CallerPopupPage() {
  const { t } = useI18n()
  const [call, setCall] = useState<ActiveCall | null>(null)
  const [transferTo, setTransferTo] = useState('')
  const [contact, setContact] = useState<Contact | null>(null)

  useEffect(() => {
    void api.bridge.call.active().then(setCall)
    return api.bridge.call.onActiveChanged(setCall)
  }, [])

  useEffect(() => {
    if (!call?.phoneNumber) return
    let cancelled = false
    void api.bridge.contacts.search(call.phoneNumber).then((list) => {
      if (!cancelled) setContact(list[0] ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [call?.phoneNumber])

  if (!call) {
    return (
      <div className="flex h-full flex-col bg-gradient-to-b from-[#132033] to-[#0b1220] p-5">
        <div className="py-16 text-center text-[var(--color-muted)]">{t.call.waitingIncoming}</div>
      </div>
    )
  }

  const name = call.callerName ?? contact?.name ?? t.popup.unknownCaller
  const company = call.company ?? contact?.company
  const initial = name.slice(0, 1).toUpperCase()

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#132033] to-[#0b1220] p-5">
      <div className="mb-2 text-center text-sm text-[var(--color-muted)]">
        {call.direction === 'inbound' ? t.call.incoming : t.call.active}
      </div>
      <div className="mx-auto mb-4 grid h-[72px] w-[72px] place-items-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] text-2xl font-bold text-[#041016] [animation:pulse-soft_1.8s_ease_infinite]">
        {initial}
      </div>
      <div className="text-center">
        <h1 className="m-0 text-[1.35rem] font-semibold" dir="ltr">
          {call.phoneNumber}
        </h1>
        <div className="mt-1 text-base">{name}</div>
        <div className="mt-1.5 text-sm text-[var(--color-muted)]">
          {[company, call.queue, call.extension].filter(Boolean).join(' · ') || call.state}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {call.state === 'ringing' ? (
          <>
            <Button variant="primary" onClick={() => void api.bridge.call.answer()}>
              <Phone size={16} /> {t.call.answer}
            </Button>
            <Button variant="danger" onClick={() => void api.bridge.call.reject()}>
              <PhoneOff size={16} /> {t.call.reject}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => void api.bridge.call.mute()}>
              {call.muted ? <Mic size={16} /> : <MicOff size={16} />}
              {call.muted ? t.call.unmute : t.call.mute}
            </Button>
            <Button onClick={() => void api.bridge.call.hold()}>
              <Pause size={16} /> {call.held ? t.call.resume : t.call.hold}
            </Button>
            <Button onClick={() => void api.bridge.call.record()}>
              <Mic size={16} /> {call.recording ? t.call.stopRec : t.call.record}
            </Button>
            <Button variant="danger" onClick={() => void api.bridge.call.reject()}>
              <PhoneOff size={16} /> {t.call.hangup}
            </Button>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => void navigator.clipboard.writeText(call.phoneNumber)}
          >
            <Copy size={14} /> {t.call.copyNumber}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (contact) window.location.hash = '#/contacts'
              else void api.bridge.window.hidePopup()
            }}
          >
            <UserRound size={14} /> {t.call.openContact}
          </Button>
        </div>
        <Input
          placeholder={t.call.transferTo}
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
          dir="ltr"
          className="text-left"
        />
        <Button
          disabled={!transferTo.trim()}
          onClick={() => void api.bridge.call.transfer(transferTo.trim())}
        >
          <ArrowRightLeft size={16} /> {t.call.transfer}
        </Button>
        <Button variant="ghost" onClick={() => void api.bridge.window.hidePopup()}>
          {t.common.hide}
        </Button>
      </div>
    </div>
  )
}
