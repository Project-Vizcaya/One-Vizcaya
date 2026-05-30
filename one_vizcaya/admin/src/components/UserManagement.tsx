import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUsers } from '@/hooks/useUsers'
import { ROLE_LABELS, MUNICIPALITIES } from '@/lib/constants'

const ROLES = ['citizen', 'municipal_admin', 'provincial_admin', 'super_admin'] as const

export function UserManagement() {
  const { users, isLoading, updateRole } = useUsers()
  const [pending, setPending] = useState<Record<string, { role?: string; muni?: string }>>({})
  const [saving, setSaving]  = useState<string | null>(null)

  function setRole(id: string, role: string) { setPending(p => ({ ...p, [id]: { ...p[id], role } })) }
  function setMuni(id: string, muni: string) { setPending(p => ({ ...p, [id]: { ...p[id], muni } })) }

  async function save(userId: string, currentRole: string, currentMuni?: string) {
    const p = pending[userId]
    if (!p) return
    setSaving(userId)
    try {
      await updateRole.mutateAsync({ userId, role: p.role ?? currentRole, municipality: p.muni ?? currentMuni })
      toast.success('Role updated')
      setPending(prev => { const n = { ...prev }; delete n[userId]; return n })
    } catch { toast.error('Failed to update role') }
    finally { setSaving(null) }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">👥 Manage User Roles</CardTitle>
          <span className="text-xs text-muted-foreground">{users.length} users</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No users found</p>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {users.map(u => {
              const p = pending[u.id]
              const currentRole = p?.role ?? u.role
              const isMuni      = currentRole === 'municipal_admin'
              const dirty       = !!p

              return (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-muted/30 transition-colors flex-wrap">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {(u.phoneNumber ?? u.id).slice(-2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-[120px]">
                    <p className="text-sm font-semibold">{u.phoneNumber ?? u.id}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role}</p>
                  </div>
                  <Select value={currentRole} onValueChange={v => setRole(u.id, v)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {isMuni && (
                    <Select value={p?.muni ?? u.municipality ?? 'Bayombong'} onValueChange={v => setMuni(u.id, v)}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {dirty && (
                    <Button size="sm" onClick={() => save(u.id, u.role, u.municipality)} disabled={saving === u.id} className="h-8 text-xs">
                      {saving === u.id ? '…' : 'Save'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
