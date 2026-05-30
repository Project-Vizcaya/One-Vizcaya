import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp, type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

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
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'announcements'), orderBy('createdAt', 'desc')),
      snap => { setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement))); setLoading(false) },
      () => setLoading(false),
    )
  }, [])

  const post = useMutation({
    mutationFn: (data: Omit<Announcement, 'id' | 'createdAt'>) =>
      addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, 'announcements', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })

  return { items, loading, post, remove }
}
