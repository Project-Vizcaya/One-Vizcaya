"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { deletionAudit } = require("./deletion");

const NOW = Date.UTC(2026, 10, 3);
const ago = (months) => ({ toDate: () => new Date(NOW - months * 30.44 * 86400e3) });

test("a deletion through the callable names who and why", () => {
  assert.deepEqual(
    deletionAudit({ deletionRequestedBy: "prov1", deletionReason: "Test entry by trainee", reportedAt: ago(1) }, NOW),
    { cause: "operator_deletion", deletedBy: "prov1", reason: "Test entry by trainee" },
  );
});

test("the stamp wins even on an old report", () => {
  assert.equal(deletionAudit({ deletionRequestedBy: "prov1", reportedAt: ago(30) }, NOW).cause, "operator_deletion");
});

test("an unstamped report past 24 months is the retention purge", () => {
  assert.deepEqual(deletionAudit({ reportedAt: ago(25) }, NOW),
    { cause: "retention_24_months", deletedBy: "system:retention", reason: null });
});

test("an unstamped recent deletion is flagged, not passed off as an operator's", () => {
  assert.deepEqual(deletionAudit({ reportedAt: ago(3) }, NOW),
    { cause: "unattributed", deletedBy: null, reason: null });
  assert.equal(deletionAudit({}, NOW).cause, "unattributed");
});
