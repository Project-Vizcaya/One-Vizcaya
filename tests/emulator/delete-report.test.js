"use strict";

// Integration tests for the deleteReportWithReason callable (P2, PDRRMO §8)
// against the Firestore emulator.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");

const del = fft.wrap(fns.deleteReportWithReason);
const db = admin.firestore();
const REPORT = "users/citizen/reports/r1";
const call = (uid, data) => del({ data, auth: uid ? { uid, token: {} } : undefined });
const code = (c) => (e) => e.code === c;

beforeEach(async () => {
  for (const c of ["users"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
  }
  await db.doc("users/prov").set({ role: "provincial_admin" });
  await db.doc("users/muni").set({ role: "municipal_admin", municipality: "Bambang" });
  await db.doc("users/citizen").set({ role: "citizen" });
  await db.doc(REPORT).set({ userId: "citizen", category: "Flooding", status: "reported" });
});
after(() => fft.cleanup());

test("a provincial admin with a reason deletes the report", async () => {
  await call("prov", { userId: "citizen", reportId: "r1", reason: "Test entry made during training" });
  assert.equal((await db.doc(REPORT).get()).exists, false);
});

test("a reason is required", async () => {
  await assert.rejects(call("prov", { userId: "citizen", reportId: "r1", reason: "x" }), code("invalid-argument"));
  await assert.rejects(call("prov", { userId: "citizen", reportId: "r1" }), code("invalid-argument"));
  assert.equal((await db.doc(REPORT).get()).exists, true);
});

test("municipal admins and citizens are refused", async () => {
  await assert.rejects(call("muni", { userId: "citizen", reportId: "r1", reason: "Not needed anymore" }), code("permission-denied"));
  await assert.rejects(call("citizen", { userId: "citizen", reportId: "r1", reason: "Delete my report" }), code("permission-denied"));
  assert.equal((await db.doc(REPORT).get()).exists, true);
});

test("unauthenticated callers and missing reports are refused", async () => {
  await assert.rejects(call(null, { userId: "citizen", reportId: "r1", reason: "Five+ chars" }), code("unauthenticated"));
  await assert.rejects(call("prov", { userId: "citizen", reportId: "nope", reason: "Five+ chars" }), code("not-found"));
});
