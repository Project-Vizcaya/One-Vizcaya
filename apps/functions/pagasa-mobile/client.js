"use strict";

// HTTP client for the DOST-PAGASA mobile API.
//
// HARD RULES (docs/weather.md):
//  - Only the public GET endpoints in ALLOWED are ever called. The /auth/*
//    endpoints create device records on PAGASA's server and are never called.
//  - The app does not imitate PAGASA's app: the only headers sent are
//    Accept: application/json and If-None-Match. No device ids, no App Check
//    tokens, none of PAGASA's Firebase configuration.
//  - Be gentle: conditional requests (ETag), a 10 s timeout, and the callers
//    never fetch more often than the documented intervals.

const DEFAULT_BASE = "https://api.mobile.panahon.gov.ph/api/v1";
const TIMEOUT_MS = 10000;

const ALLOWED = [
  /^\/nowcast\/dashboard$/,
  /^\/alerts$/,
  /^\/observation\/automatic$/,
  /^\/observation\/manual$/,
  /^\/observation\/automatic\/historical-data\/\d+$/,
  /^\/city-outlook\/philippine-cities$/,
  /^\/location\/search$/,
];

class PagasaBlocked extends Error {
  constructor(status) { super(`PAGASA answered ${status}`); this.status = status; }
}

/**
 * GET one endpoint. Returns:
 *   { notModified: true }                 on 304 (reuse what you have)
 *   { json, etag }                        on 200
 * Throws PagasaBlocked on 401/403 (access was closed: stop calling), and a
 * plain Error on anything else (network, timeout, 5xx, bad JSON).
 */
async function pagasaGet(path, { query = {}, etag = null, base = DEFAULT_BASE, fetchImpl = fetch } = {}) {
  if (!ALLOWED.some((re) => re.test(path))) throw new Error(`PAGASA path not allowed: ${path}`);
  const url = new URL(base.replace(/\/$/, "") + path);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  const headers = { Accept: "application/json" };
  if (etag) headers["If-None-Match"] = etag;

  const res = await fetchImpl(url.toString(), { method: "GET", headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 304) return { notModified: true };
  if (res.status === 401 || res.status === 403) throw new PagasaBlocked(res.status);
  if (res.status !== 200) throw new Error(`PAGASA ${path} answered ${res.status}`);
  let json;
  try { json = await res.json(); } catch { throw new Error(`PAGASA ${path} returned invalid JSON`); }
  return { json, etag: res.headers.get("etag") || null };
}

module.exports = { pagasaGet, PagasaBlocked, ALLOWED, DEFAULT_BASE, TIMEOUT_MS };
