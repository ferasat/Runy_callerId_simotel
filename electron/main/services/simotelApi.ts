/**
 * Simotel API HTTP client with retry, timeout, auth, logging, and caching hooks.
 *
 * Auth: X-APIKEY header (Simotel v4).
 * All endpoints are POST with JSON body per official Postman collection.
 */

import { DEFAULT_API_PATH } from '../../../shared/constants'
import type { ApiErrorShape, Pagination, ServerConfig } from '../../../shared/types'

export class ApiError extends Error {
  code: string
  status?: number
  details?: unknown

  constructor(shape: ApiErrorShape) {
    super(shape.message)
    this.name = 'ApiError'
    this.code = shape.code
    this.status = shape.status
    this.details = shape.details
  }
}

export interface ApiClientOptions {
  timeoutMs?: number
  maxRetries?: number
  retryBaseMs?: number
  onLog?: (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void
  cacheGet?: (key: string) => unknown | null
  cacheSet?: (key: string, value: unknown, ttlMs?: number) => void
}

export interface OriginateParams {
  caller: string
  callee: string
  context?: string
  caller_id?: string
  trunk_name?: string
  timeout?: string | number
}

export interface SearchUsersParams {
  status?: string
  alike?: number | string
  conditions?: { name?: string; number?: string; mapped?: string }
}

export interface SearchQueuesParams {
  alike?: string
  conditions?: { name?: string; number?: string }
}

export interface CdrSearchParams {
  conditions?: Record<string, string>
  date_range?: { from: string; to: string }
  pagination?: Pagination
  alike?: string
}

export class SimotelApiClient {
  private baseUrl: string
  private apiPath: string
  private apiKey: string
  private timeoutMs: number
  private maxRetries: number
  private retryBaseMs: number
  private onLog?: ApiClientOptions['onLog']
  private cacheGet?: ApiClientOptions['cacheGet']
  private cacheSet?: ApiClientOptions['cacheSet']

  constructor(server: Pick<ServerConfig, 'baseUrl' | 'apiPath' | 'apiKey'>, options: ApiClientOptions = {}) {
    this.baseUrl = server.baseUrl.replace(/\/+$/, '')
    this.apiPath = (server.apiPath || DEFAULT_API_PATH).replace(/^\/+|\/+$/g, '')
    this.apiKey = server.apiKey
    this.timeoutMs = options.timeoutMs ?? 15000
    this.maxRetries = options.maxRetries ?? 3
    this.retryBaseMs = options.retryBaseMs ?? 400
    this.onLog = options.onLog
    this.cacheGet = options.cacheGet
    this.cacheSet = options.cacheSet
  }

  updateServer(server: Pick<ServerConfig, 'baseUrl' | 'apiPath' | 'apiKey'>): void {
    this.baseUrl = server.baseUrl.replace(/\/+$/, '')
    this.apiPath = (server.apiPath || DEFAULT_API_PATH).replace(/^\/+|\/+$/g, '')
    this.apiKey = server.apiKey
  }

  private url(endpoint: string): string {
    const path = endpoint.replace(/^\/+/, '')
    return `${this.baseUrl}/${this.apiPath}/${path}`
  }

  async request<T>(endpoint: string, body: unknown = {}, opts: { cacheKey?: string; cacheTtlMs?: number; skipRetry?: boolean } = {}): Promise<T> {
    if (opts.cacheKey && this.cacheGet) {
      const cached = this.cacheGet(opts.cacheKey)
      if (cached !== null && cached !== undefined) return cached as T
    }

    let attempt = 0
    let lastError: unknown

    while (attempt <= (opts.skipRetry ? 0 : this.maxRetries)) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        this.onLog?.('info', 'API request', { endpoint, attempt })
        const res = await fetch(this.url(endpoint), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-APIKEY': this.apiKey
          },
          body: JSON.stringify(body ?? {}),
          signal: controller.signal
        })
        clearTimeout(timer)

        const text = await res.text()
        let data: unknown = null
        try {
          data = text ? JSON.parse(text) : null
        } catch {
          data = text
        }

