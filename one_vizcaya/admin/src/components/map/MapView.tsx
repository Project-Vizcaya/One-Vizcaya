import { useState, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from "@/lib/firebase";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, MapPin, Shield, Flame } from "lucide-react";
import type { Report, Responder } from "@/types";

interface MapViewProps {
  reports: Report[];
  responders: Responder[];
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#6B7280",
};

export function MapView({ reports, responders }: MapViewProps) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showResponders, setShowResponders] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [muniFilter, setMuniFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedResponder, setSelectedResponder] = useState<Responder | null>(null);

  const filteredReports = muniFilter === "all"
    ? reports
    : reports.filter((r) => r.municipality === muniFilter);

  const filteredResponders = muniFilter === "all"
    ? responders
    : responders.filter((r) => r.municipality === muniFilter);

  const mapCenter = muniFilter !== "all"
    ? (MUNICIPALITIES.find((m) => m.name === muniFilter)?.center ?? NV_CENTER)
    : NV_CENTER;

  const reportsByMuni = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.municipality] = (acc[r.municipality] ?? 0) + 1;
    return acc;
  }, {});
  const maxCount = Math.max(...Object.values(reportsByMuni), 1);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={muniFilter} onValueChange={setMuniFilter}>
          <SelectTrigger className="h-8 text-xs w-44">
            <SelectValue placeholder="All Municipalities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            {MUNICIPALITIES.map((m) => (
              <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1.5">
          <ToggleButton
            active={showHeatmap}
            onClick={() => setShowHeatmap(!showHeatmap)}
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Heat"
          />
          <ToggleButton
            active={showResponders}
            onClick={() => setShowResponders(!showResponders)}
            icon={<Shield className="h-3.5 w-3.5" />}
            label="Responders"
          />
          <ToggleButton
            active={showPins}
            onClick={() => setShowPins(!showPins)}
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Pins"
          />
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border shadow-sm" style={{ height: 480 }}>
        <APIProvider apiKey={MAPS_API_KEY}>
          <Map
            mapId="one-vizcaya-map"
            defaultCenter={mapCenter}
            defaultZoom={NV_ZOOM}
            center={mapCenter}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeId="roadmap"
          >
            {/* Municipality overlays */}
            {showHeatmap && MUNICIPALITIES.map((muni) => {
              const count = reportsByMuni[muni.name] ?? 0;
              const intensity = count / maxCount;
              if (!muni.center) return null;
              return (
                <AdvancedMarker
                  key={`muni-${muni.name}`}
                  position={muni.center}
                >
                  <div
                    className="rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer"
                    style={{
                      backgroundColor: muni.color,
                      opacity: 0.7 + intensity * 0.3,
                      width: Math.max(32, 24 + count * 2) + "px",
                      height: Math.max(32, 24 + count * 2) + "px",
                      fontSize: count > 9 ? "10px" : "12px",
                    }}
                    title={`${muni.name}: ${count} reports`}
                  >
                    {count > 0 ? count : ""}
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Report pins */}
            {showPins && filteredReports.filter((r) => r.status !== "solved").map((report) => {
              const muni = MUNICIPALITIES.find((m) => m.name === report.municipality);
              if (!muni?.center) return null;
              const offset = {
                lat: muni.center.lat + (Math.random() - 0.5) * 0.02,
                lng: muni.center.lng + (Math.random() - 0.5) * 0.02,
              };
              return (
                <AdvancedMarker
                  key={`report-${report.id}`}
                  position={offset}
                  onClick={() => { setSelectedReport(report); setSelectedResponder(null); }}
                >
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-150 transition-transform"
                    style={{ backgroundColor: PRIORITY_COLORS[report.priority] ?? "#6B7280" }}
                  />
                </AdvancedMarker>
              );
            })}

            {/* Responder markers */}
            {showResponders && filteredResponders.filter((r) => r.lat && r.lng).map((responder) => (
              <AdvancedMarker
                key={`resp-${responder.id}`}
                position={{ lat: responder.lat!, lng: responder.lng! }}
                onClick={() => { setSelectedResponder(responder); setSelectedReport(null); }}
              >
                <div className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded shadow font-medium cursor-pointer hover:bg-blue-700 transition-colors whitespace-nowrap">
                  🛡 {responder.name.split(" ")[0]}
                </div>
              </AdvancedMarker>
            ))}

            {/* Report info window */}
            {selectedReport && (
              <InfoWindow
                position={
                  MUNICIPALITIES.find((m) => m.name === selectedReport.municipality)?.center ?? NV_CENTER
                }
                onCloseClick={() => setSelectedReport(null)}
              >
                <div className="text-sm space-y-1 min-w-[180px]">
                  <p className="font-semibold">{selectedReport.category}</p>
                  <p className="text-muted-foreground">{selectedReport.municipality}</p>
                  <div className="flex gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 capitalize">{selectedReport.status.replace("_", " ")}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 capitalize">{selectedReport.priority}</span>
                  </div>
                </div>
              </InfoWindow>
            )}

            {/* Responder info window */}
            {selectedResponder && selectedResponder.lat && selectedResponder.lng && (
              <InfoWindow
                position={{ lat: selectedResponder.lat, lng: selectedResponder.lng }}
                onCloseClick={() => setSelectedResponder(null)}
              >
                <div className="text-sm space-y-1 min-w-[160px]">
                  <p className="font-semibold">{selectedResponder.name}</p>
                  <p className="text-muted-foreground capitalize">{selectedResponder.type} · {selectedResponder.municipality}</p>
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
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-600" />Critical</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500" />High</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500" />Medium</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400" />Low</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-600" />Responder</div>
      </div>
    </div>
  );
}

function ToggleButton({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className="h-8 text-xs gap-1 px-2"
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
