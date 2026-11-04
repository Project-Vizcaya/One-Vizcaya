"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { sendWithAccounting, recipientsFrom, BATCH } = require("./delivery");

const ok = { success: true };
const err = (code) => ({ success: false, error: { code } });

function fakeMessaging(responder) {
  const calls = [];
  return {
    calls,
    async sendEachForMulticast(msg) {
      calls.push(msg);
      return { responses: msg.tokens.map(responder) };
    },
  };
}

test("counts delivered and failed, and collects only permanently dead tokens", async () => {
  const codes = {
    a: null,
    b: "messaging/registration-token-not-registered",
    c: "messaging/invalid-registration-token",
    d: "messaging/internal-error",
    e: "messaging/invalid-argument",
  };
  const m = fakeMessaging((t) => (codes[t] ? err(codes[t]) : ok));
  const recips = Object.keys(codes).map((t) => ({ uid: `u_${t}`, token: t }));
  const r = await sendWithAccounting(m, recips, { notification: { title: "x" } });
  assert.equal(r.attempted, 5);
  assert.equal(r.delivered, 1);
  assert.equal(r.failed, 4);
  // A transient or payload error must never delete a user's token.
  assert.deepEqual(r.deadTokens, [{ uid: "u_b", token: "b" }, { uid: "u_c", token: "c" }]);
  assert.deepEqual(m.calls[0].notification, { title: "x" });
});

test("splits into batches of 500 and maps results back to the right user", async () => {
  const recips = Array.from({ length: BATCH + 3 }, (_, i) => ({ uid: `u${i}`, token: `t${i}` }));
  const m = fakeMessaging((t) => (t === `t${BATCH + 1}` ? err("messaging/registration-token-not-registered") : ok));
  const r = await sendWithAccounting(m, recips, {});
  assert.equal(m.calls.length, 2);
  assert.equal(m.calls[0].tokens.length, BATCH);
  assert.equal(m.calls[1].tokens.length, 3);
  assert.equal(r.delivered, BATCH + 2);
  assert.deepEqual(r.deadTokens, [{ uid: `u${BATCH + 1}`, token: `t${BATCH + 1}` }]);
});

test("a refused batch counts as failed but marks no token dead", async () => {
  const m = { async sendEachForMulticast() { throw new Error("quota"); } };
  const r = await sendWithAccounting(m, [{ uid: "u", token: "t" }], {});
  assert.deepEqual(r, { attempted: 1, delivered: 0, failed: 1, deadTokens: [] });
});

test("recipientsFrom skips users without a usable token", () => {
  const docs = [
    { id: "a", data: () => ({ fcmToken: "ta" }) },
    { id: "b", data: () => ({}) },
    { id: "c", data: () => ({ fcmToken: "" }) },
    { id: "d", data: () => ({ fcmToken: null }) },
  ];
  assert.deepEqual(recipientsFrom(docs), [{ uid: "a", token: "ta" }]);
});
