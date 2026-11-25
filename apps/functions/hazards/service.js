"use strict";

// Hazard Watch feed refresh (docs/4-app-and-website/hazards.md). Run by the hazardWatch
// schedule every 10 minutes. Writes earthquakes near Nueva Vizcaya to
// hazard_signals/{id} and each feed's state to hazard_feed_status/{source}.
// Signals older than the 7-day window are removed.
//
// Switches, Firestore document config/hazards:
//   usgsEnabled      default true   (public USGS feed, no permission needed)
//   phivolcsEnabled  default false  (needs PHIVOLCS's written permission)
//   phivolcsUrl      default https://earthquake.phivolcs.dost.gov.ph/

const { mapUsgs, mapPhivolcs, markSuperseded, NV_CENTRE, RADIUS_KM, WINDOW_DAYS } = require("./quakes");

const TIMEOUT_MS = 10000;
const DEFAULT_PHIVOLCS = "https://earthquake.phivolcs.dost.gov.ph/";

function resolveConfig(c) {
  c = c || {};
  return {
    usgs: c.usgsEnabled !== false,
    phivolcs: c.phivolcsEnabled === true,
    phivolcsUrl: typeof c.phivolcsUrl === "string" && /^https:\/\/[^\s]+$/.test(c.phivolcsUrl) ? c.phivolcsUrl : DEFAULT_PHIVOLCS,
  };
}

function usgsUrl(nowMs) {
  const u = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
  u.searchParams.set("format", "geojson");
  u.searchParams.set("starttime", new Date(nowMs - WINDOW_DAYS * 86400e3).toISOString().slice(0, 19));
  u.searchParams.set("latitude", String(NV_CENTRE.lat));
  u.searchParams.set("longitude", String(NV_CENTRE.lon));
  u.searchParams.set("maxradiuskm", String(RADIUS_KM));
  u.searchParams.set("minmagnitude", "3");
  u.searchParams.set("orderby", "time");
  return u.toString();
}

class HazardService {
  constructor(db, { fetchImpl = fetch, now = Date.now } = {}) {
    this.db = db;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  async get(url, accept) {
    const res = await this.fetchImpl(url, { headers: { Accept: accept }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status !== 200) throw new Error(`${new URL(url).host} answered ${res.status}`);
    return res;
  }

  async status(source, patch) {
    await this.db.doc(`hazard_feed_status/${source}`).set({ ...patch, checkedAtMs: this.now() }, { merge: true });
  }

  /** @returns {Promise<{usgs: number|null, phivolcs: number|null, removed: number, errors: string[]}>} */
  async refresh() {
    const cfg = resolveConfig((await this.db.doc("config/hazards").get()).data());
    const now = this.now();
    const out = { usgs: null, phivolcs: null, removed: 0, errors: [] };
    let usgs = [], phivolcs = [];
    let usgsOk = false, phivolcsOk = false;

    if (cfg.phivolcs) {
      try {
        const html = await (await this.get(cfg.phivolcsUrl, "text/html")).text();
        phivolcs = mapPhivolcs(html, cfg.phivolcsUrl, now);
        phivolcsOk = true;
        out.phivolcs = phivolcs.length;
        await this.status("phivolcs", { enabled: true, lastOkAtMs: now, lastError: null, count: phivolcs.length });
      } catch (e) {
        out.errors.push(`phivolcs: ${e.message}`);
        await this.status("phivolcs", { enabled: true, lastError: String(e.message).slice(0, 200), lastErrorAtMs: now });
      }
    } else {
      await this.status("phivolcs", { enabled: false });
    }

    if (cfg.usgs) {
      try {
        usgs = mapUsgs(await (await this.get(usgsUrl(now), "application/json")).json(), now);
        usgsOk = true;
        out.usgs = usgs.length;
        await this.status("usgs", { enabled: true, lastOkAtMs: now, lastError: null, count: usgs.length });
      } catch (e) {
        out.errors.push(`usgs: ${e.message}`);
        await this.status("usgs", { enabled: true, lastError: String(e.message).slice(0, 200), lastErrorAtMs: now });
      }
    } else {
      await this.status("usgs", { enabled: false });
    }

    // Load the PHIVOLCS signals we already hold, so a USGS twin stays hidden
    // even when this run's PHIVOLCS fetch failed.
    const existing = (await this.db.collection("hazard_signals").get()).docs;
    const knownPhivolcs = phivolcsOk ? phivolcs
      : existing.filter((d) => d.data().source === "phivolcs").map((d) => d.data());
    usgs = markSuperseded(usgs, knownPhivolcs);

    const writer = this.db.bulkWriter();
    for (const q of [...phivolcs, ...usgs]) {
      writer.set(this.db.doc(`hazard_signals/${q.id}`), { ...q, fetchedAtMs: now });
    }
    // Remove: anything past the window; and signals of a feed that was
    // switched off. A feed that merely failed keeps its last good signals.
    const cutoff = now - WINDOW_DAYS * 86400e3;
    for (const d of existing) {
      const s = d.data();
      const off = (s.source === "usgs" && !cfg.usgs) || (s.source === "phivolcs" && !cfg.phivolcs);
      if (off || typeof s.timeMs !== "number" || s.timeMs < cutoff) {
        writer.delete(d.ref);
        out.removed++;
      }
    }
    await writer.close();
    return out;
  }
}

module.exports = { HazardService, resolveConfig, usgsUrl, DEFAULT_PHIVOLCS };
