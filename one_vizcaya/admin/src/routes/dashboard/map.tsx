import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/components/map/MapView";
import { useReports } from "@/hooks/useReports";
import { useResponders } from "@/hooks/useResponders";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/dashboard/map")({
  component: MapPage,
});

function MapPage() {
  const { getEffectiveMunicipality } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports } = useReports(municipality);
  const { responders } = useResponders();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold">Interactive Map</h1>
        <p className="text-sm text-muted-foreground">Report heatmap & responder locations across Nueva Vizcaya</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <MapView reports={reports} responders={responders} />
        </CardContent>
      </Card>
    </div>
  );
}
