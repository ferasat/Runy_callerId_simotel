/** Renderer-side API façade over the secure preload bridge. */

export const api = {
  get bridge() {
    if (typeof window === 'undefined' || !window.simotel) {
      throw new Error('Simotel bridge unavailable — run inside Electron')
    }
    return window.simotel
  },
  isAvailable(): boolean {
    return typeof window !== 'undefined' && Boolean(window.simotel)
  }
}
