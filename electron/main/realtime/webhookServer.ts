/**
 * Local Event API webhook receiver.
 *
 * Simotel Event API POSTs named events (IncomingCall, NewState, Cdr, …)
 * to a reachable URL. When the PBX can reach the agent LAN, this is the
 * preferred realtime transport (priority: webhook after WS/SSE).
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http'
import { EventEmitter } from 'events'
import { SIMOTEL_EVENTS } from '../../../shared/constants'
import type { RealtimeEvent } from '../realtime/engine'
import { mapSimotelEvent } from '../realtime/engine'

export class EventWebhookServer extends EventEmitter {
  private server: Server | null = null
  private port: number

  constructor(port = 3939) {
    super()
    this.port = port
  }

  async start(port = this.port): Promise<number> {
    this.port = port
    if (this.server) return this.port

    this.server = createServer((req, res) => {
      void this.handle(req, res)
    })

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject)
      this.server!.listen(this.port, '0.0.0.0', () => resolve())
    })

    return this.port
  }

  stop(): void {
    this.server?.close()
    this.server = null
  }

  getPort(): number {
    return this.port
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, service: 'simotel-event-webhook' }))
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end('Method Not Allowed')
      return
    }

    try {
      const raw = await readBody(req)
      let data: Record<string, unknown> = {}
      try {
        data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      } catch {
        // form-urlencoded fallback
        data = Object.fromEntries(new URLSearchParams(raw))
      }

      const eventName = String(
        data.event_name ?? data.event ?? data.Event ?? extractEventFromPath(req.url ?? '') ?? 'Ping'
      )

      if (!SIMOTEL_EVENTS.includes(eventName as (typeof SIMOTEL_EVENTS)[number])) {
        // Still accept unknown events as raw
      }

      const mapped: RealtimeEvent = mapSimotelEvent({
        ...data,
        event: eventName,
        type: eventName
      })

      this.emit('event', mapped)
      this.emit(eventName, mapped)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: 1, success: true }))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: 0, message: err instanceof Error ? err.message : 'error' }))
    }
  }
}

function extractEventFromPath(url: string): string | null {
  const path = url.split('?')[0]
  const parts = path.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  if (last && /^[A-Za-z]+$/.test(last)) return last
  return null
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}
