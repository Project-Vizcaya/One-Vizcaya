"use strict";

// Integration test for push delivery accounting (P2) on onNewBroadcast and
// onNewAnnouncement, against the Firestore emulator. FCM is replaced by a stub
// that reports a fixed result per token.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");

const db = admin.firestore();
const RESULT = {
  good: { success: true },
  dead: { success: false, error: { code: "messaging/registration-token-not-registered" } },
  busy: { success: false, error: { code: "messaging/server-unavailable" } },
};
let sent;
let beforeSend = async () => {};
// admin.messaging is a read-only getter, so stub the method on the class.
const { Messaging } = require("firebase-admin/messaging");
Messaging.prototype.sendEachForMulticast = async function (msg) {
  await beforeSend();
  sent.push(msg);
  return { responses: msg.tokens.map((t) => RESULT[t.split("-")[0]]) };
};

beforeEach(async () => {
  sent = [];
  beforeSend = async () => {};
  for (const c of ["users", "broadcasts", "announcements"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  await db.doc("users/a").set({ municipality: "Bambang", fcmToken: "good-a" });
  await db.doc("users/b").set({ municipality: "Bambang", fcmToken: "dead-b" });
  await db.doc("users/c").set({ municipality: "Bambang", fcmToken: "busy-c" });
  await db.doc("users/d").set({ municipality: "Bambang" });
  await db.doc("users/e").set({ municipality: "Solano", fcmToken: "good-e" });
});
after(() => fft.cleanup());

async function fire(fn, path, data) {
  await db.doc(path).set(data);
  await fft.wrap(fn)({ data: await db.doc(path).get(), params: {} });
  return (await db.doc(path).get()).data().delivery;
}

test("a town broadcast records delivered/failed counts and prunes only dead tokens", async () => {
  const d = await fire(fns.onNewBroadcast, "broadcasts/b1",
    { title: "Flood watch", body: "Avoid the river.", scope: "municipality", municipality: "Bambang" });
  assert.deepEqual(sent[0].tokens.sort(), ["busy-c", "dead-b", "good-a"]);
  assert.equal(d.attempted, 3);
  assert.equal(d.delivered, 1);
  assert.equal(d.failed, 2);
  assert.equal(d.invalidTokensRemoved, 1);
  assert.ok(d.completedAt);
  assert.equal((await db.doc("users/b").get()).data().fcmToken, undefined, "dead token removed");
  assert.equal((await db.doc("users/c").get()).data().fcmToken, "busy-c", "transient failure keeps token");
});

test("a token the app replaced during the send is not removed", async () => {
  // The app registers a fresh token while the broadcast is going out.
  beforeSend = () => db.doc("users/b").update({ fcmToken: "good-b-new" });
  await fire(fns.onNewBroadcast, "broadcasts/b2",
    { title: "t", body: "b", scope: "municipality", municipality: "Bambang" });
  assert.equal((await db.doc("users/b").get()).data().fcmToken, "good-b-new");
});

test("no recipients still records a delivery of zero", async () => {
  const d = await fire(fns.onNewBroadcast, "broadcasts/b3",
    { title: "t", body: "b", scope: "municipality", municipality: "Kayapa" });
  assert.equal(sent.length, 0);
  assert.deepEqual([d.attempted, d.delivered, d.failed], [0, 0, 0]);
});

test("announcements are accounted for the same way", async () => {
  const d = await fire(fns.onNewAnnouncement, "announcements/a1",
    { title: "Road closed", body: "Use the bypass.", municipality: "Bambang" });
  assert.deepEqual([d.attempted, d.delivered, d.failed, d.invalidTokensRemoved], [3, 1, 2, 1]);
});
