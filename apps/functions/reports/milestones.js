"use strict";

// Report response-timeline milestones (PDRRMO §14 and §8).
//
// PDRRMO's indicators include "response/referral time" and "percentage of
// reports acted upon within prescribed timelines", which were impossible to
// compute: no acknowledgedAt or referredAt existed, and the web console never
// wrote resolvedAt (only the mobile admin app did). These are now stamped
// SERVER-SIDE by one trigger, so every client — web, mobile, future ones — is
// covered and none can skip or back-date them.
//
// Definitions (stamped once, the first time each happens):
//   acknowledgedAt — first human response: status leaves "reported"
//                    (including being closed without action).
//   referredAt     — first referral: routed to another administrative tier,
//                    assigned a responder, or referred to a named office.
//   resolvedAt     — set when status becomes "solved"; cleared if re-opened,
//                    so resolution time always measures the final resolution.
//
// Reports already past these points when this shipped are NOT back-filled:
// the moment they happened was never recorded, and guessing would corrupt
// the very metrics this exists to provide.

/**
 * Pure decision: which milestone fields to write for one update.
 * @param {object} before  report data before the write
 * @param {object} after   report data after the write
 * @param {*} when         timestamp value to store (the change's own time)
 * @param {*} deleteValue  sentinel that deletes a field (FieldValue.delete())
 * @returns {object} fields to update; empty when nothing changes
 */
function milestoneUpdates(before, after, when, deleteValue) {
  const u = {};
  if (!after.acknowledgedAt && before.status === "reported" && after.status && after.status !== "reported") {
    u.acknowledgedAt = when;
  }

  const tierChanged = (after.handlingLevel || null) !== (before.handlingLevel || null);
  const responderAssigned = !!after.assignedResponder && after.assignedResponder !== before.assignedResponder;
  const officeReferred = !!after.referral && JSON.stringify(after.referral) !== JSON.stringify(before.referral || null);
  if (!after.referredAt && (tierChanged || responderAssigned || officeReferred)) {
    u.referredAt = when;
  }

  if (after.status === "solved" && !after.resolvedAt) u.resolvedAt = when;
  if (before.status === "solved" && after.status !== "solved" && after.resolvedAt) u.resolvedAt = deleteValue;
  return u;
}

module.exports = { milestoneUpdates };
