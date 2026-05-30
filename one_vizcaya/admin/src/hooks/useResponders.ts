import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface Responder {
  id: string
  name: string
  type: 'mdrrmo' | 'police' | 'fire' | 'hospital' | 'health' | 'dpwh' | string
  municipality: string
  phone: string
  latitude?: number
  longitude?: number
  address?: string
}

export function useResponders() {
  const qc = useQueryClient()

  const { data: responders = [], isLoading } = useQuery({
    queryKey: ['responders'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'responders'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Responder))
    },
    staleTime: 5 * 60_000,
  })

  const add = useMutation({
    mutationFn: async (data: Omit<Responder, 'id'>) => {
      await addDoc(collection(db, 'responders'), { ...data, createdAt: serverTimestamp() })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['responders'] }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => deleteDoc(doc(db, 'responders', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['responders'] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Responder> }) => {
      await updateDoc(doc(db, 'responders', id), data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['responders'] }),
  })

  return { responders, isLoading, add, remove, update }
}
