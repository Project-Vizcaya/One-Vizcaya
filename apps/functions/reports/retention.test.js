"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { archiveUpdate, dueForDeletion } = require("./retention");

const NOW = Date.UTC(2026, 10, 4);
const filed = (monthsBack) => {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - monthsBack);
  return { toMillis: () => d.getTime() };
};

test("archives after 12 months, remembering the status it had", () => {
  assert.deepEqual(archiveUpdate({ status: "solved", reportedAt: filed(13) }, NOW),
    { status: "archived", statusBeforeArchive: "solved" });
  assert.deepEqual(archiveUpdate({ status: "reported", reportedAt: filed(13) }, NOW),
    { status: "archived", statusBeforeArchive: "reported" });
  assert.equal(archiveUpdate({ status: "solved", reportedAt: filed(11) }, NOW), null);
  assert.equal(archiveUpdate({ status: "archived", reportedAt: filed(13) }, NOW), null, "already archived");
  assert.equal(archiveUpdate({ status: "solved" }, NOW), null, "no filing date: not guessed");
});

test("deletes only ARCHIVED reports older than 24 months", () => {
  assert.equal(dueForDeletion({ status: "archived", reportedAt: filed(25) }, NOW), true);
  assert.equal(dueForDeletion({ status: "archived", reportedAt: filed(23) }, NOW), false);
  // The old job deleted these too.
  assert.equal(dueForDeletion({ status: "ongoing", reportedAt: filed(25) }, NOW), false);
  assert.equal(dueForDeletion({ status: "solved", reportedAt: filed(30) }, NOW), false);
  assert.equal(dueForDeletion({ status: "archived" }, NOW), false);
});
