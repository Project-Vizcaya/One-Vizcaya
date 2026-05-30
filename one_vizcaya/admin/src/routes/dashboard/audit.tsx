import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog } from "@/hooks/useUsers";
import { timeAgo } from "@/lib/utils";
import { ClipboardList, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { logs, loading } = useAuditLog();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Recent admin actions</p>
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
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No audit entries yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg bg-white text-sm hover:bg-accent/50 transition-colors">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.action.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(log.timestamp)}</span>
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
          )}
          <p className="text-xs text-muted-foreground mt-3 text-right">Showing last 50 entries</p>
        </CardContent>
      </Card>
    </div>
  );
}
