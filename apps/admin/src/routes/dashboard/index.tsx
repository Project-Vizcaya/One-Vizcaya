import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { useReports } from "@/hooks/useReports";
import { useAuthStore } from "@/stores/authStore";
import { timeAgo } from "@/lib/utils";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-500",
  medium:   "bg-yellow-500",
  low:      "bg-gray-400",
};

const STATUS_VARIANT: Record<string, "reported" | "acknowledged" | "under_review" | "ongoing" | "solved"> = {
  reported: "reported", acknowledged: "acknowledged", under_review: "under_review",
  ongoing: "ongoing", solved: "solved",
};

function DashboardOverview() {
  const { getEffectiveMunicipality, user } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports, loading } = useReports(municipality);
  const navigate = useNavigate();

  const recent = reports.slice(0, 10);

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {municipality ? `Municipality of ${municipality}` : "Province of Nueva Vizcaya"} ·{" "}
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live data
            </span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
          <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 sm:h-24" />)}
        </div>
      ) : (
        <StatsGrid
          reports={reports}
          onFilterChange={(filter) => navigate({ to: "/dashboard/reports", search: { filter } })}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Analytics */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Analytics & Trends</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? <Skeleton className="h-64 w-full" /> : <AnalyticsCharts reports={reports} />}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <div>
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Reports</CardTitle>
                </div>
                {recent.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{recent.length} shown</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-3 px-0">
              {loading ? (
                <div className="space-y-1 px-4">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
                </div>
              ) : recent.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" aria-hidden />
                  <p className="text-sm">No reports yet</p>
                </div>
              ) : (
                <div>
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors border-b last:border-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[r.priority] ?? "bg-gray-400"}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{r.category}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.municipality} · {timeAgo(r.reportedAt)}</p>
                      </div>
                      <Badge variant={STATUS_VARIANT[r.status]} className="text-[9px] uppercase tracking-wide shrink-0">
                        {r.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
