"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseNum, parsePhtDate, hourlyTimes, mapDashboard, mapAlerts, mapObservations } = require("./parse");
const { nvAlerts } = require("./alerts");
const { nearestStations } = require("./stations");
const { pagasaGet, PagasaBlocked } = require("./client");

/** Fixture files are raw responses: headers, blank line, JSON body. */
function readFixture(name) {
  const raw = fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8").replace(/\r\n/g, "\n");
  return JSON.parse(raw.slice(raw.indexOf("\n\n") + 2));
}
const PHT = (y, mo, d, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h - 8, mi);
const NOW = PHT(2026, 10, 10, 21, 20);

test("parseNum handles every display format, and missing values", () => {
  const cases = [["28 °C", 28], ["26.14°C", 26.14], ["89.2%", 89.2], ["1005.6 hPa", 1005.6], ["0.2 km/h", 0.2],
    ["0 mm/hr", 0], ["5.6571960449219 mm", 5.6571960449219], ["32", 32], [31, 31], ["-3 °C", -3],
    ["-", null], ["", null], [null, null], [undefined, null], ["n/a", null], [NaN, null]];
  for (const [input, want] of cases) assert.equal(parseNum(input), want, JSON.stringify(input));
});

test("dates are parsed as Asia/Manila in every format", () => {
  assert.equal(parsePhtDate("October 10, 2026 10:00 PM"), PHT(2026, 10, 10, 22, 0));
  assert.equal(parsePhtDate("October 11, 2026 12:00 AM"), PHT(2026, 10, 11, 0, 0));
  assert.equal(parsePhtDate("October 10, 2026 12:30 PM"), PHT(2026, 10, 10, 12, 30));
  assert.equal(parsePhtDate("2026-10-10 21:40:00"), PHT(2026, 10, 10, 21, 40));
  assert.equal(parsePhtDate(1791640800), 1791640800000);
  assert.equal(parsePhtDate("1791640800"), 1791640800000);
  for (const bad of ["-", "", null, undefined, "10/10", "soon", "Smarch 3, 2026"]) assert.equal(parsePhtDate(bad), null);
});

test("hourly labels are anchored to real hours, across midnight", () => {
  const t = hourlyTimes(["9:00 PM", "10:00 PM", "11:00 PM", "12:00 AM"], NOW);
  assert.equal(t[0], PHT(2026, 10, 10, 21, 0));
  assert.equal(t[3], PHT(2026, 10, 11, 0, 0));
  // Just after midnight, a first slot of 11:00 PM belongs to yesterday.
  assert.equal(hourlyTimes(["11:00 PM"], PHT(2026, 10, 11, 0, 5))[0], PHT(2026, 10, 10, 23, 0));
  assert.deepEqual(hourlyTimes(["soon"], NOW), [null]);
});

test("dashboard fixture maps to a full forecast, keeping PAGASA's categories", () => {
  const f = mapDashboard(readFixture("dashboard.txt"), NOW);
  assert.deepEqual(f.place, { barangay: "Poblacion", municipality: "Bambang", province: "Nueva Vizcaya",
    region: "Region II", lat: 16.3833, lon: 121.0667 });
  assert.equal(f.current.tempC, 24);
  assert.equal(f.current.rainMm, 0.11);
  assert.equal(f.current.rainDesc, "Light Rain");
  assert.equal(f.current.heatIndexDesc, "Not Hazardous");
  assert.equal(f.current.heatIndexColor, "#2ECC40");
  assert.equal(f.hourly.length, 24);
  assert.equal(f.hourly[1].timeMs - f.hourly[0].timeMs, 3600e3);
  assert.equal(f.daily.length, 5);
  assert.equal(f.daily[0].tempMaxC, 32, "a bare number without a unit");
  assert.equal(f.daily[0].rainMm, 5.6571960449219);
  assert.equal(f.daily[0].heatIndexMaxDesc, "Extreme Caution");
  assert.equal(f.links.rainMap, "https://api.mobile.panahon.gov.ph/maps/rain.gif");
});

test("one bad field never drops the record", () => {
  const f = mapDashboard(readFixture("dashboard.txt"), NOW);
  assert.equal(f.hourly[5].tempC, null); // "-"
  assert.equal(f.hourly[5].heatIndexC !== null, true);
  assert.equal(f.hourly[6].rainMm, null); // ""
  assert.equal(f.hourly[7].heatIndexC, null); // null
});

test("unusable dashboard responses map to null, not a crash", () => {
  for (const bad of [null, {}, { success: false }, { success: true, data: {} }, { data: "x" }, "text"]) {
    assert.equal(mapDashboard(bad, NOW), null);
  }
  // province may be null (chartered cities).
  const j = readFixture("dashboard.txt"); j.meta.province = null;
  assert.equal(mapDashboard(j, NOW).place.province, null);
});

