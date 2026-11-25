"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { mapUsgs, mapPhivolcs, parsePhivolcsTime, quakeLevel, markSuperseded } = require("./quakes");
const { usgsUrl, resolveConfig } = require("./service");

const NOW = 1795420800000; // 2026-11-23T08:00:00Z, the fixtures' reference time
const body = (name) => {
  const raw = fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8");
  return raw.slice(raw.indexOf("\n\n") + 2);
};

test("USGS: keeps quakes within 400 km and 7 days, drops bad and far ones", () => {
  const q = mapUsgs(JSON.parse(body("usgs.txt")), NOW);
  assert.deepEqual(q.map((x) => x.id).sort(),
    ["usgs_us7000aaa1", "usgs_us7000aaa2", "usgs_us7000aaa3", "usgs_us7000aaa6"]);
  const kayapa = q.find((x) => x.id === "usgs_us7000aaa1");
  assert.equal(kayapa.source, "usgs");
  assert.equal(kayapa.kind, "earthquake");
  assert.equal(kayapa.magnitude, 5.2);
  assert.equal(kayapa.depthKm, 10);
  assert.ok(kayapa.distanceKm > 20 && kayapa.distanceKm < 45, String(kayapa.distanceKm));
  assert.equal(kayapa.level, "critical");
  assert.equal(q.find((x) => x.id === "usgs_us7000aaa3").level, "watch");
  assert.deepEqual(mapUsgs(null, NOW), []);
  assert.deepEqual(mapUsgs({ features: "x" }, NOW), []);
});

test("PHIVOLCS: parses the table, Philippine time, location and bulletin link", () => {
  const q = mapPhivolcs(body("phivolcs.txt"), "https://earthquake.phivolcs.dost.gov.ph/", NOW);
  assert.equal(q.length, 3, "three real rows; the header and junk rows are skipped");
  const solano = q.find((x) => /Solano/.test(x.place));
  assert.equal(solano.source, "phivolcs");
  assert.equal(solano.magnitude, 4.7);
  assert.equal(solano.depthKm, 12);
  assert.equal(solano.place, "006 km N 45° E of Solano (Nueva Vizcaya)");
  assert.match(solano.url, /^https:\/\/earthquake\.phivolcs\.dost\.gov\.ph\/2026_Earthquake_Information\/November\//);
  assert.equal(solano.level, "warning");
});

test("PHIVOLCS time is Philippine time", () => {
  assert.equal(parsePhivolcsTime("23 November 2026 - 03:15 PM"), Date.UTC(2026, 10, 23, 7, 15));
  assert.equal(parsePhivolcsTime("1 January 2026 - 12:05 AM"), Date.UTC(2025, 11, 31, 16, 5));
  for (const bad of ["", null, "yesterday", "31 Smarch 2026 - 01:00 PM"]) assert.equal(parsePhivolcsTime(bad), null);
});

test("severity is a triage aid from magnitude and distance", () => {
  assert.equal(quakeLevel(6.2, 180), "critical");
  assert.equal(quakeLevel(5.0, 40), "critical");
  assert.equal(quakeLevel(5.0, 250), "warning");
  assert.equal(quakeLevel(4.1, 90), "warning");
  assert.equal(quakeLevel(3.6, 140), "watch");
  assert.equal(quakeLevel(3.6, 300), "info");
  assert.equal(quakeLevel(null, 10), "info");
});

test("a USGS copy of a PHIVOLCS quake is marked superseded", () => {
  const usgs = mapUsgs(JSON.parse(body("usgs.txt")), NOW);
  const ph = mapPhivolcs(body("phivolcs.txt"), "https://earthquake.phivolcs.dost.gov.ph/", NOW);
  const marked = markSuperseded(usgs, ph);
  const dup = marked.find((x) => x.id === "usgs_us7000aaa6");
  assert.ok(dup.supersededBy && dup.supersededBy.startsWith("phivolcs_"));
  assert.equal(marked.find((x) => x.id === "usgs_us7000aaa1").supersededBy, null);
});

test("config: USGS on and PHIVOLCS off by default; only https URLs accepted", () => {
  assert.deepEqual(resolveConfig(undefined), { usgs: true, phivolcs: false, phivolcsUrl: "https://earthquake.phivolcs.dost.gov.ph/" });
  assert.equal(resolveConfig({ usgsEnabled: false, phivolcsEnabled: true }).usgs, false);
  assert.equal(resolveConfig({ phivolcsUrl: "http://evil" }).phivolcsUrl, "https://earthquake.phivolcs.dost.gov.ph/");
});

test("the USGS query asks for the province's radius and window only", () => {
  const u = new URL(usgsUrl(NOW));
  assert.equal(u.host, "earthquake.usgs.gov");
  assert.equal(u.searchParams.get("maxradiuskm"), "400");
  assert.equal(u.searchParams.get("latitude"), "16.49");
  assert.equal(u.searchParams.get("starttime"), "2026-11-16T08:00:00");
});
