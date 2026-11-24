import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { formatDistanceToNowStrict } from "date-fns";
import { doc, setDoc } from "firebase/firestore";
import {
  Activity, CloudLightning, Waves, Mountain, Siren, Wind, FileText, ExternalLink, Phone, Info, Construction,
} from "lucide-react";
import { db, MAPS_API_KEY, NV_CENTER, NV_ZOOM } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { useReports } from "@/hooks/useReports";
import { useSosAlerts } from "@/hooks/useSosAlerts";
import { usePagasaProduct } from "@/hooks/usePagasaProduct";
import { useResponders } from "@/hooks/useResponders";
import { useQuakeSignals, useHazardFeedStatus, usePagasaMobileAlerts, useTransparencySettings } from "@/hooks/useHazards";
import { FLOOD_CONTROL_META, FLOOD_CONTROL_PROJECTS } from "@/data/floodControl";
import { OFFICIAL_HAZARD_LINKS } from "@/data/officialHazardLinks";
import { buildHazardItems, hazardCounts, SOURCE_LABEL, type HazardItem, type HazardKind, type HazardLevel } from "@/lib/hazards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/useToast";
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
  const { getEffectiveMunicipality, user } = useAuthStore();
  const isProvincialAdmin = ["provincial_admin", "admin", "super_admin"].includes(user?.role ?? "");
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
  const [showStructures, setShowStructures] = useState(false);
  const { floodControlPublic } = useTransparencySettings();
  const [savingSwitch, setSavingSwitch] = useState(false);
  // DPWH flood-control structures (docs/flood-control.md). Contractor and cost
  // are left out here; they are for the resident list once it is switched on.
  const structures = FLOOD_CONTROL_PROJECTS.filter((p) => !municipality || p.town === municipality);
  const project = structures.find((p) => `dpwh_${p.id}` === selected) ?? null;

  const setResidentList = async (on: boolean) => {
    setSavingSwitch(true);
    try {
      await setDoc(doc(db, "public_settings/transparency"), { floodControlPublic: on }, { merge: true });
      toast({ title: on ? "Residents can now see the flood-control list" : "Flood-control list hidden from residents" });
    } catch {
      toast({ title: "Could not change the setting", variant: "destructive" });
    } finally {
      setSavingSwitch(false);
    }
  };

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
              {showStructures && structures.map((p) => (
                <AdvancedMarker key={p.id} position={{ lat: p.lat, lng: p.lng }} zIndex={0}
                  title={`DPWH flood control: ${p.description}`} onClick={() => setSelected(`dpwh_${p.id}`)}>
                  <div className={cn("h-3.5 w-3.5 rounded-[2px] border-2 border-white bg-slate-600 shadow",
                    selected === `dpwh_${p.id}` && "ring-4 ring-amber-400")} />
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

      <section className="rounded-lg border bg-card" aria-labelledby="dpwh-title">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <Construction aria-hidden="true" className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          <div className="min-w-0 flex-1">
            <h2 id="dpwh-title" className="text-sm font-bold">DPWH flood-control structures</h2>
            <p className="text-xs text-muted-foreground">
              {structures.length} in {municipality ?? "the province"} · {FLOOD_CONTROL_META.source}, snapshot {FLOOD_CONTROL_META.snapshot}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <Switch checked={showStructures} onCheckedChange={setShowStructures} aria-label="Show DPWH flood-control structures on the map" />
            Show on map
          </label>
        </div>
        {showStructures && (
          <div className="border-t px-3 py-2 text-sm">
            {project ? (
              <div className="space-y-0.5">
                <p className="font-semibold break-words">{project.description}</p>
                <p className="text-xs text-muted-foreground">
                  {[project.town ?? "Town not stated", project.typeOfWork, `${project.year} programme`,
                    project.completedDate ? `completed ${project.completedDate}` : "no completion date",
                    project.office].join(" · ")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Click a grey square on the map to see that structure. Locations are as DPWH recorded them.</p>
            )}
          </div>
        )}
        {isProvincialAdmin && (
          <div className="border-t px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="font-semibold">Resident app list</span>
            <span className="text-xs text-muted-foreground">"Flood-control projects" per town, with contractors and costs</span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold",
              floodControlPublic ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100" : "bg-muted text-muted-foreground")}>
              {floodControlPublic === null ? "…" : floodControlPublic ? "Shown to residents" : "Hidden"}
            </span>
            {floodControlPublic !== null && (
              <button disabled={savingSwitch} onClick={() => setResidentList(!floodControlPublic)}
                className="ml-auto h-8 rounded-md border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-50">
                {floodControlPublic ? "Hide from residents" : "Show to residents"}
              </button>
            )}
            <span className="w-full text-xs text-muted-foreground">Turn on only with the Governor's office's approval.</span>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card p-3" aria-labelledby="official-title">
        <h2 id="official-title" className="text-sm font-bold mb-2">Official hazard services</h2>
        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICIAL_HAZARD_LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                {l.name} <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <span className="text-xs text-muted-foreground"> · {l.agency}</span>
            </li>
          ))}
        </ul>
      </section>

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
