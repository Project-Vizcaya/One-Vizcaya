import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Megaphone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useAnnouncements } from '@/hooks/useAnnouncements'
import type { AdminUser } from '@/lib/authContext'
import { MUNICIPALITIES } from '@/lib/constants'
import { timeAgo } from '@/lib/utils'

export function AnnouncementsPanel({ user }: { user: AdminUser }) {
  const { items, loading, post, remove } = useAnnouncements()
  const [open, setOpen]   = useState(false)
  const [form, setForm]   = useState({ title: '', body: '', postedBy: '', municipality: 'All', urgent: false, scheduledAt: '' })
  const [saving, setSaving] = useState(false)

  const f = (k: string) => (v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  async function submit() {
    if (!form.title || !form.body) { toast.error('Title and message are required'); return }
    if (form.scheduledAt && (new Date(form.scheduledAt).getTime() - Date.now()) / 60_000 < 15) {
      toast.error('Schedule must be ≥15 minutes from now'); return
    }
    setSaving(true)
    try {
      await post.mutateAsync({ title: form.title, body: form.body, postedBy: form.postedBy || user.phoneNumber, municipality: form.municipality, urgent: form.urgent, scheduledAt: form.scheduledAt ? { toDate: () => new Date(form.scheduledAt) } as never : null })
      toast.success('Announcement posted!')
      setForm({ title: '', body: '', postedBy: '', municipality: 'All', urgent: false, scheduledAt: '' })
      setOpen(false)
    } catch { toast.error('Failed to post') }
    finally { setSaving(false) }
  }

  async function del(id: string) {
    await remove.mutateAsync(id); toast.success('Deleted')
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" /> Announcements</CardTitle>
            <Button size="sm" onClick={() => setOpen(true)} className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">📭 No announcements yet</p>
          ) : items.map((a, i) => (
            <div key={a.id}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.title}</span>
                    {a.urgent && <Badge variant="destructive" className="text-[10px] h-4">URGENT</Badge>}
                    {a.scheduledAt && <Badge variant="outline" className="text-[10px] h-4">🕐 Scheduled</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.body}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>{a.postedBy || '—'}</span>
                    <span>·</span>
                    <span>{a.municipality === 'All' ? '🌐 Province-wide' : a.municipality}</span>
                    <span>·</span>
                    <span>{timeAgo(a.createdAt)}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => del(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Title</Label><Input value={form.title} onChange={e => f('title')(e.target.value)} placeholder="Announcement title" className="mt-1" /></div>
            <div><Label className="text-xs">Message</Label><Textarea value={form.body} onChange={e => f('body')(e.target.value)} placeholder="Write the message…" rows={3} className="mt-1 resize-none" /></div>
            <div><Label className="text-xs">Posted By</Label><Input value={form.postedBy} onChange={e => f('postedBy')(e.target.value)} placeholder="LGU Bambang / Mayor Juan dela Cruz" className="mt-1" /></div>
            <div><Label className="text-xs">Municipality</Label>
              <Select value={form.municipality} onValueChange={f('municipality')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">🌐 Province-wide</SelectItem>
                  {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Schedule (optional)</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => f('scheduledAt')(e.target.value)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to post immediately. Min 15 min ahead.</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="urgent" checked={form.urgent} onCheckedChange={v => f('urgent')(!!v)} />
              <Label htmlFor="urgent" className="text-sm cursor-pointer">Mark as Urgent</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'Posting…' : 'Post'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