        if (!res.ok) {
          throw new ApiError({
            code: `HTTP_${res.status}`,
            message: `Simotel API error ${res.status}`,
            status: res.status,
            details: data
          })
        }

        if (opts.cacheKey && this.cacheSet) {
          this.cacheSet(opts.cacheKey, data, opts.cacheTtlMs ?? 30_000)
        }
        return data as T
      } catch (err) {
        clearTimeout(timer)
        lastError = err
        const retryable =
          err instanceof Error &&
          (err.name === 'AbortError' ||
            err.message.includes('fetch') ||
            (err instanceof ApiError && (err.status ?? 0) >= 500))
        this.onLog?.('warn', 'API request failed', {
          endpoint,
          attempt,
          error: err instanceof Error ? err.message : String(err)
        })
        if (!retryable || attempt >= this.maxRetries) break
        const delay = this.retryBaseMs * Math.pow(2, attempt)
        await sleep(delay)
        attempt += 1
      }
    }

    if (lastError instanceof ApiError) throw lastError
    throw new ApiError({
      code: 'REQUEST_FAILED',
      message: lastError instanceof Error ? lastError.message : 'Request failed',
      details: lastError
    })
  }

  ping(): Promise<unknown> {
    return this.request('setting/ping/act', {}, { skipRetry: false })
  }

  searchUsers(params: SearchUsersParams = {}): Promise<unknown> {
    return this.request(
      'pbx/users/search',
      {
        status: params.status ?? 'all',
        alike: params.alike ?? 1,
        conditions: params.conditions ?? { name: '', number: '', mapped: '' }
      },
      { cacheKey: `users:${JSON.stringify(params)}`, cacheTtlMs: 15_000 }
    )
  }

  searchQueues(params: SearchQueuesParams = {}): Promise<unknown> {
    return this.request(
      'pbx/queues/search',
      {
        alike: params.alike ?? 'true',
        conditions: params.conditions ?? { name: '', number: '' }
      },
      { cacheKey: `queues:${JSON.stringify(params)}`, cacheTtlMs: 10_000 }
    )
  }

  addQueueAgent(queue: string, agent: string): Promise<unknown> {
    return this.request('pbx/queues/addagent', { queue, agent })
  }

  removeQueueAgent(queue: string, agent: string): Promise<unknown> {
    return this.request('pbx/queues/removeagent', { queue, agent })
  }

  pauseQueueAgent(queue: string, agent: string): Promise<unknown> {
    return this.request('pbx/queues/pauseagent', { queue, agent })
  }

  resumeQueueAgent(queue: string, agent: string): Promise<unknown> {
    return this.request('pbx/queues/resumeagent', { queue, agent })
  }

  originate(params: OriginateParams): Promise<unknown> {
    return this.request('call/originate/act', {
      caller: params.caller,
      callee: params.callee,
      context: params.context ?? 'outgoing_context',
      caller_id: params.caller_id ?? params.caller,
      trunk_name: params.trunk_name,
      timeout: String(params.timeout ?? 30)
    })
  }

  searchCdr(params: CdrSearchParams): Promise<unknown> {
    return this.request('reports/cdr/search', {
      conditions: params.conditions ?? { from: '', to: '', cuid: '' },
      date_range: params.date_range,
      pagination: params.pagination ?? { start: 0, count: 20, sorting: {} },
      alike: params.alike ?? 'true'
    })
  }

  searchQuick(params: CdrSearchParams): Promise<unknown> {
    return this.request('reports/quick/search', {
      conditions: params.conditions ?? { from: '', to: '' },
      date_range: params.date_range,
      pagination: params.pagination ?? { start: 0, count: 20, sorting: {} },
      alike: params.alike ?? 'true'
    })
  }

  downloadRecording(file: string): Promise<unknown> {
    return this.request('reports/audio/download', { file })
  }

  searchQueueReports(params: CdrSearchParams): Promise<unknown> {
    return this.request('reports/queue/search', {
      conditions: params.conditions ?? {},
      date_range: params.date_range,
      pagination: params.pagination ?? { start: 0, count: 20, sorting: {} },
      alike: params.alike ?? 'true'
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
