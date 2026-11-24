import type { Incident, UnitStatus } from "./types";

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ── Adaptive location reporting (handoff §4.1) ─────────────────────────────
// Shortest wait between fixes and the distance that also triggers a send.
export const REPORTING: Record<UnitStatus, { intervalMs: number; distanceM: number } | null> = {
  off_duty: null,
  available: { intervalMs: 3 * 60_000, distanceM: 100 },
  dispatched: { intervalMs: 7_000, distanceM: 20 },
  en_route: { intervalMs: 7_000, distanceM: 20 },
  on_scene: { intervalMs: 45_000, distanceM: 25 },
  returning: { intervalMs: 30_000, distanceM: 50 },
};

/** Should the responder site send this fix, given the last one sent? */
export function shouldSend(
  status: UnitStatus,
  last: { lat: number; lng: number; atMs: number } | null,
  next: { lat: number; lng: number; atMs: number },
): boolean {
  const rule = REPORTING[status];
  if (!rule) return false;
  if (!last) return true;
  return next.atMs - last.atMs >= rule.intervalMs || distanceM(last, next) >= rule.distanceM;
}

// ── Staleness: never show a stale dot as live (handoff §4.2) ───────────────
export type Freshness = "live" | "fading" | "lost" | "none";

export function freshness(status: UnitStatus, fixTime: string | null, nowMs: number): Freshness {
  if (!fixTime) return "none";
  const age = nowMs - Date.parse(fixTime);
  const moving = status === "dispatched" || status === "en_route" || status === "returning";
  if (age > 5 * 60_000 && moving) return "lost";
  if (moving) return age < 30_000 ? "live" : "fading";
  // Available / on scene report less often: live up to 6 min, then lost.
  return age < 6 * 60_000 ? "live" : "lost";
}

export function ageText(fixTime: string | null, nowMs: number): string {
  if (!fixTime) return "no position yet";
  const s = Math.max(0, Math.round((nowMs - Date.parse(fixTime)) / 1000));
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)} h ago`;
}

// ── ETA (handoff §7.3) ─────────────────────────────────────────────────────
// STUB until OpenRouteService / OSRM is chosen: straight-line distance × 1.4
// for winding provincial roads, at 35 km/h. Recalculated at most every 90 s,
// or sooner when the unit has moved more than 500 m.
export const ETA_ROAD_FACTOR = 1.4;
export const ETA_SPEED_MPS = 35_000 / 3600;
export const ETA_MIN_INTERVAL_MS = 90_000;
export const ETA_MOVE_M = 500;

export function etaSeconds(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  return Math.round((distanceM(from, to) * ETA_ROAD_FACTOR) / ETA_SPEED_MPS);
}

export function etaDue(
  last: { atMs: number; lat: number; lng: number } | null,
  now: { atMs: number; lat: number; lng: number },
): boolean {
  if (!last) return true;
  return now.atMs - last.atMs >= ETA_MIN_INTERVAL_MS || distanceM(last, now) > ETA_MOVE_M;
}

/** The citizen sees a rounded range, never a countdown. Same rule as One Vizcaya. */
export function etaRange(seconds: number): [number, number] {
  const m = seconds / 60;
  if (m < 5) return [0, 5];
  const step = m <= 60 ? 5 : 15;
  const lo = Math.floor(m / step) * step;
  return [lo, lo + step];
}

// ── Possible duplicates (handoff §5): within 300 m and 30 min ──────────────
export const DUP_RADIUS_M = 300;
export const DUP_WINDOW_MS = 30 * 60_000;

// Categories that describe the same kind of event. Anything else only matches
// its own category, or a hotline call with no category yet.
const FAMILIES: string[][] = [
  ["flood", "flooding", "flash flood", "rising water"],
  ["fire", "structure fire", "grass fire", "vehicle fire"],
  ["landslide", "rockslide", "road blocked", "road obstruction"],
  ["vehicular accident", "road accident", "collision", "accident"],
  ["medical", "medical emergency", "injury"],
];
const family = (c: string | null) => {
  const x = (c ?? "").trim().toLowerCase();
  if (!x) return null;
  return FAMILIES.find((f) => f.some((w) => x.includes(w)))?.[0] ?? x;
};

export function compatibleCategory(a: string | null, b: string | null): boolean {
  const fa = family(a), fb = family(b);
  return fa === null || fb === null || fa === fb;
}

export function possibleDuplicates(target: Incident, all: Incident[]): Incident[] {
  if (target.lat === null || target.lng === null) return [];
  const t = Date.parse(target.created_at);
  return all
    .filter((o) =>
      o.id !== target.id && !o.merged_into && o.status !== "duplicate" && o.status !== "closed" &&
      o.status !== "invalid" && o.status !== "resolved" &&
      o.lat !== null && o.lng !== null &&
      Math.abs(Date.parse(o.created_at) - t) <= DUP_WINDOW_MS &&
      distanceM({ lat: target.lat!, lng: target.lng! }, { lat: o.lat, lng: o.lng }) <= DUP_RADIUS_M &&
      compatibleCategory(target.category, o.category))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

// ── Navigation links (handoff §7.2): external apps, no in-app navigation ───
export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
export const wazeUrl = (lat: number, lng: number) => `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
