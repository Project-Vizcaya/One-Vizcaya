import { useState } from 'react'
import type { Report } from '../../hooks/useReports'
import type { AdminUser } from '../../hooks/useAuth'
import type { Toast } from '../../hooks/useToast'
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_BADGE_CLASS, CANNED_RESPONSES } from '../../lib/constants'
import { timeAgo, formatDate } from '../../lib/utils'

type AddToast = (msg: string, type?: Toast['type']) => void

interface Props {
  report: Report
  currentUser?: AdminUser
  onClose: () => void
  onUpdateStatus: (userId: string, id: string, status: string) => Promise<void>
  onUpdateNote: (userId: string, id: string, note: string) => Promise<void>
  onAssign: (userId: string, id: string, assignedTo: string) => Promise<void>
  onDelete: (r: Report) => void
  onToast: AddToast
}

export function ReportDetailModal({ report, onClose, onUpdateStatus, onUpdateNote, onAssign, onDelete, onToast }: Props) {
  const [note, setNote]         = useState(report.notes ?? '')
  const [status, setStatus]     = useState(report.status)
  const [assignedTo, setAssignedTo] = useState(report.assignedTo ?? '')
  const [saving, setSaving]     = useState(false)

  async function save() {
    setSaving(true)
    try {
      if (status !== report.status) await onUpdateStatus(report.userId, report.id, status)
      if (note !== (report.notes ?? '')) await onUpdateNote(report.userId, report.id, note)
      if (assignedTo !== (report.assignedTo ?? '')) await onAssign(report.userId, report.id, assignedTo)
      onToast('Report updated', 'success')
      onClose()
    } catch {
      onToast('Failed to update report', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-lg font-extrabold text-gray-900">{report.category}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{report.municipality} · {timeAgo(report.reportedAt)}</p>
            </div>
            <div className="flex gap-2 items-center">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_BADGE_CLASS[report.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                {PRIORITY_LABELS[report.priority] ?? report.priority}
              </span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
          </div>

          {report.imageUrl && (
            <img src={report.imageUrl} alt="Report" className="w-full h-48 object-cover rounded-xl mb-4 border border-gray-100" />
          )}

          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Description</div>
              <p className="text-sm text-gray-700 leading-relaxed">{report.description || '—'}</p>
            </div>

            {report.location && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Location</div>
                <p className="text-sm text-gray-600">{report.location}</p>
                {report.latitude && report.longitude && (
                  <a href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 font-semibold mt-0.5 inline-block hover:underline">
                    📍 View on Google Maps
                  </a>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Assigned To</label>
              <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                placeholder="Responder name or team"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Internal Notes</label>
              <select onChange={e => { if (e.target.value) setNote(e.target.value); e.target.value = '' }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none mb-2">
                <option value="">— Quick Response Template —</option>
                {CANNED_RESPONSES.map((r, i) => <option key={i} value={r}>{r.slice(0, 60)}…</option>)}
              </select>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                placeholder="Add internal notes…"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500 resize-y" />
              <div className={`text-xs text-right mt-1 ${note.length > 500 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {note.length}/500
              </div>
            </div>

            <div className="text-xs text-gray-400 flex gap-4 flex-wrap">
              <span>Reported: {formatDate(report.reportedAt)}</span>
              <span>Updated: {formatDate(report.updatedAt)}</span>
              {report.isAnonymous && <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-xs">Anonymous</span>}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button onClick={() => onDelete(report)}
            className="px-3 py-2 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all">
            🗑 Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all">Cancel</button>
            <button onClick={save} disabled={saving}
              className="px-5 py-2 bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-800 transition-all disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
