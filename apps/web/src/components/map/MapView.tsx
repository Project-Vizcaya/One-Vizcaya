import { useState, useMemo, useEffect } from "react";
import {
  APIProvider, Map, AdvancedMarker, InfoWindow, Polygon, useMap,
} from "@vis.gl/react-google-maps";
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from "@/lib/firebase";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, MapPin, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Report, Responder } from "@/types";

// Imperatively recenters the map only when its inputs change (i.e. when a
// different municipality is selected). It does NOT bind center/zoom as
// controlled props, so the user can still freely pan and zoom.
function CameraController({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center.lat, center.lng, zoom]);
  return null;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high:     "#F97316",
  medium:   "#F59E0B",
  low:      "#6B7280",
};

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

// Choropleth: interpolates hue from green (120°) → yellow (60°) → red (0°) based on intensity 0–1
function choroplethColor(count: number, max: number): { fill: string; stroke: string; opacity: number } {
  if (max === 0 || count === 0) {
    return { fill: "#9CA3AF", stroke: "#6B7280", opacity: 0.15 };
  }
  const t   = Math.min(count / max, 1);
  const hue = Math.round(120 * (1 - t));
  return {
    fill:    `hsl(${hue}, 80%, 45%)`,
    stroke:  `hsl(${hue}, 90%, 30%)`,
    opacity: 0.25 + t * 0.40,
  };
}

