import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import type { Toast } from '../hooks/useToast'
import { ROLE_LABELS, MUNICIPALITIES } from '../lib/constants'

type AddToast = (msg: string, type?: Toast['type']) => void

const ROLES = ['citizen', 'municipal_admin', 'provincial_admin', 'super_admin'] as const

export function UserManagement({ onToast }: { onToast: AddToast }) {
  const { users, isLoading, updateRole } = useUsers()
  const [saving, setSaving] = useState<string | null>(null)
  const [roleMap, setRoleMap]   = useState<Record<string, string>>({})
  const [muniMap, setMuniMap]   = useState<Record<string, string>>({})

  function getRole(id: string, fallback: string) { return roleMap[id] ?? fallback }
  function getMuni(id: string, fallback: string)  { return muniMap[id] ?? fallback }

  async function save(userId: string) {
    const role  = roleMap[userId]
    const muni  = muniMap[userId]
    if (!role) return
    setSaving(userId)
    try {
      await updateRole.mutateAsync({ userId, role, municipality: muni })
      onToast('Role updated', 'success')
      setRoleMap(m => { const n = { ...m }; delete n[userId]; return n })
      setMuniMap(m => { const n = { ...m }; delete n[userId]; return n })
    } catch {
      onToast('Failed to update role', 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="font-bold text-gray-800">👥 Manage User Roles</div>
        <span className="text-xs text-gray-400">{users.length} users</span>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="text-center py-8 text-gray-300 text-sm">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm">No users found</div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {users.map(u => {
              const currentRole = getRole(u.id, u.role)
              const isMuni = currentRole === 'municipal_admin'
              const dirty = roleMap[u.id] !== undefined || muniMap[u.id] !== undefined
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {(u.phoneNumber ?? u.id).slice(-2)}
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <div className="text-sm font-bold text-gray-800">{u.phoneNumber ?? u.id}</div>
                    <div className="text-xs text-gray-400">{ROLE_LABELS[u.role] ?? u.role}</div>
                  </div>
                  <select value={currentRole}
                    onChange={e => setRoleMap(m => ({ ...m, [u.id]: e.target.value }))}
                    className="border-2 border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-green-500">
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                  {isMuni && (
                    <select value={getMuni(u.id, u.municipality ?? 'Bayombong')}
                      onChange={e => setMuniMap(m => ({ ...m, [u.id]: e.target.value }))}
                      className="border-2 border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-green-500">
                      {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                  {dirty && (
                    <button onClick={() => save(u.id)} disabled={saving === u.id}
                      className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-green-800">
                      {saving === u.id ? '…' : 'Save'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
