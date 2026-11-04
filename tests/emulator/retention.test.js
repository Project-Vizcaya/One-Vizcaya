"use strict";

// Integration test for the retention jobs (P3) against the Firestore emulator.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");

const db = admin.firestore();
const monthsAgo = (m) => { const d = new Date(); d.setMonth(d.getMonth() - m); return admin.firestore.Timestamp.fromDate(d); };
const R = (id) => db.doc(`users/citizen/reports/${id}`);

beforeEach(async () => {
  const snap = await db.collectionGroup("reports").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  await R("oldSolved").set({ status: "solved", reportedAt: monthsAgo(13) });
  await R("oldOpen").set({ status: "ongoing", reportedAt: monthsAgo(13) });
  await R("recent").set({ status: "reported", reportedAt: monthsAgo(2) });
  await R("veryOldArchived").set({ status: "archived", statusBeforeArchive: "closed", reportedAt: monthsAgo(25) });
  await R("veryOldNotArchived").set({ status: "ongoing", reportedAt: monthsAgo(25) });
});
after(() => fft.cleanup());

test("archiving keeps the status each report had", async () => {
  await fft.wrap(fns.archiveOldReports)({});
  const solved = (await R("oldSolved").get()).data();
  assert.equal(solved.status, "archived");
  assert.equal(solved.statusBeforeArchive, "solved");
  assert.ok(solved.archivedAt);
  assert.equal((await R("oldOpen").get()).data().statusBeforeArchive, "ongoing");
  assert.equal((await R("recent").get()).data().status, "reported");
});

test("deletion removes only archived reports past 24 months", async () => {
  await fft.wrap(fns.deleteOldArchivedReports)({});
  assert.equal((await R("veryOldArchived").get()).exists, false);
  assert.equal((await R("veryOldNotArchived").get()).exists, true, "never deleted without the archive step");
  assert.equal((await R("oldSolved").get()).exists, true);
});
