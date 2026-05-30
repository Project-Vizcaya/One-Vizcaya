import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { ALLOWED_ROLES } from '../lib/constants'

export interface AdminUser {
  uid: string
  phoneNumber: string
  role: string
  municipality: string
}

export function useAuth() {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: User | null) => {
      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        const data = snap.exists() ? snap.data() : {}
        const role: string = data['role'] || 'citizen'
        if (!ALLOWED_ROLES.includes(role as never)) {
          await fbSignOut(auth)
          setUser(null)
        } else {
          setUser({
            uid: fbUser.uid,
            phoneNumber: fbUser.phoneNumber ?? '',
            role,
            municipality: data['municipality'] || 'Bambang',
          })
        }
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const signOut = () => fbSignOut(auth)

  return { user, loading, signOut }
}
