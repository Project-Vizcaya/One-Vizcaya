"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assessHealth, JOB_INTERVAL_MIN } = require("./health");

const NOW = Date.UTC(2026, 10, 4, 12, 0);
const min = (m) => NOW - m * 60e3;
const allFresh = () =>
  Object.fromEntries(Object.keys(JOB_INTERVAL_MIN).map((j) => [j, { lastSuccessMs: min(1) }]));

test("everything fresh is ok", () => {
  const r = assessHealth({ firestoreOk: true, heartbeats: allFresh(), nowMs: NOW });
  assert.equal(r.status, "ok");
  assert.ok(Object.values(r.checks).every((s) => s === "ok"));
});

test("Firestore unreachable is down", () => {
  const r = assessHealth({ firestoreOk: false, heartbeats: allFresh(), nowMs: NOW });
  assert.equal(r.status, "down");
  assert.deepEqual(r.checks, { firestore: "down" });
});

test("a job that missed a run is stale and degrades the status", () => {
  const hb = allFresh();
  hb.escalateOverdueReports = { lastSuccessMs: min(41) }; // 2x15 + 10 = 40
  const r = assessHealth({ firestoreOk: true, heartbeats: hb, nowMs: NOW });
  assert.equal(r.checks.escalateOverdueReports, "stale");
  assert.equal(r.status, "degraded");
});

test("a job just inside its window is ok", () => {
  const hb = allFresh();
  hb.escalateOverdueReports = { lastSuccessMs: min(39) };
  hb.archiveOldReports = { lastSuccessMs: min(25 * 60) }; // daily, 2x1440+10
  assert.equal(assessHealth({ firestoreOk: true, heartbeats: hb, nowMs: NOW }).status, "ok");
});

test("a job whose latest run threw is failing", () => {
  const hb = allFresh();
  hb.pagasaRegionalWatch = { lastSuccessMs: min(70), lastErrorMs: min(5) };
  const r = assessHealth({ firestoreOk: true, heartbeats: hb, nowMs: NOW });
  assert.equal(r.checks.pagasaRegionalWatch, "failing");
  assert.equal(r.status, "degraded");
});

test("a job that recovered after an error is ok", () => {
  const hb = allFresh();
  hb.pagasaRegionalWatch = { lastSuccessMs: min(2), lastErrorMs: min(62) };
  assert.equal(assessHealth({ firestoreOk: true, heartbeats: hb, nowMs: NOW }).checks.pagasaRegionalWatch, "ok");
});

test("a job with no heartbeat yet is unknown and does not degrade", () => {
  const hb = allFresh();
  delete hb.deleteOldArchivedReports;
  const r = assessHealth({ firestoreOk: true, heartbeats: hb, nowMs: NOW });
  assert.equal(r.checks.deleteOldArchivedReports, "unknown");
  assert.equal(r.status, "ok");
});

test("every scheduled job in index.js has an expected interval, and no others", () => {
  const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "../index.js"), "utf8");
  const jobs = [...src.matchAll(/^exports\.(\w+) = scheduled\("(\w+)"/gm)];
  for (const [, exported, named] of jobs) assert.equal(exported, named, "heartbeat name matches export");
  assert.deepEqual(jobs.map((m) => m[1]).sort(), Object.keys(JOB_INTERVAL_MIN).sort());
  assert.equal(/= onSchedule\(/.test(src), false, "declare scheduled jobs through scheduled()");
});
