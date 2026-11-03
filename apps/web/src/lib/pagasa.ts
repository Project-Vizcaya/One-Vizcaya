import { Timestamp } from "firebase/firestore";

// Official PAGASA products for Nueva Vizcaya, as written to
// `pagasa_products/nueva_vizcaya` by the `pagasaRegionalWatch` Cloud Function.
// This is the SAME document the mobile app reads; the web console never
// fetches PAGASA itself. Field handling and freshness thresholds mirror
// apps/mobile/lib/data/models/pagasa_product.dart so both show the same thing.
//
// Coverage: the forecast and outlook cover the PROVINCE; synopsis, rainfall
// and thunderstorm products cover the Northern Luzon REGION. None is a
// municipal observation. Missing values stay null.

export interface PagasaCoverage { level: "province" | "region" | string; name: string; psgc?: string | null }
export interface PagasaPeriod {
  description: string | null; high: number | null; low: number | null;
  windSpeed: string | null; windDirection: string | null;
}
export interface PagasaOutlookDay extends PagasaPeriod { label: string | null; date: string | null }
export interface PagasaThunderstorm {
  kind: "advisory" | "watch" | "information" | "other" | string;
  title: string | null; issuedAt: Date | null; validUntil: Date | null;
  text: string; mentionsNuevaVizcaya: boolean;
}
export interface PagasaProduct {
  sourceUrl: string; office: string;
  retrievedAt: Date | null; lastSuccessAt: Date | null; lastErrorAt: Date | null;
  forecast: { coverage: PagasaCoverage | null; issuedAt: Date | null; validUntil: Date | null;
    day: PagasaPeriod | null; night: PagasaPeriod | null } | null;
  outlook: { issuedAt: Date | null; days: PagasaOutlookDay[] } | null;
  synopsis: { coverage: PagasaCoverage | null; issuedAt: Date | null; validUntil: Date | null;
    text: string | null; mentionsTropicalCyclone: boolean } | null;
  rainfall: { coverage: PagasaCoverage | null; text: string | null; noneIssued: boolean | null } | null;
  thunderstorms: { coverage: PagasaCoverage | null; items: PagasaThunderstorm[] } | null;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
function time(v: unknown): Date | null {
  if (v instanceof Timestamp) return v.toDate();
  if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  return null;
}
function coverage(v: unknown): PagasaCoverage | null {
  const m = obj(v);
  return m ? { level: str(m.level) ?? "", name: str(m.name) ?? "", psgc: str(m.psgc) } : null;
}
function period(v: unknown): PagasaPeriod | null {
  const m = obj(v);
  return m ? { description: str(m.description), high: num(m.high), low: num(m.low),
    windSpeed: str(m.windSpeed), windDirection: str(m.windDirection) } : null;
}

export function parsePagasaProduct(raw: Raw): PagasaProduct {
  const f = obj(raw.provincialForecast), o = obj(raw.extendedOutlook), s = obj(raw.synopsis);
  const r = obj(raw.rainfallWarning), t = obj(raw.thunderstorms);
  return {
    sourceUrl: str(raw.sourceUrl) ?? "https://www.pagasa.dost.gov.ph/regional-forecast/nlprsd",
    office: str(raw.office) ?? "PAGASA",
    retrievedAt: time(raw.retrievedAt), lastSuccessAt: time(raw.lastSuccessAt), lastErrorAt: time(raw.lastErrorAt),
    forecast: f && { coverage: coverage(f.coverage), issuedAt: time(f.issuedAt), validUntil: time(f.validUntil),
      day: period(f.day), night: period(f.night) },
    outlook: o && { issuedAt: time(o.issuedAt),
      days: (Array.isArray(o.days) ? o.days : []).flatMap((d) => {
        const p = period(d); const m = obj(d);
        return p && m ? [{ ...p, label: str(m.label), date: str(m.date) }] : [];
      }) },
    synopsis: s && { coverage: coverage(s.coverage), issuedAt: time(s.issuedAt), validUntil: time(s.validUntil),
      text: str(s.text), mentionsTropicalCyclone: s.mentionsTropicalCyclone === true },
    rainfall: r && { coverage: coverage(r.coverage), text: str(r.text),
      noneIssued: typeof r.noneIssued === "boolean" ? r.noneIssued : null },
    thunderstorms: t && { coverage: coverage(t.coverage),
      items: (Array.isArray(t.items) ? t.items : []).flatMap((i) => {
        const m = obj(i); const text = m && str(m.text);
        return m && text ? [{ kind: str(m.kind) ?? "other", title: str(m.title), issuedAt: time(m.issuedAt),
          validUntil: time(m.validUntil), text, mentionsNuevaVizcaya: m.mentionsNuevaVizcaya === true }] : [];
      }) },
  };
}

export const hasForecast = (p: PagasaProduct | null) => !!(p?.forecast?.day || p?.forecast?.night);

/** Expired only once PAGASA's stated window has passed; no window -> never expired. */
export const isExpired = (t: PagasaThunderstorm, now: Date) => !!t.validUntil && now > t.validUntil;

export type PagasaFreshness = "updated" | "cached" | "stale" | "unavailable";

/** Same thresholds as the mobile app: One Vizcaya's own, not PAGASA's. */
export function pagasaFreshness(p: PagasaProduct | null, now: Date): PagasaFreshness {
  if (!p || !hasForecast(p)) return "unavailable";
  const last = p.lastSuccessAt ?? p.retrievedAt;
  if (!last) return "unavailable";
  const age = now.getTime() - last.getTime();
  if (age > 6 * 3600e3) return "stale";
  const failedSince = !!p.lastErrorAt && p.lastErrorAt > last;
  if (failedSince || age > 2 * 3600e3) return "cached";
  return "updated";
}

/** Philippine time regardless of the viewer's time zone (matches mobile). */
export function fmtPht(d: Date | null): string {
  if (!d) return "at an unknown time";
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }) + " PHT";
}
