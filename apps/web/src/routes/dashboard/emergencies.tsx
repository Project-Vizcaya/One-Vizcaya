import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { Siren, Navigation, Phone, Truck, Check, Loader2, ShieldCheck, BadgeCheck, Flag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSosAlerts, verifySos, dispatchSos, resolveSos } from "@/hooks/useSosAlerts";
import { toast } from "@/hooks/useToast";
import { timeAgo } from "@/lib/utils";
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from "@/lib/firebase";
import type { SosAlert } from "@/types";

export const Route = createFileRoute("/dashboard/emergencies")({
  component: EmergenciesPage,
});

function EmergenciesPage() {
  const { alerts, loading } = useSosAlerts();
  const withGps = alerts.filter((a) => a.lat != null && a.lng != null);
  const center = withGps.length > 0 ? { lat: withGps[0].lat!, lng: withGps[0].lng! } : NV_CENTER;

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Siren className="h-5 w-5 text-red-600" />
            <h1 className="text-lg font-bold tracking-tight">Live Emergencies</h1>
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">{alerts.length} active</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            SOS beacons with live location — dispatch responders to the exact spot.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading emergencies…
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-green-500/70" />
          <p className="text-sm font-medium">No active emergencies</p>
          <p className="text-xs mt-1">New SOS alerts appear here instantly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,420px)] gap-4">
          <div className="space-y-3 order-2 lg:order-1">
            {/* Flagged (possible-abuse) alerts sink to the bottom — never hidden. */}
            {[...alerts].sort((a, b) => Number(a.flagged) - Number(b.flagged)).map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <div className="rounded-lg overflow-hidden border shadow-sm sticky top-3" style={{ height: "clamp(240px, 40vh, 460px)" }}>
              <APIProvider apiKey={MAPS_API_KEY}>
                <Map mapId="one-vizcaya-sos" defaultCenter={center} defaultZoom={withGps.length ? 13 : NV_ZOOM} gestureHandling="greedy">
                  {withGps.map((a) => (
                    <AdvancedMarker key={a.id} position={{ lat: a.lat!, lng: a.lng! }} title={`${a.name} — ${a.status}`}>
                      <div className="relative">
                        <span className="absolute inline-flex h-6 w-6 rounded-full bg-red-500 opacity-60 animate-ping" />
                        <span className="relative inline-flex h-6 w-6 rounded-full bg-red-600 border-2 border-white items-center justify-center">
                          <Siren className="h-3 w-3 text-white" />
                        </span>
                      </div>
                    </AdvancedMarker>
                  ))}
                </Map>
              </APIProvider>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: SosAlert }) {
  const [busy, setBusy] = useState(false);
  const dispatched = alert.status === "dispatched";
  const hasFix = alert.lat != null && alert.lng != null;
  const mapsUrl = hasFix ? `https://www.google.com/maps/search/?api=1&query=${alert.lat},${alert.lng}` : null;

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ title: okMsg, variant: "success" as never });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={alert.flagged ? "border-slate-300 bg-slate-50/60" : dispatched ? "border-orange-300" : "border-red-300"}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <Badge className={dispatched ? "bg-orange-600" : "bg-red-600"}>
            {dispatched ? "DISPATCHED" : "ACTIVE SOS"}
          </Badge>
          {alert.verified ? (
            <Badge className="bg-green-600 gap-1"><BadgeCheck className="h-3 w-3" /> Verified</Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">Unverified</Badge>
          )}
          {alert.barangay && <Badge variant="outline" className="text-xs">Brgy. {alert.barangay}</Badge>}
          {alert.municipality && <Badge variant="outline" className="text-xs">{alert.municipality}</Badge>}
          {alert.updatedAt && (
            <span className="ml-auto text-xs text-muted-foreground">updated {timeAgo(alert.updatedAt)}</span>
          )}
        </div>
        {alert.flagged && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 rounded px-2 py-1 mb-1.5">
            <Flag className="h-3 w-3 shrink-0" />
            Flagged: {alert.flagReason ?? "possible misuse"} — verify before dispatch.
          </div>
        )}
        <p className="font-bold text-base">{alert.name}</p>
        <p className="text-xs text-muted-foreground">{alert.phone || "no phone"}</p>
        <p className="text-xs mt-1.5 font-mono">
          {hasFix
            ? `${alert.lat!.toFixed(6)}, ${alert.lng!.toFixed(6)}${alert.accuracy != null ? `  ·  ±${Math.round(alert.accuracy)} m` : ""}`
            : "Waiting for a location fix…"}
        </p>
        {alert.note && <p className="text-xs italic text-muted-foreground mt-1">“{alert.note}”</p>}

        <div className="flex flex-wrap gap-2 mt-3">
          {mapsUrl && (
            <Button asChild size="sm" className={dispatched ? "bg-orange-600 hover:bg-orange-700" : "bg-red-600 hover:bg-red-700"}>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-3.5 w-3.5 mr-1" /> Navigate
              </a>
            </Button>
          )}
          {alert.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${alert.phone}`}><Phone className="h-3.5 w-3.5 mr-1" /> Call</a>
            </Button>
          )}
          {!alert.verified && (
            <Button size="sm" variant="outline" className="text-green-800 border-green-300" disabled={busy} onClick={() => run(() => verifySos(alert.id), "Verified — real emergency")}>
              <BadgeCheck className="h-3.5 w-3.5 mr-1" /> Verify (called)
            </Button>
          )}
          {!dispatched && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => dispatchSos(alert.id), "Marked dispatched")}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Truck className="h-3.5 w-3.5 mr-1" />} Dispatch
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="text-green-700" disabled={busy}>
                <Check className="h-3.5 w-3.5 mr-1" /> Close <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => run(() => resolveSos(alert.id, "resolved"), "Resolved")}>
                ✓ Resolved (real)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run(() => resolveSos(alert.id, "false_alarm"), "Closed — false alarm")}>
                False alarm
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => run(() => resolveSos(alert.id, "abuse"), "Marked as abuse")}>
                <Flag className="h-3.5 w-3.5 mr-1.5" /> Mark as abuse
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
