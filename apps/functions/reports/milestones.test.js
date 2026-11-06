"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { milestoneUpdates } = require("./milestones");

const T = "T"; // stands in for the change's timestamp
const DEL = "DELETE"; // stands in for FieldValue.delete()
const run = (before, after) => milestoneUpdates(before, after, T, DEL);

test("first response stamps acknowledgedAt", () => {
  assert.deepEqual(run({ status: "reported" }, { status: "acknowledged" }), { acknowledgedAt: T });
  assert.deepEqual(run({ status: "reported" }, { status: "under_review" }), { acknowledgedAt: T });
});

test("closing without action is also a response", () => {
  assert.deepEqual(run({ status: "reported" }, { status: "closed" }), { acknowledgedAt: T });
});

test("acknowledgedAt is never overwritten", () => {
  assert.deepEqual(run({ status: "acknowledged", acknowledgedAt: "old" },
    { status: "ongoing", acknowledgedAt: "old" }), {});
});

test("reports already past 'reported' are not back-filled", () => {
  assert.deepEqual(run({ status: "ongoing" }, { status: "under_review" }), {});
});

test("referral: tier change, responder assignment, or named office", () => {
  assert.deepEqual(run({ status: "acknowledged", handlingLevel: "municipal" },
    { status: "acknowledged", handlingLevel: "provincial" }), { referredAt: T });
  assert.deepEqual(run({ status: "acknowledged" },
    { status: "acknowledged", assignedResponder: "BFP Bambang" }), { referredAt: T });
  assert.deepEqual(run({ status: "acknowledged" },
    { status: "acknowledged", referral: { officeId: "mdrrmo-bambang" } }), { referredAt: T });
});

test("referredAt is stamped once", () => {
  assert.deepEqual(run({ status: "acknowledged", referredAt: "old", handlingLevel: "municipal" },
    { status: "acknowledged", referredAt: "old", handlingLevel: "provincial" }), {});
});

test("solved stamps resolvedAt when the client did not (the web console case)", () => {
  assert.deepEqual(run({ status: "ongoing", acknowledgedAt: "a" },
    { status: "solved", acknowledgedAt: "a" }), { resolvedAt: T });
});

test("a client-written resolvedAt is kept (the mobile case)", () => {
  assert.deepEqual(run({ status: "ongoing", acknowledgedAt: "a" },
    { status: "solved", acknowledgedAt: "a", resolvedAt: "m" }), {});
});

test("re-opening a solved report clears resolvedAt", () => {
  assert.deepEqual(run({ status: "solved", acknowledgedAt: "a", resolvedAt: "r" },
    { status: "under_review", acknowledgedAt: "a", resolvedAt: "r" }), { resolvedAt: DEL });
});

test("a jump straight from reported to solved stamps both", () => {
  assert.deepEqual(run({ status: "reported" }, { status: "solved" }), { acknowledgedAt: T, resolvedAt: T });
});

test("the trigger's own follow-up write is a no-op (no infinite loop)", () => {
  const after = { status: "acknowledged", acknowledgedAt: T };
  assert.deepEqual(run(after, after), {});
});

test("unrelated edits (notes) change nothing", () => {
  assert.deepEqual(run({ status: "ongoing", acknowledgedAt: "a", notes: [] },
    { status: "ongoing", acknowledgedAt: "a", notes: ["x"] }), {});
});
