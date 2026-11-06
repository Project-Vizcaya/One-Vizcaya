"use strict";

// Integration test for auditReportReferral (P2) against the Firestore emulator.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");

const db = admin.firestore();
const run = fft.wrap(fns.auditReportReferral);
const PATH = "users/citizen/reports/r1";
const base = { municipality: "Bambang", category: "Flooding", status: "acknowledged" };

beforeEach(async () => {
  const snap = await db.collection("audit_logs").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});
after(() => fft.cleanup());

const change = (before, afterData) => fft.makeChange(
  fft.firestore.makeDocumentSnapshot(before, PATH),
  fft.firestore.makeDocumentSnapshot(afterData, PATH));
const audits = async () => (await db.collection("audit_logs").get()).docs.map((d) => d.data());
const ref = (type, name) => ({ officeType: type, officeName: name, by: "muni", at: admin.firestore.Timestamp.fromMillis(1) });

test("a first referral and a re-referral are both audited", async () => {
  await run({ data: change(base, { ...base, referral: ref("MDRRMO", "MDRRMO Bambang") }), params: { userId: "citizen", reportId: "r1" } });
  await run({ data: change({ ...base, referral: ref("MDRRMO", "MDRRMO Bambang") },
    { ...base, referral: ref("BFP", "BFP Bambang") }), params: { userId: "citizen", reportId: "r1" } });
  const a = (await audits()).sort((x, y) => x.action.localeCompare(y.action));
  assert.deepEqual(a.map((x) => x.action), ["report_referred", "report_rereferred"]);
  const re = a[1];
  assert.equal(re.officeName, "BFP Bambang");
  assert.equal(re.previousOffice, "MDRRMO MDRRMO Bambang");
  assert.equal(re.referredBy, "muni");
});

test("an unrelated edit to a referred report writes nothing", async () => {
  const r = { ...base, referral: ref("MDRRMO", "MDRRMO Bambang") };
  await run({ data: change(r, { ...r, status: "ongoing" }), params: { userId: "citizen", reportId: "r1" } });
  assert.equal((await audits()).length, 0);
});
