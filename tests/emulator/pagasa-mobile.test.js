"use strict";

// Integration test for the server-side DOST-PAGASA source against the
// Firestore emulator. PAGASA is replaced by a fake fetch serving the fixture
// files; no live call is made.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
require("../../apps/functions/index.js");
const { PagasaService } = require("../../apps/functions/pagasa-mobile/service.js");

const db = admin.firestore();
const fixture = (name) => {
  const raw = fs.readFileSync(path.join(__dirname, "../../apps/functions/pagasa-mobile/fixtures", name), "utf8");
  return JSON.parse(raw.slice(raw.indexOf("\n\n") + 2));
};
const BODY = {
  "/nowcast/dashboard": fixture("dashboard.txt"),
  "/alerts": fixture("alerts.txt"),
  "/observation/automatic": fixture("observation_automatic.txt"),
  "/observation/manual": { data: [] },
};
const TOWNS = { Bambang: [16.3833, 121.0667], Solano: [16.5167, 121.1833] };
const T0 = Date.UTC(2026, 9, 10, 13, 20); // 9:20 PM Manila, inside the fixtures' validity

let calls, mode, clock;
const fakeFetch = async (url, init) => {
  const u = new URL(url);
  const p = u.pathname.replace("/api/v1", "");
  calls.push({ path: p, query: Object.fromEntries(u.searchParams), headers: init.headers });
  if (mode === "blocked") return { status: 403, headers: { get: () => null }, json: async () => ({}) };
  if (mode === "down") throw new Error("ECONNRESET");
  if (init.headers["If-None-Match"] === "v1") return { status: 304, headers: { get: () => null }, json: async () => ({}) };
  return { status: 200, headers: { get: (h) => (h === "etag" ? "v1" : null) }, json: async () => BODY[p] };
};
const svc = () => new PagasaService(db, { fetchImpl: fakeFetch, now: () => clock });
const get = async (id) => (await db.doc(`weather_pagasa/${id}`).get()).data();

