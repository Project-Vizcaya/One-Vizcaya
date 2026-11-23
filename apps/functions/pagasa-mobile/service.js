"use strict";

// Server-side DOST-PAGASA source for One Vizcaya (docs/weather.md).
//
// All PAGASA traffic goes through here, never from phones:
//   - refreshAll(): run by the pagasaMobileWatch schedule. Fetches alerts,
//     nearby-station readings and one forecast per municipality, and stores
//     them in Firestore (collection weather_pagasa) for every app to read.
//   - pointForecast(): run by the getPagasaForecast callable. Barangay-level
//     forecast for a user's coordinates, shared per ~1 km cell for 15 minutes.
//
// So a province of users costs PAGASA a fixed, small number of requests,
// and there is ONE switch: config/weather.pagasaMobileEnabled. When it is
// off, or PAGASA answers 401/403, no PAGASA call is made and the apps fall
// back to the international source by themselves.

const { pagasaGet, PagasaBlocked, DEFAULT_BASE } = require("./client");
const { mapDashboard, mapAlerts, mapObservations } = require("./parse");
const { nvAlerts } = require("./alerts");
const { STATIONS, nearestStations } = require("./stations");

const MIN = 60e3;
// Minimum refresh intervals (never faster).
const INTERVAL = { alerts: 5 * MIN, observations: 10 * MIN, dashboard: 15 * MIN };
const BLOCK_BACKOFF_MS = 6 * 60 * MIN; // after a 401/403, stay away this long
const MODES = ["pagasaPrimary", "pagasaOnly", "sideBySide", "internationalOnly"];
// Nueva Vizcaya, with a margin: the callable serves this province only.
const NV_BOUNDS = { latMin: 15.85, latMax: 16.95, lonMin: 120.65, lonMax: 121.65 };

const COL = "weather_pagasa";
const POINTS = "weather_pagasa_points";

function resolveConfig(cfg) {
  const c = cfg || {};
  const base = typeof c.pagasaBaseUrl === "string" && /^https:\/\/[^\s]+$/.test(c.pagasaBaseUrl)
    ? c.pagasaBaseUrl : DEFAULT_BASE;
  return {
    enabled: c.pagasaMobileEnabled === true, // off unless explicitly switched on
    mode: MODES.includes(c.mode) ? c.mode : "pagasaPrimary",
    alertRules: c.alertRules || null,
    base,
  };
}

/** The mode apps should use right now, given the switch and any block. */
function effectiveMode(cfg, blocked) {
  return !cfg.enabled || blocked ? "internationalOnly" : cfg.mode;
}

const inNv = (lat, lon) =>
  Number.isFinite(lat) && Number.isFinite(lon) &&
  lat >= NV_BOUNDS.latMin && lat <= NV_BOUNDS.latMax && lon >= NV_BOUNDS.lonMin && lon <= NV_BOUNDS.lonMax;

/** ~1.1 km cell id for a coordinate, e.g. "16.38_121.07". */
const cellOf = (lat, lon) => `${lat.toFixed(2)}_${lon.toFixed(2)}`;
const muniDocId = (name) => `muni_${name.replace(/[^A-Za-z0-9]+/g, "_")}`;

class PagasaService {
  /**
   * @param {FirebaseFirestore.Firestore} db
   * @param {{fetchImpl?: Function, now?: () => number, ts?: (ms: number) => any}} deps
   */
  constructor(db, { fetchImpl = fetch, now = Date.now, ts = (ms) => new Date(ms) } = {}) {
    this.db = db;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.ts = ts;
  }

  async config() {
    return resolveConfig((await this.db.doc("config/weather").get()).data());
  }

  async status() {
    return (await this.db.doc(`${COL}/_status`).get()).data() || {};
  }

  isBlocked(status) {
    return typeof status.blockedUntilMs === "number" && status.blockedUntilMs > this.now();
  }

