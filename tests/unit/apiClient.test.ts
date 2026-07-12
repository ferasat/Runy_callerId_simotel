import { describe, expect, it } from 'vitest'
import { SimotelApiClient, ApiError } from '../../electron/main/services/simotelApi'

describe('SimotelApiClient', () => {
  it('builds requests with X-APIKEY and retries on failure', async () => {
    const calls: Array<{ url: string; headers: HeadersInit | undefined; body: string }> = []
    const original = globalThis.fetch
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        headers: init?.headers,
        body: String(init?.body)
      })
      if (calls.length < 2) {
        return new Response('fail', { status: 500 })
      }
      return new Response(JSON.stringify({ success: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }) as typeof fetch

    const client = new SimotelApiClient(
      { baseUrl: 'https://pbx.example.com/', apiPath: 'api/v4', apiKey: 'tok' },
      { maxRetries: 2, retryBaseMs: 1 }
    )
    const result = await client.ping()
    expect(result).toEqual({ success: 1 })
    expect(calls[0].url).toBe('https://pbx.example.com/api/v4/setting/ping/act')
    expect((calls[0].headers as Record<string, string>)['X-APIKEY']).toBe('tok')

    globalThis.fetch = original
  })

  it('throws ApiError on terminal failure', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response('nope', { status: 401 })) as typeof fetch
    const client = new SimotelApiClient(
      { baseUrl: 'https://pbx.example.com', apiPath: 'api/v4', apiKey: 'x' },
      { maxRetries: 0, retryBaseMs: 1 }
    )
    await expect(client.ping()).rejects.toBeInstanceOf(ApiError)
    globalThis.fetch = original
  })

  it('serializes originate payload', async () => {
    let body = ''
    const original = globalThis.fetch
    globalThis.fetch = (async (_u, init) => {
      body = String(init?.body)
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    const client = new SimotelApiClient(
      { baseUrl: 'https://pbx.example.com', apiPath: 'api/v4', apiKey: 'x' },
      { maxRetries: 0 }
    )
    await client.originate({ caller: '100', callee: '0912', timeout: 20 })
    expect(JSON.parse(body)).toMatchObject({
      caller: '100',
      callee: '0912',
      timeout: '20'
    })
    globalThis.fetch = original
  })
})
