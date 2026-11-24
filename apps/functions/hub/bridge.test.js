"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { sign, verify, ingestPayload, forwardReport, etaRange, parseStatusUpdate } = require("./bridge");

const SECRET = "test-secret";
const UUID = "3f9a2c11-0000-5000-8000-000000000000";
const AT = "2026-11-24T10:00:00.000Z";

test("signature: valid, tampered, stale, missing", () => {
  const body = '{"a":1}';
  const now = 1_800_000_000;
  const h = sign(SECRET, body, now);
  assert.equal(verify(SECRET, body, h, now), true);
  assert.equal(verify(SECRET, '{"a":2}', h, now), false);
  assert.equal(verify("other", body, h, now), false);
  assert.equal(verify(SECRET, body, h, now + 301), false);
  assert.equal(verify(SECRET, body, undefined, now), false);
  assert.equal(verify(SECRET, body, "t=1,v1=zz", now), false);
  assert.equal(verify("", body, h, now), false);
});

test("ingest payload carries no name or phone", () => {
  const p = ingestPayload("users/u1/reports/r1", {
    category: "Flooding", priority: "critical", description: "Water rising", location: "Purok 3",
    barangay: "Salinas", municipality: "Bambang", latitude: 16.38, longitude: 121.1,
    userPhone: "+639170000000", reporterName: "Juan", reportedAt: { toDate: () => new Date("2026-11-24T00:00:00Z") },
  }, { incidentUuid: UUID, incidentId: "NV-BAM-20261124-3F9A2C" });
  assert.equal(p.incident_id, UUID);
  assert.equal(p.incident_code, "NV-BAM-20261124-3F9A2C");
  assert.equal(p.external_ref, "users/u1/reports/r1");
  assert.equal(p.reported_at, "2026-11-24T00:00:00.000Z");
  assert.ok(!JSON.stringify(p).includes("639170000000"));
  assert.ok(!JSON.stringify(p).includes("Juan"));
});

test("forwardReport signs the body and fails on a bad answer", async () => {
  let seen;
  await forwardReport({
    hubUrl: "https://hub.example/", secret: SECRET, payload: { incident_id: UUID },
    fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true }; },
  });
  assert.equal(seen.url, "https://hub.example/api/ingest-app-report");
  assert.equal(verify(SECRET, seen.init.body, seen.init.headers["x-ov-signature"]), true);
  await assert.rejects(forwardReport({
    hubUrl: "https://hub.example", secret: SECRET, payload: {}, fetchImpl: async () => ({ ok: false, status: 500 }),
  }), /500/);
});

test("arrival time is a rounded range, never exact", () => {
  assert.deepEqual(etaRange(120), [0, 5]);
  assert.deepEqual(etaRange(12 * 60), [10, 15]);
  assert.deepEqual(etaRange(59 * 60), [55, 60]);
  assert.deepEqual(etaRange(75 * 60), [75, 90]);
  assert.equal(etaRange(-1), null);
  assert.equal(etaRange("600"), null);
});

test("status update validation", () => {
  const ok = parseStatusUpdate({ incident_id: UUID, external_ref: "users/u1/reports/r1", stage: "en_route", eta_seconds: 700, agency: "PDRRMO", at: AT });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.update.eta, [10, 15]);
  // ETA only while on the way.
  assert.equal(parseStatusUpdate({ incident_id: UUID, external_ref: "users/u1/reports/r1", stage: "on_scene", eta_seconds: 700, at: AT }).update.eta, null);
  assert.equal(parseStatusUpdate({ incident_id: UUID, external_ref: "users/u1/reports/r1", stage: "teleported", at: AT }).ok, false);
  assert.equal(parseStatusUpdate({ incident_id: "x", external_ref: "users/u1/reports/r1", stage: "received", at: AT }).ok, false);
  assert.equal(parseStatusUpdate({ incident_id: UUID, external_ref: "broadcasts/x", stage: "received", at: AT }).ok, false);
  assert.equal(parseStatusUpdate({ incident_id: UUID, external_ref: "users/u1/reports/r1", stage: "received", agency: "x".repeat(61), at: AT }).ok, false);
  // The time of the change is required (ordering).
  assert.equal(parseStatusUpdate({ incident_id: UUID, external_ref: "users/u1/reports/r1", stage: "received" }).ok, false);
});
