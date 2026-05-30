import { useState } from 'react'
import { useResponders, type Responder } from '../hooks/useResponders'
import type { Toast } from '../hooks/useToast'
import { ResponderModal } from './modals/ResponderModal'

type AddToast = (msg: string, type?: Toast['type']) => void

const TYPE_ICONS: Record<string, string> = {
  mdrrmo: '🚨', police: '👮', fire: '🚒', hospital: '🏥', health: '⚕️', dpwh: '🏗️'
}

const TYPE_COLORS: Record<string, string> = {
  mdrrmo: 'bg-red-50', police: 'bg-blue-50', fire: 'bg-orange-50',
  hospital: 'bg-purple-50', health: 'bg-teal-50', dpwh: 'bg-yellow-50'
}

const TYPES = ['all', 'mdrrmo', 'police', 'fire', 'hospital', 'health', 'dpwh'] as const
const TYPE_LABELS: Record<string, string> = { all: 'All', mdrrmo: 'MDRRMO', police: 'Police', fire: 'Fire', hospital: 'Hospital', health: 'Health', dpwh: 'DPWH' }

interface Props { role?: string; municipality?: string; onToast: AddToast }

export function ResponderDirectory({ onToast }: Props) {
  const { responders, isLoading, add, remove, update } = useResponders()
  const [typeFilter, setTypeFilter]   = useState<string>('all')
  const [muniFilter, setMuniFilter]   = useState<string>('all')
  const [search, setSearch]           = useState('')
  const [modal, setModal]             = useState<Responder | null | 'new'>(null)

  const filtered = responders.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false
    if (muniFilter !== 'all' && r.municipality !== muniFilter) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.municipality.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleSave(data: Omit<Responder, 'id'>) {
    if (modal === 'new') {
      await add.mutateAsync(data)
      onToast('Responder added', 'success')
    } else if (modal) {
      await update.mutateAsync({ id: modal.id, data })
      onToast('Responder updated', 'success')
    }
    setModal(null)
  }

  async function handleDelete(id: string) {
    await remove.mutateAsync(id)
    onToast('Responder deleted', 'success')
    setModal(null)
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-gray-800 text-sm">🚨 Responder Directory</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModal('new')}
              className="border border-gray-200 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all">
              + Add
            </button>
            <span className="text-xs text-gray-400">{filtered.length}</span>
          </div>
        </div>

        <div className="px-4 pt-3 pb-2 space-y-2">
          <select value={muniFilter} onChange={e => setMuniFilter(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="all">All Municipalities</option>
            {['Ambaguio','Aritao','Bagabag','Bambang','Bayombong','Diadi','Dupax del Norte','Dupax del Sur','Kasibu','Kayapa','Quezon','Santa Fe','Solano','Villaverde','Alfonso Castañeda'].map(m =>
              <option key={m} value={m}>{m}</option>
            )}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search responders…"
            className="w-full border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-green-500" />
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${typeFilter === t ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2" style={{ maxHeight: 520 }}>
          {isLoading ? (
            <div className="text-center py-8 text-gray-300 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-sm">No responders found</div>
          ) : filtered.map(r => (
            <div key={r.id} onClick={() => setModal(r)}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-green-50 hover:border-green-200 hover:translate-x-0.5 transition-all cursor-pointer">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${TYPE_COLORS[r.type] ?? 'bg-gray-50'}`}>
                {TYPE_ICONS[r.type] ?? '🏢'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800 truncate">{r.name}</div>
                <div className="text-xs text-gray-400">{r.municipality}</div>
                <div className="text-xs text-green-700 font-semibold">{r.phone}</div>
                <div className="flex gap-1.5 mt-1.5">
                  <a href={`tel:${r.phone}`} onClick={e => e.stopPropagation()}
                    className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-[11px] font-bold hover:bg-green-100">Call</a>
                  <a href={`sms:${r.phone}`} onClick={e => e.stopPropagation()}
                    className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-md text-[11px] font-bold hover:bg-yellow-100">SMS</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal !== null && (
        <ResponderModal
          responder={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
