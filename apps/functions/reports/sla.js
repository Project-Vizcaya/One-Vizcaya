"use strict";

// SLA targets and breach detection (PDRRMO §7 escalation, §14 "acted upon
// within prescribed timelines").
//
// The targets are POLICY, set by the Province, not by the developers. They
// live in Firestore at config/sla, editable by provincial admins. Until real
// numbers are saved, the defaults below apply and are flagged `provisional`,
// so every figure built on them is labelled "provisional — pending PDRRMO
// approval" rather than presented as an official timeline.
//
// Keyed by PRIORITY (assigned by the triage engine), not by category: the old
// per-category table matched no real category name, so every report silently
// fell back to 72 hours. A priority the app does not recognise is treated as
// "low", exactly as the mobile app's ReportPriority.fromString does.
//
// An SLA here is time-to-resolution: an OPEN report older than its target is
// overdue. Closed-without-action and solved reports are never overdue.

const DEFAULT_SLA_HOURS = Object.freeze({ critical: 2, high: 24, medium: 72, low: 168 });
const PRIORITIES = Object.keys(DEFAULT_SLA_HOURS);
const OPEN_STATUSES = Object.freeze(["reported", "acknowledged", "under_review", "ongoing"]);

/**
 * Merges a stored config/sla document over the defaults. Only positive
 * numbers are accepted; anything else keeps the default for that priority.
 * @returns {{hoursByPriority: Record<string, number>, provisional: boolean}}
 */
function resolveSla(config) {
  const hours = { ...DEFAULT_SLA_HOURS };
  const stored = config && typeof config.hoursByPriority === "object" ? config.hoursByPriority : {};
  for (const p of PRIORITIES) {
    const v = stored[p];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) hours[p] = v;
  }
  // Provisional unless a provincial admin has explicitly confirmed the values.
  return { hoursByPriority: hours, provisional: !(config && config.provisional === false) };
}

const priorityOf = (p) => (PRIORITIES.includes(p) ? p : "low");

/**
 * @param {object} report  report data (reportedAt as a Firestore Timestamp or Date)
 * @param {{hoursByPriority: Record<string, number>}} sla
 * @param {number} nowMs
 * @returns {null | {priority: string, hoursAllowed: number, hoursOpen: number, unacknowledged: boolean}}
 *          null when not overdue, not open, or already escalated
 */
function slaBreach(report, sla, nowMs) {
  if (!OPEN_STATUSES.includes(report.status)) return null;
  if (report.slaEscalatedAt) return null; // escalate once per report
  const reported = report.reportedAt?.toDate?.() ?? (report.reportedAt instanceof Date ? report.reportedAt : null);
  if (!reported) return null;
  const priority = priorityOf(report.priority);
  const hoursAllowed = sla.hoursByPriority[priority];
  const hoursOpen = (nowMs - reported.getTime()) / 3600e3;
  if (hoursOpen <= hoursAllowed) return null;
  return {
    priority,
    hoursAllowed,
    hoursOpen,
    unacknowledged: report.status === "reported" && !report.acknowledgedAt,
  };
}

module.exports = { DEFAULT_SLA_HOURS, OPEN_STATUSES, resolveSla, slaBreach, priorityOf };
