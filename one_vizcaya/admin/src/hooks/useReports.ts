import { useEffect, useState } from 'react'
import {
  collectionGroup,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isProvincialRole } from '../lib/utils'

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
    const isProvincial = isProvincialRole(role)
    const base = collectionGroup(db, 'reports')
    const q = isProvincial
      ? query(base, orderBy('reportedAt', 'desc'))
      : query(base, where('municipality', '==', municipality), orderBy('reportedAt', 'desc'))

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        userId: d.ref.parent.parent?.id ?? '',
        ...d.data(),
      })) as Report[]
      setReports(docs)
      setLoading(false)
    }, () => setLoading(false))

    return unsub
  }, [role, municipality])

  async function updateReportStatus(userId: string, reportId: string, status: string) {
    await updateDoc(doc(db, 'users', userId, 'reports', reportId), {
      status,
      updatedAt: serverTimestamp(),
    })
  }

  async function updateReportNote(userId: string, reportId: string, note: string) {
    await updateDoc(doc(db, 'users', userId, 'reports', reportId), {
      notes: note,
      updatedAt: serverTimestamp(),
    })
  }

  async function assignReport(userId: string, reportId: string, assignedTo: string) {
    await updateDoc(doc(db, 'users', userId, 'reports', reportId), {
      assignedTo,
      updatedAt: serverTimestamp(),
    })
  }

  async function deleteReport(userId: string, reportId: string) {
    await deleteDoc(doc(db, 'users', userId, 'reports', reportId))
  }

  return { reports, loading, updateReportStatus, updateReportNote, assignReport, deleteReport }
}
