import { useState } from 'react'
import { Phone, MessageSquare, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useResponders, type Responder } from '@/hooks/useResponders'
import { MUNICIPALITIES } from '@/lib/constants'

const TYPE_ICONS: Record<string, string> = { mdrrmo: '🚨', police: '👮', fire: '🚒', hospital: '🏥', health: '⚕️', dpwh: '🏗️' }
const TYPE_COLORS: Record<string, string> = { mdrrmo: 'bg-red-50', police: 'bg-blue-50', fire: 'bg-orange-50', hospital: 'bg-purple-50', health: 'bg-teal-50', dpwh: 'bg-yellow-50' }
const TYPES = ['all', 'mdrrmo', 'police', 'fire', 'hospital', 'health', 'dpwh'] as const
const TYPE_LABELS: Record<string, string> = { all: 'All', mdrrmo: 'MDRRMO', police: 'Police', fire: 'Fire', hospital: 'Hospital', health: 'Health', dpwh: 'DPWH' }

export function ResponderDirectory() {
  const { responders, isLoading, add, remove, update } = useResponders()
  const [typeFilter, setTypeFilter] = useState('all')
  const [muniFilter, setMuniFilter] = useState('all')
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState<Responder | 'new' | null>(null)

  const filtered = responders.filter(r =>
    (typeFilter === 'all' || r.type === typeFilter) &&
    (muniFilter === 'all' || r.municipality === muniFilter) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()))
  )

  async function handleSave(data: Omit<Responder, 'id'>) {
    if (modal === 'new') {
      await add.mutateAsync(data); toast.success('Responder added')
    } else if (modal) {
      await update.mutateAsync({ id: modal.id, data }); toast.success('Responder updated')
    }
    setModal(null)
  }

  async function handleDelete(id: string) {
    await remove.mutateAsync(id); toast.success('Responder deleted'); setModal(null)
  }

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">🚨 Responder Directory</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{filtered.length}</span>
              <Button variant="outline" size="sm" onClick={() => setModal('new')} className="h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>

          <Select value={muniFilter} onValueChange={setMuniFilter}>
            <SelectTrigger className="h-9 text-sm mt-2"><SelectValue placeholder="All Municipalities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Municipalities</SelectItem>
              {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search responders…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>

          <div className="flex flex-wrap gap-1">
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${typeFilter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 overflow-y-auto" style={{ maxHeight: 500 }}>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No responders found</p>
          ) : (
            <div className="space-y-1 p-3">
              {filtered.map(r => (
                <button key={r.id} onClick={() => setModal(r)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border text-left hover:bg-muted/50 hover:border-primary/30 transition-all group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${TYPE_COLORS[r.type] ?? 'bg-muted'}`}>
                    {TYPE_ICONS[r.type] ?? '🏢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.municipality}</p>
                    <p className="text-xs text-primary font-medium mt-0.5">{r.phone}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <a href={`tel:${r.phone}`} onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-[10px] font-bold hover:bg-green-100">
                        <Phone className="h-3 w-3" /> Call
                      </a>
                      <a href={`sms:${r.phone}`} onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-md text-[10px] font-bold hover:bg-yellow-100">
                        <MessageSquare className="h-3 w-3" /> SMS
                      </a>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {modal !== null && (
        <ResponderFormModal
          responder={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}

function ResponderFormModal({ responder, onClose, onSave, onDelete }: {
  responder: Responder | null
  onClose: () => void
  onSave: (d: Omit<Responder, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [f, setF] = useState({ name: responder?.name ?? '', type: responder?.type ?? 'mdrrmo', municipality: responder?.municipality ?? 'Bayombong', phone: responder?.phone ?? '', address: responder?.address ?? '', lat: String(responder?.latitude ?? ''), lng: String(responder?.longitude ?? '') })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const u = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }))

  async function save() {
    if (!f.name || !f.phone) return
    setSaving(true)
    try { await onSave({ name: f.name, type: f.type, municipality: f.municipality, phone: f.phone, address: f.address, latitude: f.lat ? +f.lat : undefined, longitude: f.lng ? +f.lng : undefined }) }
    finally { setSaving(false) }
  }
  async function del() {
    if (!responder) return
    setDeleting(true)
    try { await onDelete(responder.id) } finally { setDeleting(false) }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{responder ? 'Edit Responder' : 'Add Responder'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {([['name', 'Name'], ['phone', 'Phone'], ['address', 'Address']] as const).map(([k, lbl]) => (
            <div key={k}><Label className="text-xs">{lbl}</Label><Input value={f[k]} onChange={e => u(k)(e.target.value)} className="mt-1" /></div>
          ))}
          <div><Label className="text-xs">Type</Label>
            <Select value={f.type} onValueChange={u('type')}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{['mdrrmo','police','fire','hospital','health','dpwh'].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Municipality</Label>
            <Select value={f.municipality} onValueChange={u('municipality')}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Latitude</Label><Input value={f.lat} onChange={e => u('lat')(e.target.value)} type="number" step="any" className="mt-1" /></div>
            <div><Label className="text-xs">Longitude</Label><Input value={f.lng} onChange={e => u('lng')(e.target.value)} type="number" step="any" className="mt-1" /></div>
          </div>
        </div>
        <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
          {responder && <Button variant="destructive" size="sm" className="mr-auto" onClick={del} disabled={deleting}>{deleting ? '…' : 'Delete'}</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !f.name || !f.phone}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
