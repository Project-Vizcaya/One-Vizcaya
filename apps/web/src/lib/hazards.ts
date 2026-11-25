import type { Report, SosAlert } from "@/types";
import type { PagasaProduct } from "@/lib/pagasa";
import { isOpenReport } from "@/lib/utils";
import { REPORT_CATEGORIES } from "@/data/reportCategories";

// Hazard Watch (docs/4-app-and-website/hazards.md): one list of everything that needs the
// PDRRMO's attention, from every source, ranked so the PROVINCE'S OWN
// information comes first:
//   tier 0  One Vizcaya: open SOS and open disaster-type reports
//   tier 1  PAGASA (official): warnings, advisories, tropical cyclone info
//   tier 2  PHIVOLCS (official): earthquakes near the province
//   tier 3  USGS (international): earthquakes near the province
// Within a tier: critical > warning > watch > info, then newest first.
// Nothing is merged across sources; every item names its source.

export type HazardKind = "sos" | "flood" | "landslide" | "incident" | "weather" | "typhoon" | "earthquake";
export type HazardLevel = "critical" | "warning" | "watch" | "info";
export type HazardSource = "onevizcaya" | "pagasa" | "phivolcs" | "usgs";

export interface HazardItem {
  id: string;
  kind: HazardKind;
  level: HazardLevel;
  source: HazardSource;
  tier: 0 | 1 | 2 | 3;
  title: string;
  detail: string;
  municipality: string | null;
  at: Date | null;
  lat: number | null;
  lng: number | null;
  /** Earthquakes: magnitude and distance from the province. */
  magnitude?: number;
  distanceKm?: number;
  /** External page (bulletin, event page) or console route. */
  href?: string;
  /** Report owner + id, to open it in Live Reports. */
  reportRef?: { userId: string; id: string };
}

export interface QuakeSignal {
  id: string;
  source: "usgs" | "phivolcs";
  magnitude: number;
  depthKm: number | null;
  lat: number;
  lon: number;
  place: string | null;
  timeMs: number;
  url: string | null;
  distanceKm: number;
  level: HazardLevel;
  supersededBy: string | null;
}

export interface PagasaMobileAlert {
  id: string;
  title: string;
  message: string;
  issuedAt: Date | null;
  validUntil: Date | null;
  priority: number;
}

export const SOURCE_LABEL: Record<HazardSource, string> = {
  onevizcaya: "One Vizcaya",
  pagasa: "PAGASA",
  phivolcs: "PHIVOLCS",
  usgs: "USGS (international)",
};

// Report categories that are hazards: every category whose usual priority is
// "critical", plus bridge damage (it cuts towns off).
const HAZARD_CATEGORIES = new Set([
  ...REPORT_CATEGORIES.filter((c) => c.basePriority === "critical").map((c) => c.name),
  "Bridge Damage / Blockage",
]);

export const isHazardReport = (r: Pick<Report, "category">) => HAZARD_CATEGORIES.has(r.category);

function reportKind(category: string): HazardKind {
  if (/flood/i.test(category)) return "flood";
  if (/landslide/i.test(category)) return "landslide";
  return "incident";
}

const LEVEL_RANK: Record<HazardLevel, number> = { critical: 0, warning: 1, watch: 2, info: 3 };

function reportLevel(priority: string): HazardLevel {
  if (priority === "critical") return "critical";
  if (priority === "high") return "warning";
  if (priority === "medium") return "watch";
  return "info";
}

