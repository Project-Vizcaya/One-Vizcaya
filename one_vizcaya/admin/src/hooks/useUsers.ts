import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export interface AdminUserRecord {
  id: string
  phoneNumber?: string
  role: string
  municipality?: string
  createdAt?: Timestamp | null
}

export function useUsers() {
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('role')))
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminUserRecord))
    },
    staleTime: 60_000,
  })

  const updateRole = useMutation({
    mutationFn: async ({ userId, role, municipality }: { userId: string; role: string; municipality?: string }) => {
      const payload: Record<string, string> = { role }
      if (municipality) payload['municipality'] = municipality
      await updateDoc(doc(db, 'users', userId), payload)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  return { users, isLoading, updateRole }
}
