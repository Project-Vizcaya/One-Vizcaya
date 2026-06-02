import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { BroadcastCard } from "@/components/broadcasts/BroadcastCard";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/dashboard/broadcasts")({
  component: BroadcastsPage,
});

function BroadcastsPage() {
  const { user } = useAuthStore();

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Broadcast Alert</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Province of Nueva Vizcaya · Send push notifications to all citizens
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
          <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>

      <div className="max-w-xl">
        <Card>
          <CardContent className="pt-5">
            <BroadcastCard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
