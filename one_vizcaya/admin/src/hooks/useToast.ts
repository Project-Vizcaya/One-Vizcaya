import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  message: string
  type?: 'default' | 'success' | 'error' | 'new-report'
  title?: string
  sub?: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'default', opts?: { title?: string; sub?: string }) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type, ...opts }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
