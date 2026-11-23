"use strict";

// Integration test for the Post Maker AI helper's gatekeeping against the
// Firestore emulator. Claude and Secret Manager are replaced by fakes; no
// real API call is made.

const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const fft = require("firebase-functions-test")({ projectId: "demo-onevizcaya" });
const admin = require("firebase-admin");
require("../../apps/functions/index.js");
const { PostAssistService } = require("../../apps/functions/ai/service.js");

const db = admin.firestore();
let key, calls, answer;
const fakeClient = () => ({ beta: { messages: { create: async (params) => { calls.push(params); return answer(); } } } });
const svc = () => new PostAssistService(db, {
  readKey: async () => key, makeClient: fakeClient, now: () => Date.UTC(2026, 10, 23, 2),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
});
const ok = () => ({ stop_reason: "end_turn", model: "claude-opus-5-5",
  content: [{ type: "text", text: JSON.stringify({ headline: "Road closed at Dalton Pass", caption: "Use the bypass. #NuevaVizcaya" }) }] });
const input = { template: "advisory", issuer: "Municipality of Santa Fe", headline: "road closed dalton pass", body: "landslide km 222", lang: "en" };

beforeEach(async () => {
  key = "sk-test"; calls = []; answer = ok;
  for (const c of ["ai_usage", "audit_logs", "config"]) {
    const snap = await db.collection(c).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
});
after(() => fft.cleanup());

test("off without a key, or when switched off; nothing is sent", async () => {
  key = null;
  assert.equal(await svc().available(), false);
  await assert.rejects(svc().draft("m1", "municipal_admin", input), (e) => e.code === "failed-precondition");
  key = "sk-test";
  await db.doc("config/ai").set({ postAssistEnabled: false });
  assert.equal(await svc().available(), false);
  await assert.rejects(svc().draft("m1", "municipal_admin", input), (e) => e.code === "failed-precondition");
  assert.equal(calls.length, 0);
});

test("admins only", async () => {
  for (const role of ["citizen", "barangay_admin", undefined]) {
    await assert.rejects(svc().draft("c1", role, input), (e) => e.code === "permission-denied");
  }
  assert.equal(calls.length, 0);
});

test("a draft comes back, is counted and audited without the text", async () => {
  const r = await svc().draft("m1", "municipal_admin", input);
  assert.equal(r.headline, "Road closed at Dalton Pass");
  assert.equal(r.remainingToday, 29);
  assert.equal(calls[0].model, "claude-opus-5-5");
  const [log] = (await db.collection("audit_logs").get()).docs.map((d) => d.data());
  assert.equal(log.action, "ai_post_draft");
  assert.equal(log.uid, "m1");
  assert.equal(JSON.stringify(log).includes("Dalton"), false, "the text itself is not stored");
  assert.equal((await db.doc("ai_usage/m1_2026-11-23").get()).data().count, 1);
});

test("the daily limit stops the 31st draft before any call", async () => {
  await db.doc("ai_usage/m1_2026-11-23").set({ uid: "m1", count: 30 });
  await assert.rejects(svc().draft("m1", "municipal_admin", input), (e) => e.code === "resource-exhausted");
  assert.equal(calls.length, 0);
  // Another admin is unaffected.
  await svc().draft("m2", "provincial_admin", input);
  assert.equal(calls.length, 1);
});

test("a refusal or a failed call is a clear error, and nothing is audited as a draft", async () => {
  answer = () => ({ stop_reason: "refusal", content: [] });
  await assert.rejects(svc().draft("m1", "municipal_admin", input), (e) => e.code === "failed-precondition");
  answer = () => { throw Object.assign(new Error("overloaded"), { status: 529 }); };
  await assert.rejects(svc().draft("m1", "municipal_admin", input), (e) => e.code === "unavailable");
  assert.equal((await db.collection("audit_logs").get()).size, 0);
});
