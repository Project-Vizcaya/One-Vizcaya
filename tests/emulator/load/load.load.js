"use strict";

// Load and failover tests (P2, PDRRMO §14) against the LOCAL Firestore
// emulator only. Run with `npm run test:load` (not part of `npm test`).
//
// What this does and does not show:
//  - It exercises our own code paths at realistic provincial volumes and
//    under injected failures, and checks they stay correct.
//  - Timings are from the emulator on one machine. They are NOT production
//    latency or capacity figures: the emulator is single-process, has no
//    network hops and does not enforce Firestore's production limits. FCM is
//    stubbed, so push throughput is not measured.

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const { Messaging } = require("firebase-admin/messaging");
const { CollectionReference } = require("firebase-admin/firestore");
const {
  initializeTestEnvironment, assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { doc, setDoc, Timestamp } = require("firebase/firestore");
const fns = require("../../../apps/functions/index.js");

const db = admin.firestore();
const SIZES = {
  fanoutUsers: Number(process.env.LOAD_USERS || 5000),
  reportBurst: Number(process.env.LOAD_REPORTS || 300),
  overdueReports: Number(process.env.LOAD_OVERDUE || 2000),
};

// FCM stub: behaviour is switched per test.
let fcm = async (msg) => ({ responses: msg.tokens.map(() => ({ success: true })) });
let fcmCalls = 0;
Messaging.prototype.sendEachForMulticast = async function (msg) { fcmCalls++; return fcm(msg); };

async function wipe(...cols) {
  for (const c of cols) {
    const snap = await db.collection(c).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const b = db.batch();
      snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
      await b.commit();
    }
  }
}
async function seed(n, makePath, makeData) {
  for (let i = 0; i < n; i += 400) {
    const b = db.batch();
    for (let j = i; j < Math.min(n, i + 400); j++) b.set(db.doc(makePath(j)), makeData(j));
    await b.commit();
  }
}
const elapsed = (t0) => Math.round(performance.now() - t0);

before(async () => { await wipe("users", "broadcasts", "audit_logs", "system_health", "config"); });
after(() => fft.cleanup());

// ── load ────────────────────────────────────────────────────────────────────

test(`broadcast fan-out to ${SIZES.fanoutUsers} phones is batched and fully accounted`, async (t) => {
  await wipe("users", "broadcasts");
  await seed(SIZES.fanoutUsers, (i) => `users/u${i}`, (i) => ({ municipality: "Bambang", fcmToken: `tok-${i}` }));
  fcmCalls = 0;
  await db.doc("broadcasts/big").set({ title: "Typhoon", body: "Prepare.", scope: "municipality", municipality: "Bambang" });
  const t0 = performance.now();
  await fft.wrap(fns.onNewBroadcast)({ data: await db.doc("broadcasts/big").get(), params: {} });
  const ms = elapsed(t0);
  const d = (await db.doc("broadcasts/big").get()).data().delivery;
  t.diagnostic(`fan-out ${SIZES.fanoutUsers} users: ${ms} ms, ${fcmCalls} FCM calls`);
  assert.equal(fcmCalls, Math.ceil(SIZES.fanoutUsers / 500));
  assert.equal(d.attempted, SIZES.fanoutUsers);
  assert.equal(d.delivered, SIZES.fanoutUsers);
});

test(`${SIZES.reportBurst} citizens submitting at the same moment all pass the rules`, async (t) => {
  const env = await initializeTestEnvironment({
    projectId: "demo-onevizcaya",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "../../../firestore.rules"), "utf8") },
  });
  try {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const c = ctx.firestore();
      await Promise.all(Array.from({ length: SIZES.reportBurst }, (_, i) =>
        setDoc(doc(c, `users/c${i}`), { role: "citizen", municipality: "Solano", residencyStatus: "certified" })));
    });
    const t0 = performance.now();
    await Promise.all(Array.from({ length: SIZES.reportBurst }, (_, i) =>
      assertSucceeds(setDoc(doc(env.authenticatedContext(`c${i}`).firestore(), `users/c${i}/reports/r1`), {
        userId: `c${i}`, userPhone: "+639000000000", isAnonymous: false,
        municipality: "Solano", barangay: "Poblacion", category: "Flooding",
        status: "reported", priority: "high", reportedAt: Timestamp.now(),
      }))));
    t.diagnostic(`${SIZES.reportBurst} concurrent report creates: ${elapsed(t0)} ms`);
  } finally {
    await env.cleanup();
  }
});

