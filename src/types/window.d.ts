import type { SimotelPreloadApi } from '../../electron/preload/index'

declare global {
  interface Window {
    simotel: SimotelPreloadApi
  }
}

export {}