test("alerts: Nueva Vizcaya, region-wide and #NLPRSD match; others do not", () => {
  const all = mapAlerts(readFixture("alerts.txt"));
  assert.equal(all.length, 5);
  const ids = nvAlerts(all, null, NOW).map((a) => a.id);
  // a2 (priority 3) first, then a1 (2), then a5 (1, no expiry). a3 is Metro
  // Manila; a4 matched by message but expired at 8 PM.
  assert.deepEqual(ids, ["a2", "a1", "a5"]);
});

test("alerts: unix timestamp preferred; unknown types and missing expiry are kept", () => {
  const all = mapAlerts(readFixture("alerts.txt"));
  const a1 = all.find((a) => a.id === "a1");
  assert.equal(a1.issuedAtMs, 1791640800000);
  assert.equal(a1.validUntilMs, PHT(2026, 10, 11, 1, 0));
  const a5 = all.find((a) => a.id === "a5");
  assert.equal(a5.type, "Something New");
  assert.equal(a5.validUntilMs, null);
  assert.equal(a5.priority, 1, "priority given as a string");
});

test("alerts: expiry, ordering by newest within a priority, and configurable rules", () => {
  const mk = (id, priority, issuedAtMs, validUntilMs, locations = ["Nueva Vizcaya"]) =>
    ({ id, priority, issuedAtMs, validUntilMs, locations, message: "" });
  const list = [mk("old", 1, 100, NOW + 1), mk("new", 1, 200, NOW + 1), mk("gone", 9, 300, NOW - 1), mk("ifugao", 5, 1, NOW + 1, ["Ifugao"])];
  assert.deepEqual(nvAlerts(list, null, NOW).map((a) => a.id), ["new", "old"]);
  assert.deepEqual(nvAlerts(list, { locations: ["Ifugao"], messageContains: ["zzz"] }, NOW).map((a) => a.id), ["ifugao"]);
});

test("observations are keyed by site id and tolerate missing values", () => {
  const o = mapObservations(readFixture("observation_automatic.txt"));
  assert.deepEqual(Object.keys(o).sort(), ["1", "5026", "5076"]);
  assert.equal(o["5076"].tempC, 26.14);
  assert.equal(o["5076"].humidityPct, 89.2);
  assert.equal(o["5076"].pressureHpa, 1005.6);
  assert.equal(o["5076"].observedAtMs, PHT(2026, 10, 10, 21, 40));
  assert.equal(o["5026"].tempC, null);
  assert.equal(o["5026"].windDir, null);
});

test("nearest stations are found by site id with distance, nearest first", () => {
  const o = mapObservations(readFixture("observation_automatic.txt"));
  const near = nearestStations(16.3833, 121.0667, o, 2); // Bambang
  assert.deepEqual(near.map((s) => s.siteId), [5076, 5026]);
  assert.ok(near[0].distanceKm > 30 && near[0].distanceKm < 120);
  assert.equal(nearestStations(16.38, 121.07, {}, 2).length, 0, "no reading, no card");
});

// ── client: no live calls; a fake fetch records what would be sent ─────────

function fakeFetch(status, body, etag) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return { status, headers: { get: (h) => (h.toLowerCase() === "etag" ? etag : null) }, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

test("client sends only Accept and If-None-Match, with lat/lon params", async () => {
  const f = fakeFetch(200, { success: true }, 'W/"abc"');
  const r = await pagasaGet("/nowcast/dashboard", { query: { lat: 16.38, lon: 121.07 }, etag: 'W/"old"', fetchImpl: f });
  assert.equal(r.etag, 'W/"abc"');
  const { url, init } = f.calls[0];
  assert.equal(url, "https://api.mobile.panahon.gov.ph/api/v1/nowcast/dashboard?lat=16.38&lon=121.07");
  assert.equal(init.method, "GET");
  assert.deepEqual(Object.keys(init.headers).sort(), ["Accept", "If-None-Match"]);
});

test("client: 304 reuses the cache, 401/403 mean blocked, other errors throw", async () => {
  assert.deepEqual(await pagasaGet("/alerts", { fetchImpl: fakeFetch(304) }), { notModified: true });
  await assert.rejects(pagasaGet("/alerts", { fetchImpl: fakeFetch(403) }), PagasaBlocked);
  await assert.rejects(pagasaGet("/alerts", { fetchImpl: fakeFetch(401) }), PagasaBlocked);
  await assert.rejects(pagasaGet("/alerts", { fetchImpl: fakeFetch(500) }), (e) => !(e instanceof PagasaBlocked));
});

test("client refuses every path that is not a listed public GET endpoint", async () => {
  const f = fakeFetch(200, {});
  for (const p of ["/auth/register-device", "/auth/challenge", "/auth/verify", "/nowcast/dashboard/../auth/verify",
    "/observation/automatic/historical-data/abc", "/anything"]) {
    await assert.rejects(pagasaGet(p, { fetchImpl: f }), /not allowed/);
  }
  assert.equal(f.calls.length, 0, "nothing was sent");
});
