import { useState } from 'react'
import type { Report } from '../../hooks/useReports'

interface Props {
  report: Report
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmModal({ report, onClose, onConfirm }: Props) {
  const [input, setInput]   = useState('')
  const [busy, setBusy]     = useState(false)
  const valid = input === 'DELETE'

  async function confirm() {
    if (!valid) return
    setBusy(true)
    try { await onConfirm() } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9500] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-red-600 px-5 py-4 flex items-center gap-2.5">
          <span className="text-2xl">⚠️</span>
          <span className="text-base font-extrabold text-white">Confirm Deletion</span>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            This will permanently delete the report <strong>"{report.category}"</strong> from {report.municipality}. This action cannot be undone.
          </p>
          <input value={input} onChange={e => setInput(e.target.value)}
            placeholder="Type DELETE to confirm" autoComplete="off"
            className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors ${valid ? 'border-green-400' : input ? 'border-red-400' : 'border-gray-200'}`} />
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200">Cancel</button>
            <button onClick={confirm} disabled={!valid || busy}
              className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-red-700 transition-all">
              {busy ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
