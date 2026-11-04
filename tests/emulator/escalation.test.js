"use strict";

// Integration test for escalateOverdueReports (P2, PDRRMO §7/§14) against the
// Firestore emulator. Seeded admins have no FCM tokens, so nothing is sent;
// the test checks which reports are escalated, stamped and audited.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");

const run = fft.wrap(fns.escalateOverdueReports);
const db = admin.firestore();
const ago = (h) => admin.firestore.Timestamp.fromMillis(Date.now() - h * 3600e3);

async function wipe() {
  for (const c of ["users", "audit_logs", "config"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
  }
}

beforeEach(async () => {
  await wipe();
  await db.doc("users/muni").set({ role: "municipal_admin", municipality: "Bambang" });
  const r = (id, data) => db.doc(`users/citizen/reports/${id}`).set({ municipality: "Bambang", category: "Flooding", ...data });
  await r("overdueCritical", { status: "reported", priority: "critical", reportedAt: ago(3) });
  await r("freshCritical", { status: "reported", priority: "critical", reportedAt: ago(1) });
  await r("overdueButSolved", { status: "solved", priority: "critical", reportedAt: ago(50) });
  await r("overdueButClosed", { status: "closed", priority: "high", reportedAt: ago(50) });
  await r("alreadyEscalated", { status: "ongoing", priority: "high", reportedAt: ago(50), slaEscalatedAt: ago(1) });
});
after(() => fft.cleanup());

const audits = async () => (await db.collection("audit_logs").get()).docs.map((d) => d.data());

test("escalates only open, overdue, not-yet-escalated reports — once", async () => {
  await run({});
  const a = await audits();
  assert.deepEqual(a.map((x) => x.reportId), ["overdueCritical"]);
  assert.equal(a[0].action, "report_sla_breached");
  assert.equal(a[0].unacknowledged, true);
  assert.equal(a[0].slaProvisional, true, "defaults are labelled provisional");

  const r = (await db.doc("users/citizen/reports/overdueCritical").get()).data();
  assert.ok(r.slaEscalatedAt);
  assert.equal(r.slaHoursAllowed, 2);

  await run({});
  assert.equal((await audits()).length, 1, "a second run does not escalate it again");
});

test("saved SLA targets are honoured and drop the provisional flag", async () => {
  await db.doc("config/sla").set({ hoursByPriority: { critical: 0.5 }, provisional: false });
  await db.doc("users/citizen/reports/freshCritical").update({ reportedAt: ago(1) });
  await run({});
  const ids = (await audits()).map((x) => x.reportId).sort();
  assert.deepEqual(ids, ["freshCritical", "overdueCritical"]);
  assert.equal((await audits())[0].slaProvisional, false);
});
