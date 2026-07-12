import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { ApiError, SimotelApiClient } from '../../electron/main/services/simotelApi'
import type { ServerConfig } from '../../shared/types'

vi.mock('axios', () => {
  const post = vi.fn()
  return {
    default: {
      create: () => ({
        post,
        defaults: { baseURL: '', timeout: 15000 },
        interceptors: {
          request: { use: vi.fn() }
        }
      }),
      isAxiosError: (err: unknown) =>
        Boolean(err && typeof err === 'object' && 'isAxiosError' in err)
    }
  }
})

const baseServer: ServerConfig = {
  id: '1',
  name: 'PBX',
  baseUrl: 'https://pbx.example.com',
  apiPath: 'api/v4',
  apiAuth: 'both',
  apiKey: 'tok',
  username: 'simotel',
  password: 'simotel',
  timeoutMs: 15000,
  reconnectPolicy: { enabled: true, maxRetries: 2, baseDelayMs: 1 },
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe('SimotelApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts to ping endpoint and retries on failure', async () => {
    const clientHttp = axios.create()
    const post = clientHttp.post as unknown as ReturnType<typeof vi.fn>
    post
      .mockRejectedValueOnce({ isAxiosError: true, message: 'fail', response: { status: 500 } })
      .mockResolvedValueOnce({ data: { success: 1 } })

    const client = new SimotelApiClient(baseServer, { maxRetries: 2, retryBaseMs: 1 })
    // Rebind mocked instance methods used by constructor-created client
    ;(client as unknown as { http: { post: typeof post } }).http.post = post

    const result = await client.ping()
    expect(result).toEqual({ success: 1 })
    expect(post).toHaveBeenCalled()
    expect(String(post.mock.calls[0][0])).toContain('setting/ping/act')
  })

  it('throws ApiError on terminal failure', async () => {
    const post = vi.fn().mockRejectedValue({
      isAxiosError: true,
      message: 'unauthorized',
      response: { status: 401, data: { message: 'nope' } }
    })
    const client = new SimotelApiClient(baseServer, { maxRetries: 0, retryBaseMs: 1 })
    ;(client as unknown as { http: { post: typeof post } }).http.post = post
    // Force axios.isAxiosError true path via our mock — attach flag recognized by request()
    await expect(client.ping()).rejects.toBeInstanceOf(ApiError)
  })

  it('serializes originate payload', async () => {
    const post = vi.fn().mockResolvedValue({ data: {} })
    const client = new SimotelApiClient(baseServer, { maxRetries: 0 })
    ;(client as unknown as { http: { post: typeof post } }).http.post = post
    await client.originate({ caller: '100', callee: '0912', timeout: 20 })
    expect(post.mock.calls[0][0]).toBe('call/originate/act')
    expect(post.mock.calls[0][1]).toMatchObject({
      caller: '100',
      callee: '0912',
      timeout: '20'
    })
  })
})
