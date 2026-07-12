/**
 * Offline / resilience helpers.
 * Detect internet & server loss, queue requests, retry with backoff.
 */

export type OfflineStatus = 'online' | 'offline' | 'server_down'

export class RequestQueue {
  private items: Array<{
    id: string
    run: () => Promise<unknown>
    retries: number
  }> = []
  private flushing = false
  private maxRetries: number
  private onStatus?: (status: OfflineStatus) => void

  constructor(opts: { maxRetries?: number; onStatus?: (s: OfflineStatus) => void } = {}) {
    this.maxRetries = opts.maxRetries ?? 5
    this.onStatus = opts.onStatus
  }

  enqueue(id: string, run: () => Promise<unknown>): void {
    this.items.push({ id, run, retries: 0 })
  }

  size(): number {
    return this.items.length
  }

  async flush(): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    try {
      while (this.items.length) {
        const item = this.items[0]
        try {
          await item.run()
          this.items.shift()
          this.onStatus?.('online')
        } catch {
          item.retries += 1
          this.onStatus?.('server_down')
          if (item.retries >= this.maxRetries) {
            this.items.shift()
          } else {
            await sleep(Math.min(30_000, 500 * 2 ** item.retries))
            break
          }
        }
      }
    } finally {
      this.flushing = false
    }
  }
}

export function detectInternet(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true
  }
  return navigator.onLine
}

export function watchConnectivity(onChange: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const up = (): void => onChange(true)
  const down = (): void => onChange(false)
  window.addEventListener('online', up)
  window.addEventListener('offline', down)
  return () => {
    window.removeEventListener('online', up)
    window.removeEventListener('offline', down)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
