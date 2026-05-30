import { createContext, useContext, type ReactNode } from 'react'
import { useAuth, type AdminUser } from '../hooks/useAuth'

interface AuthCtx {
  user: AdminUser | null
  loading: boolean
  signOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  return <Ctx.Provider value={auth}>{children}</Ctx.Provider>
}

export function useAuthContext() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider')
  return ctx
}
