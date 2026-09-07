import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuditLog, deleteAuditLog, clearAuditLogs } from "@/hooks/useUsers";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { timeAgo } from "@/lib/utils";
import { ClipboardList, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { user } = useAuthStore();
  const { logs, loading } = useAuditLog();
  const isSuperAdmin = user?.role === "super_admin";

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await deleteAuditLog(deleteId);
      toast({ title: "Audit entry deleted", variant: "success" as never });
    } catch (e) {
      toast({ title: "Failed to delete", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await clearAuditLogs(logs.map((l) => l.id));
      toast({ title: "Audit log cleared", variant: "success" as never });
    } catch (e) {
      toast({ title: "Failed to clear", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setBusy(false);
      setClearOpen(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Audit Log</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Province of Nueva Vizcaya · Recent administrative actions
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isSuperAdmin && logs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
              onClick={() => setClearOpen(true)}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear shown
            </Button>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-foreground">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" aria-hidden />
              <p className="text-sm">No audit entries yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card text-sm hover:bg-accent/40 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-[hsl(var(--gov-green-700))] mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold capitalize">{log.action.replace(/_/g, " ")}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{timeAgo(log.timestamp)}</span>
                      </div>
                      {Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </p>
                      )}
                    </div>
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(log.id)}
                        aria-label="Delete audit entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-right">Showing last 50 entries</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete one */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this audit entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes one entry from the audit trail. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy} className="bg-destructive hover:bg-destructive/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear all shown */}
      <AlertDialog open={clearOpen} onOpenChange={(o) => !o && setClearOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the shown audit entries?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the {logs.length} entries currently shown. Older entries beyond
              these aren't affected. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} disabled={busy} className="bg-destructive hover:bg-destructive/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
