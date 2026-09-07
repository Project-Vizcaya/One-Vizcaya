import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { httpsCallable } from "firebase/functions";
import { CloudRain, Wind, Thermometer, Cloud, MapPin, Loader2, RefreshCw, AlertTriangle, Droplets, Sun } from "lucide-react";
import { functions } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/weather")({
  component: WeatherPage,
});

// Municipality centres for Nueva Vizcaya (mirrors NV_MUNICIPALITY_COORDS in
// functions). "Province-wide" centres on the capital with a wider zoom.
const NV_COORDS: Record<string, [number, number]> = {
  "Province-wide": [16.48, 121.15],
  Bambang: [16.3833, 121.0667],
  Bayombong: [16.4833, 121.15],
  Solano: [16.5167, 121.1833],
  Aritao: [16.3, 121.0333],
  Bagabag: [16.5833, 121.2333],
  Villaverde: [16.65, 121.2667],
  Diadi: [16.6, 121.3],
  Quezon: [16.2333, 121.0167],
  "Santa Fe": [16.1667, 120.9833],
  Ambaguio: [16.2167, 121.1167],
  Kasibu: [16.3167, 121.2667],
  "Dupax del Norte": [16.5, 121.1],
  "Dupax del Sur": [16.4667, 121.0833],
  "Alfonso Castañeda": [16.1833, 121.2167],
  Kayapa: [16.35, 120.9167],
};

const OVERLAYS = [
  { key: "rain", label: "Rain", icon: CloudRain },
  { key: "wind", label: "Wind", icon: Wind },
  { key: "temp", label: "Temp", icon: Thermometer },
  { key: "clouds", label: "Clouds", icon: Cloud },
] as const;

interface ForecastSlot {
  ts: number;
  windKmh: number;
  gustKmh: number;
  tempC: number | null;
  precipMm: number;
}
interface ForecastResult {
  lat: number;
  lon: number;
  municipality: string | null;
  series: ForecastSlot[];
}

interface UvSlot {
  key: string;
  dateLabel: string;
  timeLabel: string;
  uv: number;
}

const _MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// WHO UV Index risk bands.
function uvLevel(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: "Low", color: "#2E7D32" };
  if (uv < 6) return { label: "Moderate", color: "#F9A825" };
  if (uv < 8) return { label: "High", color: "#E65100" };
  if (uv < 11) return { label: "Very High", color: "#C62828" };
  return { label: "Extreme", color: "#6A1B9A" };
}

