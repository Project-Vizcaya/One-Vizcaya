import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { ALLOWED_ROLES } from './constants'

export interface AdminUser {
  uid: string
  phoneNumber: string
  role: string
  municipality: string
}

interface Ctx {
  user: AdminUser | null
  loading: boolean
  signOut: () => void
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (fb: User | null) => {
      if (!fb) { setUser(null); setLoading(false); return }
      try {
        const snap = await getDoc(doc(db, 'users', fb.uid))
        const data = snap.exists() ? snap.data() : {}
        const role: string = data['role'] ?? 'citizen'
        if (!ALLOWED_ROLES.includes(role as never)) {
          await fbSignOut(auth); setUser(null)
        } else {
          setUser({ uid: fb.uid, phoneNumber: fb.phoneNumber ?? '', role, municipality: data['municipality'] ?? 'Bambang' })
        }
      } catch { setUser(null) }
      finally { setLoading(false) }
    })
  }, [])

  return <AuthCtx.Provider value={{ user, loading, signOut: () => fbSignOut(auth) }}>{children}</AuthCtx.Provider>
}

export function useAuthContext() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuthContext outside AuthProvider')
  return ctx
}
