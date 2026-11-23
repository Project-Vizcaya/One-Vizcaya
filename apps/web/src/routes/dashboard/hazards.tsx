import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Activity, CloudLightning, Waves, Mountain, Siren, Wind, FileText, ExternalLink, Phone, Info,
} from "lucide-react";
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { useReports } from "@/hooks/useReports";
import { useSosAlerts } from "@/hooks/useSosAlerts";
import { usePagasaProduct } from "@/hooks/usePagasaProduct";
import { useResponders } from "@/hooks/useResponders";
import { useQuakeSignals, useHazardFeedStatus, usePagasaMobileAlerts } from "@/hooks/useHazards";
import { buildHazardItems, hazardCounts, SOURCE_LABEL, type HazardItem, type HazardKind, type HazardLevel } from "@/lib/hazards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/hazards")({ component: HazardWatchPage });

// Hazard Watch (docs/hazards.md): everything that needs the PDRRMO's
// attention on one map and one list, the province's own information first.

const FILTERS: { key: string; label: string; match: (i: HazardItem) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "critical", label: "Critical", match: (i) => i.level === "critical" },
  { key: "province", label: "One Vizcaya", match: (i) => i.source === "onevizcaya" },
  { key: "weather", label: "Weather & typhoon", match: (i) => i.kind === "weather" || i.kind === "typhoon" },
  { key: "flood", label: "Flood & landslide", match: (i) => i.kind === "flood" || i.kind === "landslide" },
  { key: "earthquake", label: "Earthquake", match: (i) => i.kind === "earthquake" },
];

const KIND_ICON: Record<HazardKind, typeof Activity> = {
  sos: Siren, flood: Waves, landslide: Mountain, incident: FileText, weather: CloudLightning, typhoon: Wind, earthquake: Activity,
};

