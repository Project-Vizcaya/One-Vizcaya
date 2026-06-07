import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { useReports } from "@/hooks/useReports";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { getEffectiveMunicipality, user } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports, loading } = useReports(municipality);

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Analytics & Trends</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {municipality ? `Municipality of ${municipality}` : "Province of Nueva Vizcaya"} · Report statistics and performance
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
          <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 sm:h-24" />)}
        </div>
      ) : (
        <StatsGrid reports={reports} />
      )}

      <Card>
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Report Trends & Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? <Skeleton className="h-80 w-full" /> : <AnalyticsCharts reports={reports} />}
        </CardContent>
      </Card>
    </div>
  );
}
