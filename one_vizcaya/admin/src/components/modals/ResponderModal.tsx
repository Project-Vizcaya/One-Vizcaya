import { useState } from 'react'
import type { Responder } from '../../hooks/useResponders'

interface Props {
  responder: Responder | null
  onClose: () => void
  onSave: (data: Omit<Responder, 'id'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const TYPES = ['mdrrmo', 'police', 'fire', 'hospital', 'health', 'dpwh'] as const
const MUNICIPALITIES = ['Ambaguio','Aritao','Bagabag','Bambang','Bayombong','Diadi','Dupax del Norte','Dupax del Sur','Kasibu','Kayapa','Quezon','Santa Fe','Solano','Villaverde','Alfonso Castañeda']

export function ResponderModal({ responder, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState({
    name:         responder?.name         ?? '',
    type:         responder?.type         ?? 'mdrrmo',
    municipality: responder?.municipality ?? 'Bayombong',
    phone:        responder?.phone        ?? '',
    address:      responder?.address      ?? '',
    latitude:     String(responder?.latitude  ?? ''),
    longitude:    String(responder?.longitude ?? ''),
  })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name || !form.phone) return
    setSaving(true)
    try {
      await onSave({
        name: form.name, type: form.type, municipality: form.municipality,
        phone: form.phone, address: form.address,
        latitude:  form.latitude  ? parseFloat(form.latitude)  : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      })
    } finally { setSaving(false) }
  }

  async function del() {
    if (!responder) return
    setDeleting(true)
    try { await onDelete(responder.id) } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[9000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-lg font-extrabold text-gray-900 mb-4">
            {responder ? 'Edit Responder' : 'Add Responder'}
          </h3>
          <div className="space-y-3">
            {(['name','phone','address'] as const).map(k => (
              <div key={k}>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">{k}</label>
                <input value={form[k]} onChange={e => set(k, e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500" />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Municipality</label>
              <select value={form.municipality} onChange={e => set('municipality', e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
                {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['latitude','longitude'] as const).map(k => (
                <div key={k}>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">{k}</label>
                  <input value={form[k]} onChange={e => set(k, e.target.value)} type="number" step="any"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex items-center justify-between gap-2">
          {responder ? (
            <button onClick={del} disabled={deleting}
              className="px-3 py-2 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50">
              {deleting ? 'Deleting…' : '🗑 Delete'}
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">Cancel</button>
            <button onClick={save} disabled={saving || !form.name || !form.phone}
              className="px-5 py-2 bg-green-700 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