export function buildHazardItems(input: {
  reports: Report[];
  sos: SosAlert[];
  pagasa: PagasaProduct | null;
  pagasaAlerts: PagasaMobileAlert[];
  quakes: QuakeSignal[];
  now: Date;
}): HazardItem[] {
  const { now } = input;
  const items: HazardItem[] = [];

  // Tier 0: the province's own data.
  for (const s of input.sos) {
    if (s.status !== "active" && s.status !== "dispatched") continue;
    items.push({
      id: `sos_${s.id}`, kind: "sos", level: "critical", source: "onevizcaya", tier: 0,
      title: `SOS${s.status === "dispatched" ? " (dispatched)" : ""}: ${s.name || "Resident"}`,
      detail: [s.barangay && `Brgy. ${s.barangay}`, s.municipality, s.note].filter(Boolean).join(" · "),
      municipality: s.municipality || null,
      at: s.updatedAt ?? s.createdAt ?? null,
      lat: typeof s.lat === "number" ? s.lat : null,
      lng: typeof s.lng === "number" ? s.lng : null,
      href: "/dashboard/emergencies",
    });
  }
  for (const r of input.reports) {
    if (!isOpenReport(r) || !isHazardReport(r)) continue;
    items.push({
      id: `report_${r.id}`, kind: reportKind(r.category), level: reportLevel(r.priority),
      source: "onevizcaya", tier: 0,
      title: r.category,
      detail: [r.barangay && `Brgy. ${r.barangay}`, r.municipality, r.description].filter(Boolean).join(" · "),
      municipality: r.municipality || null,
      at: r.reportedAt,
      lat: typeof r.latitude === "number" ? r.latitude : null,
      lng: typeof r.longitude === "number" ? r.longitude : null,
      reportRef: { userId: r.userId, id: r.id },
    });
  }

  // Tier 1: PAGASA, official.
  const p = input.pagasa;
  if (p) {
    if (p.synopsis?.mentionsTropicalCyclone && p.synopsis.text) {
      const expired = !!p.synopsis.validUntil && now > p.synopsis.validUntil;
      if (!expired) {
        items.push({
          id: "pagasa_tc", kind: "typhoon", level: "warning", source: "pagasa", tier: 1,
          title: "Tropical cyclone information",
          detail: p.synopsis.text, municipality: null, at: p.synopsis.issuedAt, lat: null, lng: null,
          href: p.sourceUrl,
        });
      }
    }
    if (p.rainfall && p.rainfall.noneIssued === false && p.rainfall.text) {
      items.push({
        id: "pagasa_rain", kind: "flood", level: "warning", source: "pagasa", tier: 1,
        title: "Heavy rainfall warning",
        detail: p.rainfall.text, municipality: null, at: p.retrievedAt, lat: null, lng: null,
        href: p.sourceUrl,
      });
    }
    (p.thunderstorms?.items ?? []).forEach((t, i) => {
      if (!t.mentionsNuevaVizcaya) return;
      if (t.validUntil && now > t.validUntil) return;
      items.push({
        id: `pagasa_ts_${i}`, kind: "weather", level: t.kind === "advisory" ? "warning" : "watch",
        source: "pagasa", tier: 1,
        title: t.title || "Thunderstorm information",
        detail: t.text, municipality: null, at: t.issuedAt, lat: null, lng: null, href: p.sourceUrl,
      });
    });
  }
  for (const a of input.pagasaAlerts) {
    if (a.validUntil && now > a.validUntil) continue;
    items.push({
      id: `pagasa_alert_${a.id}`, kind: /flood|rain/i.test(a.title) ? "flood" : "weather",
      level: a.priority >= 3 ? "critical" : a.priority >= 2 ? "warning" : "watch",
      source: "pagasa", tier: 1,
      title: a.title, detail: a.message, municipality: null, at: a.issuedAt, lat: null, lng: null,
    });
  }

  // Tiers 2-3: earthquakes. A USGS copy of a PHIVOLCS report is hidden.
  for (const q of input.quakes) {
    if (q.supersededBy) continue;
    items.push({
      id: q.id, kind: "earthquake", level: q.level, source: q.source, tier: q.source === "phivolcs" ? 2 : 3,
      title: `Magnitude ${q.magnitude.toFixed(1)} earthquake`,
      detail: [q.place, `${q.distanceKm} km from the province`, q.depthKm !== null && `${q.depthKm} km deep`]
        .filter(Boolean).join(" · "),
      municipality: null, at: new Date(q.timeMs), lat: q.lat, lng: q.lon,
      magnitude: q.magnitude, distanceKm: q.distanceKm, href: q.url ?? undefined,
    });
  }

  return items.sort((a, b) =>
    (a.tier - b.tier) ||
    (LEVEL_RANK[a.level] - LEVEL_RANK[b.level]) ||
    ((b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)));
}

export function hazardCounts(items: HazardItem[]) {
  return {
    active: items.length,
    critical: items.filter((i) => i.level === "critical").length,
    sources: new Set(items.map((i) => i.source)).size,
  };
}

/** Map circle radius for an earthquake: a rough felt-area aid, not a model. */
export const quakeRadiusMeters = (mag: number) => Math.min(150000, Math.max(5000, 10 ** (0.4 * mag) * 1000));
