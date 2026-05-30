import { useState } from "react";
import { format } from "date-fns";
import { Save, Trash2, FileText, User, MapPin, Clock, Tag, AlertCircle, Loader2 } from "lucide-react";
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
  { value: "reported", label: "Reported" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "under_review", label: "Under Review" },
  { value: "ongoing", label: "Ongoing" },
  { value: "solved", label: "Solved" },
];

const CANNED_RESPONSES = [
  "We have received your report and are currently assessing the situation.",
  "A response team has been dispatched to address this issue.",
  "This matter has been forwarded to the appropriate department.",
  "We are currently monitoring the situation closely.",
  "The issue has been resolved. Thank you for your report.",
  "We need additional information to process your report. Please contact us.",
];

interface ReportDetailProps {
  report: Report | null;
  open: boolean;
  onClose: () => void;
}

function priorityVariant(p: string): "critical" | "high" | "medium" | "low" {
  return p as "critical" | "high" | "medium" | "low";
}

function statusVariant(s: string) {
  return s.replace("_", "") as never;
}

export function ReportDetail({ report, open, onClose }: ReportDetailProps) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<ReportStatus | "">(report?.status ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      toast({ title: "Report deleted", variant: "success" as never });
      onClose();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  if (!report) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <span>Report Details</span>
              <Badge variant={priorityVariant(report.priority)} className="text-xs">
                {report.priority.toUpperCase()}
              </Badge>
              <Badge variant={statusVariant(report.status)} className="text-xs capitalize">
                {report.status.replace("_", " ")}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-5 pr-2">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={report.category} />
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Municipality" value={report.municipality} />
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={report.location || "—"} />
                <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Reported" value={timeAgo(report.reportedAt)} />
                <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Reported by" value={report.isAnonymous ? "Anonymous" : report.userId} />
                <InfoRow icon={<AlertCircle className="h-3.5 w-3.5" />} label="Assigned to" value={report.assignedResponder || "Unassigned"} />
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1 text-muted-foreground text-xs uppercase tracking-wide">Description</p>
                <p className="whitespace-pre-wrap">{report.description}</p>
              </div>

              {report.imageUrl && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Photo</p>
                  <img src={report.imageUrl} alt="Report" className="rounded-lg max-h-48 object-cover w-full" />
                </div>
              )}

              <Separator />

              {/* Status update */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Update Status</p>
                <div className="flex gap-2">
                  <Select value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleStatusSave} disabled={saving || status === report.status} size="sm">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span className="ml-1 hidden sm:inline">Save</span>
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-3">
                <p className="text-sm font-semibold">Notes ({report.notes.length})</p>
                {report.notes.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[...report.notes].reverse().map((n, i) => (
                      <div key={i} className="bg-muted/40 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", authorColor(n.author))}>
                            {n.author}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(n.timestamp instanceof Date ? n.timestamp : new Date(n.timestamp))}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {CANNED_RESPONSES.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => setNote((prev) => prev ? prev + " " + r : r)}
                        className="text-xs bg-muted hover:bg-accent px-2 py-1 rounded transition-colors text-left"
                      >
                        {r.slice(0, 40)}…
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Add a note…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{note.length} chars</span>
                    <Button size="sm" onClick={handleNoteSave} disabled={saving || !note.trim()}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span className="ml-1">Add Note</span>
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Delete */}
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Last modified: {format(report.lastModified, "MMM d, yyyy h:mm a")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The report will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
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
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
