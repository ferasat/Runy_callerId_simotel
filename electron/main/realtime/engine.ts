/**
 * Realtime Engine
 *
 * Automatically detects the best supported realtime protocol:
 * WebSocket → SSE → Webhook → Long Polling → Smart Polling
 *
 * Falls back to intelligent polling with exponential backoff when
 * push protocols are unavailable. Reconnects automatically.
 */

import { EventEmitter } from 'events'
import { REALTIME_PRIORITY } from '../../../shared/constants'
import type { ConnectionState, RealtimeProtocol } from '../../../shared/types'

export type RealtimeEventType =
  | 'incoming_call'
  | 'outgoing_call'
  | 'call_answered'
  | 'call_ended'
  | 'call_missed'
  | 'transfer'
  | 'recording_started'
  | 'recording_finished'
  | 'queue_update'
  | 'agent_status'
  | 'connection'
  | 'raw'

export interface RealtimeEvent {
  type: RealtimeEventType
  payload: Record<string, unknown>
  receivedAt: string
}

export interface RealtimeEngineOptions {
  baseUrl: string
  apiKey: string
  pollFn?: () => Promise<RealtimeEvent[]>
  preferredProtocols?: RealtimeProtocol[]
  onLog?: (
    level: 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, unknown>
  ) => void
}

export class RealtimeEngine extends EventEmitter {
  private options: RealtimeEngineOptions
  private protocol: RealtimeProtocol | null = null
  private state: ConnectionState = 'disconnected'
  private ws: WebSocket | null = null
  private sse: EventSource | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private backoffMs = 1000
  private readonly maxBackoffMs = 30_000
  private stopped = true
  private consecutiveEmptyPolls = 0

  constructor(options: RealtimeEngineOptions) {
    super()
    this.options = options
  }

  getStatus(): { state: ConnectionState; protocol: RealtimeProtocol | null } {
    return { state: this.state, protocol: this.protocol }
  }

  async start(): Promise<void> {
    this.stopped = false
    this.setState('connecting')
    const order = this.options.preferredProtocols ?? [...REALTIME_PRIORITY]
    for (const proto of order) {
      if (this.stopped) return
      const ok = await this.tryProtocol(proto)
      if (ok) {
        this.protocol = proto
        this.backoffMs = 1000
        this.setState('connected')
        this.options.onLog?.('info', 'Realtime connected', { protocol: proto })
        this.emitEvent('connection', { state: 'connected', protocol: proto })
        return
      }
    }
    // Absolute fallback
    this.protocol = 'smart_polling'
    this.startSmartPolling()
    this.setState('connected')
    this.options.onLog?.('warn', 'Realtime fell back to smart polling')
  }

  stop(): void {
    this.stopped = true
    this.cleanupTransports()
    this.setState('disconnected')
  }

