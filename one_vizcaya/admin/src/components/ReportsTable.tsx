import { useState, useMemo, useEffect } from 'react'
import type { Report } from '../hooks/useReports'
import type { AdminUser } from '../hooks/useAuth'
import type { Toast } from '../hooks/useToast'
import {
  STATUS_LABELS, PRIORITY_LABELS, STATUS_BADGE_CLASS, PRIORITY_BADGE_CLASS,
} from '../lib/constants'
import { timeAgo, getSLAStatus, exportToCSV } from '../lib/utils'
import { ReportDetailModal } from './modals/ReportDetailModal'
import { DeleteConfirmModal } from './modals/DeleteConfirmModal'

type AddToast = (msg: string, type?: Toast['type'], opts?: { title?: string; sub?: string }) => void

interface Props {
  reports: Report[]
  loading: boolean
  role?: string
  currentUser: AdminUser
  onUpdateStatus: (userId: string, reportId: string, status: string) => Promise<void>
  onUpdateNote: (userId: string, reportId: string, note: string) => Promise<void>
  onAssign: (userId: string, reportId: string, assignedTo: string) => Promise<void>
  onDelete: (userId: string, reportId: string) => Promise<void>
  onToast: AddToast
}

const STATUS_CHIPS = ['all', 'reported', 'acknowledged', 'under_review', 'ongoing', 'solved'] as const

