import { useState } from "react";
import { Search, Phone, MessageSquare, Plus, Edit, Trash2, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { saveResponder, deleteResponder } from "@/hooks/useResponders";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { MUNICIPALITIES } from "@/data/municipalities";
import type { Responder, ResponderType } from "@/types";

const TYPE_FILTERS = ["all", "mdrrmo", "police", "fire", "hospital", "health", "dpwh"] as const;

const TYPE_COLORS: Record<ResponderType, string> = {
  mdrrmo: "bg-orange-100 text-orange-800",
  police: "bg-blue-100 text-blue-800",
  fire: "bg-red-100 text-red-800",
  hospital: "bg-green-100 text-green-800",
  health: "bg-teal-100 text-teal-800",
  dpwh: "bg-yellow-100 text-yellow-800",
};

const TYPE_ICONS: Record<ResponderType, string> = {
  mdrrmo: "🆘",
  police: "👮",
  fire: "🚒",
  hospital: "🏥",
  health: "⚕️",
  dpwh: "🏗️",
};

interface ResponderDirectoryProps {
  responders: Responder[];
  loading: boolean;
}

const EMPTY_RESPONDER: Omit<Responder, "id"> = {
  name: "", type: "mdrrmo", municipality: "", phone: "", email: "", address: "", verified: false,
};

export function ResponderDirectory({ responders, loading }: ResponderDirectoryProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [muniFilter, setMuniFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Responder>>(EMPTY_RESPONDER);
  const [editId, setEditId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");

  const filtered = responders.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (muniFilter !== "all" && r.municipality !== muniFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.municipality.toLowerCase().includes(q) || r.phone.includes(q);
    }
    return true;
  });

  const openCreate = () => {
    setEditId(undefined);
    setEditData(EMPTY_RESPONDER);
    setEditOpen(true);
  };

  const openEdit = (r: Responder) => {
    setEditId(r.id);
    setEditData(r);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editData.name?.trim() || !editData.municipality || !editData.phone?.trim()) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveResponder(editData as Omit<Responder, "id">, editId);
      toast({ title: editId ? "Responder updated" : "Responder added", variant: "success" as never });
      setEditOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteResponder(deleteId);
      toast({ title: "Responder removed", variant: "success" as never });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search responders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={muniFilter} onValueChange={setMuniFilter}>
          <SelectTrigger className="h-8 text-xs w-44">
            <SelectValue placeholder="All Municipalities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            {MUNICIPALITIES.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 text-xs shrink-0" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border capitalize",
              typeFilter === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-accent"
            )}
          >
            {t === "all" ? "All" : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>No responders found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <div key={r.id} className="border rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl shrink-0">{TYPE_ICONS[r.type] ?? "🏢"}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.municipality}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => { setDeleteId(r.id); setDeleteName(r.name); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium uppercase", TYPE_COLORS[r.type])}>
                  {r.type}
                </span>
                <div className="flex gap-1">
                  {r.phone && (
                    <>
                      <a href={`tel:${r.phone}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors">
                        <Phone className="h-3.5 w-3.5 text-green-700" />
                      </a>
                      <a href={`sms:${r.phone}`} className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-700" />
                      </a>
                    </>
                  )}
                </div>
              </div>
              {r.phone && <p className="text-xs text-muted-foreground mt-1.5">{r.phone}</p>}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-right">{filtered.length} of {responders.length} responders</p>

      {/* Edit modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Responder" : "Add Responder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Name *">
              <Input value={editData.name ?? ""} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} placeholder="Organization name" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type *">
                <Select value={editData.type ?? "mdrrmo"} onValueChange={(v) => setEditData((p) => ({ ...p, type: v as ResponderType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["mdrrmo", "police", "fire", "hospital", "health", "dpwh"] as ResponderType[]).map((t) => (
                      <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Municipality *">
                <Select value={editData.municipality ?? ""} onValueChange={(v) => setEditData((p) => ({ ...p, municipality: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {MUNICIPALITIES.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Phone *">
              <Input value={editData.phone ?? ""} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} placeholder="+63..." />
            </Field>
            <Field label="Email">
              <Input type="email" value={editData.email ?? ""} onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))} />
            </Field>
            <Field label="Address">
              <Input value={editData.address ?? ""} onChange={(e) => setEditData((p) => ({ ...p, address: e.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Responder?</AlertDialogTitle>
            <AlertDialogDescription>Remove "{deleteName}" from the directory?</AlertDialogDescription>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
