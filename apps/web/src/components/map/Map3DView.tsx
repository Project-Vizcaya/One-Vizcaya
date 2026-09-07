import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, Mountain, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NV_CENTER } from "@/lib/firebase";
import { MUNICIPALITIES } from "@/data/municipalities";
import type { Report, Responder } from "@/types";

// The 3D view is WebGL-based. MapLibre GL v5 specifically needs a **WebGL 2**
// context — a machine with hardware acceleration disabled (or a blocklisted
// GPU) often exposes only software WebGL 1, which passes a naive check but then
// leaves MapLibre unable to create its context, producing a silent blank map.
// So we probe for webgl2 directly and report *why* it's unavailable.
type WebGLState = "ok" | "webgl1only" | "none";
function webglSupport(): WebGLState {
  try {
    const canvas = document.createElement("canvas");
    if (canvas.getContext("webgl2")) return "ok";
    if (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      return "webgl1only";
    return "none";
  } catch {
    return "none";
  }
}

// "Vizcaya's Eye" — a 3D terrain view of the province built on MapLibre GL with
// FREE, no-API-key data: Esri World Imagery (satellite) draped over Mapzen/AWS
// Terrain-RGB elevation. Nueva Vizcaya is very mountainous, so the 3D relief
// makes the landslide/flood geography around each report readable at a glance.

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

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string),
  );
}

interface Props {
  reports: Report[];
  responders: Responder[];
}

