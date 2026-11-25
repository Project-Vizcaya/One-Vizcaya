"use strict";

// Earthquake feeds for Hazard Watch (docs/4-app-and-website/hazards.md).
//
//   USGS   — the U.S. Geological Survey's public FDSN event API (free, no key).
//            On by default. Labelled "USGS", never presented as PHIVOLCS.
//   PHIVOLCS — the official Philippine source, read from its public
//            earthquake-information page. OFF until PHIVOLCS gives written
//            permission (config/hazards.phivolcsEnabled).
//
// Severity levels here are One Vizcaya's own triage aid for the console
// (magnitude and distance to the province), NOT an official intensity.

const NV_CENTRE = { lat: 16.49, lon: 121.15 }; // Bayombong
const RADIUS_KM = 400;
const WINDOW_DAYS = 7;
const PHT_OFFSET_MS = 8 * 3600e3;

function distanceKm(aLat, aLon, bLat = NV_CENTRE.lat, bLon = NV_CENTRE.lon) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** One Vizcaya triage level from magnitude and distance to the province. */
function quakeLevel(mag, km) {
  if (!Number.isFinite(mag) || !Number.isFinite(km)) return "info";
  if ((mag >= 6 && km <= 200) || (mag >= 5 && km <= 50)) return "critical";
  if ((mag >= 5 && km <= 300) || (mag >= 4 && km <= 100)) return "warning";
  if (mag >= 3.5 && km <= 150) return "watch";
  return "info";
}

const num = (v) => {
  if (v === null || v === undefined) return null;
  const m = /-?\d+(?:\.\d+)?/.exec(String(v));
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) ? n : null;
};

function finish(q) {
  const km = Math.round(distanceKm(q.lat, q.lon));
  return { ...q, kind: "earthquake", distanceKm: km, level: quakeLevel(q.magnitude, km) };
}

const inWindow = (q, nowMs) => q.timeMs !== null && nowMs - q.timeMs <= WINDOW_DAYS * 86400e3 && q.timeMs <= nowMs + 3600e3;

/** USGS GeoJSON -> normalized quakes near the province. Defensive throughout. */
function mapUsgs(json, nowMs) {
  const features = json && Array.isArray(json.features) ? json.features : [];
  const out = [];
  for (const f of features) {
    const p = (f && f.properties) || {};
    const c = f && f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : [];
    const lon = num(c[0]), lat = num(c[1]);
    const magnitude = num(p.mag);
    const timeMs = typeof p.time === "number" ? p.time : null;
    if (!f || typeof f.id !== "string" || lat === null || lon === null || magnitude === null) continue;
    const q = finish({
      id: `usgs_${f.id.replace(/[^A-Za-z0-9_-]/g, "")}`,
      source: "usgs",
      magnitude,
      depthKm: num(c[2]),
      lat, lon,
      place: typeof p.place === "string" ? p.place : null,
      timeMs,
      url: typeof p.url === "string" && p.url.startsWith("https://") ? p.url : null,
    });
    if (q.distanceKm <= RADIUS_KM && inWindow(q, nowMs)) out.push(q);
  }
  return out;
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december"];

/** "23 November 2026 - 03:15 PM" (Philippine time) -> epoch ms, or null. */
function parsePhivolcsTime(s) {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*-\s*(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(String(s || ""));
  if (!m) return null;
  const mo = MONTHS.indexOf(m[2].toLowerCase());
  if (mo < 0) return null;
  const h = (Number(m[4]) % 12) + (/p/i.test(m[6]) ? 12 : 0);
  return Date.UTC(Number(m[3]), mo, Number(m[1]), h, Number(m[5])) - PHT_OFFSET_MS;
}

const decode = (s) => s
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&deg;|&#176;|&ordm;/g, "°")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/\s+/g, " ").trim();

/**
 * PHIVOLCS earthquake-information page (HTML table: date-time PH time, lat,
 * lon, depth km, magnitude, location) -> normalized quakes near the province.
 * Rows that do not parse are skipped; the page layout is not under our control.
 */
function mapPhivolcs(html, baseUrl, nowMs) {
  const out = [];
  const rows = String(html || "").match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const cells = row.match(/<td[\s\S]*?<\/td>/gi);
    if (!cells || cells.length < 6) continue;
    const text = cells.map(decode);
    const timeMs = parsePhivolcsTime(text[0]);
    const lat = num(text[1]), lon = num(text[2]), depthKm = num(text[3]), magnitude = num(text[4]);
    if (timeMs === null || lat === null || lon === null || magnitude === null) continue;
    if (lat < 0 || lat > 25 || lon < 110 || lon > 135) continue; // not Philippine coordinates
    const href = /href\s*=\s*"([^"]+)"/i.exec(cells[0]);
    let url = null;
    if (href) {
      try { url = new URL(href[1].replace(/\\/g, "/"), baseUrl).toString(); } catch { url = null; }
    }
    const q = finish({
      id: `phivolcs_${timeMs}_${lat.toFixed(2)}_${lon.toFixed(2)}`.replace(/\./g, "d"),
      source: "phivolcs",
      magnitude, depthKm, lat, lon,
      place: text[5] || null,
      timeMs,
      url: url && url.startsWith("https://") ? url : null,
    });
    if (q.distanceKm <= RADIUS_KM && inWindow(q, nowMs)) out.push(q);
  }
  return out;
}

/**
 * When both feeds report the same quake (within 90 s and 60 km), PHIVOLCS is
 * the official report: the USGS copy is marked supersededBy and hidden.
 */
function markSuperseded(usgs, phivolcs) {
  return usgs.map((u) => {
    const twin = phivolcs.find((p) => Math.abs(p.timeMs - u.timeMs) <= 90e3 &&
      distanceKm(p.lat, p.lon, u.lat, u.lon) <= 60);
    return twin ? { ...u, supersededBy: twin.id } : { ...u, supersededBy: null };
  });
}

module.exports = { mapUsgs, mapPhivolcs, parsePhivolcsTime, quakeLevel, markSuperseded, distanceKm,
  NV_CENTRE, RADIUS_KM, WINDOW_DAYS };
