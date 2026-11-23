"use strict";

// Integration test for notifyOnStatusChange: the reporter's inbox entry is
// written server-side (clients may no longer write into other users' inboxes).

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");

const db = admin.firestore();
const run = fft.wrap(fns.notifyOnStatusChange);
const PATH = "users/citizen/reports/r1";
const base = { category: "Flooding", municipality: "Bambang", isAnonymous: false };
const inbox = async () => (await db.collection("users/citizen/notifications").get()).docs.map((d) => d.data());
const fire = (before, afterData, id) => run({
  id, params: { userId: "citizen", reportId: "r1" },
  data: fft.makeChange(fft.firestore.makeDocumentSnapshot({ ...base, ...before }, PATH),
    fft.firestore.makeDocumentSnapshot({ ...base, ...afterData }, PATH)),
});

beforeEach(async () => {
  const snap = await db.collection("users/citizen/notifications").get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});
after(() => fft.cleanup());

test("a status change writes one inbox entry, even if the event is delivered twice", async () => {
  await fire({ status: "reported" }, { status: "ongoing" }, "evt-1");
  await fire({ status: "reported" }, { status: "ongoing" }, "evt-1");
  const n = await inbox();
  assert.equal(n.length, 1);
  assert.equal(n[0].title, "Report In Progress");
  assert.equal(n[0].reportId, "r1");
  assert.equal(n[0].reportStatus, "ongoing");
  assert.equal(n[0].read, false);
});

test("a closed report names the category of the reason, not the admin's note", async () => {
  await fire({ status: "reported" },
    { status: "closed", disposition: "duplicate", dispositionReason: "internal note about the reporter" }, "evt-2");
  const [n] = await inbox();
  assert.match(n.body, /closed without action \(duplicate\)/i);
  assert.equal(n.body.includes("internal note"), false);
});

test("no entry when the status did not change, for anonymous reports, or on archiving", async () => {
  await fire({ status: "ongoing" }, { status: "ongoing", priority: "high" }, "evt-3");
  await fire({ status: "reported", isAnonymous: true }, { status: "ongoing", isAnonymous: true }, "evt-4");
  await fire({ status: "solved" }, { status: "archived" }, "evt-5");
  assert.equal((await inbox()).length, 0);
});
