import { useState } from "react";
import { Plus, Trash2, Megaphone, AlertTriangle, Loader2, Wand2, Lock, Building2 } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { postAnnouncement, deleteAnnouncement } from "@/hooks/useAnnouncements";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { timeAgo } from "@/lib/utils";
import { MUNICIPALITIES } from "@/data/municipalities";
import type { Announcement } from "@/types";

interface AnnouncementsCardProps {
  announcements: Announcement[];
  loading: boolean;
}

export function AnnouncementsCard({ announcements, loading }: AnnouncementsCardProps) {
  const { user } = useAuthStore();

  // Follow the dashboard SCOPE (not just the role): a municipal admin — or a
  // provincial/super admin who set the SCOPE dropdown to a town — posts only for
  // that municipality (locked). Only province-wide view keeps the audience
  // picker (All Municipalities / a specific town).
  const viewAs = useAuthStore((s) => s.viewAs);
  const viewMunicipality = useAuthStore((s) => s.viewMunicipality);
  const homeMunicipality =
    viewAs === "municipal" ? (viewMunicipality ?? user?.municipality ?? "") : "";
  const isProvincial = viewAs !== "municipal";
  const defaultPostedBy = isProvincial
    ? "Provincial Government of Nueva Vizcaya"
    : homeMunicipality
      ? `LGU ${homeMunicipality}`
      : (user?.name ?? "");

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [municipality, setMunicipality] = useState(isProvincial ? "all" : homeMunicipality);
  const [postedBy, setPostedBy] = useState(defaultPostedBy);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState("");

  const openDialog = () => {
    // Re-apply role-based defaults every time the composer opens.
    setTitle("");
    setBody("");
    setUrgent(false);
    setMunicipality(isProvincial ? "all" : homeMunicipality);
    setPostedBy(defaultPostedBy);
    setSourceUrl("");
    setSourceLabel("");
    setImageUrl("");
    setOpen(true);
  };

  // Paste a source link and auto-fill the headline + message from the page's
  // Open Graph / meta tags — same one-tap flow as the mobile app.
  const handleAutofill = async () => {
    const url = sourceUrl.trim();
    if (!url) {
      toast({ title: "Paste a source link first", variant: "destructive" });
      return;
    }
    setFetchingMeta(true);
    try {
      const fn = httpsCallable<
        { url: string },
        { title: string; description: string; image: string; siteName: string; url: string }
      >(functions, "fetchLinkPreview");
      const { data } = await fn({ url });
      if (data.title) setTitle(data.title.slice(0, 150));
      if (data.description) setBody(data.description);
      if (data.image) setImageUrl(data.image);
      if (data.siteName && !sourceLabel.trim()) setSourceLabel(data.siteName);
      if (data.url) setSourceUrl(data.url);
      const bodyMissing = !data.description;
      toast({
        title: bodyMissing ? "Imported title only" : "Filled from link — review before posting",
        description: bodyMissing
          ? "This link (often Facebook) hides its text behind a login. Paste the message manually."
          : undefined,
        variant: "success" as never,
      });
    } catch {
      toast({ title: "Couldn't read that link", description: "Fill the fields in manually instead.", variant: "destructive" });
    } finally {
      setFetchingMeta(false);
    }
  };

  const canPost = !!title.trim() && !!body.trim() && !!postedBy.trim();

  const handlePost = async () => {
    if (!canPost || !user) return;
    setSaving(true);
    try {
      await postAnnouncement({
        title: title.trim(),
        body: body.trim(),
        urgent,
        isUrgent: urgent,
        municipality: isProvincial ? municipality : homeMunicipality,
        postedBy: postedBy.trim(),
        ...(sourceUrl.trim()
          ? { sourceUrl: sourceUrl.trim(), sourceLabel: sourceLabel.trim() || "View original post" }
          : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
      toast({ title: "Announcement posted", variant: "success" as never });
      setOpen(false);
    } catch {
      toast({ title: "Failed to post", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAnnouncement(deleteId);
      toast({ title: "Announcement removed", variant: "success" as never });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</p>
        <Button size="sm" className="h-8 text-xs" onClick={openDialog}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Post
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`border rounded-lg p-3.5 ${a.urgent ? "border-red-200 bg-red-50/50" : "bg-white"}`}
            >
              <div className="flex items-start gap-2">
                {a.urgent && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{a.title}</p>
                    {a.urgent && <Badge variant="destructive" className="text-xs">Urgent</Badge>}
                    {a.municipality !== "all" && (
                      <Badge variant="outline" className="text-xs">{a.municipality}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {a.postedBy} · {timeAgo(a.timestamp)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => { setDeleteId(a.id); setDeleteTitle(a.title); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Post Announcement
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {isProvincial ? "Province-wide or per municipality" : `For ${homeMunicipality || "your municipality"} residents`}
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Announcement Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Road Project Update in Bambang" maxLength={150} />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Message / Details *</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the full announcement details here…" rows={5} maxLength={1000} className="resize-none" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Posted By *</Label>
              <Input value={postedBy} onChange={(e) => setPostedBy(e.target.value)} placeholder="e.g. Provincial Government of Nueva Vizcaya" />
            </div>

            {/* Audience: dropdown for provincial admins, locked for municipal admins */}
            <div className="space-y-1">
              <Label className="text-xs">Target Audience</Label>
              {isProvincial ? (
                <Select value={municipality} onValueChange={setMunicipality}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🌍 All Municipalities (Province-Wide)</SelectItem>
                    {MUNICIPALITIES.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1">{homeMunicipality || "Your municipality"}</span>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              )}
            </div>

            {/* Source link + one-tap auto-fill, mirroring the mobile composer */}
            <div className="space-y-1">
              <Label className="text-xs">Source URL (optional)</Label>
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://facebook.com/post/…" className="text-sm" />
              <p className="text-[10px] text-muted-foreground">Citizens can tap to view the original post.</p>
            </div>
            <Button type="button" variant="outline" className="w-full gap-2" onClick={handleAutofill} disabled={fetchingMeta || !sourceUrl.trim()}>
              {fetchingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {fetchingMeta ? "Reading link…" : "Auto-fill title & message from link"}
            </Button>

            {imageUrl && (
              <img src={imageUrl} alt="Imported preview" className="rounded-md border w-full h-32 object-cover" />
            )}

            <div className="space-y-1">
              <Label className="text-xs">Source Label (optional)</Label>
              <Input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="e.g. Governor's Office • Facebook" />
            </div>

            {/* Urgent toggle, styled like the mobile sheet */}
            <div className={`flex items-center gap-3 rounded-lg border p-3 ${urgent ? "border-red-300 bg-red-50" : "border-muted bg-muted/30"}`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 ${urgent ? "text-red-500" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${urgent ? "text-red-700" : ""}`}>Mark as Urgent</p>
                <p className="text-[11px] text-muted-foreground">Shows a red border and URGENT badge to citizens.</p>
              </div>
              <Switch checked={urgent} onCheckedChange={setUrgent} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handlePost} disabled={saving || !canPost}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>Remove "{deleteTitle}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