  async writeStatus(cfg, patch = {}) {
    const prev = await this.status();
    const blocked = this.isBlocked({ ...prev, ...patch });
    await this.db.doc(`${COL}/_status`).set({
      enabled: cfg.enabled,
      mode: effectiveMode(cfg, blocked),
      configuredMode: cfg.mode,
      updatedAtMs: this.now(),
      ...patch,
    }, { merge: true });
  }

  /** One conditional GET; returns mapped data, or {notModified: true}. */
  get(cfg, path, query, etag) {
    return pagasaGet(path, { query, etag, base: cfg.base, fetchImpl: this.fetchImpl });
  }

  // ── scheduled refresh ─────────────────────────────────────────────────────

  /**
   * @param {Record<string, [number, number]>} municipalities  name -> [lat, lon]
   * @returns {Promise<{skipped?: string, calls: number, errors: number}>}
   */
  async refreshAll(municipalities) {
    const cfg = await this.config();
    const status = await this.status();
    if (!cfg.enabled) {
      if (status.enabled !== false || status.mode !== "internationalOnly") await this.writeStatus(cfg);
      return { skipped: "disabled", calls: 0, errors: 0 };
    }
    if (this.isBlocked(status)) return { skipped: "blocked", calls: 0, errors: 0 };

    const out = { calls: 0, errors: 0 };
    const due = (lastMs, every) => !(typeof lastMs === "number") || this.now() - lastMs >= every - 5e3;
    try {
      // Alerts: every run.
      await this.step(out, () => this.refreshAlerts(cfg));

      // Station readings.
      const stationsDoc = (await this.db.doc(`${COL}/stations`).get()).data() || {};
      if (due(stationsDoc.checkedAtMs, INTERVAL.observations)) {
        await this.step(out, () => this.refreshStations(cfg, stationsDoc, out));
      }
      const readings = ((await this.db.doc(`${COL}/stations`).get()).data() || {}).readings || {};

      // One forecast per municipality.
      for (const [name, [lat, lon]] of Object.entries(municipalities)) {
        const ref = this.db.doc(`${COL}/${muniDocId(name)}`);
        const prev = (await ref.get()).data() || {};
        if (!due(prev.checkedAtMs, INTERVAL.dashboard)) continue;
        await this.step(out, async () => {
          const r = await this.get(cfg, "/nowcast/dashboard", { lat, lon }, prev.etag || null);
          out.calls++;
          const stations = nearestStations(lat, lon, readings);
          if (r.notModified) {
            await ref.set({ checkedAtMs: this.now(), stations }, { merge: true });
            return;
          }
          const forecast = mapDashboard(r.json, this.now());
          if (!forecast) throw new Error(`unusable dashboard for ${name}`);
          await ref.set({
            municipality: name, lat, lon, forecast, stations, etag: r.etag,
            fetchedAtMs: this.now(), checkedAtMs: this.now(), source: "pagasa",
          });
        });
      }
      await this.writeStatus(cfg, out.errors === 0 ? { lastOkAtMs: this.now(), lastError: null } : {});
    } catch (e) {
      if (!(e instanceof PagasaBlocked)) throw e;
      // Access was closed (auth turned on, or we were asked to stop): back off
      // quietly. Apps see mode "internationalOnly" and fall back by themselves.
      console.warn(`PAGASA answered ${e.status}; pausing PAGASA calls for 6 h.`);
      await this.writeStatus(cfg, { blockedUntilMs: this.now() + BLOCK_BACKOFF_MS, lastError: `http_${e.status}` });
      out.skipped = "blocked";
    }
    return out;
  }

  /** Runs one step; a blocked answer aborts everything, other errors are counted. */
  async step(out, fn) {
    try {
      await fn();
    } catch (e) {
      if (e instanceof PagasaBlocked) throw e;
      out.errors++;
      console.error("PAGASA refresh step failed:", e.message);
    }
  }

