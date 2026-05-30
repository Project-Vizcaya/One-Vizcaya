import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { useReports } from "@/hooks/useReports";
import { useAuthStore } from "@/stores/authStore";
import { timeAgo } from "@/lib/utils";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { getEffectiveMunicipality, user } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports, loading } = useReports(municipality);
  const navigate = useNavigate();

  const recent = reports.slice(0, 8);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Welcome back, {user?.name} · {municipality ?? "Province-wide"}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <StatsGrid
          reports={reports}
          currentUserId={user?.uid}
          onFilterChange={(filter) => navigate({ to: "/dashboard/reports", search: { filter } })}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <AnalyticsCharts reports={reports} />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              {recent.length > 0 && (
                <span className="text-xs text-muted-foreground">{recent.length} reports</span>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No reports yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-start gap-2.5 py-2 border-b last:border-0">
                      <div
                        className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            r.priority === "critical" ? "#DC2626" :
                            r.priority === "high" ? "#F97316" :
                            r.priority === "medium" ? "#F59E0B" : "#6B7280",
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.category}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.municipality} · {timeAgo(r.reportedAt)}
                        </p>
                      </div>
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