beforeEach(async () => {
  calls = []; mode = "ok"; clock = T0;
  for (const c of ["weather_pagasa", "weather_pagasa_points", "config"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
});
after(() => fft.cleanup());
const enable = (extra = {}) => db.doc("config/weather").set({ pagasaMobileEnabled: true, ...extra });

test("kill switch off (the default): zero PAGASA calls, apps told internationalOnly", async () => {
  const r = await svc().refreshAll(TOWNS);
  assert.equal(r.skipped, "disabled");
  assert.equal(calls.length, 0);
  assert.equal((await get("_status")).mode, "internationalOnly");
  const p = await svc().pointForecast(16.38, 121.07);
  assert.deepEqual([p.available, p.reason, p.mode], [false, "disabled", "internationalOnly"]);
  assert.equal(calls.length, 0);
});

test("a refresh stores alerts for Nueva Vizcaya, station readings and one forecast per town", async () => {
  await enable();
  const r = await svc().refreshAll(TOWNS);
  assert.equal(r.errors, 0);
  const alerts = await get("alerts");
  assert.deepEqual(alerts.active.map((a) => a.id), ["a2", "a1", "a5"]);
  const b = await get("muni_Bambang");
  assert.equal(b.forecast.current.tempC, 24);
  assert.equal(b.forecast.daily.length, 5);
  assert.equal(b.stations[0].siteId, 5076);
  assert.equal(b.source, "pagasa");
  assert.ok(await get("muni_Solano"));
  assert.equal((await get("_status")).mode, "pagasaPrimary");
  // Only the listed public GET endpoints, with lat/lon (not latitude/longitude).
  assert.deepEqual([...new Set(calls.map((c) => c.path))].sort(),
    ["/alerts", "/nowcast/dashboard", "/observation/automatic", "/observation/manual"]);
  assert.deepEqual(Object.keys(calls.find((c) => c.path === "/nowcast/dashboard").query), ["lat", "lon"]);
  for (const c of calls) assert.ok(Object.keys(c.headers).every((h) => ["Accept", "If-None-Match"].includes(h)));
});

test("refresh intervals are respected, and ETags turn repeat fetches into 304s", async () => {
  await enable();
  await svc().refreshAll(TOWNS);
  const first = calls.length;
  clock += 5 * 60e3; // 5 min later: only alerts are due
  await svc().refreshAll(TOWNS);
  assert.deepEqual(calls.slice(first).map((c) => c.path), ["/alerts"]);
  assert.equal(calls[first].headers["If-None-Match"], "v1");
  clock += 10 * 60e3; // 15 min after the first run: forecasts are due again
  const before = calls.length;
  await svc().refreshAll(TOWNS);
  const again = calls.slice(before).filter((c) => c.path === "/nowcast/dashboard");
  assert.equal(again.length, 2);
  assert.ok(again.every((c) => c.headers["If-None-Match"] === "v1"));
  assert.equal((await get("muni_Bambang")).forecast.current.tempC, 24, "304 keeps the stored forecast");
});

test("alerts expire with time even when PAGASA answers 304", async () => {
  await enable();
  await svc().refreshAll(TOWNS);
  clock = Date.UTC(2026, 9, 10, 18, 0); // 2 AM Manila next day: a1 (until 1 AM) is over
  await svc().refreshAll(TOWNS);
  assert.deepEqual((await get("alerts")).active.map((a) => a.id), ["a2", "a5"]);
});

test("401/403: calls stop for 6 hours and apps are told to fall back", async () => {
  await enable();
  mode = "blocked";
  const r = await svc().refreshAll(TOWNS);
  assert.equal(r.skipped, "blocked");
  assert.equal(calls.length, 1, "stopped at the first refusal");
  assert.equal((await get("_status")).mode, "internationalOnly");
  clock += 30 * 60e3;
  await svc().refreshAll(TOWNS);
  assert.equal(calls.length, 1, "no further calls while blocked");
  clock += 6 * 3600e3; mode = "ok";
  await svc().refreshAll(TOWNS);
  assert.ok(calls.length > 1, "tries again after the pause");
  assert.equal((await get("_status")).mode, "pagasaPrimary");
});

test("a network failure keeps the last good forecast", async () => {
  await enable();
  await svc().refreshAll(TOWNS);
  mode = "down"; clock += 20 * 60e3;
  const r = await svc().refreshAll(TOWNS);
  assert.ok(r.errors > 0);
  assert.equal((await get("muni_Bambang")).forecast.current.tempC, 24);
  assert.equal((await get("_status")).mode, "pagasaPrimary", "an outage is not a block");
});

test("barangay-level lookup: one fetch per ~1 km cell per 15 minutes, province only", async () => {
  await enable({ mode: "sideBySide" });
  const a = await svc().pointForecast(16.3841, 121.0672);
  assert.equal(a.available, true);
  assert.equal(a.mode, "sideBySide");
  assert.equal(a.forecast.place.barangay, "Poblacion");
  assert.equal(a.stale, false);
  await svc().pointForecast(16.3838, 121.0668); // same cell, a neighbour
  assert.equal(calls.length, 1, "the neighbour was served from the cell cache");
  assert.deepEqual(calls[0].query, { lat: "16.38", lon: "121.07" });
  const far = await svc().pointForecast(14.6, 121.0); // Manila
  assert.deepEqual([far.available, far.reason], [false, "outside_province"]);
  assert.equal(calls.length, 1);
});

test("barangay-level lookup serves stale data when PAGASA is down", async () => {
  await enable();
  await svc().pointForecast(16.38, 121.07);
  mode = "down"; clock += 20 * 60e3;
  const p = await svc().pointForecast(16.38, 121.07);
  assert.deepEqual([p.available, p.stale], [true, true]);
  const none = await svc().pointForecast(16.52, 121.18);
  assert.deepEqual([none.available, none.reason], [false, "unavailable"]);
});
