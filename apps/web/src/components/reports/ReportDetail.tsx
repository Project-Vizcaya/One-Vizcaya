import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Save, Trash2, User, MapPin, Clock, Tag, AlertCircle, Loader2, FileImage, Camera, Image as ImageIcon, XCircle, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { updateReportStatus, assignResponder, addReportNote, deleteReport, transferReportLevel, closeReportWithDisposition, reopenReport } from "@/hooks/useReports";
import { useResponders } from "@/hooks/useResponders";
import { ReferralSection } from "@/components/reports/ReferralSection";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { cn, timeAgo, authorColor, DISPOSITION_OPTIONS, dispositionLabel } from "@/lib/utils";
import type { Report, ReportStatus, HandlingLevel, ReportDisposition } from "@/types";

// Mirrors the mobile HandlingLevel enum — the four administrative tiers a
// report can be routed through.
const HANDLING_LEVELS: { value: HandlingLevel; label: string; hint: string }[] = [
  { value: "barangay",   label: "Barangay",   hint: "Very local, low-risk matters a barangay can resolve." },
  { value: "municipal",  label: "Municipal",  hint: "Town-wide services & infrastructure beyond one barangay." },
  { value: "provincial", label: "Provincial", hint: "High-impact or cross-municipal incidents needing provincial resources." },
  { value: "region_ii",  label: "Region II",  hint: "National/regional mandate — DPWH Region II, region-wide calamities." },
];

const HANDLING_LABEL: Record<HandlingLevel, string> = {
  barangay: "Barangay", municipal: "Municipal", provincial: "Provincial", region_ii: "Region II",
};

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "reported",     label: "Reported" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "under_review", label: "Under Review" },
  { value: "ongoing",      label: "Ongoing" },
  { value: "solved",       label: "Solved / Resolved" },
];

const CANNED_RESPONSES = [
  "We have received your report and are currently assessing the situation.",
  "A response team has been dispatched to your location.",
  "This matter has been forwarded to the appropriate department for immediate action.",
  "We are actively monitoring and coordinating response efforts.",
  "The issue has been resolved. Thank you for your report.",
  "Additional information is required. Please contact the MDRRMO office.",
];

const STATUS_VARIANT: Record<ReportStatus, "reported" | "acknowledged" | "under_review" | "ongoing" | "solved" | "closed"> = {
  archived:     "closed",
  reported:     "reported",
  acknowledged: "acknowledged",
  under_review: "under_review",
  ongoing:      "ongoing",
  solved:       "solved",
  closed:       "closed",
};

const PRIORITY_VARIANT: Record<string, "critical" | "high" | "medium" | "low"> = {
  critical: "critical", high: "high", medium: "medium", low: "low",
};

interface ReportDetailProps {
  report: Report | null;
  open: boolean;
  onClose: () => void;
}

