import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BroadcastCard } from "@/components/broadcasts/BroadcastCard";

export const Route = createFileRoute("/dashboard/broadcasts")({
  component: BroadcastsPage,
});

function BroadcastsPage() {
  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold">📡 Broadcast Alert</h1>
        <p className="text-sm text-muted-foreground">Send push notifications to all citizens</p>
      </div>

      <div className="max-w-lg">
        <Card>
          <CardContent className="pt-5">
            <BroadcastCard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
