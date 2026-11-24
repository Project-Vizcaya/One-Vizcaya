"use strict";

// Integration tests for incident IDs and the Command Hub bridge against the
// Firestore emulator. No Hub or Secret Manager is contacted.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");
const { applyStatusUpdate, parseStatusUpdate } = require("../../apps/functions/hub/bridge.js");
const { incidentUuidFor } = require("../../apps/functions/reports/incidentId.js");

const db = admin.firestore();
const created = fft.wrap(fns.onReportCreated);
const PATH = "users/citizen/reports/r1";
const ts = () => admin.firestore.FieldValue.serverTimestamp();
const report = (extra = {}) => ({
  userId: "citizen", municipality: "Bambang", category: "Flooding", status: "reported", isAnonymous: false,
  reportedAt: admin.firestore.Timestamp.fromDate(new Date("2026-11-24T01:00:00Z")), ...extra,
});
const fireCreated = async (path, data) => {
  await db.doc(path).set(data);
  const [, uid, , id] = path.split("/");
  await created({ params: { userId: uid, reportId: id }, data: await db.doc(path).get() });
  return (await db.doc(path).get()).data();
};

beforeEach(async () => {
  for (const c of ["users/citizen/reports", "users/citizen/notifications", "config"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
});
after(() => fft.cleanup());

test("every new report gets a town-coded incident ID and the shared UUID", async () => {
  const bam = await fireCreated(PATH, report());
  assert.match(bam.incidentId, /^NV-BAM-20261124-[0-9A-F]{6}$/);
  assert.equal(bam.incidentUuid, incidentUuidFor(PATH));
  const byb = await fireCreated("users/citizen/reports/r2", report({ municipality: "Bayombong" }));
  assert.match(byb.incidentId, /^NV-BYB-20261124-[0-9A-F]{6}$/);
  assert.notEqual(byb.incidentUuid, bam.incidentUuid);
});

test("a re-delivered event keeps the same IDs", async () => {
  const first = await fireCreated(PATH, report());
  await created({ params: { userId: "citizen", reportId: "r1" }, data: await db.doc(PATH).get() });
  const again = (await db.doc(PATH).get()).data();
  assert.equal(again.incidentId, first.incidentId);
  assert.equal(again.incidentUuid, first.incidentUuid);
});

test("forwarding is off by default: no Hub call, no error", async () => {
  const d = await fireCreated(PATH, report());
  assert.ok(d.incidentId);
});

test("Hub update: stage, rounded arrival time, one inbox entry per stage", async () => {
  const d = await fireCreated(PATH, report());
  const u = (stage, extra = {}) => parseStatusUpdate({ incident_id: d.incidentUuid, external_ref: PATH, stage, ...extra }).update;

  assert.equal(await applyStatusUpdate(db, u("en_route", { eta_seconds: 700, agency: "PDRRMO" }), { serverTimestamp: ts }), "stage_changed");
  let r = (await db.doc(PATH).get()).data();
  assert.equal(r.hub.stage, "en_route");
  assert.equal(r.hub.etaMin, 10);
  assert.equal(r.hub.etaMax, 15);
  assert.equal(r.hub.agency, "PDRRMO");

  // A new arrival time only: no new inbox entry.
  assert.equal(await applyStatusUpdate(db, u("en_route", { eta_seconds: 200 }), { serverTimestamp: ts }), "updated");
  r = (await db.doc(PATH).get()).data();
  assert.equal(r.hub.etaMax, 5);

  await applyStatusUpdate(db, u("on_scene"), { serverTimestamp: ts });
  const inbox = (await db.collection("users/citizen/notifications").get()).docs.map((x) => x.data());
  assert.equal(inbox.length, 2);
  assert.ok(inbox.some((n) => n.title === "Responder on the way" && n.body.includes("10 to 15 minutes") && n.body.startsWith(d.incidentId)));
  assert.ok(inbox.some((n) => n.title === "Responder on scene"));
  // Nothing about where the responder is.
  assert.ok(inbox.every((n) => !/lat|lng|km away/i.test(n.body)));
});

test("Hub update for the wrong UUID or a missing report changes nothing", async () => {
  await fireCreated(PATH, report());
  const wrong = parseStatusUpdate({ incident_id: "00000000-0000-5000-8000-000000000000", external_ref: PATH, stage: "resolved" }).update;
  assert.equal(await applyStatusUpdate(db, wrong, { serverTimestamp: ts }), "mismatch");
  assert.equal((await db.doc(PATH).get()).data().hub, undefined);
  const missing = parseStatusUpdate({ incident_id: "00000000-0000-5000-8000-000000000000", external_ref: "users/citizen/reports/nope", stage: "resolved" }).update;
  assert.equal(await applyStatusUpdate(db, missing, { serverTimestamp: ts }), "not_found");
});
