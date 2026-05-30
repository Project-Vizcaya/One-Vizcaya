import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportsTable } from "@/components/reports/ReportsTable";
import { useReports } from "@/hooks/useReports";
import { useAuthStore } from "@/stores/authStore";
import { Bell } from "lucide-react";

const searchSchema = z.object({
  filter: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/reports")({
  validateSearch: searchSchema,
  component: ReportsPage,
});

function ReportsPage() {
  const { getEffectiveMunicipality } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports, loading } = useReports(municipality);
  const { filter } = Route.useSearch();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
        <div>
          <h1 className="text-xl font-bold">Live Reports</h1>
          <p className="text-sm text-muted-foreground">Real-time emergency reports · {reports.length} total</p>
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
