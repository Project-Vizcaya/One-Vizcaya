import { createContext, useContext } from 'react'
import type { Toast } from '../hooks/useToast'

type AddToast = (message: string, type?: Toast['type'], opts?: { title?: string; sub?: string }) => void

export const ToastContext = createContext<AddToast>(() => {})

export function useToastContext() {
  return useContext(ToastContext)
}
