"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { needsSecondApprover, canPropose, decisionError } = require("./approval");

const NOW = 1_000_000;
const ts = (ms) => ({ toMillis: () => ms });
const draft = (x = {}) => ({ status: "pending", municipality: "Bambang", expiresAt: ts(NOW + 1), ...x });
const by = (uid, role, town, decision = "approve") => ({ uid, role, profileMunicipality: town, decision, nowMs: NOW });

test("urgent or province-wide needs a second approver; routine town alerts do not", () => {
  assert.equal(needsSecondApprover({ urgent: true, municipality: "Bambang" }), true);
  assert.equal(needsSecondApprover({ urgent: false, municipality: null }), true);
  assert.equal(needsSecondApprover({ urgent: false, municipality: "Bambang" }), false);
});

test("who may propose", () => {
  assert.equal(canPropose("provincial_admin", "", null), true);
  assert.equal(canPropose("municipal_admin", "Bambang", "Bambang"), true);
  assert.equal(canPropose("municipal_admin", "Bambang", "Solano"), false);
  assert.equal(canPropose("municipal_admin", "Bambang", null), false, "town admin cannot go province-wide");
  assert.equal(canPropose("municipal_admin", "", ""), false);
  assert.equal(canPropose("citizen", "Bambang", "Bambang"), false);
});

test("the proposer cannot approve their own alert, but can withdraw it", () => {
  const d = draft({ requestedBy: "a", urgent: true });
  assert.equal(decisionError(d, by("a", "municipal_admin", "Bambang")).code, "permission-denied");
  assert.equal(decisionError(d, by("a", "provincial_admin", "")).code, "permission-denied");
  assert.equal(decisionError(d, by("a", "municipal_admin", "Bambang", "reject")), null);
});

test("a second in-scope admin can approve", () => {
  const d = draft({ requestedBy: "a", urgent: true });
  assert.equal(decisionError(d, by("b", "municipal_admin", "Bambang")), null);
  assert.equal(decisionError(d, by("p", "provincial_admin", "")), null);
  assert.equal(decisionError(d, by("c", "municipal_admin", "Solano")).code, "permission-denied");
});

test("only provincial admins can decide a province-wide alert", () => {
  const d = draft({ requestedBy: "p1", municipality: null });
  assert.equal(decisionError(d, by("m", "municipal_admin", "Bambang")).code, "permission-denied");
  assert.equal(decisionError(d, by("p2", "provincial_admin", "")), null);
});

test("automated drafts (no requester) keep the one-approver rule", () => {
  assert.equal(decisionError(draft(), by("m", "municipal_admin", "Bambang")), null);
});

test("expired and already-decided drafts are refused", () => {
  assert.equal(decisionError(draft({ expiresAt: ts(NOW - 1) }), by("m", "municipal_admin", "Bambang")).code,
    "failed-precondition");
  assert.equal(decisionError(draft({ status: "approved" }), by("m", "municipal_admin", "Bambang")).code,
    "failed-precondition");
  // Rejecting an expired draft (dismissing it) is still allowed.
  assert.equal(decisionError(draft({ expiresAt: ts(NOW - 1) }), by("m", "municipal_admin", "Bambang", "reject")), null);
});
