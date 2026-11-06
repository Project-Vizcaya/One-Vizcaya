"use strict";

// Integration test for the public `health` endpoint and the scheduled-job
// heartbeats (P2, uptime) against the Firestore emulator.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");
const { JOB_INTERVAL_MIN } = require("../../apps/functions/health/health.js");

const db = admin.firestore();
const ago = (m) => admin.firestore.Timestamp.fromMillis(Date.now() - m * 60e3);

async function call(method = "GET") {
  const res = { code: 0, body: null, headers: {} };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.send = (b) => { res.body = b; return res; };
  res.on = () => res; // used by the functions framework wrapper
  await fns.health({ method, headers: {}, get: () => undefined }, res);
  return res;
}

beforeEach(async () => {
  for (const c of ["system_health", "users", "audit_logs", "config"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
});
after(() => fft.cleanup());

test("all jobs fresh -> 200 ok, no caching", async () => {
  await Promise.all(Object.keys(JOB_INTERVAL_MIN).map((j) =>
    db.doc(`system_health/${j}`).set({ lastSuccessAt: ago(1) })));
  const r = await call();
  assert.equal(r.code, 200);
  assert.equal(r.body.status, "ok");
  assert.equal(r.headers["Cache-Control"], "no-store");
});

test("a job that stopped running -> 503 degraded, without error text", async () => {
  await db.doc("system_health/escalateOverdueReports").set({ lastSuccessAt: ago(90) });
  await db.doc("system_health/pagasaRegionalWatch")
    .set({ lastSuccessAt: ago(120), lastErrorAt: ago(3), lastError: "secret internal detail" });
  const r = await call();
  assert.equal(r.code, 503);
  assert.equal(r.body.status, "degraded");
  assert.equal(r.body.checks.escalateOverdueReports, "stale");
  assert.equal(r.body.checks.pagasaRegionalWatch, "failing");
  assert.equal(JSON.stringify(r.body).includes("secret"), false);
});

test("only GET/HEAD are accepted", async () => {
  assert.equal((await call("POST")).code, 405);
});

test("a scheduled job writes its heartbeat when it runs", async () => {
  await fft.wrap(fns.escalateOverdueReports)({});
  const hb = (await db.doc("system_health/escalateOverdueReports").get()).data();
  assert.ok(hb.lastSuccessAt, "success recorded");
  const r = await call();
  assert.equal(r.body.checks.escalateOverdueReports, "ok");
});
