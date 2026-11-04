"use strict";

// Report retention (RA 10173; README "Defined retention"). Two nightly jobs:
//   archiveOldReports       — 12 months after filing: status -> "archived",
//                             keeping the status it had in statusBeforeArchive
//                             (solved / closed / never resolved).
//   deleteOldArchivedReports — 24 months after filing: deletes ARCHIVED
//                             reports only.
// The delete job used to delete every report older than 24 months whatever
// its status, so a report that had somehow not been archived (e.g. the
// archive job failing for a while) would be deleted without ever being
// archived first. Now deletion requires the archive step to have happened.

const ARCHIVE_AFTER_MONTHS = 12;
const DELETE_AFTER_MONTHS = 24;

const monthsAgo = (nowMs, months) => {
  const d = new Date(nowMs);
  d.setMonth(d.getMonth() - months);
  return d.getTime();
};
const filedMs = (data) =>
  data.reportedAt && typeof data.reportedAt.toMillis === "function" ? data.reportedAt.toMillis() : null;

/** Fields to write when archiving, or null if this report is not due. */
function archiveUpdate(data, nowMs) {
  const t = filedMs(data);
  if (t === null || t >= monthsAgo(nowMs, ARCHIVE_AFTER_MONTHS)) return null;
  if (data.status === "archived") return null;
  return { status: "archived", statusBeforeArchive: data.status || null };
}

/** True when this report is due for deletion. */
function dueForDeletion(data, nowMs) {
  const t = filedMs(data);
  return data.status === "archived" && t !== null && t < monthsAgo(nowMs, DELETE_AFTER_MONTHS);
}

module.exports = { archiveUpdate, dueForDeletion, ARCHIVE_AFTER_MONTHS, DELETE_AFTER_MONTHS };
