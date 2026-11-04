"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveSla, slaBreach, DEFAULT_SLA_HOURS } = require("./sla");

const NOW = Date.UTC(2026, 10, 3, 12);
const hoursAgo = (h) => new Date(NOW - h * 3600e3);
const SLA = resolveSla(null);

test("with no config, the defaults apply and are provisional", () => {
  assert.deepEqual(SLA.hoursByPriority, DEFAULT_SLA_HOURS);
  assert.equal(SLA.provisional, true);
});

test("saved values override defaults; only explicit confirmation drops 'provisional'", () => {
  const s = resolveSla({ hoursByPriority: { critical: 1, high: 12 } });
  assert.equal(s.hoursByPriority.critical, 1);
  assert.equal(s.hoursByPriority.medium, DEFAULT_SLA_HOURS.medium);
  assert.equal(s.provisional, true);
  assert.equal(resolveSla({ hoursByPriority: {}, provisional: false }).provisional, false);
});

test("invalid stored values are ignored, not trusted", () => {
  const s = resolveSla({ hoursByPriority: { critical: -5, high: "24", medium: 0, low: NaN } });
  assert.deepEqual(s.hoursByPriority, DEFAULT_SLA_HOURS);
});

test("an open report past its priority's target is overdue", () => {
  const b = slaBreach({ status: "reported", priority: "critical", reportedAt: hoursAgo(3) }, SLA, NOW);
  assert.equal(b.priority, "critical");
  assert.equal(b.hoursAllowed, 2);
  assert.equal(b.unacknowledged, true);
});

test("within target is not overdue", () => {
  assert.equal(slaBreach({ status: "ongoing", priority: "high", reportedAt: hoursAgo(23) }, SLA, NOW), null);
});

test("solved and closed-without-action reports are never overdue", () => {
  for (const status of ["solved", "closed", "archived"]) {
    assert.equal(slaBreach({ status, priority: "critical", reportedAt: hoursAgo(100) }, SLA, NOW), null);
  }
});

test("each report escalates once", () => {
  assert.equal(slaBreach({ status: "reported", priority: "critical", reportedAt: hoursAgo(9),
    slaEscalatedAt: "already" }, SLA, NOW), null);
});

test("an acknowledged report can still be overdue, but is not 'unacknowledged'", () => {
  const b = slaBreach({ status: "acknowledged", priority: "critical", reportedAt: hoursAgo(3),
    acknowledgedAt: "t" }, SLA, NOW);
  assert.equal(b.unacknowledged, false);
});

test("an unknown priority (e.g. legacy 'normal') is treated as low, like the app", () => {
  assert.equal(slaBreach({ status: "reported", priority: "normal", reportedAt: hoursAgo(100) }, SLA, NOW), null);
  assert.equal(slaBreach({ status: "reported", priority: "normal", reportedAt: hoursAgo(200) }, SLA, NOW).priority, "low");
});

test("Firestore Timestamps are accepted", () => {
  const ts = { toDate: () => hoursAgo(3) };
  assert.ok(slaBreach({ status: "reported", priority: "critical", reportedAt: ts }, SLA, NOW));
});
