import { useEffect, useState } from 'react'
import {
  collectionGroup, query, where, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, serverTimestamp, type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { isProvincialRole } from '@/lib/utils'

export interface Report {
  id: string
  userId: string
  category: string
  municipality: string
  status: string
  priority: string
  description: string
  location?: string
  latitude?: number
  longitude?: number
  reportedAt: Timestamp | null
  updatedAt: Timestamp | null
  assignedTo?: string
  notes?: string
  isAnonymous?: boolean
  imageUrl?: string
  barangay?: string
}

export function useReports(role: string, municipality: string) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const base = collectionGroup(db, 'reports')
    const q = isProvincialRole(role)
      ? query(base, orderBy('reportedAt', 'desc'))
      : query(base, where('municipality', '==', municipality), orderBy('reportedAt', 'desc'))

    return onSnapshot(q, snap => {
      setReports(snap.docs.map(d => ({ id: d.id, userId: d.ref.parent.parent?.id ?? '', ...d.data() } as Report)))
      setLoading(false)
    }, () => setLoading(false))
  }, [role, municipality])

  const ref = (userId: string, id: string) => doc(db, 'users', userId, 'reports', id)

  const updateStatus = (userId: string, id: string, status: string) =>
    updateDoc(ref(userId, id), { status, updatedAt: serverTimestamp() })

  const updateNote = (userId: string, id: string, notes: string) =>
    updateDoc(ref(userId, id), { notes, updatedAt: serverTimestamp() })

  const assign = (userId: string, id: string, assignedTo: string) =>
    updateDoc(ref(userId, id), { assignedTo, updatedAt: serverTimestamp() })

  const remove = (userId: string, id: string) => deleteDoc(ref(userId, id))

  return { reports, loading, updateStatus, updateNote, assign, remove }
}
