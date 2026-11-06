"use strict";

// Integration tests for the decideAlertDraft callable (P1, PDRRMO §2) against
// the Firestore emulator: real transactions and documents, no mocks of
// Firestore. It is the only path by which an automated weather alert reaches
// the public, so its gate is tested end to end here.

const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

// Must be initialised before requiring the functions so the Admin SDK binds to
// the emulator project (FIRESTORE_EMULATOR_HOST is set by emulators:exec).
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
const fns = require("../../apps/functions/index.js");

const decide = fft.wrap(fns.decideAlertDraft);
const db = admin.firestore();

const USERS = {
  prov: { role: "provincial_admin" },
  muni: { role: "municipal_admin", municipality: "Bambang" },
  muniOther: { role: "municipal_admin", municipality: "Solano" },
  citizen: { role: "citizen", municipality: "Bambang" },
};
const call = (uid, data) => decide({ data, auth: uid ? { uid, token: {} } : undefined });

async function clear() {
  for (const c of ["alert_drafts", "broadcasts", "audit_logs", "users"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

async function seedDraft(id, extra = {}) {
  await db.collection("alert_drafts").doc(id).set({
    title: "🌀 Severe winds expected — Bambang",
    body: "Wind gusts up to about 95 km/h are expected.",
    municipality: "Bambang",
    urgent: true,
    type: "weather",
    source: "windyWindWatch",
    status: "pending",
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 3600e3),
    ...extra,
  });
}

const broadcasts = async () => (await db.collection("broadcasts").get()).docs.map((d) => d.data());
const audits = async () => (await db.collection("audit_logs").get()).docs.map((d) => d.data());

before(async () => { await clear(); });
beforeEach(async () => {
  await clear();
  await Promise.all(Object.entries(USERS).map(([uid, u]) => db.collection("users").doc(uid).set(u)));
});
after(() => fft.cleanup());

const rejectsWith = (code) => (e) => e.code === code;

test("the town's admin approves: broadcast created with approvedBy, draft decided, audited", async () => {
  await seedDraft("d1");
  const r = await call("muni", { draftId: "d1", decision: "approve" });
  assert.equal(r.status, "approved");

  const [b] = await broadcasts();
  assert.equal(b.scope, "Bambang");
  assert.equal(b.urgent, true);
  assert.equal(b.approvedBy, "muni");
  assert.equal(b.draftId, "d1");

  const d = (await db.collection("alert_drafts").doc("d1").get()).data();
  assert.equal(d.status, "approved");
  assert.equal(d.decidedBy, "muni");
  assert.equal(d.broadcastId, r.broadcastId);

  const [a] = await audits();
  assert.equal(a.action, "automated_alert_approved");
  assert.equal(a.decidedBy, "muni");
});

test("a provincial admin may approve any town's draft", async () => {
  await seedDraft("d1");
  await call("prov", { draftId: "d1", decision: "approve" });
  assert.equal((await broadcasts()).length, 1);
});

test("another town's admin is refused and nothing is sent", async () => {
  await seedDraft("d1");
  await assert.rejects(call("muniOther", { draftId: "d1", decision: "approve" }), rejectsWith("permission-denied"));
  assert.equal((await broadcasts()).length, 0);
  assert.equal((await db.collection("alert_drafts").doc("d1").get()).data().status, "pending");
});

test("a citizen is refused", async () => {
  await seedDraft("d1");
  await assert.rejects(call("citizen", { draftId: "d1", decision: "approve" }), rejectsWith("permission-denied"));
  assert.equal((await broadcasts()).length, 0);
});

test("unauthenticated callers are refused", async () => {
  await seedDraft("d1");
  await assert.rejects(call(null, { draftId: "d1", decision: "approve" }), rejectsWith("unauthenticated"));
});

test("a draft can be decided only once", async () => {
  await seedDraft("d1");
  await call("muni", { draftId: "d1", decision: "approve" });
  await assert.rejects(call("prov", { draftId: "d1", decision: "approve" }), rejectsWith("failed-precondition"));
  assert.equal((await broadcasts()).length, 1, "no second broadcast");
});

test("an expired draft cannot be approved (a stale weather alert must not go out late)", async () => {
  await seedDraft("d1", { expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() - 1000) });
  await assert.rejects(call("muni", { draftId: "d1", decision: "approve" }), rejectsWith("failed-precondition"));
  assert.equal((await broadcasts()).length, 0);
});

test("rejection sends nothing, records the note, and is audited", async () => {
  await seedDraft("d1");
  await call("muni", { draftId: "d1", decision: "reject", note: "Gusts already easing per MDRRMO." });
  assert.equal((await broadcasts()).length, 0);
  const d = (await db.collection("alert_drafts").doc("d1").get()).data();
  assert.equal(d.status, "rejected");
  assert.equal(d.note, "Gusts already easing per MDRRMO.");
  assert.equal((await audits())[0].action, "automated_alert_rejected");
});

test("invalid input is refused", async () => {
  await assert.rejects(call("muni", { draftId: "d1", decision: "send" }), rejectsWith("invalid-argument"));
  await assert.rejects(call("muni", { decision: "approve" }), rejectsWith("invalid-argument"));
  await assert.rejects(call("muni", { draftId: "missing", decision: "approve" }), rejectsWith("not-found"));
});

// ── second approver for admin alerts (P2) ──────────────────────────────────

const propose = fft.wrap(fns.proposeAdminAlert);
const proposeAs = (uid, data) => propose({ data, auth: { uid, token: {} } });
const drafts = async () => (await db.collection("alert_drafts").get()).docs;

test("an urgent town alert waits for a second admin, then goes out", async () => {
  await db.doc("users/muni2").set({ role: "municipal_admin", municipality: "Bambang" });
  const { draftId } = await proposeAs("muni",
    { title: "Evacuate Purok 3", body: "River rising fast; go to the school.", urgent: true, municipality: "Bambang" });
  assert.equal((await broadcasts()).length, 0, "nothing sent on one person's say-so");
  const d = (await db.doc(`alert_drafts/${draftId}`).get()).data();
  assert.equal(d.requestedBy, "muni");
  assert.equal(d.status, "pending");

  await assert.rejects(call("muni", { draftId, decision: "approve" }), rejectsWith("permission-denied"));
  await assert.rejects(call("muniOther", { draftId, decision: "approve" }), rejectsWith("permission-denied"));
  await call("muni2", { draftId, decision: "approve" });

  const [b] = await broadcasts();
  assert.equal(b.scope, "Bambang");
  assert.equal(b.urgent, true);
  assert.equal(b.sentBy, "muni");
  assert.equal(b.approvedBy, "muni2");
  const actions = (await audits()).map((a) => a.action).sort();
  assert.deepEqual(actions, ["admin_alert_approved", "admin_alert_proposed"]);
});

test("a province-wide alert needs a second PROVINCIAL admin and goes out with scope 'all'", async () => {
  await db.doc("users/prov2").set({ role: "provincial_admin" });
  const { draftId } = await proposeAs("prov", { title: "Typhoon signal no. 2", body: "Prepare and stay indoors.", urgent: false });
  await assert.rejects(call("muni", { draftId, decision: "approve" }), rejectsWith("permission-denied"));
  await assert.rejects(call("prov", { draftId, decision: "approve" }), rejectsWith("permission-denied"));
  await call("prov2", { draftId, decision: "approve" });
  const [b] = await broadcasts();
  assert.equal(b.scope, "all");
});

test("the proposer can withdraw their own alert", async () => {
  const { draftId } = await proposeAs("muni", { title: "Test alert", body: "Sent by mistake.", urgent: true, municipality: "Bambang" });
  await call("muni", { draftId, decision: "reject", note: "Sent by mistake" });
  assert.equal((await db.doc(`alert_drafts/${draftId}`).get()).data().status, "rejected");
  assert.equal((await broadcasts()).length, 0);
});

test("proposals are scope-checked and only for alerts that need approval", async () => {
  await assert.rejects(proposeAs("muni", { title: "Hello all", body: "Province-wide please.", urgent: false }),
    rejectsWith("permission-denied"));
  await assert.rejects(proposeAs("muni", { title: "Solano alert", body: "Not my town.", urgent: true, municipality: "Solano" }),
    rejectsWith("permission-denied"));
  await assert.rejects(proposeAs("citizen", { title: "Fake alert", body: "Not an admin.", urgent: true, municipality: "Bambang" }),
    rejectsWith("permission-denied"));
  await assert.rejects(proposeAs("muni", { title: "Routine", body: "Water interruption.", urgent: false, municipality: "Bambang" }),
    rejectsWith("invalid-argument"));
  assert.equal((await drafts()).length, 0);
});