const LEVEL_STYLE: Record<HazardLevel, { badge: string; dot: string; label: string }> = {
  critical: { badge: "bg-red-600 text-white", dot: "#DC2626", label: "Critical" },
  warning: { badge: "bg-orange-500 text-white", dot: "#F97316", label: "Warning" },
  watch: { badge: "bg-amber-300 text-amber-950", dot: "#F59E0B", label: "Watch" },
  info: { badge: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100", dot: "#64748B", label: "Info" },
};

function Pan({ to }: { to: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => { if (map && to) { map.panTo(to); map.setZoom(11); } }, [map, to]);
  return null;
}

const ago = (d: Date | null) => (d ? `${formatDistanceToNowStrict(d)} ago` : "");

function HazardWatchPage() {
  const { getEffectiveMunicipality } = useAuthStore();
  const municipality = getEffectiveMunicipality();
  const { reports } = useReports(municipality);
  const { alerts: sos } = useSosAlerts();
  const { product: pagasa } = usePagasaProduct();
  const pagasaAlerts = usePagasaMobileAlerts();
  const quakes = useQuakeSignals();
  const feeds = useHazardFeedStatus();
  const { responders } = useResponders();
  const [filter, setFilter] = useState("all");
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const items = useMemo(
    () => buildHazardItems({ reports, sos, pagasa, pagasaAlerts, quakes, now: new Date() }),
    [reports, sos, pagasa, pagasaAlerts, quakes]);
  const counts = hazardCounts(items);
  const shown = items.filter(FILTERS.find((f) => f.key === filter)!.match);
  const hotlines = responders.filter((r) => (r.municipality === "All" || r.municipality === municipality) &&
    r.type === "mdrrmo" && !r.phone.includes("#")).slice(0, 6);

  const feedLine = (key: "usgs" | "phivolcs", name: string) => {
    const f = feeds[key];
    if (!f || !f.enabled) return `${name}: off${key === "phivolcs" ? " (needs PHIVOLCS's permission)" : ""}`;
    if (f.lastError) return `${name}: not updating (${f.lastError})`;
    return `${name}: updated ${ago(f.lastOkAt)}`;
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Hazard Watch</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {municipality ? `Municipality of ${municipality}` : "Province of Nueva Vizcaya"} · the province's own reports and SOS first, then PAGASA, PHIVOLCS and USGS
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Active", counts.active, ""], ["Critical", counts.critical, "text-red-600"], ["Sources", counts.sources, ""]].map(([l, v, c]) => (
            <div key={l as string} className="rounded-lg border px-3 py-1.5 min-w-[72px]">
              <p className={cn("text-xl font-bold tabular-nums", c as string)}>{v as number}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{l as string}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter hazards">
        {FILTERS.map((f) => {
          const n = items.filter(f.match).length;
          return (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
              className={cn("h-9 rounded-full border px-3 text-sm flex items-center gap-1.5 transition-colors",
                filter === f.key ? "bg-[hsl(var(--gov-green-800))] text-white border-transparent" : "hover:bg-accent")}>
              {f.label}<span className="text-xs tabular-nums opacity-80">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg overflow-hidden border" style={{ height: "clamp(300px, 55vh, 620px)" }}>
          <APIProvider apiKey={MAPS_API_KEY}>
            <Map mapId="one-vizcaya-hazards" defaultCenter={NV_CENTER} defaultZoom={NV_ZOOM - 1} gestureHandling="greedy">
              <Pan to={focus} />
              {shown.filter((i) => i.lat !== null && i.lng !== null).map((i) => (
                <AdvancedMarker key={i.id} position={{ lat: i.lat!, lng: i.lng! }} title={`${i.title} (${SOURCE_LABEL[i.source]})`}
                  onClick={() => setSelected(i.id)}>
                  <div className={cn("rounded-full border-2 border-white shadow flex items-center justify-center text-white font-bold",
                    selected === i.id && "ring-4 ring-sky-400")}
                    style={{ background: LEVEL_STYLE[i.level].dot, width: i.magnitude ? 34 : 26, height: i.magnitude ? 34 : 26, fontSize: 12 }}>
                    {i.magnitude ? i.magnitude.toFixed(1) : i.kind === "sos" ? "SOS" : "!"}
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </div>

        <Card>
          <CardContent className="p-0">
            <ul className="divide-y max-h-[620px] overflow-y-auto" aria-live="polite">
              {shown.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground text-center">Nothing to show for this filter.</li>
              )}
              {shown.map((i) => {
                const Icon = KIND_ICON[i.kind];
                return (
                  <li key={i.id} className={cn("p-3 flex gap-3", selected === i.id && "bg-accent/60")}>
                    <Icon aria-hidden="true" className="h-5 w-5 mt-0.5 shrink-0" style={{ color: LEVEL_STYLE[i.level].dot }} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-bold uppercase", LEVEL_STYLE[i.level].badge)}>{LEVEL_STYLE[i.level].label}</span>
                        <Badge variant={i.source === "onevizcaya" ? "default" : "outline"} className="text-xs">{SOURCE_LABEL[i.source]}</Badge>
                        <span className="text-xs text-muted-foreground">{ago(i.at)}</span>
                      </div>
                      <p className="text-sm font-semibold break-words">{i.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3 break-words">{i.detail}</p>
                      <div className="flex flex-wrap gap-3 pt-0.5">
                        {i.lat !== null && i.lng !== null && (
                          <button className="text-xs text-primary hover:underline min-h-[24px]"
                            onClick={() => { setFocus({ lat: i.lat!, lng: i.lng! }); setSelected(i.id); }}>Show on map</button>
                        )}
                        {i.reportRef && <Link to="/dashboard/reports" className="text-xs text-primary hover:underline">Open in Live Reports</Link>}
                        {i.href?.startsWith("/") && !i.reportRef && <Link to={i.href} className="text-xs text-primary hover:underline">Open</Link>}
                        {i.href?.startsWith("https://") && (
                          <a href={i.href} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            {SOURCE_LABEL[i.source]} page <ExternalLink aria-hidden="true" className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border p-3 text-xs text-muted-foreground space-y-1">
        <p className="flex items-start gap-1.5"><Info aria-hidden="true" className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Earthquake levels are One Vizcaya's triage aid from magnitude and distance, not an official intensity.
          PHIVOLCS is the official source for Philippine earthquakes; USGS is international and shown when PHIVOLCS has no report of the same event.
        </p>
        <p>{feedLine("phivolcs", "PHIVOLCS")} · {feedLine("usgs", "USGS")}</p>
      </div>

      <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5"><Phone aria-hidden="true" className="h-4 w-4" /> Emergency hotlines</span>
        <a href="tel:911" className="text-sm font-semibold hover:underline">911</a>
        {hotlines.map((h) => <a key={h.id} href={`tel:${h.phone}`} className="text-sm hover:underline">{h.name}: {h.phone}</a>)}
      </div>
    </div>
  );
}
