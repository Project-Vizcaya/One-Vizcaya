import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { ReportsTable } from "@/components/reports/ReportsTable";
import { useReports } from "@/hooks/useReports";
import { useAuthStore } from "@/stores/authStore";

const searchSchema = z.object({
  filter: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/reports")({
  validateSearch: searchSchema,
  component: ReportsPage,
});

function ReportsPage() {
  const { getEffectiveMunicipality, user } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports, loading } = useReports(municipality);
  const { filter } = Route.useSearch();

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Live Reports</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {municipality ? `Municipality of ${municipality}` : "Province of Nueva Vizcaya"} ·{" "}
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              {loading ? "Loading…" : `${reports.length} total`}
            </span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
          <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <ReportsTable reports={reports} loading={loading} initialFilter={filter ?? "all"} />
        </CardContent>
      </Card>
    </div>
  );
}
