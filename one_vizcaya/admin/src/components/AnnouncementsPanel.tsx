import { useState } from 'react'
import { useAnnouncements } from '../hooks/useAnnouncements'
import type { AdminUser } from '../hooks/useAuth'
import type { Toast } from '../hooks/useToast'
import { MUNICIPALITIES } from '../lib/constants'
import { timeAgo } from '../lib/utils'

type AddToast = (msg: string, type?: Toast['type']) => void

interface Props { user: AdminUser; onToast: AddToast }

export function AnnouncementsPanel({ user, onToast }: Props) {
  const { announcements, loading, post, remove } = useAnnouncements()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', body: '', postedBy: '', municipality: 'All', urgent: false, scheduledAt: ''
  })
  const [saving, setSaving] = useState(false)

  function set(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.title || !form.body) { onToast('Title and message are required', 'error'); return }
    if (form.scheduledAt) {
      const mins = (new Date(form.scheduledAt).getTime() - Date.now()) / 60_000
      if (mins < 15) { onToast('Schedule must be at least 15 minutes from now', 'error'); return }
    }
    setSaving(true)
    try {
      await post.mutateAsync({
        title: form.title,
        body: form.body,
        postedBy: form.postedBy || user.phoneNumber,
        municipality: form.municipality,
        urgent: form.urgent,
        scheduledAt: form.scheduledAt ? { toDate: () => new Date(form.scheduledAt) } as never : null,
      })
      onToast('Announcement posted!', 'success')
      setForm({ title: '', body: '', postedBy: '', municipality: 'All', urgent: false, scheduledAt: '' })
      setShowForm(false)
    } catch {
      onToast('Failed to post announcement', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    await remove.mutateAsync(id)
    onToast('Announcement deleted', 'success')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="font-bold text-gray-800">📢 Announcements</div>
        <button onClick={() => setShowForm(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showForm ? 'bg-gray-100 border-gray-200 text-gray-600' : 'border-green-700 text-green-700 hover:bg-green-50'}`}>
          {showForm ? '✕ Cancel' : '+ New Announcement'}
        </button>
      </div>

      {showForm && (
        <div className="mx-5 my-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          {[
            { k: 'title',    label: 'Title',      placeholder: 'Announcement title' },
            { k: 'postedBy', label: 'Posted By',  placeholder: 'e.g. LGU Bambang / Mayor Juan dela Cruz' },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
              <input value={form[k as keyof typeof form] as string} onChange={e => set(k, e.target.value)}
                placeholder={placeholder}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500" />
            </div>
          ))}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Message</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)}
              rows={3} placeholder="Write the announcement message here…"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500 resize-y" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Municipality</label>
            <select value={form.municipality} onChange={e => set('municipality', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none">
              <option value="All">🌐 Province-wide (All Municipalities)</option>
              {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide block mb-1">Schedule For (optional)</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-green-500" />
            <p className="text-xs text-gray-400 mt-1">Leave empty to post immediately. Min 15 minutes ahead if scheduling.</p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} className="w-4 h-4" />
            <span className="font-semibold text-gray-700">Mark as Urgent</span>
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2 bg-green-700 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {saving ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      <div className="p-5 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-300 text-sm">Loading…</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm">📭 No announcements yet</div>
        ) : announcements.map(a => (
          <div key={a.id} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-sm">{a.title}</span>
                  {a.urgent && <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">🚨 URGENT</span>}
                  {a.scheduledAt && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">🕐 Scheduled</span>}
                </div>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">{a.body}</p>
                <div className="text-xs text-gray-400 mt-2 flex flex-wrap gap-2">
                  <span>By {a.postedBy || '—'}</span>
                  <span>·</span>
                  <span>{a.municipality === 'All' ? '🌐 Province-wide' : a.municipality}</span>
                  <span>·</span>
                  <span>{timeAgo(a.createdAt)}</span>
                </div>
              </div>
              <button onClick={() => del(a.id)} className="text-gray-300 hover:text-red-500 text-lg transition-colors shrink-0">×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