function WeatherPage() {
  const [place, setPlace] = useState<string>("Province-wide");
  const [overlay, setOverlay] = useState<string>("rain");
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noKey, setNoKey] = useState(false);

  const [uv, setUv] = useState<UvSlot[]>([]);
  const [uvLoading, setUvLoading] = useState(false);
  const [uvError, setUvError] = useState(false);

  const [lat, lon] = NV_COORDS[place] ?? NV_COORDS["Province-wide"];
  // Windy's forecast tiles are coarse; a tighter zoom looks blank/"wrong", so
  // keep municipalities at a moderate zoom that reliably frames the town.
  const zoom = place === "Province-wide" ? 9 : 10;

  // UV Index forecast at 4-hour intervals via Open-Meteo (free, no API key).
  // Auto-loads when the selected place changes — independent of the Windy key.
  useEffect(() => {
    let cancelled = false;
    setUvLoading(true);
    setUvError(false);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=uv_index&timezone=Asia%2FManila&forecast_days=2`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("uv"))))
      .then((d) => {
        if (cancelled) return;
        const times: string[] = d?.hourly?.time ?? [];
        const values: number[] = d?.hourly?.uv_index ?? [];
        // Manila "now" as a comparable YYYYMMDDHH key (sv-SE gives ISO-like text).
        const nowKey = new Date()
          .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
          .slice(0, 13)
          .replace(/[- :]/g, "");
        const slots: UvSlot[] = [];
        for (let i = 0; i < times.length && slots.length < 8; i++) {
          const t = times[i]; // "2026-09-04T08:00" (Manila local)
          const hour = parseInt(t.slice(11, 13), 10);
          if (hour % 4 !== 0) continue; // every 4 hours
          if (t.slice(0, 13).replace(/[-T:]/g, "") < nowKey) continue; // now onward
          const [, m, dd] = t.slice(0, 10).split("-").map(Number);
          const h12 = hour % 12 === 0 ? 12 : hour % 12;
          slots.push({
            key: t,
            dateLabel: `${_MONTHS[m - 1]} ${dd}`,
            timeLabel: `${h12} ${hour < 12 ? "AM" : "PM"}`,
            uv: Math.round((values[i] ?? 0) * 10) / 10,
          });
        }
        setUv(slots);
      })
      .catch(() => {
        if (!cancelled) setUvError(true);
      })
      .finally(() => {
        if (!cancelled) setUvLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  const embedUrl = useMemo(() => {
    const p = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      detailLat: String(lat),
      detailLon: String(lon),
      zoom: String(zoom),
      level: "surface",
      overlay,
      product: "ecmwf",
      menu: "",
      message: "true",
      marker: "true",
      calendar: "now",
      type: "map",
      location: "coordinates",
      metricWind: "km/h",
      metricTemp: "°C",
    });
    return `https://embed.windy.com/embed2.html?${p.toString()}`;
  }, [lat, lon, zoom, overlay]);

  const loadForecast = async () => {
    setLoading(true);
    setError(null);
    setNoKey(false);
    try {
      const fn = httpsCallable<{ municipality?: string; lat?: number; lon?: number }, ForecastResult>(
        functions,
        "getWindyForecast",
      );
      const arg = place === "Province-wide" ? { lat, lon } : { municipality: place };
      const { data } = await fn(arg);
      setForecast(data);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "functions/failed-precondition") {
        setNoKey(true);
      } else {
        setError(err.message ?? "Could not load the forecast.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Weather</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Province of Nueva Vizcaya · Live conditions via Windy
          </p>
        </div>
        <div className="w-48 shrink-0">
          <Select value={place} onValueChange={setPlace}>
            <SelectTrigger className="text-xs">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(NV_COORDS).map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Interactive Windy map */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Live Weather Map</CardTitle>
          <div className="flex gap-1">
            {OVERLAYS.map((o) => (
              <Button
                key={o.key}
                size="sm"
                variant={overlay === o.key ? "default" : "outline"}
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => setOverlay(o.key)}
              >
                <o.icon className="h-3.5 w-3.5" /> {o.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-hidden rounded-lg border" style={{ aspectRatio: "16 / 9" }}>
            <iframe
              key={embedUrl}
              title="Windy weather map"
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              frameBorder="0"
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Interactive forecast map from Windy.com. Use the buttons to switch overlays; drag and zoom the map freely.
          </p>
        </CardContent>
      </Card>

      {/* On-demand point forecast (needs the WINDY_API_KEY secret) */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Forecast — {place}</CardTitle>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={loadForecast} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {forecast ? "Refresh" : "Load forecast"}
          </Button>
        </CardHeader>
        <CardContent>
          {noKey ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Windy API key not set</p>
                <p className="text-xs mt-0.5">
                  The map above works without a key. To enable live forecast data, register a free key at
                  {" "}api.windy.com and run:{" "}
                  <code className="rounded bg-amber-100 px-1">firebase functions:secrets:set WINDY_API_KEY</code>, then redeploy functions.
                </p>
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !forecast ? (
            <p className="text-sm text-muted-foreground">
              Click <strong>Load forecast</strong> for the next-24-hour wind, gusts, temperature and rain at {place}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {forecast.series.map((s) => (
                  <div key={s.ts} className="w-24 shrink-0 rounded-lg border p-2.5 text-center">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {new Date(s.ts).toLocaleTimeString("en-PH", { hour: "numeric", hour12: true })}
                    </p>
                    <p className="mt-1 text-lg font-bold">{s.tempC ?? "–"}°</p>
                    <div className="mt-1.5 space-y-0.5 text-[11px]">
                      <p className={`flex items-center justify-center gap-1 ${s.gustKmh >= 60 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                        <Wind className="h-3 w-3" /> {s.windKmh}
                        <span className="opacity-60">/{s.gustKmh}</span>
                      </p>
                      <p className={`flex items-center justify-center gap-1 ${s.precipMm >= 7.5 ? "text-blue-600 font-semibold" : "text-muted-foreground"}`}>
                        <Droplets className="h-3 w-3" /> {s.precipMm} mm
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Wind (sustained/gust) in km/h · rain in mm per 3h. Red = gusts ≥ 60 km/h; blue = heavy rain. Source: Windy Point Forecast.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* UV Index — 4-hour intervals (Open-Meteo, no key needed) */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-amber-500" /> UV Index — {place}
          </CardTitle>
          {uvLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {uvError ? (
            <p className="text-sm text-destructive">Could not load the UV index right now.</p>
          ) : uv.length === 0 && !uvLoading ? (
            <p className="text-sm text-muted-foreground">No UV data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {uv.map((s) => {
                  const lvl = uvLevel(s.uv);
                  return (
                    <div key={s.key} className="w-24 shrink-0 rounded-lg border p-2.5 text-center">
                      <p className="text-[11px] font-medium text-muted-foreground">{s.dateLabel}</p>
                      <p className="text-[11px] text-muted-foreground">{s.timeLabel}</p>
                      <p className="mt-1 text-2xl font-bold" style={{ color: lvl.color }}>{s.uv}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: lvl.color }}>
                        {lvl.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                UV Index at 4-hour intervals (Manila time). Low 0–2 · Moderate 3–5 · High 6–7 · Very High 8–10 · Extreme 11+. Source: Open-Meteo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
