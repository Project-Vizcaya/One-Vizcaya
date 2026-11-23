"use strict";

// Integration test for the Hazard Watch feed refresh against the Firestore
// emulator. USGS and PHIVOLCS are replaced by a fake fetch serving the
// fixture files; no live call is made.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
require("../../apps/functions/index.js");
const { HazardService } = require("../../apps/functions/hazards/service.js");

const db = admin.firestore();
const NOW = 1795420800000;
const fx = (name) => {
  const raw = fs.readFileSync(path.join(__dirname, "../../apps/functions/hazards/fixtures", name), "utf8");
  return raw.slice(raw.indexOf("\n\n") + 2);
};
let calls, down;
const fakeFetch = async (url) => {
  const host = new URL(url).host;
  calls.push(host);
  if (down.has(host)) return { status: 503, json: async () => ({}), text: async () => "" };
  if (host === "earthquake.usgs.gov") return { status: 200, json: async () => JSON.parse(fx("usgs.txt")) };
  return { status: 200, text: async () => fx("phivolcs.txt") };
};
const svc = (now = NOW) => new HazardService(db, { fetchImpl: fakeFetch, now: () => now });
const ids = async () => (await db.collection("hazard_signals").get()).docs.map((d) => d.id).sort();
const status = async (s) => (await db.doc(`hazard_feed_status/${s}`).get()).data();

beforeEach(async () => {
  calls = []; down = new Set();
  for (const c of ["hazard_signals", "hazard_feed_status", "config"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
});
after(() => fft.cleanup());

test("default: USGS only, PHIVOLCS never contacted until switched on", async () => {
  const r = await svc().refresh();
  assert.equal(r.usgs, 4);
  assert.equal(r.phivolcs, null);
  assert.deepEqual([...new Set(calls)], ["earthquake.usgs.gov"]);
  assert.equal((await ids()).length, 4);
  assert.equal((await status("phivolcs")).enabled, false);
  assert.equal((await status("usgs")).lastError, null);
});

test("PHIVOLCS on: official reports stored, the USGS twin is marked superseded", async () => {
  await db.doc("config/hazards").set({ phivolcsEnabled: true });
  await svc().refresh();
  const all = (await db.collection("hazard_signals").get()).docs.map((d) => d.data());
  assert.equal(all.filter((s) => s.source === "phivolcs").length, 3);
  const twin = all.find((s) => s.id === "usgs_us7000aaa6");
  assert.ok(twin.supersededBy.startsWith("phivolcs_"));
});

test("a failing feed keeps its last signals and records the error", async () => {
  await svc().refresh();
  down.add("earthquake.usgs.gov");
  const r = await svc(NOW + 600e3).refresh();
  assert.equal(r.errors.length, 1);
  assert.equal((await ids()).length, 4, "kept");
  assert.match((await status("usgs")).lastError, /503/);
});

test("switching a feed off removes its signals; old ones age out after 7 days", async () => {
  await svc().refresh();
  await db.doc("config/hazards").set({ usgsEnabled: false });
  await svc().refresh();
  assert.deepEqual(await ids(), []);
  await db.doc("config/hazards").set({ usgsEnabled: true });
  await svc().refresh();
  down.add("earthquake.usgs.gov");
  await svc(NOW + 8 * 86400e3).refresh();
  assert.deepEqual(await ids(), [], "everything is older than the window now");
});