// Deterministic jitter so fallback pins don't stack exactly on the municipality centre
function stableOffset(id: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return {
    lat: ((h & 0xffff) / 0xffff - 0.5) * 0.025,
    lng: (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.025,
  };
}

interface MapViewProps {
  reports: Report[];
  responders: Responder[];
}

export function MapView({ reports, responders }: MapViewProps) {
  const [showHeatmap,    setShowHeatmap]    = useState(true);
  const [showZones,      setShowZones]      = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showPins,       setShowPins]       = useState(false);
  const [muniFilter,     setMuniFilter]     = useState("all");
  const [selectedReport,    setSelectedReport]    = useState<Report | null>(null);
  const [selectedResponder, setSelectedResponder] = useState<Responder | null>(null);

  const filteredReports    = useMemo(() => muniFilter === "all" ? reports    : reports.filter((r) => r.municipality === muniFilter),    [reports, muniFilter]);
  const filteredResponders = useMemo(() => muniFilter === "all" ? responders : responders.filter((r) => r.municipality === muniFilter), [responders, muniFilter]);

  // Weighted intensity per municipality (critical counts 4×, etc.)
  const intensityByMuni = useMemo(() =>
    reports.reduce<Record<string, number>>((acc, r) => {
      if (r.status === "solved") return acc;
      acc[r.municipality] = (acc[r.municipality] ?? 0) + (PRIORITY_WEIGHT[r.priority] ?? 1);
      return acc;
    }, {}),
  [reports]);

  // Raw count per municipality (for zone bubbles)
  const countByMuni = useMemo(() =>
    reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.municipality] = (acc[r.municipality] ?? 0) + 1;
      return acc;
    }, {}),
  [reports]);

  const maxIntensity = useMemo(() => Math.max(...Object.values(intensityByMuni), 1), [intensityByMuni]);
  const maxCount     = useMemo(() => Math.max(...Object.values(countByMuni), 1),     [countByMuni]);

  const mapCenter = useMemo(() =>
    muniFilter !== "all"
      ? (MUNICIPALITIES.find((m) => m.name === muniFilter)?.center ?? NV_CENTER)
      : NV_CENTER,
  [muniFilter]);

  // Convert GeoJSON [lng, lat] coordinate format to LatLngLiteral for the Polygon component
  const muniPolygons = useMemo(() =>
    MUNICIPALITIES.map((muni) => ({
      muni,
      paths: muni.coordinates.map((ring) =>
        ring.map(([lng, lat]) => ({ lat, lng }))
      ),
      color: choroplethColor(intensityByMuni[muni.name] ?? 0, maxIntensity),
    })),
  [intensityByMuni, maxIntensity]);

  // Report pin positions — use exact GPS if available, otherwise municipality centre + jitter
  const reportPins = useMemo(() =>
    filteredReports
      .filter((r) => r.status !== "solved")
      .map((r) => {
        if (r.latitude && r.longitude) {
          return { report: r, pos: { lat: r.latitude, lng: r.longitude } };
        }
        const muni = MUNICIPALITIES.find((m) => m.name === r.municipality);
        if (!muni?.center) return null;
        const off = stableOffset(r.id);
        return { report: r, pos: { lat: muni.center.lat + off.lat, lng: muni.center.lng + off.lng } };
      })
      .filter(Boolean) as { report: Report; pos: { lat: number; lng: number } }[],
  [filteredReports]);

  const activeCount = filteredReports.filter((r) => r.status !== "solved").length;
  const gpsCount    = filteredReports.filter((r) => r.latitude && r.longitude).length;

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={muniFilter} onValueChange={setMuniFilter}>
          <SelectTrigger className="h-8 text-xs w-44" aria-label="Filter by municipality">
            <SelectValue placeholder="All Municipalities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            {MUNICIPALITIES.map((m) => (
              <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Map layer toggles">
          <ToggleButton active={showHeatmap}    onClick={() => setShowHeatmap(!showHeatmap)}       icon={<Layers  className="h-3.5 w-3.5" aria-hidden />} label="Intensity" />
          <ToggleButton active={showZones}      onClick={() => setShowZones(!showZones)}           icon={<span className="h-3.5 w-3.5 flex items-center justify-center text-[9px] font-black leading-none" aria-hidden>●</span>} label="Zones" />
          <ToggleButton active={showResponders} onClick={() => setShowResponders(!showResponders)} icon={<Shield  className="h-3.5 w-3.5" aria-hidden />} label="Responders" />
          <ToggleButton active={showPins}       onClick={() => setShowPins(!showPins)}             icon={<MapPin  className="h-3.5 w-3.5" aria-hidden />} label="Pins" />
        </div>

        <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
          {activeCount} active{gpsCount > 0 ? ` · ${gpsCount} with GPS` : ""}
        </span>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border shadow-sm" style={{ height: "clamp(300px, 50vw, 520px)" }}>
        <APIProvider apiKey={MAPS_API_KEY}>
          <Map
            mapId="one-vizcaya-map"
            defaultCenter={mapCenter}
            defaultZoom={NV_ZOOM}
            gestureHandling="greedy"
          >
            <CameraController
              center={mapCenter}
              zoom={muniFilter === "all" ? NV_ZOOM : 11}
            />
            {/* Choropleth intensity overlay — municipality polygons coloured green→yellow→red */}
            {showHeatmap && muniPolygons.map(({ muni, paths, color }) => (
              <Polygon
                key={`heat-${muni.name}`}
                paths={paths}
                strokeColor={color.stroke}
                strokeOpacity={0.8}
                strokeWeight={1.5}
                fillColor={color.fill}
                fillOpacity={color.opacity}
                clickable={false}
              />
            ))}

            {/* Zone bubble markers — count per municipality */}
            {showZones && MUNICIPALITIES.map((muni) => {
              if (!muni.center) return null;
              const count     = countByMuni[muni.name] ?? 0;
              const intensity = count / maxCount;
              const size      = Math.max(28, 22 + count * 3);
              return (
                <AdvancedMarker key={`zone-${muni.name}`} position={muni.center} title={`${muni.name}: ${count} reports`}>
                  <div
                    className="rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/30 cursor-default select-none"
                    style={{
                      backgroundColor: muni.color,
                      opacity: count === 0 ? 0.2 : 0.55 + intensity * 0.45,
                      width:  `${size}px`,
                      height: `${size}px`,
                      fontSize: size < 32 ? "10px" : "12px",
                    }}
                    aria-label={`${muni.name}: ${count} reports`}
                  >
                    {count > 0 ? count : ""}
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Individual report pins */}
            {showPins && reportPins.map(({ report: r, pos }) => (
              <AdvancedMarker
                key={`pin-${r.id}`}
                position={pos}
                title={`${r.category} – ${r.priority}`}
                onClick={() => { setSelectedReport(r); setSelectedResponder(null); }}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-150 transition-transform"
                  style={{ backgroundColor: PRIORITY_COLORS[r.priority] ?? "#6B7280" }}
                  aria-label={`${r.priority} priority: ${r.category}`}
                />
              </AdvancedMarker>
            ))}

            {/* Responder labels */}
            {showResponders && filteredResponders.filter((r) => r.lat && r.lng).map((r) => (
              <AdvancedMarker
                key={`resp-${r.id}`}
                position={{ lat: r.lat!, lng: r.lng! }}
                title={`${r.name} (${r.type})`}
                onClick={() => { setSelectedResponder(r); setSelectedReport(null); }}
              >
                <div
                  className="bg-blue-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md font-semibold cursor-pointer hover:bg-blue-800 transition-colors whitespace-nowrap border border-white/20"
                  aria-label={`Responder: ${r.name}`}
                >
                  {r.name.split(" ")[0]}
                </div>
              </AdvancedMarker>
            ))}

            {/* Report info popup */}
            {selectedReport && (() => {
              const pos = selectedReport.latitude && selectedReport.longitude
                ? { lat: selectedReport.latitude, lng: selectedReport.longitude }
                : MUNICIPALITIES.find((m) => m.name === selectedReport.municipality)?.center ?? null;
              return pos ? (
                <InfoWindow position={pos} onCloseClick={() => setSelectedReport(null)}>
                  <div className="text-sm space-y-1.5 min-w-[180px]">
                    <p className="font-bold">{selectedReport.category}</p>
                    <p className="text-muted-foreground text-xs">{selectedReport.municipality}</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-medium uppercase">{selectedReport.status.replace(/_/g, " ")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium uppercase">{selectedReport.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{selectedReport.description}</p>
                  </div>
                </InfoWindow>
              ) : null;
            })()}

            {/* Responder info popup */}
            {selectedResponder?.lat && selectedResponder?.lng && (
              <InfoWindow
                position={{ lat: selectedResponder.lat, lng: selectedResponder.lng }}
                onCloseClick={() => setSelectedResponder(null)}
              >
                <div className="text-sm space-y-1 min-w-[160px]">
                  <p className="font-bold">{selectedResponder.name}</p>
                  <p className="text-muted-foreground text-xs capitalize">{selectedResponder.type} · {selectedResponder.municipality}</p>
                  {selectedResponder.phone && (
                    <a href={`tel:${selectedResponder.phone}`} className="text-blue-600 text-xs hover:underline block">
                      {selectedResponder.phone}
                    </a>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground items-center" role="img" aria-label="Map legend">
        {showHeatmap && (
          <div className="flex items-center gap-1.5">
            <div className="flex rounded overflow-hidden">
              {[120, 90, 60, 30, 0].map((hue) => (
                <div key={hue} className="w-5 h-3" style={{ backgroundColor: `hsl(${hue}, 80%, 45%)` }} />
              ))}
            </div>
            <span>Intensity (low → critical)</span>
          </div>
        )}
        {showPins && Object.entries(PRIORITY_COLORS).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0" style={{ backgroundColor: c }} />
            <span className="capitalize">{p}</span>
          </div>
        ))}
        {showResponders && (
          <div className="flex items-center gap-1">
            <div className="w-8 h-3 rounded bg-blue-700" />
            <span>Responder</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={cn("h-8 text-xs gap-1.5 px-2.5", active && "shadow-inner")}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
