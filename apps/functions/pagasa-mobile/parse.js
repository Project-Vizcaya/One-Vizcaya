"use strict";

// Parsers for the DOST-PAGASA mobile API (api.mobile.panahon.gov.ph/api/v1),
// used with PAGASA's permission on condition that the app discloses it is not
// an official PAGASA app. See docs/weather.md.
//
// The API returns display strings ("28 °C", "89.2%", "0.11 mm", "-", "", null)
// and several date formats. Everything here is defensive: a bad field becomes
// null and the rest of the record is kept; nothing throws on odd data.
// PAGASA's own category labels and colours (*_desc, *_color) are passed
// through unchanged: they are the official classification, never recomputed.

const PHT_OFFSET_MS = 8 * 3600e3; // Asia/Manila, no DST

/** First number in a value, or null. "28 °C" -> 28, "-" -> null. */
function parseNum(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = /-?\d+(?:\.\d+)?/.exec(String(v));
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Trimmed non-empty string, or null ("-", "" and null are missing). */
function str(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" || s === "-" ? null : s;
}

const hex = (v) => (/^#[0-9a-f]{3,8}$/i.test(String(v || "").trim()) ? String(v).trim() : null);
const httpsUrl = (v) => (/^https:\/\/[^\s]+$/i.test(String(v || "").trim()) ? String(v).trim() : null);

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december"];

/** Epoch ms for a wall-clock time in Manila. */
function pht(y, mo, d, h = 0, mi = 0, s = 0) {
  const t = Date.UTC(y, mo - 1, d, h, mi, s) - PHT_OFFSET_MS;
  return Number.isFinite(t) ? t : null;
}
function to24(h, ampm) {
  const pm = /p/i.test(ampm);
  return (h % 12) + (pm ? 12 : 0);
}

/**
 * Parses PAGASA's date formats as Asia/Manila; returns epoch ms or null.
 *   unix seconds (number or digit string)
 *   "2026-10-10 21:40:00"
 *   "October 10, 2026 10:00 PM"
 */
function parsePhtDate(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? Math.round(v * (v < 1e11 ? 1000 : 1)) : null;
  const s = String(v).trim();
  if (/^\d{9,11}$/.test(s)) return Number(s) * 1000;
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) return pht(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0));
  m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?$/i.exec(s);
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    if (!mo) return null;
    return m[4] ? pht(+m[3], mo, +m[2], to24(+m[4], m[6]), +m[5]) : pht(+m[3], mo, +m[2]);
  }
  return null;
}

/**
 * Hourly points carry only "9:00 PM". Anchors them to real times: the first
 * one is the hour at or before `nowMs` (Manila), each next one an hour later.
 */
function hourlyTimes(labels, nowMs) {
  const first = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(String(labels[0] || "").trim());
  if (!first) return labels.map(() => null);
  const local = new Date(nowMs + PHT_OFFSET_MS);
  let t = pht(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate(), to24(+first[1], first[3]), +first[2]);
  // The first slot may belong to yesterday or tomorrow around midnight.
  if (t - nowMs > 12 * 3600e3) t -= 24 * 3600e3;
  if (nowMs - t > 12 * 3600e3) t += 24 * 3600e3;
  return labels.map((_, i) => t + i * 3600e3);
}

/** A "now"/hourly object (nc, hc[i]). */
function mapPoint(p) {
  if (!p || typeof p !== "object") return null;
  return {
    timeLabel: str(p.time),
    icon: httpsUrl(p.icon),
    desc: str(p.desc),
    tempC: parseNum(p.tmp),
    rainMm: parseNum(p.tprecip),
    rainDesc: str(p.tprecip_desc),
    rainColor: hex(p.tprecip_color),
    heatIndexC: parseNum(p.hindex),
    heatIndexDesc: str(p.hindex_desc),
    heatIndexColor: hex(p.hindex_color),
  };
}

