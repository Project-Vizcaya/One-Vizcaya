import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponderDirectory } from "@/components/responders/ResponderDirectory";
import { useResponders } from "@/hooks/useResponders";

export const Route = createFileRoute("/dashboard/responders")({
  component: RespondersPage,
});

function RespondersPage() {
  const { responders, loading } = useResponders();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold">🚨 Responder Directory</h1>
        <p className="text-sm text-muted-foreground">{responders.length} registered responders</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <ResponderDirectory responders={responders} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