export function ReportDetail({ report, open, onClose }: ReportDetailProps) {
  const { user } = useAuthStore();
  const { responders } = useResponders();
  const [status, setStatus] = useState<ReportStatus | "">(report?.status ?? "");
  const [resolution, setResolution] = useState("");
  const [assigned, setAssigned] = useState<string>(report?.assignedResponder ?? "");
  const [level, setLevel] = useState<HandlingLevel>(report?.handlingLevel ?? "municipal");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  // Close-without-action dialog (PDRRMO §8 disposition).
  const [dispOpen, setDispOpen] = useState(false);
  const [disp, setDisp] = useState<ReportDisposition | "">("");
  const [dispReason, setDispReason] = useState("");
  const [dupOf, setDupOf] = useState("");

  // Sync status when a different report is opened — fixes stale state bug
  useEffect(() => {
    if (report) {
      setStatus(report.status);
      setAssigned(report.assignedResponder ?? "");
      setLevel(report.handlingLevel ?? "municipal");
    }
    setNote("");
  }, [report]);

  const handleAssign = async (responderName: string) => {
    if (!report) return;
    const prev = assigned;
    setAssigned(responderName);
    try {
      await assignResponder(report.userId, report.id, responderName);
      toast({ title: `Assigned to ${responderName}`, variant: "success" as never });
    } catch {
      setAssigned(prev);
      toast({ title: "Failed to assign responder", variant: "destructive" });
    }
  };

  const handleTransfer = async (next: HandlingLevel) => {
    if (!report || next === level) return;
    const prev = level;
    setLevel(next);
    try {
      await transferReportLevel(report.userId, report.id, next, user?.uid);
      toast({ title: `Routed to ${HANDLING_LABEL[next]} level`, variant: "success" as never });
    } catch {
      setLevel(prev);
      toast({ title: "Failed to route report", variant: "destructive" });
    }
  };

  const appendCanned = useCallback((text: string) => {
    setNote((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }, []);

  // Lifecycle (P3): Solved only from Ongoing, with a note of what was done.
  const canSolve = report?.status === "ongoing";
  const resolutionOk = resolution.trim().length >= 10 && resolution.trim().length <= 1000;

  const handleStatusSave = async () => {
    if (!report || !status || status === report.status) return;
    if (status === "solved" && !resolutionOk) return;
    setSaving(true);
    try {
      await updateReportStatus(report.userId, report.id, status as ReportStatus, resolution);
      toast({ title: "Status updated", variant: "success" as never });
      setResolution("");
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNoteSave = async () => {
    if (!report || !note.trim() || !user) return;
    setSaving(true);
    try {
      await addReportNote(report.userId, report.id, {
        text: note.trim(),
        author: user.name,
        authorRole: user.role,
        timestamp: new Date(),
      });
      setNote("");
      toast({ title: "Note added", variant: "success" as never });
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!report || !disp || dispReason.trim().length < 5) return;
    setSaving(true);
    try {
      await closeReportWithDisposition(report.userId, report.id, disp, dispReason, dupOf);
      toast({ title: `Closed: ${dispositionLabel(disp)}`, description: "Recorded with your name and the reason." });
      setDispOpen(false); setDisp(""); setDispReason(""); setDupOf("");
    } catch {
      toast({ title: "Failed to close report", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await reopenReport(report.userId, report.id);
      toast({ title: "Report re-opened", description: "Moved back to Under Review." });
    } catch {
      toast({ title: "Failed to re-open report", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!report) return;
    try {
      await deleteReport(report.userId, report.id, deleteReason);
      toast({ title: "Report deleted", description: "Recorded in the audit log with your name and reason." });
      setDeleteReason("");
      onClose();
    } catch (e) {
      toast({ title: "Failed to delete", description: (e as { message?: string })?.message, variant: "destructive" });
    }
  };

  if (!report) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[min(42rem,95vw)] max-w-none">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
              Report #{report.id.slice(-6).toUpperCase()}
              <Badge variant={PRIORITY_VARIANT[report.priority] ?? "low"} className="text-[10px] uppercase tracking-wide">
                {report.priority}
              </Badge>
              <Badge variant={STATUS_VARIANT[report.status]} className="text-[10px] capitalize">
                {report.status === "archived" && report.statusBeforeArchive
                  ? `archived · was ${report.statusBeforeArchive.replace("_", " ")}`
                  : report.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {HANDLING_LABEL[level]}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[75vh]">
            <div className="space-y-4 pr-1">
              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />}     label="Category"    value={report.category} />
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />}  label="Municipality" value={report.municipality} />
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />}  label="Location"    value={report.location || "—"} />
                <InfoRow icon={<Clock className="h-3.5 w-3.5" />}   label="Reported"    value={format(report.reportedAt, "MMM d, yyyy · h:mm a")} />
                <InfoRow icon={<User className="h-3.5 w-3.5" />}    label="Reporter"    value={report.isAnonymous ? "Anonymous" : report.userId.slice(0, 10) + "…"} />
                {report.onBehalfOf && (
                  <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Filed on behalf of"
                    value={[report.onBehalfOf.name, report.onBehalfOf.relationship && `(${report.onBehalfOf.relationship})`, report.onBehalfOf.contact].filter(Boolean).join(" · ")} />
                )}
                <InfoRow icon={<AlertCircle className="h-3.5 w-3.5" />} label="Assigned To" value={assigned || "Unassigned"} />
              </div>

              {/* Description */}
              <div className="bg-muted/40 rounded-lg p-3 text-sm border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Incident Description</p>
                <p className="whitespace-pre-wrap leading-relaxed">{report.description}</p>
              </div>

              {report.status === "solved" && report.resolutionNote && (
                <div className="rounded-lg p-3 text-sm border border-green-200 bg-green-50/60 dark:bg-green-950/20">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">How it was resolved</p>
                  <p className="whitespace-pre-wrap break-words">{report.resolutionNote}</p>
                  {report.resolutionBy && <p className="text-xs text-muted-foreground mt-1">by admin {report.resolutionBy.slice(0, 8)}</p>}
                </div>
              )}

              {/* Photo */}
              {report.imageUrl && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                      <FileImage className="h-3 w-3" aria-hidden /> Attached Photo
                    </p>
                    {report.photoSource === "camera" ? (
                      <span className="text-[10px] font-semibold text-green-700 bg-green-100 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Camera className="h-3 w-3" /> Live camera · GPS-stamped
                      </span>
                    ) : report.photoSource === "gallery" ? (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> From gallery · unverified
                      </span>
                    ) : null}
                  </div>
                  <img
                    src={report.imageUrl}
                    alt="Report photo"
                    className="rounded-lg max-h-64 object-contain w-full border bg-black/5"
                    loading="lazy"
                  />
                  {report.photoSource === "camera" && report.photoLatitude != null && report.photoLongitude != null && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${report.photoLatitude},${report.photoLongitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" /> Open photo location in Google Maps
                    </a>
                  )}
                </div>
              )}

              <Separator />

              {/* Status update — or, for a report closed without action, its
                  recorded disposition (PDRRMO §8). */}
              {report.status === "closed" ? (
                <div className="rounded-lg border border-slate-300 bg-slate-50 dark:bg-slate-900/40 p-3 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Closed without action</p>
                  <p className="text-sm font-semibold">{dispositionLabel(report.disposition)}</p>
                  {report.dispositionReason && <p className="text-sm whitespace-pre-line">{report.dispositionReason}</p>}
                  {report.duplicateOf && <p className="text-xs text-muted-foreground">Duplicate of report #{report.duplicateOf.slice(-6).toUpperCase()}</p>}
                  <p className="text-[11px] text-muted-foreground">
                    {report.dispositionAt ? `${format(report.dispositionAt, "MMM d, yyyy h:mm a")} · ` : ""}
                    by admin {report.dispositionBy ? report.dispositionBy.slice(0, 8) : "unknown"} · recorded in the audit log
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleReopen} disabled={saving}>
                    <RotateCcw className="h-3.5 w-3.5" /> Re-open report
                  </Button>
                </div>
              ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Update Status</p>
                <div className="flex gap-2">
                  <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm"
                          disabled={opt.value === "solved" && !canSolve && report.status !== "solved"}>
                          {opt.label}{opt.value === "solved" && !canSolve && report.status !== "solved" ? " (from Ongoing only)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusSave}
                    disabled={saving || !status || status === report.status || (status === "solved" && !resolutionOk)}
                    size="sm"
                    className="shrink-0"
                    aria-label="Save status"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                    <span className="ml-1.5 hidden sm:inline">Save</span>
                  </Button>
                </div>
                {status === "solved" && status !== report.status && (
                  <div className="mt-2 space-y-1">
                    <Textarea
                      aria-label="Resolution note" maxLength={1000} rows={2}
                      value={resolution} onChange={(e) => setResolution(e.target.value)}
                      placeholder="What was done to resolve it (required)…"
                      className="text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      At least 10 characters. Recorded with your name; the resident is told the report is resolved.
                    </p>
                  </div>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 mt-2" onClick={() => setDispOpen(true)}>
                  <XCircle className="h-3.5 w-3.5" /> Close without action…
                </Button>
              </div>
              )}

              {/* Assign responder */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Assign Responder</p>
                <Select value={assigned} onValueChange={handleAssign}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Choose a responder…" />
                  </SelectTrigger>
                  <SelectContent>
                    {responders
                      .filter((r) => {
                        const m = (r.municipality ?? "").toLowerCase();
                        return m === report.municipality.toLowerCase() || m === "all" || m === "";
                      })
                      .map((r) => (
                        <SelectItem key={r.id} value={r.name} className="text-sm">
                          {r.name}{r.type ? ` · ${r.type}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {assigned && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Currently assigned: <span className="font-medium text-foreground">{assigned}</span> — saved automatically.
                  </p>
                )}
              </div>

              {/* Refer to a named office (P2) */}
              <ReferralSection key={report.id} report={report} />

              {/* Route / transfer between administrative tiers (parity with the
                  mobile admin's 4-level routing). Escalating to Provincial or
                  Region II makes the report appear in the province-wide view. */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Route / Transfer Level</p>
                <Select value={level} onValueChange={(v) => handleTransfer(v as HandlingLevel)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HANDLING_LEVELS.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value} className="text-sm">
                        {lvl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {HANDLING_LEVELS.find((l) => l.value === level)?.hint}
                </p>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Notes &amp; Updates ({report.notes.length})
                </p>

                {report.notes.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-44 overflow-y-auto">
                    {[...report.notes].reverse().map((n, i) => (
                      <div key={i} className="bg-muted/30 border rounded-md p-2.5 text-sm">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide", authorColor(n.author))}>
                            {n.author}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {timeAgo(n.timestamp instanceof Date ? n.timestamp : new Date(n.timestamp as unknown as string))}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Canned responses */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {CANNED_RESPONSES.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => appendCanned(r)}
                      className="text-[11px] bg-muted/60 hover:bg-accent px-2 py-1 rounded border text-left transition-colors leading-tight"
                    >
                      {r.slice(0, 38)}…
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="Add an official note or update…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                  aria-label="Add note"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-muted-foreground">{note.length} characters</span>
                  <Button size="sm" onClick={handleNoteSave} disabled={saving || !note.trim()}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" aria-hidden /> : <Save className="h-3.5 w-3.5 mr-1" aria-hidden />}
                    Add Note
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Last modified: {format(report.lastModified, "MMM d, yyyy h:mm a")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                  Delete Report
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dispOpen} onOpenChange={setDispOpen}>
        <AlertDialogContent className="w-[min(30rem,92vw)] max-w-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Close without action</AlertDialogTitle>
            <AlertDialogDescription>
              The report stays on record, marked with your reason, your account and the time.
              The reporter is notified of the category, not your reason. It can be re-opened later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <Select value={disp} onValueChange={(v) => setDisp(v as ReportDisposition)}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Why is it being closed?" /></SelectTrigger>
              <SelectContent>
                {DISPOSITION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-sm">
                    {o.label} — <span className="text-muted-foreground">{o.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {disp === "duplicate" && (
              <input
                value={dupOf}
                onChange={(e) => setDupOf(e.target.value)}
                placeholder="Original report ID (optional)"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            )}
            <Textarea
              value={dispReason}
              onChange={(e) => setDispReason(e.target.value)}
              placeholder="Reason (required, at least 5 characters) — e.g. what was checked"
              className="text-sm min-h-[80px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleClose(); }}
              disabled={saving || !disp || dispReason.trim().length < 5}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Close report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="w-[min(28rem,92vw)] max-w-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete report #{report.id.slice(-6).toUpperCase()}. This action cannot be undone.
              To record a false, duplicate, incomplete or unverifiable report, use
              "Close without action" instead — it keeps a record of why.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Reason for deleting (required, recorded in the audit log)"
            className="text-sm min-h-[70px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteReason.trim().length < 5}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
