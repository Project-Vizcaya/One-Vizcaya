import { useState, useMemo } from "react";
import {
  APIProvider, Map, AdvancedMarker, InfoWindow,
} from "@vis.gl/react-google-maps";
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from "@/lib/firebase";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, MapPin, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Report, Responder } from "@/types";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high:     "#F97316",
  medium:   "#F59E0B",
  low:      "#6B7280",
};

// Deterministic jitter from report ID so markers don't move on re-render
function stableOffset(id: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const latOff = ((h & 0xffff) / 0xffff - 0.5) * 0.025;
  const lngOff = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.025;
  return { lat: latOff, lng: lngOff };
}

interface MapViewProps {
  reports: Report[];
  responders: Responder[];
}

export function MapView({ reports, responders }: MapViewProps) {
  const [showHeatmap,    setShowHeatmap]    = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showPins,       setShowPins]       = useState(true);
  const [muniFilter,     setMuniFilter]     = useState("all");
  const [selectedReport,    setSelectedReport]    = useState<Report | null>(null);
  const [selectedResponder, setSelectedResponder] = useState<Responder | null>(null);

  const filteredReports    = useMemo(() => muniFilter === "all" ? reports    : reports.filter((r) => r.municipality === muniFilter),    [reports, muniFilter]);
  const filteredResponders = useMemo(() => muniFilter === "all" ? responders : responders.filter((r) => r.municipality === muniFilter), [responders, muniFilter]);

  const reportsByMuni = useMemo(() =>
    reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.municipality] = (acc[r.municipality] ?? 0) + 1;
      return acc;
    }, {}),
  [reports]);

  const maxCount = useMemo(() => Math.max(...Object.values(reportsByMuni), 1), [reportsByMuni]);

  const mapCenter = useMemo(() =>
    muniFilter !== "all"
      ? (MUNICIPALITIES.find((m) => m.name === muniFilter)?.center ?? NV_CENTER)
      : NV_CENTER,
  [muniFilter]);

  // Stable pin positions computed once per report ID
  const reportPins = useMemo(() =>
    filteredReports
      .filter((r) => r.status !== "solved")
      .map((r) => {
        const muni = MUNICIPALITIES.find((m) => m.name === r.municipality);
        if (!muni?.center) return null;
        const off = stableOffset(r.id);
        return { report: r, pos: { lat: muni.center.lat + off.lat, lng: muni.center.lng + off.lng } };
      })
      .filter(Boolean) as { report: Report; pos: { lat: number; lng: number } }[],
  [filteredReports]);

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

        <div className="flex gap-1.5" role="group" aria-label="Map layer toggles">
          <ToggleButton active={showHeatmap}    onClick={() => setShowHeatmap(!showHeatmap)}       icon={<Layers className="h-3.5 w-3.5" aria-hidden />} label="Heat" />
          <ToggleButton active={showResponders} onClick={() => setShowResponders(!showResponders)} icon={<Shield className="h-3.5 w-3.5" aria-hidden />} label="Responders" />
          <ToggleButton active={showPins}       onClick={() => setShowPins(!showPins)}             icon={<MapPin className="h-3.5 w-3.5" aria-hidden />} label="Pins" />
        </div>

        <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
          {filteredReports.filter((r) => r.status !== "solved").length} active incidents
        </span>
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border shadow-sm" style={{ height: "clamp(300px, 50vw, 500px)" }}>
        <APIProvider apiKey={MAPS_API_KEY}>
          <Map
            mapId="one-vizcaya-map"
            defaultCenter={mapCenter}
            defaultZoom={NV_ZOOM}
            center={mapCenter}
            gestureHandling="greedy"
          >
            {/* Municipality bubble markers */}
            {showHeatmap && MUNICIPALITIES.map((muni) => {
              if (!muni.center) return null;
              const count = reportsByMuni[muni.name] ?? 0;
              const intensity = count / maxCount;
              const size = Math.max(28, 22 + count * 3);
              return (
                <AdvancedMarker key={`muni-${muni.name}`} position={muni.center} title={`${muni.name}: ${count} reports`}>
                  <div
                    className="rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white/30 cursor-default"
                    style={{
                      backgroundColor: muni.color,
                      opacity: 0.6 + intensity * 0.4,
                      width: `${size}px`,
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

            {/* Report pins — stable positions */}
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

            {/* Responder markers */}
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
                  🛡 {r.name.split(" ")[0]}
                </div>
              </AdvancedMarker>
            ))}

            {/* Report popup */}
            {selectedReport && (() => {
              const muni = MUNICIPALITIES.find((m) => m.name === selectedReport.municipality);
              return muni?.center ? (
                <InfoWindow position={muni.center} onCloseClick={() => setSelectedReport(null)}>
                  <div className="text-sm space-y-1.5 min-w-[180px]">
                    <p className="font-bold text-sm">{selectedReport.category}</p>
                    <p className="text-muted-foreground text-xs">{selectedReport.municipality}</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-medium uppercase">{selectedReport.status.replace("_", " ")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium uppercase">{selectedReport.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{selectedReport.description}</p>
                  </div>
                </InfoWindow>
              ) : null;
            })()}

            {/* Responder popup */}
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
                      📞 {selectedResponder.phone}
                    </a>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" role="img" aria-label="Map legend">
        {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0" style={{ backgroundColor: c }} />
            <span className="capitalize">{p}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-5 h-3.5 rounded bg-blue-700" />
          <span>Responder</span>
        </div>
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
      className="h-8 text-xs gap-1.5 px-2.5"
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
