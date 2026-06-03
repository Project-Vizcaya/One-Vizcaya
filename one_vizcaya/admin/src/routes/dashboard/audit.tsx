import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog } from "@/hooks/useUsers";
import { useAuthStore } from "@/stores/authStore";
import { timeAgo } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

export const Route = createFileRoute("/dashboard/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { user } = useAuthStore();
  const { logs, loading } = useAuditLog();

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
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
          <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
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
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-right">Showing last 50 entries</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
