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
  const { getEffectiveMunicipality } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports, loading } = useReports(municipality);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Analytics & Trends</h1>
        <p className="text-sm text-muted-foreground">Report statistics and trends</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <StatsGrid reports={reports} />
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report Trends & Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-80 w-full" /> : <AnalyticsCharts reports={reports} />}
        </CardContent>
      </Card>
    </div>
  );
}
