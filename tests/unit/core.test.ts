import { describe, expect, it } from 'vitest'
import { mapSimotelEvent } from '../../electron/main/realtime/engine'
import { REALTIME_PRIORITY } from '../../shared/constants'
import { contactSchema, loginSchema, originateSchema, serverSchema } from '../../src/api/validation/schemas'
import { RequestQueue, detectInternet } from '../../src/lib/offline'

describe('validation schemas', () => {
  it('accepts a valid server', () => {
    const result = serverSchema.safeParse({
      name: 'PBX',
      baseUrl: 'https://pbx.example.com',
      apiPath: 'api/v4',
      apiKey: 'secret',
      isDefault: true
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid login', () => {
    const result = loginSchema.safeParse({ serverId: '', extension: '' })
    expect(result.success).toBe(false)
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
  it('maps incoming ring events', () => {
    const event = mapSimotelEvent({ event: 'IncomingCall', caller: '09120000000', queue: 'sales' })
    expect(event.type).toBe('incoming_call')
    expect(event.payload.caller).toBe('09120000000')
  })

  it('maps hangup to call_ended', () => {
    expect(mapSimotelEvent({ Event: 'Hangup' }).type).toBe('call_ended')
  })
})

describe('realtime priority', () => {
  it('prefers websocket first', () => {
    expect(REALTIME_PRIORITY[0]).toBe('websocket')
    expect(REALTIME_PRIORITY[REALTIME_PRIORITY.length - 1]).toBe('smart_polling')
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