/** A daily object (dc[i]). */
function mapDay(d) {
  if (!d || typeof d !== "object") return null;
  return {
    dayLabel: str(d.d),
    dateLabel: str(d.dt),
    icon: httpsUrl(d.icon),
    desc: str(d.desc),
    rainMm: parseNum(d.tprecip),
    rainDesc: str(d.tprecip_desc),
    rainColor: hex(d.tprecip_color),
    tempMaxC: parseNum(d.tmax),
    tempMinC: parseNum(d.tmin),
    heatIndexMaxC: parseNum(d.hmax),
    heatIndexMaxDesc: str(d.hmax_desc),
    heatIndexMaxColor: hex(d.hmax_color),
    heatIndexMinC: parseNum(d.hmin),
  };
}

/** /nowcast/dashboard -> normalized forecast, or null if unusable. */
function mapDashboard(json, nowMs) {
  const data = json && json.data;
  if (!json || json.success === false || !data || typeof data !== "object") return null;
  const meta = json.meta || {};
  const hourlyRaw = Array.isArray(data.hc) ? data.hc : [];
  const times = hourlyTimes(hourlyRaw.map((h) => h && h.time), nowMs);
  const hourly = hourlyRaw.map(mapPoint).map((p, i) => (p ? { ...p, timeMs: times[i] } : null)).filter(Boolean);
  const daily = (Array.isArray(data.dc) ? data.dc : []).map(mapDay).filter(Boolean);
  const current = mapPoint(data.nc);
  if (!current && hourly.length === 0 && daily.length === 0) return null;
  return {
    place: {
      barangay: str(meta.barangay),
      municipality: str(meta.municipality),
      province: str(meta.province),
      region: str(meta.region),
      lat: parseNum(meta.lat),
      lon: parseNum(meta.lon),
    },
    current,
    hourly,
    daily,
    links: {
      rainMap: httpsUrl(data.rain_map && data.rain_map.url),
      briefing: httpsUrl(data.public_weather_forecast && data.public_weather_forecast.url),
      webMap: httpsUrl(data.panahon_web && data.panahon_web.url),
    },
  };
}

/** /alerts -> normalized alerts (unfiltered). */
function mapAlerts(json) {
  const list = json && Array.isArray(json.data) ? json.data : [];
  return list.map((a) => {
    if (!a || typeof a !== "object") return null;
    const title = str(a.title);
    const message = str(a.message);
    if (!title && !message) return null;
    return {
      id: str(a.alert_id) || `${title}|${a.issued_at_timestamp || a.issued_at || ""}`,
      title: title || "Weather advisory",
      type: str(a.type),
      issuedBy: str(a.issued_by),
      // Prefer the unix timestamp when present.
      issuedAtMs: parsePhtDate(a.issued_at_timestamp) ?? parsePhtDate(a.issued_at),
      validUntilMs: parsePhtDate(a.valid_until_at),
      locations: (Array.isArray(a.locations) ? a.locations : []).map(str).filter(Boolean),
      message: message || "",
      priority: parseNum(a.priority) ?? 0,
      icon: httpsUrl(a.icon),
      image: httpsUrl(a.image),
    };
  }).filter(Boolean);
}

/** /observation/automatic|manual -> readings keyed by site id. */
function mapObservations(json) {
  const list = json && Array.isArray(json.data) ? json.data : [];
  const out = {};
  for (const row of list) {
    const o = row && row.obs;
    const id = o && parseNum(o.site_id);
    if (id === null || id === undefined) continue;
    out[String(Math.round(id))] = {
      siteId: Math.round(id),
      name: str(o.loc),
      observedAtMs: parsePhtDate(o.observed_at),
      desc: str(o.desc),
      icon: httpsUrl(o.icon),
      tempC: parseNum(o.temp),
      humidityPct: parseNum(o.hum),
      windKph: parseNum(o.ws),
      windDir: str(o.wd),
      rain1hMm: parseNum(o.precip_1h),
      rain3hMm: parseNum(o.precip_3h),
      pressureHpa: parseNum(o.mslp),
      heatIndexC: parseNum(o.heat_index),
    };
  }
  return out;
}

module.exports = { parseNum, str, parsePhtDate, hourlyTimes, mapDashboard, mapAlerts, mapObservations };
