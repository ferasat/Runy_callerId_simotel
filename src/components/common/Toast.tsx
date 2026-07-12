import { useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'

export function Toast() {
  const toast = useAppStore((s) => s.toast)
  const clearToast = useAppStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 3200)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null
  return <div className={`toast ${toast.tone}`}>{toast.message}</div>
}
