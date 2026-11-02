import { useMemo, useState } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAPS_API_KEY, NV_CENTER, NV_ZOOM } from "@/lib/firebase";
import { MUNICIPALITIES } from "@/data/municipalities";
import { useAuthStore } from "@/stores/authStore";
import type { Report, Responder } from "@/types";

// Satellite view — aerial imagery of where a report actually is, so a responder
// (police / fire / MDRRMO) has a real visual reference point before moving out:
// the river, the bend in the road, the roof they are looking for.
//
// This replaces an earlier MapLibre-based "3D terrain" view, which required
// WebGL 2 and rendered blank on every machine it was tested on (office and
// café PCs whose GPU driver Chrome blocklists for WebGL 2). This view is built
// on the same Google Maps stack as the 2D map, which is already proven to work
// on that hardware.
//
// Deliberately NOT called "3D": Google's oblique/45° imagery does not cover
// rural Nueva Vizcaya, so this is top-down aerial imagery, not a tilted
// terrain model. Naming it accurately beats promising a view we cannot deliver.

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#6B7280",
};

// Deterministic jitter so pins without GPS don't stack on the town centre.
function stableOffset(id: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return {
    lat: ((h & 0xffff) / 0xffff - 0.5) * 0.02,
    lng: (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.02,
  };
}

// Recentres imperatively so the user can still pan/zoom freely afterwards.
function Recenter({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  const reset = () => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  };
  return (
    <Button
      size="sm"
      variant="secondary"
      className="absolute left-2 top-2 z-10 h-8 gap-1.5 text-xs shadow"
      onClick={reset}
    >
      <Satellite className="h-3.5 w-3.5" /> Reset view
    </Button>
  );
}

interface Props {
  reports: Report[];
  responders: Responder[];
}

export function SatelliteView({ reports, responders }: Props) {
  const viewAs = useAuthStore((s) => s.viewAs);
  const viewMunicipality = useAuthStore((s) => s.viewMunicipality);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedResponder, setSelectedResponder] = useState<Responder | null>(null);

  // Open on the town the dashboard is scoped to, like the 2D map does.
  const scopedMuni = viewAs === "municipal" ? viewMunicipality : null;
  const center = useMemo(
    () =>
      (scopedMuni && MUNICIPALITIES.find((m) => m.name === scopedMuni)?.center) || NV_CENTER,
    [scopedMuni],
  );
  const zoom = scopedMuni ? 13 : NV_ZOOM;

  const reportPins = useMemo(
    () =>
      reports
        .filter((r) => r.status !== "solved")
        .map((r) => {
          if (r.latitude && r.longitude) {
            return { r, pos: { lat: r.latitude, lng: r.longitude }, exact: true };
          }
          const muni = MUNICIPALITIES.find((m) => m.name === r.municipality);
          if (!muni?.center) return null;
          const off = stableOffset(r.id);
          return {
            r,
            pos: { lat: muni.center.lat + off.lat, lng: muni.center.lng + off.lng },
            exact: false,
          };
        })
        .filter(Boolean) as { r: Report; pos: { lat: number; lng: number }; exact: boolean }[],
    [reports],
  );

  const responderPins = useMemo(
    () => responders.filter((r) => r.lat && r.lng),
    [responders],
  );

  const gpsCount = reportPins.filter((p) => p.exact).length;

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-lg overflow-hidden border shadow-sm"
        style={{ height: "clamp(340px, 55vw, 560px)" }}
      >
        <APIProvider apiKey={MAPS_API_KEY}>
          <Map
            mapId="one-vizcaya-map"
            defaultCenter={center}
            defaultZoom={zoom}
            mapTypeId="hybrid"
            gestureHandling="greedy"
            tilt={0}
          >
            <Recenter center={center} zoom={zoom} />

            {reportPins.map(({ r, pos, exact }) => (
              <AdvancedMarker
                key={`sat-pin-${r.id}`}
                position={pos}
                title={`${r.category} – ${r.priority}${exact ? "" : " (approximate)"}`}
                onClick={() => {
                  setSelectedReport(r);
                  setSelectedResponder(null);
                }}
              >
                <div
                  className="rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-150 transition-transform"
                  style={{
                    width: exact ? 14 : 11,
                    height: exact ? 14 : 11,
                    backgroundColor: PRIORITY_COLORS[r.priority] ?? "#6B7280",
                    // A hollow centre marks a pin placed from the town centre
                    // rather than real GPS, so a responder is not sent to a
                    // precise-looking point that was never precise.
                    boxShadow: exact ? undefined : "inset 0 0 0 3px rgba(255,255,255,.85)",
                  }}
                  aria-label={`${r.priority} priority: ${r.category}`}
                />
              </AdvancedMarker>
            ))}

            {responderPins.map((resp) => (
              <AdvancedMarker
                key={`sat-resp-${resp.id}`}
                position={{ lat: resp.lat!, lng: resp.lng! }}
                title={`${resp.name} (${resp.type})`}
                onClick={() => {
                  setSelectedResponder(resp);
                  setSelectedReport(null);
                }}
              >
                <div className="bg-blue-700 text-white text-[10px] px-1.5 py-0.5 rounded shadow-md font-semibold cursor-pointer hover:bg-blue-800 transition-colors whitespace-nowrap border border-white/20">
                  {resp.name.split(" ")[0]}
                </div>
              </AdvancedMarker>
            ))}

            {selectedReport && (() => {
              const hit = reportPins.find((p) => p.r.id === selectedReport.id);
              return hit ? (
                <InfoWindow position={hit.pos} onCloseClick={() => setSelectedReport(null)}>
                  <div className="text-sm space-y-1.5 min-w-[190px]">
                    <p className="font-bold">{selectedReport.category}</p>
                    <p className="text-muted-foreground text-xs">
                      {selectedReport.municipality}
                      {selectedReport.barangay ? ` · ${selectedReport.barangay}` : ""}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-medium uppercase">
                        {selectedReport.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium uppercase">
                        {selectedReport.priority}
                      </span>
                    </div>
                    {!hit.exact && (
                      <p className="text-[11px] text-amber-700">
                        Approximate location — no GPS on this report.
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {selectedReport.description}
                    </p>
                  </div>
                </InfoWindow>
              ) : null;
            })()}

            {selectedResponder?.lat && selectedResponder?.lng && (
              <InfoWindow
                position={{ lat: selectedResponder.lat, lng: selectedResponder.lng }}
                onCloseClick={() => setSelectedResponder(null)}
              >
                <div className="text-sm space-y-1 min-w-[160px]">
                  <p className="font-bold">{selectedResponder.name}</p>
                  <p className="text-muted-foreground text-xs capitalize">
                    {selectedResponder.type} · {selectedResponder.municipality}
                  </p>
                  {selectedResponder.phone && (
                    <a
                      href={`tel:${selectedResponder.phone}`}
                      className="text-blue-600 text-xs hover:underline block"
                    >
                      {selectedResponder.phone}
                    </a>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground items-center">
        {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0"
              style={{ backgroundColor: c }}
            />
            <span className="capitalize">{p}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div
            className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0 bg-gray-500"
            style={{ boxShadow: "inset 0 0 0 3px rgba(255,255,255,.85)" }}
          />
          <span>Approximate (no GPS)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-3 rounded bg-blue-700" />
          <span>Responder</span>
        </div>
        <span className="ml-auto hidden sm:block">
          {reportPins.length} active · {gpsCount} with GPS · aerial imagery may be
          several years old
        </span>
      </div>
    </div>
  );
}