export function ReportsTable({ reports, loading, currentUser, onUpdateStatus, onUpdateNote, onAssign, onDelete, onToast }: Props) {
  const [statusFilter, setStatusFilter]     = useState<string>('all')
  const [search, setSearch]                 = useState('')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const [criticalOnly, setCriticalOnly]     = useState(false)
  const [overdueOnly, setOverdueOnly]       = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<Report | null>(null)
  const [selected, setSelected]             = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus]         = useState('')
  const [bulkBusy, setBulkBusy]             = useState(false)

  const filtered = useMemo(() => {
    let r = reports
    if (statusFilter !== 'all') r = r.filter(x => x.status === statusFilter)
    if (criticalOnly) r = r.filter(x => x.priority === 'critical')
    if (overdueOnly)  r = r.filter(x => getSLAStatus(x) === 'overdue')
    if (search) {
      const s = search.toLowerCase()
      r = r.filter(x =>
        x.category?.toLowerCase().includes(s) ||
        x.municipality?.toLowerCase().includes(s) ||
        x.description?.toLowerCase().includes(s) ||
        x.location?.toLowerCase().includes(s)
      )
    }
    if (dateFrom) r = r.filter(x => {
      if (!x.reportedAt) return false
      const d = (x.reportedAt as { toDate(): Date }).toDate()
      return d >= new Date(dateFrom)
    })
    if (dateTo) r = r.filter(x => {
      if (!x.reportedAt) return false
      const d = (x.reportedAt as { toDate(): Date }).toDate()
      return d <= new Date(dateTo + 'T23:59:59')
    })
    return r
  }, [reports, statusFilter, criticalOnly, overdueOnly, search, dateFrom, dateTo])

  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(filtered.map(r => r.id)))
    else setSelected(new Set())
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function applyBulk() {
    if (!bulkStatus || selected.size === 0) return
    setBulkBusy(true)
    const targets = filtered.filter(r => selected.has(r.id))
    await Promise.all(targets.map(r => onUpdateStatus(r.userId, r.id, bulkStatus)))
    onToast(`Updated ${targets.length} reports to "${STATUS_LABELS[bulkStatus]}"`, 'success')
    setSelected(new Set())
    setBulkBusy(false)
  }

  function doExport() {
    exportToCSV(filtered.map(r => ({
      id: r.id,
      category: r.category,
      municipality: r.municipality,
      status: r.status,
      priority: r.priority,
      location: r.location ?? '',
      reportedAt: r.reportedAt ? (r.reportedAt as { toDate(): Date }).toDate().toISOString() : '',
      assignedTo: r.assignedTo ?? '',
    })), `reports-${new Date().toISOString().slice(0, 10)}.csv`)
    onToast('CSV exported', 'success')
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'r' || e.key === 'R') setStatusFilter('all')
      if (e.key === 'e' || e.key === 'E') doExport()
      if (e.key === 'f' || e.key === 'F') document.getElementById('report-search')?.focus()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered])

  const overdueCount = reports.filter(r => getSLAStatus(r) === 'overdue').length

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 font-bold text-gray-800">
            Live Reports
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {overdueCount > 0 && (
              <span className="bg-red-600 text-white rounded-full text-xs font-extrabold px-2 py-0.5">{overdueCount} overdue</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{filtered.length} reports</span>
            <button onClick={doExport}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all">
              ⬇ Export CSV
            </button>
          </div>
        </div>

        <div className="px-5 pt-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <input id="report-search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 flex-1 min-w-[160px]" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-green-500" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-green-500" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50">Clear</button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            {STATUS_CHIPS.map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  statusFilter === s
                    ? 'bg-green-700 border-green-700 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                }`}>
                {s === 'all' ? 'All' : STATUS_LABELS[s]}
              </button>
            ))}
            <button onClick={() => setCriticalOnly(v => !v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${criticalOnly ? 'bg-red-600 border-red-600 text-white' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
              🚨 Critical
            </button>
            <button onClick={() => setOverdueOnly(v => !v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${overdueOnly ? 'bg-red-600 border-red-600 text-white' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
              ⏰ Overdue
            </button>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-blue-700 text-white rounded-xl px-4 py-2.5 flex-wrap">
              <span className="text-sm font-bold">{selected.size} selected</span>
              <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-800 border-none outline-none">
                <option value="">Mark as…</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button onClick={applyBulk} disabled={!bulkStatus || bulkBusy}
                className="bg-white text-blue-700 px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-50">
                {bulkBusy ? 'Updating…' : 'Apply'}
              </button>
              <button onClick={() => setSelected(new Set())}
                className="border border-white/50 px-3 py-1 rounded-lg text-sm">Cancel</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left px-3 py-2.5 w-9">
                  <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} />
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Category</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Municipality</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Priority</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell">Location</th>
                <th className="text-left px-3 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Reported</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><EmptyState icon="⏳" text="Loading reports…" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon="📭" text="No reports match your filters" /></td></tr>
              ) : filtered.map(r => {
                const sla = getSLAStatus(r)
                return (
                  <tr key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selected.has(r.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleRow(r.id) }}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
                    </td>
                    <td className="px-3 py-2.5 max-w-[180px] truncate font-medium text-gray-800">
                      {r.category}
                      {sla === 'overdue' && <span className="ml-1.5 text-[10px] font-bold bg-red-50 text-red-600 rounded-full px-1.5 py-0.5">⏰ Overdue</span>}
                      {sla === 'warning' && <span className="ml-1.5 text-[10px] font-bold bg-orange-50 text-orange-600 rounded-full px-1.5 py-0.5">⚠ Due soon</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{r.municipality}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_BADGE_CLASS[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${PRIORITY_BADGE_CLASS[r.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                        {PRIORITY_LABELS[r.priority] ?? r.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 hidden md:table-cell max-w-[160px] truncate">{r.location ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 hidden sm:table-cell">{timeAgo(r.reportedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          currentUser={currentUser}
          onClose={() => setSelectedReport(null)}
          onUpdateStatus={onUpdateStatus}
          onUpdateNote={onUpdateNote}
          onAssign={onAssign}
          onDelete={r => { setDeleteTarget(r); setSelectedReport(null) }}
          onToast={onToast}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          report={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await onDelete(deleteTarget.userId, deleteTarget.id)
            onToast('Report deleted', 'success')
            setDeleteTarget(null)
          }}
        />
      )}
    </>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-14 text-gray-300">
      <div className="text-4xl mb-2">{icon}</div>
      <div className="text-sm text-gray-400">{text}</div>
    </div>
  )
}