export function Map3DView({ reports, responders }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [webgl] = useState(webglSupport);
  const webglOk = webgl === "ok";
  const [tileError, setTileError] = useState(false);
  // Set when MapLibre fails to actually start (context creation throws, or the
  // map never finishes loading) even though the webgl2 probe passed.
  const [initError, setInitError] = useState(false);

  const reportPins = useMemo(
    () =>
      reports
        .filter((r) => r.status !== "solved")
        .map((r) => {
          if (r.latitude && r.longitude) {
            return { r, lat: r.latitude, lng: r.longitude };
          }
          const muni = MUNICIPALITIES.find((m) => m.name === r.municipality);
          if (!muni?.center) return null;
          const off = stableOffset(r.id);
          return { r, lat: muni.center.lat + off.lat, lng: muni.center.lng + off.lng };
        })
        .filter(Boolean) as { r: Report; lat: number; lng: number }[],
    [reports],
  );

  const responderPins = useMemo(
    () => responders.filter((r) => r.lat && r.lng),
    [responders],
  );

  // Initialise the map once (skip entirely when WebGL is unavailable).
  useEffect(() => {
    if (!webglOk || !containerRef.current || mapRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: { compact: true },
      maxPitch: 80,
      center: [NV_CENTER.lng, NV_CENTER.lat],
      zoom: 8.6,
      pitch: 62,
      bearing: -17,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
          },
          terrain: {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            encoding: "terrarium",
            maxzoom: 14,
            attribution: "Elevation: Mapzen / AWS Terrain Tiles",
          },
        },
        layers: [
          { id: "satellite", type: "raster", source: "satellite" },
          {
            id: "hillshade",
            type: "hillshade",
            source: "terrain",
            paint: { "hillshade-exaggeration": 0.5 },
          },
        ],
      },
      });
    } catch (err) {
      // MapLibre couldn't create its WebGL context even though the probe passed
      // (e.g. software rendering the driver then refuses). Show the fallback.
      // eslint-disable-next-line no-console
      console.error("Map3DView: MapLibre init failed:", err);
      setInitError(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    // Safety net: if the map never finishes loading (context lost, tiles all
    // blocked, canvas stays 0×0), don't leave a silent blank box forever.
    const loadTimer = window.setTimeout(() => {
      if (!mapRef.current) return;
      setInitError(true);
    }, 12000);

    // Surface tile/source failures (e.g. a network blocking the Esri/AWS hosts)
    // instead of leaving a silent blank map.
    map.on("error", (e) => {
      const status = (e as { error?: { status?: number } }).error?.status;
      if (status && status >= 400) setTileError(true);
      // eslint-disable-next-line no-console
      console.warn("Map3DView error:", e?.error ?? e);
    });
    // A lost/failed WebGL context is the classic "blank 3D" cause — surface it.
    map.on("webglcontextlost", () => setInitError(true));

    // MapLibre needs the container's final size; force a resize once it's laid
    // out (fixes a blank canvas when mounted into a freshly-sized container).
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    map.on("load", () => {
      window.clearTimeout(loadTimer);
      map.resize();
      try {
        map.setTerrain({ source: "terrain", exaggeration: 1.6 });
      } catch {
        /* terrain unsupported — falls back to flat satellite */
      }
      try {
        // Atmospheric sky (MapLibre v5+). Ignored gracefully on older versions.
        (map as unknown as { setSky?: (o: unknown) => void }).setSky?.({
          "sky-color": "#8ec5ff",
          "sky-horizon-blend": 0.5,
          "horizon-color": "#ffffff",
          "horizon-fog-blend": 0.5,
          "fog-color": "#dfe9f5",
          "fog-ground-blend": 0.4,
        });
      } catch {
        /* no sky support — fine */
      }
      setReady(true);
    });
    return () => {
      window.clearTimeout(loadTimer);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [webglOk]);

  // (Re)draw markers when the map is ready or the data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const { r, lat, lng } of reportPins) {
      const el = document.createElement("div");
      el.style.cssText =
        `width:14px;height:14px;border-radius:50%;border:2px solid #fff;` +
        `background:${PRIORITY_COLORS[r.priority] ?? "#6B7280"};` +
        `box-shadow:0 0 5px rgba(0,0,0,.5);cursor:pointer;`;
      const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
        `<div style="font-size:12px;line-height:1.5">` +
          `<strong>${esc(r.category)}</strong><br/>` +
          `<span style="color:#666">${esc(r.municipality)}${r.barangay ? " · " + esc(r.barangay) : ""}</span><br/>` +
          `<span style="text-transform:uppercase;font-weight:600;color:#b91c1c">${esc(r.priority)}</span> · ` +
          `<span style="text-transform:uppercase">${esc(r.status.replace(/_/g, " "))}</span>` +
          `</div>`,
      );
      markersRef.current.push(
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).setPopup(popup).addTo(map),
      );
    }

    for (const resp of responderPins) {
      const el = document.createElement("div");
      el.style.cssText =
        `background:#1d4ed8;color:#fff;font-size:10px;font-weight:600;` +
        `padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,.3);` +
        `box-shadow:0 1px 4px rgba(0,0,0,.4);white-space:nowrap;cursor:pointer;`;
      el.textContent = resp.name.split(" ")[0];
      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
        `<div style="font-size:12px;line-height:1.5">` +
          `<strong>${esc(resp.name)}</strong><br/>` +
          `<span style="color:#666;text-transform:capitalize">${esc(resp.type)} · ${esc(resp.municipality)}</span>` +
          (resp.phone ? `<br/><span style="color:#1d4ed8">${esc(resp.phone)}</span>` : "") +
          `</div>`,
      );
      markersRef.current.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([resp.lng!, resp.lat!])
          .setPopup(popup)
          .addTo(map),
      );
    }
  }, [ready, reportPins, responderPins]);

  const resetView = () => {
    mapRef.current?.easeTo({
      center: [NV_CENTER.lng, NV_CENTER.lat],
      zoom: 8.6,
      pitch: 62,
      bearing: -17,
      duration: 900,
    });
  };

  // WebGL 2 unavailable, or MapLibre failed to start even though the probe
  // passed: show a clear, actionable explanation instead of a blank box.
  if (!webglOk || initError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-muted/30 text-center p-6"
        style={{ height: "clamp(340px, 55vw, 560px)" }}
      >
        <MonitorX className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">3D view isn't available on this device</p>
        <p className="text-xs text-muted-foreground max-w-md">
          The 3D terrain view needs <strong>WebGL 2</strong> with hardware graphics
          acceleration. It's the same data as 2D — the <strong>2D</strong> map has every
          report and responder.
        </p>
        <p className="text-xs text-muted-foreground max-w-md">
          To enable it in Chrome: open <span className="font-mono">chrome://settings/system</span>,
          turn on <em>“Use graphics acceleration when available”</em>, then relaunch. (On
          remote-desktop / virtual-machine sessions the GPU is often unavailable and 3D
          won't work regardless.)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative rounded-lg overflow-hidden border shadow-sm"
        style={{ height: "clamp(340px, 55vw, 560px)" }}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {tileError && (
          <div className="absolute inset-x-0 top-0 z-20 bg-amber-500/90 text-white text-[11px] px-3 py-1.5 text-center">
            Some map tiles couldn't load — check the network connection.
          </div>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="absolute left-2 top-2 z-10 h-8 gap-1.5 text-xs shadow"
          onClick={resetView}
        >
          <Mountain className="h-3.5 w-3.5" /> Reset view
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground items-center">
        {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm shrink-0" style={{ backgroundColor: c }} />
            <span className="capitalize">{p}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-8 h-3 rounded bg-blue-700" />
          <span>Responder</span>
        </div>
        <span className="ml-auto hidden sm:block">
          Drag to orbit · scroll to zoom · right-drag to tilt · 3D terrain (Esri imagery + AWS elevation)
        </span>
      </div>
    </div>
  );
}
