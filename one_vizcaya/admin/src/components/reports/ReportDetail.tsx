import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Save, Trash2, User, MapPin, Clock, Tag, AlertCircle, Loader2, FileImage } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { updateReportStatus, addReportNote, deleteReport } from "@/hooks/useReports";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { cn, timeAgo, authorColor } from "@/lib/utils";
import type { Report, ReportStatus } from "@/types";

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

const STATUS_VARIANT: Record<ReportStatus, "reported" | "acknowledged" | "under_review" | "ongoing" | "solved"> = {
  reported:     "reported",
  acknowledged: "acknowledged",
  under_review: "under_review",
  ongoing:      "ongoing",
  solved:       "solved",
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
  const [status, setStatus] = useState<ReportStatus | "">(report?.status ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync status when a different report is opened — fixes stale state bug
  useEffect(() => {
    if (report) setStatus(report.status);
    setNote("");
  }, [report]);

  const appendCanned = useCallback((text: string) => {
    setNote((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }, []);

  const handleStatusSave = async () => {
    if (!report || !status || status === report.status) return;
    setSaving(true);
    try {
      await updateReportStatus(report.userId, report.id, status as ReportStatus);
      toast({ title: "Status updated", variant: "success" as never });
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

  const handleDelete = async () => {
    if (!report) return;
    try {
      await deleteReport(report.userId, report.id);
      toast({ title: "Report deleted" });
      onClose();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
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
                {report.status.replace("_", " ")}
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
                <InfoRow icon={<AlertCircle className="h-3.5 w-3.5" />} label="Assigned To" value={report.assignedResponder || "Unassigned"} />
              </div>

              {/* Description */}
              <div className="bg-muted/40 rounded-lg p-3 text-sm border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Incident Description</p>
                <p className="whitespace-pre-wrap leading-relaxed">{report.description}</p>
              </div>

              {/* Photo */}
              {report.imageUrl && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                    <FileImage className="h-3 w-3" aria-hidden /> Attached Photo
                  </p>
                  <img
                    src={report.imageUrl}
                    alt="Report photo"
                    className="rounded-lg max-h-48 object-cover w-full border"
                    loading="lazy"
                  />
                </div>
              )}

              <Separator />

              {/* Status update */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Update Status</p>
                <div className="flex gap-2">
                  <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusSave}
                    disabled={saving || !status || status === report.status}
                    size="sm"
                    className="shrink-0"
                    aria-label="Save status"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                    <span className="ml-1.5 hidden sm:inline">Save</span>
                  </Button>
                </div>
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="w-[min(28rem,92vw)] max-w-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete report #{report.id.slice(-6).toUpperCase()}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
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
