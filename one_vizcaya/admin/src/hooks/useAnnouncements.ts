import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'

export interface Announcement {
  id: string
  title: string
  body: string
  postedBy: string
  municipality: string
  urgent: boolean
  scheduledAt: Timestamp | null
  createdAt: Timestamp | null
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  const post = useMutation({
    mutationFn: async (data: Omit<Announcement, 'id' | 'createdAt'>) => {
      await addDoc(collection(db, 'announcements'), {
        ...data,
        createdAt: serverTimestamp(),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'announcements', id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  return { announcements, loading, post, remove }
}