test(`overdue escalation over ${SIZES.overdueReports} open reports finishes well inside its 120 s timeout`, async (t) => {
  await wipe("users", "audit_logs");
  const ago = admin.firestore.Timestamp.fromMillis(Date.now() - 50 * 3600e3);
  await seed(SIZES.overdueReports, (i) => `users/cz/reports/o${i}`,
    () => ({ municipality: "Bambang", category: "Flooding", status: "reported", priority: "high", reportedAt: ago }));
  const t0 = performance.now();
  await fft.wrap(fns.escalateOverdueReports)({});
  const ms = elapsed(t0);
  t.diagnostic(`escalation over ${SIZES.overdueReports} overdue reports: ${ms} ms`);
  const audits = await db.collection("audit_logs").where("action", "==", "report_sla_breached").count().get();
  assert.equal(audits.data().count, SIZES.overdueReports, "every overdue report escalated exactly once");
  assert.ok(ms < 120e3, `took ${ms} ms`);
  // A second run escalates nothing new.
  await fft.wrap(fns.escalateOverdueReports)({});
  const again = await db.collection("audit_logs").where("action", "==", "report_sla_breached").count().get();
  assert.equal(again.data().count, SIZES.overdueReports);
});

// ── failover ────────────────────────────────────────────────────────────────

test("FCM completely down: the broadcast records the failure and no token is lost", async () => {
  await wipe("users", "broadcasts");
  await seed(1200, (i) => `users/f${i}`, (i) => ({ municipality: "Bambang", fcmToken: `tok-${i}` }));
  fcm = async () => { throw new Error("UNAVAILABLE"); };
  try {
    await db.doc("broadcasts/down").set({ title: "t", body: "b", scope: "municipality", municipality: "Bambang" });
    await fft.wrap(fns.onNewBroadcast)({ data: await db.doc("broadcasts/down").get(), params: {} });
  } finally {
    fcm = async (msg) => ({ responses: msg.tokens.map(() => ({ success: true })) });
  }
  const d = (await db.doc("broadcasts/down").get()).data().delivery;
  assert.deepEqual([d.attempted, d.delivered, d.failed, d.invalidTokensRemoved], [1200, 0, 1200, 0]);
  const withToken = await db.collection("users").where("fcmToken", "!=", null).count().get();
  assert.equal(withToken.data().count, 1200, "an outage must never prune tokens");
});

test("FCM fails one batch mid-send: the other batches still go out", async () => {
  await wipe("broadcasts");
  let call = 0;
  fcm = async (msg) => {
    call++;
    if (call === 2) throw new Error("DEADLINE_EXCEEDED");
    return { responses: msg.tokens.map(() => ({ success: true })) };
  };
  try {
    await db.doc("broadcasts/partial").set({ title: "t", body: "b", scope: "municipality", municipality: "Bambang" });
    await fft.wrap(fns.onNewBroadcast)({ data: await db.doc("broadcasts/partial").get(), params: {} });
  } finally {
    fcm = async (msg) => ({ responses: msg.tokens.map(() => ({ success: true })) });
  }
  const d = (await db.doc("broadcasts/partial").get()).data().delivery;
  assert.equal(d.attempted, 1200);
  assert.equal(d.failed, 500, "only the failed batch");
  assert.equal(d.delivered, 700);
});

function mockRes() {
  const res = { code: 0, body: null, headers: {} };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.send = (b) => { res.body = b; return res; };
  res.on = () => res;
  return res;
}

test("Firestore erroring: the health endpoint reports 'down' with 503", async () => {
  const real = CollectionReference.prototype.get;
  CollectionReference.prototype.get = function () { return Promise.reject(new Error("UNAVAILABLE")); };
  try {
    const res = mockRes();
    await fns.health({ method: "GET", headers: {}, get: () => undefined }, res);
    assert.equal(res.code, 503);
    assert.equal(res.body.status, "down");
  } finally {
    CollectionReference.prototype.get = real;
  }
});

test("Firestore hanging: the health endpoint gives up after ~5 s instead of hanging", async () => {
  const real = CollectionReference.prototype.get;
  CollectionReference.prototype.get = function () { return new Promise(() => {}); };
  try {
    const res = mockRes();
    const t0 = performance.now();
    await fns.health({ method: "GET", headers: {}, get: () => undefined }, res);
    const ms = elapsed(t0);
    assert.equal(res.code, 503);
    assert.ok(ms >= 4500 && ms < 8000, `answered after ${ms} ms`);
  } finally {
    CollectionReference.prototype.get = real;
  }
});

test("a scheduled job that throws is reported as failing, not silently ok", async () => {
  await wipe("system_health");
  // Break the escalation job's first Firestore read.
  const real = admin.firestore.Firestore.prototype.collectionGroup;
  admin.firestore.Firestore.prototype.collectionGroup = function () { throw new Error("boom"); };
  try {
    await assert.rejects(fft.wrap(fns.escalateOverdueReports)({}));
  } finally {
    admin.firestore.Firestore.prototype.collectionGroup = real;
  }
  const hb = (await db.doc("system_health/escalateOverdueReports").get()).data();
  assert.ok(hb.lastErrorAt);
  const res = mockRes();
  await fns.health({ method: "GET", headers: {}, get: () => undefined }, res);
  assert.equal(res.body.checks.escalateOverdueReports, "failing");
  assert.equal(res.code, 503);
});