  async reconnect(): Promise<void> {
    this.cleanupTransports()
    this.setState('reconnecting')
    this.emitEvent('connection', { state: 'reconnecting' })
    await sleep(this.backoffMs)
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs)
    await this.start()
  }

  private async tryProtocol(proto: RealtimeProtocol): Promise<boolean> {
    try {
      switch (proto) {
        case 'websocket':
          return await this.connectWebSocket()
        case 'sse':
          return await this.connectSse()
        case 'webhook':
          // Webhook requires server push to a local listener; treat as unsupported in desktop default.
          return false
        case 'long_polling':
          this.startLongPolling()
          return true
        case 'smart_polling':
          this.startSmartPolling()
          return true
        default:
          return false
      }
    } catch (err) {
      this.options.onLog?.('warn', `Protocol ${proto} failed`, {
        error: err instanceof Error ? err.message : String(err)
      })
      return false
    }
  }

  private connectWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      const wsUrl = this.buildWsUrl()
      let settled = false
      try {
        const ws = new WebSocket(wsUrl)
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true
            try {
              ws.close()
            } catch {
              /* ignore */
            }
            resolve(false)
          }
        }, 4000)

        ws.onopen = () => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          this.ws = ws
          resolve(true)
        }
        ws.onmessage = (ev) => this.handleMessage(String(ev.data))
        ws.onerror = () => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(false)
          } else {
            void this.reconnect()
          }
        }
        ws.onclose = () => {
          if (!this.stopped && this.protocol === 'websocket') void this.reconnect()
        }
      } catch {
        resolve(false)
      }
    })
  }

  private connectSse(): Promise<boolean> {
    return new Promise((resolve) => {
      // Node/Electron main may not have EventSource; detect support.
      if (typeof EventSource === 'undefined') {
        resolve(false)
        return
      }
      try {
        const url = `${this.options.baseUrl.replace(/\/+$/, '')}/api/v4/realtime/events?apikey=${encodeURIComponent(this.options.apiKey)}`
        const es = new EventSource(url)
        const timer = setTimeout(() => {
          es.close()
          resolve(false)
        }, 4000)
        es.onopen = () => {
          clearTimeout(timer)
          this.sse = es
          resolve(true)
        }
        es.onmessage = (ev) => this.handleMessage(ev.data)
        es.onerror = () => {
          if (!this.sse) {
            clearTimeout(timer)
            es.close()
            resolve(false)
          } else if (!this.stopped) {
            void this.reconnect()
          }
        }
      } catch {
        resolve(false)
      }
    })
  }

  private startLongPolling(): void {
    const tick = async () => {
      if (this.stopped) return
      try {
        const events = (await this.options.pollFn?.()) ?? []
        for (const e of events) this.dispatch(e)
        this.backoffMs = 1000
      } catch (err) {
        this.options.onLog?.('warn', 'Long poll failed', {
          error: err instanceof Error ? err.message : String(err)
        })
        this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs)
      }
      this.pollTimer = setTimeout(tick, Math.max(2000, this.backoffMs))
    }
    void tick()
  }

  private startSmartPolling(): void {
    const tick = async () => {
      if (this.stopped) return
      try {
        const events = (await this.options.pollFn?.()) ?? []
        if (events.length === 0) {
          this.consecutiveEmptyPolls += 1
          // Back off when idle to avoid unnecessary requests
          this.backoffMs = Math.min(1000 + this.consecutiveEmptyPolls * 500, this.maxBackoffMs)
        } else {
          this.consecutiveEmptyPolls = 0
          this.backoffMs = 1500
          for (const e of events) this.dispatch(e)
        }
      } catch {
        this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs)
        this.setState('reconnecting')
      }
      this.pollTimer = setTimeout(tick, this.backoffMs)
    }
    void tick()
  }

  private handleMessage(raw: string): void {
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      const mapped = mapSimotelEvent(data)
      this.dispatch(mapped)
    } catch {
      this.dispatch({
        type: 'raw',
        payload: { raw },
        receivedAt: new Date().toISOString()
      })
    }
  }

  private dispatch(event: RealtimeEvent): void {
    this.emit('event', event)
    this.emit(event.type, event)
  }

  private emitEvent(type: RealtimeEventType, payload: Record<string, unknown>): void {
    this.dispatch({ type, payload, receivedAt: new Date().toISOString() })
  }

  private setState(state: ConnectionState): void {
    this.state = state
    this.emit('state', state)
  }

  private cleanupTransports(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        /* ignore */
      }
      this.ws = null
    }
    if (this.sse) {
      try {
        this.sse.close()
      } catch {
        /* ignore */
      }
      this.sse = null
    }
  }

  private buildWsUrl(): string {
    const base = this.options.baseUrl.replace(/\/+$/, '')
    const wsBase = base.replace(/^http/, 'ws')
    return `${wsBase}/api/v4/realtime?apikey=${encodeURIComponent(this.options.apiKey)}`
  }
}

export function mapSimotelEvent(data: Record<string, unknown>): RealtimeEvent {
  const eventName = String(data.event ?? data.type ?? data.Event ?? data.event_name ?? 'raw')
  const normalized = eventName.toLowerCase()
  let type: RealtimeEventType = 'raw'

  if (
    eventName === 'IncomingCall' ||
    normalized.includes('incoming') ||
    normalized.includes('ring')
  ) {
    type = 'incoming_call'
  } else if (eventName === 'OutgoingCall' || normalized.includes('outgoing')) {
    type = 'outgoing_call' as RealtimeEventType
  } else if (
    eventName === 'NewState' ||
    normalized.includes('newstate') ||
    normalized.includes('answer')
  ) {
    type = normalized.includes('answer') ? 'call_answered' : 'agent_status'
  } else if (eventName === 'Transfer' || normalized.includes('transfer')) {
    type = 'transfer'
  } else if (
    eventName === 'Cdr' ||
    eventName === 'CdrQueue' ||
    normalized.includes('hangup') ||
    normalized.includes('end')
  ) {
    type = normalized.includes('miss') ? 'call_missed' : 'call_ended'
  } else if (normalized.includes('miss')) {
    type = 'call_missed'
  } else if (normalized.includes('record') && normalized.includes('start')) {
    type = 'recording_started'
  } else if (normalized.includes('record')) {
    type = 'recording_finished'
  } else if (normalized.includes('queue') || eventName === 'CdrQueue') {
    type = 'queue_update'
  } else if (
    normalized.includes('agent') ||
    normalized.includes('status') ||
    eventName === 'ExtenAdded'
  ) {
    type = 'agent_status'
  }

  return {
    type,
    payload: data,
    receivedAt: new Date().toISOString()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