  async refreshAlerts(cfg) {
    const ref = this.db.doc(`${COL}/alerts`);
    const prev = (await ref.get()).data() || {};
    const r = await this.get(cfg, "/alerts", {}, prev.etag || null);
    // Re-filter on every run, even on 304: alerts expire with time.
    const all = r.notModified ? (prev.all || []) : mapAlerts(r.json);
    await ref.set({
      all,
      active: nvAlerts(all, cfg.alertRules, this.now()),
      etag: r.notModified ? prev.etag || null : r.etag,
      fetchedAtMs: r.notModified ? prev.fetchedAtMs || this.now() : this.now(),
      checkedAtMs: this.now(),
      source: "pagasa",
    });
  }

  async refreshStations(cfg, prev, out) {
    const wanted = new Set(STATIONS.map((s) => String(s.siteId)));
    const readings = { ...(prev.readings || {}) };
    const etags = { ...(prev.etags || {}) };
    for (const kind of ["automatic", "manual"]) {
      const r = await this.get(cfg, `/observation/${kind}`, {}, etags[kind] || null);
      out.calls++;
      if (r.notModified) continue;
      const mapped = mapObservations(r.json);
      for (const id of Object.keys(mapped)) if (wanted.has(id)) readings[id] = mapped[id];
      etags[kind] = r.etag;
    }
    await this.db.doc(`${COL}/stations`).set({ readings, etags, checkedAtMs: this.now(), source: "pagasa" });
  }

  // ── on-demand barangay-level forecast ─────────────────────────────────────

  /**
   * @returns {Promise<{available: boolean, reason?: string, mode: string,
   *   forecast?: object, stations?: object[], fetchedAtMs?: number, stale?: boolean}>}
   */
  async pointForecast(lat, lon) {
    const cfg = await this.config();
    const status = await this.status();
    const blocked = this.isBlocked(status);
    const mode = effectiveMode(cfg, blocked);
    if (!cfg.enabled) return { available: false, reason: "disabled", mode };
    if (!inNv(lat, lon)) return { available: false, reason: "outside_province", mode };

    const ref = this.db.doc(`${POINTS}/${cellOf(lat, lon)}`);
    const prev = (await ref.get()).data() || null;
    const readings = ((await this.db.doc(`${COL}/stations`).get()).data() || {}).readings || {};
    const answer = (doc, stale) => ({
      available: true, mode, forecast: doc.forecast, fetchedAtMs: doc.fetchedAtMs, stale,
      stations: nearestStations(lat, lon, readings),
    });

    if (prev && this.now() - (prev.checkedAtMs || 0) < INTERVAL.dashboard) return answer(prev, false);
    if (blocked) return prev ? answer(prev, true) : { available: false, reason: "blocked", mode };

    try {
      // Round to the cell centre, so every user in the cell shares one fetch.
      const r = await this.get(cfg, "/nowcast/dashboard",
        { lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) }, prev ? prev.etag || null : null);
      if (r.notModified && prev) {
        await ref.set({ checkedAtMs: this.now() }, { merge: true });
        return answer(prev, false);
      }
      const forecast = mapDashboard(r.json, this.now());
      if (!forecast) throw new Error("unusable dashboard");
      const doc = { forecast, etag: r.etag, fetchedAtMs: this.now(), checkedAtMs: this.now(),
        expireAt: this.ts(this.now() + 24 * 60 * MIN) };
      await ref.set(doc);
      return answer(doc, false);
    } catch (e) {
      if (e instanceof PagasaBlocked) {
        await this.writeStatus(cfg, { blockedUntilMs: this.now() + BLOCK_BACKOFF_MS, lastError: `http_${e.status}` });
        return prev ? { ...answer(prev, true), mode: "internationalOnly" }
          : { available: false, reason: "blocked", mode: "internationalOnly" };
      }
      console.error("PAGASA point forecast failed:", e.message);
      // Keep showing the last good data, marked stale.
      return prev ? answer(prev, true) : { available: false, reason: "unavailable", mode };
    }
  }
}

module.exports = { PagasaService, resolveConfig, effectiveMode, inNv, cellOf, muniDocId, INTERVAL, MODES, NV_BOUNDS };
