"use strict";

// What the audit log records when a report document is deleted (PDRRMO §8, §3).
//
// A Firestore delete trigger carries no caller identity, so deletions are
// routed through the deleteReportWithReason callable, which verifies the
// caller and stamps deletionRequestedBy / deletionReason onto the report just
// before deleting it. The trigger then reads them from the deleted document's
// final snapshot. firestore.rules forbids client-side deletes, so for app
// users that callable is the only route.
//
// Anything deleted WITHOUT that stamp is not guessed at:
//   - older than 24 months -> the RA 10173 retention purge (the only other
//     deleter, and it deletes nothing younger);
//   - otherwise -> "unattributed", e.g. a deletion through the Firebase
//     console. That is flagged for follow-up rather than called an operator
//     deletion with no operator.

const RETENTION_MONTHS = 24;

/**
 * @param {object} data   the deleted report's final data
 * @param {number} nowMs  current time, ms
 * @returns {{cause: string, deletedBy: string|null, reason: string|null}}
 */
function deletionAudit(data, nowMs) {
  if (data.deletionRequestedBy) {
    return {
      cause: "operator_deletion",
      deletedBy: data.deletionRequestedBy,
      reason: data.deletionReason || null,
    };
  }
  const reportedAt = data.reportedAt?.toDate?.() ?? null;
  const ageMonths = reportedAt
    ? (nowMs - reportedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    : null;
  if (ageMonths !== null && ageMonths >= RETENTION_MONTHS) {
    return { cause: "retention_24_months", deletedBy: "system:retention", reason: null };
  }
  return { cause: "unattributed", deletedBy: null, reason: null };
}

module.exports = { deletionAudit, RETENTION_MONTHS };
