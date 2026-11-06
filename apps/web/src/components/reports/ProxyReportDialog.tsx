import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2, UserPlus } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { barangaysOf } from "@/data/barangays";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Proxy reporting (P3, PDRRMO §11): an official files a report for a resident
// without a smartphone, e.g. someone who came to the barangay hall. The report
// is filed under the official's account (status updates go to them, to relay)
// with `onBehalfOf` naming the resident. firestore.rules limit barangay and
// municipal admins to their own area; provincial admins may file anywhere.

// Must match the mobile app's ReportCategory display names.
const CATEGORIES = [
  "Disaster & Risk Management", "Health & Public Safety", "Vehicular Accident / Road Crash",
  "Hazardous / Chemical Spill", "Landslide / Soil Erosion", "Flooding / Severe Drainage Issue",
  "Bridge Damage / Blockage", "Provincial Road Damage", "Peace & Order Disturbance",
  "Water & Sewage Systems", "Online Scam / Cyber Fraud", "Stray / Loose Animals on Road",
  "Infrastructure & Roads", "Public Lighting & Utilities", "Environmental & Sanitation",
  "Traffic Obstruction / Illegal Parking", "Internet / Telecom Connectivity",
  "Social & Community Services", "Lost & Found / Document Request",
  "Digital Services / App Feedback", "General Inquiries & Others", "Others (Not Listed)",
];
const PRIORITIES = ["critical", "high", "medium", "low"] as const;

export function ProxyReportDialog() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const lockedTown = user?.role === "municipal_admin" || user?.role === "barangay_admin" ? user.municipality ?? "" : null;
  const lockedBrgy = user?.role === "barangay_admin" ? user.barangay ?? "" : null;

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [relationship, setRelationship] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("medium");
  const [town, setTown] = useState(lockedTown ?? "");
  const [brgy, setBrgy] = useState(lockedBrgy ?? "");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const effTown = lockedTown ?? town;
  const effBrgy = lockedBrgy ?? brgy;
  const valid = name.trim().length >= 2 && !!category && !!effTown &&
    description.trim().length >= 10 && location.trim().length >= 2;

  const reset = () => {
    setName(""); setContact(""); setRelationship(""); setCategory(""); setPriority("medium");
    setTown(lockedTown ?? ""); setBrgy(lockedBrgy ?? ""); setLocation(""); setDescription("");
  };

  const submit = async () => {
    const u = auth.currentUser;
    if (!valid || !u) return;
    if (!u.phoneNumber) {
      toast({ title: "Your account has no phone number", description: "Reports need the filer's number. Sign in with your phone.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Same document shape as the mobile app's ProblemReport.toMap().
      await addDoc(collection(db, "users", u.uid, "reports"), {
        category,
        description: description.trim(),
        location: location.trim(),
        municipality: effTown,
        barangay: effBrgy || null,
        status: "reported",
        priority,
        priorityScore: 0,
        duplicateCount: 0,
        reportedAt: serverTimestamp(),
        latitude: null,
        longitude: null,
        userId: u.uid,
        userPhone: u.phoneNumber,
        imageUrl: null,
        escalatedToProvince: false,
        handlingLevel: effBrgy ? "barangay" : "municipal",
        isAnonymous: false,
        isFlagged: false,
        onBehalfOf: { name: name.trim(), contact: contact.trim(), relationship: relationship.trim() },
      });
      toast({ title: "Report filed", description: `Filed for ${name.trim()}. Updates will come to you.`, variant: "success" as never });
      reset();
      setOpen(false);
    } catch (e) {
      toast({ title: "Could not file the report", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setOpen(true)}>
        <UserPlus aria-hidden="true" className="h-3.5 w-3.5" /> File for a resident
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(36rem,95vw)] max-w-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>File a report for a resident</DialogTitle>
            <DialogDescription>
              For a resident without a phone. Ask their permission first. The report is filed under your account and
              status updates come to you, to pass on.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pr-name" className="text-xs">Resident's full name *</Label>
                <Input id="pr-name" maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pr-contact" className="text-xs">How to reach them</Label>
                <Input id="pr-contact" maxLength={40} autoComplete="off" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Number or where they live…" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pr-rel" className="text-xs">Your relationship to them</Label>
              <Input id="pr-rel" maxLength={40} autoComplete="off" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Barangay official…" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="text-sm" aria-label="Category"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority *</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as (typeof PRIORITIES)[number])}>
                  <SelectTrigger className="text-sm capitalize" aria-label="Priority"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="text-sm capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Municipality *</Label>
                {lockedTown !== null ? (
                  <Input value={lockedTown} disabled aria-label="Municipality" />
                ) : (
                  <Select value={town} onValueChange={(v) => { setTown(v); setBrgy(""); }}>
                    <SelectTrigger className="text-sm" aria-label="Municipality"><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>{MUNICIPALITIES.map((m) => <SelectItem key={m.name} value={m.name} className="text-sm">{m.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Barangay</Label>
                {lockedBrgy !== null ? (
                  <Input value={lockedBrgy} disabled aria-label="Barangay" />
                ) : (
                  <Select value={brgy} onValueChange={setBrgy} disabled={!effTown}>
                    <SelectTrigger className="text-sm" aria-label="Barangay"><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>{barangaysOf(effTown).map((b) => <SelectItem key={b} value={b} className="text-sm">{b}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pr-loc" className="text-xs">Location *</Label>
              <Input id="pr-loc" maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Purok, street or landmark…" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pr-desc" className="text-xs">What is the problem? *</Label>
              <Textarea id="pr-desc" maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={!valid || saving} onClick={submit}>
                {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin mr-1.5" />}File report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
