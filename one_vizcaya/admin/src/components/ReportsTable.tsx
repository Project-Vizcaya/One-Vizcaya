import { useState, useMemo, useEffect } from 'react'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Report } from '@/hooks/useReports'
import type { AdminUser } from '@/lib/authContext'
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_COLOR, PRIORITY_COLOR, CANNED_RESPONSES } from '@/lib/constants'
import { timeAgo, formatDate, getSLAStatus, exportToCSV } from '@/lib/utils'

interface Props {
  reports: Report[]
  loading: boolean
  currentUser: AdminUser
  onUpdateStatus: (uid: string, id: string, status: string) => Promise<void>
  onUpdateNote: (uid: string, id: string, notes: string) => Promise<void>
  onAssign: (uid: string, id: string, assignedTo: string) => Promise<void>
  onDelete: (uid: string, id: string) => Promise<void>
}

const STATUS_CHIPS = ['all', 'reported', 'acknowledged', 'under_review', 'ongoing', 'solved'] as const

export function ReportsTable({ reports, loading, onUpdateStatus, onUpdateNote, onAssign, onDelete }: Props) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch]             = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [overdueOnly, setOverdueOnly]   = useState(false)
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus]     = useState('')
  const [bulkBusy, setBulkBusy]         = useState(false)

  /* detail modal */
  const [detail, setDetail]         = useState<Report | null>(null)
  const [dStatus, setDStatus]       = useState('')
  const [dNote, setDNote]           = useState('')
  const [dAssigned, setDAssigned]   = useState('')
  const [dSaving, setDSaving]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput]     = useState('')
  const [deleting, setDeleting]           = useState(false)

  function openDetail(r: Report) {
    setDetail(r); setDStatus(r.status); setDNote(r.notes ?? ''); setDAssigned(r.assignedTo ?? '')
    setDeleteConfirm(false); setDeleteInput('')
  }
  function closeDetail() { setDetail(null) }

  const filtered = useMemo(() => {
    let r = reports
    if (statusFilter !== 'all') r = r.filter(x => x.status === statusFilter)
    if (criticalOnly) r = r.filter(x => x.priority === 'critical')
    if (overdueOnly)  r = r.filter(x => getSLAStatus(x) === 'overdue')
    if (search) {
      const s = search.toLowerCase()
      r = r.filter(x => [x.category, x.municipality, x.description, x.location].some(f => f?.toLowerCase().includes(s)))
    }
    if (dateFrom) r = r.filter(x => x.reportedAt && (x.reportedAt as { toDate(): Date }).toDate() >= new Date(dateFrom))
    if (dateTo)   r = r.filter(x => x.reportedAt && (x.reportedAt as { toDate(): Date }).toDate() <= new Date(dateTo + 'T23:59:59'))
    return r
  }, [reports, statusFilter, criticalOnly, overdueOnly, search, dateFrom, dateTo])

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))

  function toggleAll(v: boolean) { setSelected(v ? new Set(filtered.map(r => r.id)) : new Set()) }
  function toggleRow(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function applyBulk() {
    if (!bulkStatus || !selected.size) return
    setBulkBusy(true)
    const targets = filtered.filter(r => selected.has(r.id))
    await Promise.all(targets.map(r => onUpdateStatus(r.userId, r.id, bulkStatus)))
    toast.success(`Updated ${targets.length} reports`)
    setSelected(new Set()); setBulkBusy(false)
  }

  async function saveDetail() {
    if (!detail) return
    setDSaving(true)
    try {
      if (dStatus !== detail.status) await onUpdateStatus(detail.userId, detail.id, dStatus)
      if (dNote !== (detail.notes ?? '')) await onUpdateNote(detail.userId, detail.id, dNote)
      if (dAssigned !== (detail.assignedTo ?? '')) await onAssign(detail.userId, detail.id, dAssigned)
      toast.success('Report updated')
      closeDetail()
    } catch { toast.error('Failed to update') }
    finally { setDSaving(false) }
  }

  async function doDelete() {
    if (!detail || deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      await onDelete(detail.userId, detail.id)
      toast.success('Report deleted')
      closeDetail()
    } finally { setDeleting(false) }
  }

  function doExport() {
    exportToCSV(filtered.map(r => ({ id: r.id, category: r.category, municipality: r.municipality, status: r.status, priority: r.priority, location: r.location ?? '', reportedAt: r.reportedAt ? (r.reportedAt as { toDate(): Date }).toDate().toISOString() : '' })), `reports-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('CSV exported')
  }

  useEffect(() => {
    function kbd(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'e' || e.key === 'E') doExport()
    }
    window.addEventListener('keydown', kbd)
    return () => window.removeEventListener('keydown', kbd)
  })

  const overdueCount = reports.filter(r => getSLAStatus(r) === 'overdue').length

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              Live Reports
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {overdueCount > 0 && <Badge variant="destructive" className="text-xs">{overdueCount} overdue</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
              <Button variant="outline" size="sm" onClick={doExport} className="text-xs h-8">
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search reports…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs w-36" />
            <Input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="h-9 text-xs w-36" />
            {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }} className="h-9 text-xs">Clear</Button>}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {STATUS_CHIPS.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
            <button onClick={() => setCriticalOnly(v => !v)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${criticalOnly ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-destructive/30 text-destructive hover:bg-destructive/10'}`}>
              🚨 Critical
            </button>
            <button onClick={() => setOverdueOnly(v => !v)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${overdueOnly ? 'bg-destructive text-destructive-foreground border-destructive' : 'border-destructive/30 text-destructive hover:bg-destructive/10'}`}>
              ⏰ Overdue
            </button>
          </div>

          {/* Bulk action */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex-wrap">
              <span className="text-sm font-semibold text-blue-800">{selected.size} selected</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Mark as…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={applyBulk} disabled={!bulkStatus || bulkBusy} className="h-8 text-xs">
                {bulkBusy ? 'Updating…' : 'Apply'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="h-8 text-xs">Cancel</Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Municipality</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="hidden md:table-cell">Location</TableHead>
                <TableHead className="hidden sm:table-cell">Reported</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading reports…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No reports match your filters</TableCell></TableRow>
              ) : filtered.map(r => {
                const sla = getSLAStatus(r)
                return (
                  <TableRow key={r.id} className={`cursor-pointer ${selected.has(r.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => openDetail(r)}>
                    <TableCell className="px-4" onClick={e => { e.stopPropagation(); toggleRow(r.id) }}>
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} />
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px]">
                      <span className="truncate block">{r.category}</span>
                      {sla === 'overdue' && <Badge variant="destructive" className="mt-0.5 text-[10px] h-4">⏰ Overdue</Badge>}
                      {sla === 'warning' && <span className="text-[10px] text-orange-600 font-medium">⚠ Due soon</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{r.municipality}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status] ?? ''}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLOR[r.priority] ?? ''}`}>
                        {PRIORITY_LABELS[r.priority] ?? r.priority}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[160px] truncate">{r.location ?? '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{timeAgo(r.reportedAt)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail modal */}
      <Dialog open={!!detail} onOpenChange={open => !open && closeDetail()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.category}</DialogTitle>
                <DialogDescription>{detail.municipality} · {timeAgo(detail.reportedAt)}</DialogDescription>
              </DialogHeader>

              {detail.imageUrl && (
                <img src={detail.imageUrl} alt="Report" className="w-full h-48 object-cover rounded-lg border" />
              )}

              <div className="space-y-4 py-2">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Description</Label>
                  <p className="text-sm mt-1 leading-relaxed">{detail.description || '—'}</p>
                </div>

                {detail.location && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location</Label>
                    <p className="text-sm mt-1">{detail.location}</p>
                    {detail.latitude && detail.longitude && (
                      <a href={`https://maps.google.com/?q=${detail.latitude},${detail.longitude}`}
                        target="_blank" rel="noreferrer" className="text-xs text-primary font-medium hover:underline">
                        📍 View on Google Maps →
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Status</Label>
                    <Select value={dStatus} onValueChange={setDStatus}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Priority</Label>
                    <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${PRIORITY_COLOR[detail.priority] ?? ''}`}>
                      {PRIORITY_LABELS[detail.priority] ?? detail.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Assigned To</Label>
                  <Input value={dAssigned} onChange={e => setDAssigned(e.target.value)} placeholder="Responder or team" className="mt-1" />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes</Label>
                  <Select onValueChange={v => v && setDNote(v)}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="— Quick response template —" /></SelectTrigger>
                    <SelectContent>
                      {CANNED_RESPONSES.map((r, i) => <SelectItem key={i} value={r}>{r.slice(0, 55)}…</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea value={dNote} onChange={e => setDNote(e.target.value)} placeholder="Internal notes…" rows={3} className="mt-2 resize-none" />
                  <p className={`text-xs text-right mt-1 ${dNote.length > 500 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{dNote.length}/500</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Reported {formatDate(detail.reportedAt)} · Updated {formatDate(detail.updatedAt)}
                  {detail.isAnonymous && <Badge variant="secondary" className="ml-2 text-xs">Anonymous</Badge>}
                </p>

                {deleteConfirm && (
                  <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-destructive">Type DELETE to confirm permanent deletion</p>
                    <Input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                      placeholder="DELETE" className="border-destructive/30 text-sm" />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 flex-wrap sm:flex-nowrap">
                {!deleteConfirm ? (
                  <Button variant="destructive" size="sm" className="mr-auto" onClick={() => setDeleteConfirm(true)}>
                    Delete
                  </Button>
                ) : (
                  <Button variant="destructive" size="sm" className="mr-auto"
                    disabled={deleteInput !== 'DELETE' || deleting} onClick={doDelete}>
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                  </Button>
                )}
                <Button variant="outline" onClick={closeDetail}>Cancel</Button>
                <Button onClick={saveDetail} disabled={dSaving}>{dSaving ? 'Saving…' : 'Save Changes'}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
