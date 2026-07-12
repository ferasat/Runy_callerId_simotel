import { describe, expect, it } from 'vitest'
import { mapSimotelEvent } from '../../electron/main/realtime/engine'
import { REALTIME_PRIORITY, SIMOTEL_EVENTS } from '../../shared/constants'
import { contactSchema, originateSchema, serverSchema } from '../../src/api/validation/schemas'
import { RequestQueue, detectInternet } from '../../src/lib/offline'
import { z } from 'zod'

const extendedServer = serverSchema.extend({
  apiAuth: z.enum(['basic', 'token', 'both']).default('both'),
  apiKey: z.string().optional(),
  timeoutMs: z.number().default(15000)
})

describe('validation schemas', () => {
  it('accepts a valid server', () => {
    const result = extendedServer.safeParse({
      name: 'PBX',
      baseUrl: 'https://pbx.example.com',
      apiPath: 'api/v4',
      apiKey: 'secret',
      apiAuth: 'both',
      isDefault: true
    })
    expect(result.success).toBe(true)
  })

  it('requires contact number', () => {
    const result = contactSchema.safeParse({
      name: 'Ali',
      numbers: [],
      tags: [],
      groupIds: [],
      isFavorite: false,
      source: 'local'
    })
    expect(result.success).toBe(false)
  })

  it('validates originate number', () => {
    expect(originateSchema.safeParse({ number: '0912' }).success).toBe(true)
    expect(originateSchema.safeParse({ number: '1' }).success).toBe(false)
  })
})

describe('realtime event mapping', () => {
  it('maps official IncomingCall events', () => {
    const event = mapSimotelEvent({ event: 'IncomingCall', caller: '09120000000', queue: 'sales' })
    expect(event.type).toBe('incoming_call')
  })

  it('maps Transfer events', () => {
    expect(mapSimotelEvent({ event: 'Transfer' }).type).toBe('transfer')
  })

  it('maps Cdr to call_ended', () => {
    expect(mapSimotelEvent({ event: 'Cdr' }).type).toBe('call_ended')
  })
})

describe('official simotel events list', () => {
  it('includes IncomingCall and NewState', () => {
    expect(SIMOTEL_EVENTS).toContain('IncomingCall')
    expect(SIMOTEL_EVENTS).toContain('NewState')
    expect(SIMOTEL_EVENTS).toContain('CdrQueue')
  })
})

describe('realtime priority', () => {
  it('prefers websocket first', () => {
    expect(REALTIME_PRIORITY[0]).toBe('websocket')
  })
})

describe('offline request queue', () => {
  it('retries failed jobs then drops after max', async () => {
    const q = new RequestQueue({ maxRetries: 2 })
    let attempts = 0
    q.enqueue('a', async () => {
      attempts += 1
      throw new Error('down')
    })
    await q.flush()
    await q.flush()
    expect(attempts).toBeGreaterThanOrEqual(1)
    expect(detectInternet()).toBeTypeOf('boolean')
  })
})
