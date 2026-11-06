"use strict";

// Second approver for admin alerts (P2, PDRRMO §2).
//
// An admin-composed alert that is URGENT (sound, full-screen takeover) or
// PROVINCE-WIDE (reaches everyone) is not sent on one person's say-so. It is
// stored as a pending draft and needs approval by a DIFFERENT admin who is in
// scope for it. Routine single-town alerts still go out directly.
//
// Automated weather drafts (no requester) keep their existing rule: any
// in-scope admin may approve.

const PROVINCIAL_ROLES = ["admin", "provincial_admin", "super_admin"];

/** @param {{urgent?: boolean, municipality?: string|null}} a */
function needsSecondApprover(a) {
  return a.urgent === true || !a.municipality;
}

/** May this caller propose an alert for `municipality` (null = province-wide)? */
function canPropose(role, profileMunicipality, municipality) {
  if (PROVINCIAL_ROLES.includes(role)) return true;
  return role === "municipal_admin" && !!profileMunicipality && !!municipality &&
    profileMunicipality === municipality;
}

/**
 * Why this caller may NOT make this decision on this draft, or null if they may.
 * @param {object} d  the draft
 * @param {{uid: string, role: string, profileMunicipality?: string,
 *          decision: "approve"|"reject", nowMs: number}} c
 * @returns {null | {code: string, message: string}}
 */
function decisionError(d, c) {
  if (d.status !== "pending") {
    return { code: "failed-precondition", message: `This alert was already ${d.status}.` };
  }
  const isRequester = !!d.requestedBy && d.requestedBy === c.uid;
  // The proposer may always withdraw their own alert.
  if (isRequester && c.decision === "reject") return null;

  const provinceWide = !d.municipality;
  const inScope = PROVINCIAL_ROLES.includes(c.role) ||
    (!provinceWide && c.role === "municipal_admin" && !!c.profileMunicipality &&
      c.profileMunicipality === d.municipality);
  if (!inScope) {
    return {
      code: "permission-denied",
      message: provinceWide
        ? "Only a provincial admin can decide a province-wide alert."
        : "Only an admin for this municipality can decide this alert.",
    };
  }
  if (c.decision === "approve") {
    if (isRequester) {
      return {
        code: "permission-denied",
        message: "A second admin must approve this alert; you cannot approve your own.",
      };
    }
    if (d.expiresAt && d.expiresAt.toMillis() < c.nowMs) {
      return {
        code: "failed-precondition",
        message: "This draft has expired; conditions may have changed, so it was not sent.",
      };
    }
  }
  return null;
}

module.exports = { needsSecondApprover, canPropose, decisionError, PROVINCIAL_ROLES };
