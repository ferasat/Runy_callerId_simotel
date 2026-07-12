/**
 * Simotel API HTTP client (Axios).
 *
 * Auth modes (official laravel-simotel config):
 * - basic  → HTTP Basic
 * - token  → X-APIKEY
 * - both   → Basic + X-APIKEY (Postman local-simotel default)
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { DEFAULT_API_PATH } from '../../../shared/constants'
import type { ApiAuthMode, ApiErrorShape, Pagination, ServerConfig } from '../../../shared/types'

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
  onLog?: (
    level: 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, unknown>
  ) => void
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

export interface SimotelEnvelope<T = unknown> {
  success?: boolean | number
  message?: string
  data?: T
}

function resolveBaseUrl(server: Pick<ServerConfig, 'baseUrl' | 'host' | 'port' | 'https'>): string {
  if (server.host) {
    const scheme = server.https === false ? 'http' : 'https'
    const port = server.port ? `:${server.port}` : ''
    return `${scheme}://${server.host}${port}`
  }
  return server.baseUrl.replace(/\/+$/, '')
}

export class SimotelApiClient {
  private http: AxiosInstance
  private apiPath: string
  private apiAuth: ApiAuthMode
  private apiKey: string
  private username?: string
  private password?: string
  private maxRetries: number
  private retryBaseMs: number
  private onLog?: ApiClientOptions['onLog']
  private cacheGet?: ApiClientOptions['cacheGet']
  private cacheSet?: ApiClientOptions['cacheSet']

  constructor(server: ServerConfig, options: ApiClientOptions = {}) {
    this.apiPath = (server.apiPath || DEFAULT_API_PATH).replace(/^\/+|\/+$/g, '')
    this.apiAuth = server.apiAuth ?? 'both'
    this.apiKey = server.apiKey
    this.username = server.username
    this.password = server.password
    this.maxRetries = options.maxRetries ?? 3
    this.retryBaseMs = options.retryBaseMs ?? 400
    this.onLog = options.onLog
    this.cacheGet = options.cacheGet
    this.cacheSet = options.cacheSet

    this.http = axios.create({
      baseURL: `${resolveBaseUrl(server)}/${this.apiPath}`,
      timeout: options.timeoutMs ?? server.timeoutMs ?? 15000,
      headers: { 'Content-Type': 'application/json' }
    })

    this.http.interceptors.request.use((config) => {
      if (this.apiAuth === 'token' || this.apiAuth === 'both') {
        config.headers.set('X-APIKEY', this.apiKey)
      }
      if ((this.apiAuth === 'basic' || this.apiAuth === 'both') && this.username) {
        config.auth = { username: this.username, password: this.password ?? '' }
      }
      return config
    })
  }

  updateServer(server: ServerConfig): void {
    this.apiPath = (server.apiPath || DEFAULT_API_PATH).replace(/^\/+|\/+$/g, '')
    this.apiAuth = server.apiAuth ?? 'both'
    this.apiKey = server.apiKey
    this.username = server.username
    this.password = server.password
    this.http.defaults.baseURL = `${resolveBaseUrl(server)}/${this.apiPath}`
    this.http.defaults.timeout = server.timeoutMs ?? 15000
  }

  async request<T>(
    endpoint: string,
    body: unknown = {},
    opts: {
      cacheKey?: string
      cacheTtlMs?: number
      skipRetry?: boolean
      config?: AxiosRequestConfig
    } = {}
  ): Promise<T> {
    if (opts.cacheKey && this.cacheGet) {
      const cached = this.cacheGet(opts.cacheKey)
      if (cached !== null && cached !== undefined) return cached as T
    }

    let attempt = 0
    let lastError: unknown
    const path = endpoint.replace(/^\/+/, '')

    while (attempt <= (opts.skipRetry ? 0 : this.maxRetries)) {
      try {
        this.onLog?.('info', 'API request', { endpoint: path, attempt, auth: this.apiAuth })
        const res = await this.http.post<T>(path, body ?? {}, opts.config)
        if (opts.cacheKey && this.cacheSet) {
          this.cacheSet(opts.cacheKey, res.data, opts.cacheTtlMs ?? 30_000)
        }
        return res.data
      } catch (err) {
        lastError = err
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        const retryable =
          !status ||
          status >= 500 ||
          (axios.isAxiosError(err) && ['ECONNABORTED', 'ERR_NETWORK'].includes(err.code ?? ''))
        this.onLog?.('warn', 'API request failed', {
          endpoint: path,
          attempt,
          status,
          error: err instanceof Error ? err.message : String(err)
        })
        if (!retryable || attempt >= this.maxRetries) break
        await sleep(this.retryBaseMs * 2 ** attempt)
        attempt += 1
      }
    }

    if (axios.isAxiosError(lastError)) {
      throw new ApiError({
        code: `HTTP_${lastError.response?.status ?? 'NETWORK'}`,
        message: lastError.message,
        status: lastError.response?.status,
        details: lastError.response?.data
      })
    }
    throw new ApiError({
      code: 'REQUEST_FAILED',
      message: lastError instanceof Error ? lastError.message : 'Request failed',
      details: lastError
    })
  }

  ping(): Promise<SimotelEnvelope> {
    return this.request('setting/ping/act', {})
  }

  searchUsers(
    params: {
      status?: string
      alike?: number | string
      conditions?: { name?: string; number?: string; mapped?: string }
    } = {}
  ): Promise<SimotelEnvelope> {
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

  searchQueues(
    params: {
      alike?: string
      conditions?: { name?: string; number?: string }
    } = {}
  ): Promise<SimotelEnvelope> {
    return this.request(
      'pbx/queues/search',
      {
        alike: params.alike ?? 'true',
        conditions: params.conditions ?? { name: '', number: '' }
      },
      { cacheKey: `queues:${JSON.stringify(params)}`, cacheTtlMs: 10_000 }
    )
  }

  addQueueAgent(queue: string, agent: string): Promise<SimotelEnvelope> {
    return this.request('pbx/queues/addagent', { queue, agent })
  }

  removeQueueAgent(queue: string, agent: string): Promise<SimotelEnvelope> {
    return this.request('pbx/queues/removeagent', { queue, agent })
  }

  pauseQueueAgent(queue: string, agent: string): Promise<SimotelEnvelope> {
    return this.request('pbx/queues/pauseagent', { queue, agent })
  }

  resumeQueueAgent(queue: string, agent: string): Promise<SimotelEnvelope> {
    return this.request('pbx/queues/resumeagent', { queue, agent })
  }

  originate(params: OriginateParams): Promise<SimotelEnvelope> {
    return this.request('call/originate/act', {
      caller: params.caller,
      callee: params.callee,
      context: params.context ?? 'outgoing_context',
      caller_id: params.caller_id ?? params.caller,
      trunk_name: params.trunk_name,
      timeout: String(params.timeout ?? 30)
    })
  }

  searchCdr(params: {
    conditions?: Record<string, string>
    date_range?: { from: string; to: string }
    pagination?: Pagination
    alike?: string
  }): Promise<SimotelEnvelope> {
    return this.request('reports/cdr/search', {
      conditions: params.conditions ?? { from: '', to: '', cuid: '' },
      date_range: params.date_range,
      pagination: params.pagination ?? { start: 0, count: 20, sorting: {} },
      alike: params.alike ?? 'true'
    })
  }

  searchQuick(params: {
    conditions?: Record<string, string>
    date_range?: { from: string; to: string }
    pagination?: Pagination
    alike?: string
  }): Promise<SimotelEnvelope> {
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

  searchQueueReports(params: {
    conditions?: Record<string, string>
    date_range?: { from: string; to: string }
    pagination?: Pagination
    alike?: string
  }): Promise<SimotelEnvelope> {
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
