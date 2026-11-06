"use strict";

// Health assessment for the public `health` endpoint (P2, PDRRMO uptime).
//
// Each scheduled job writes a heartbeat (system_health/{job}) when it runs. A
// job is "stale" when its last success is older than twice its interval plus
// slack, i.e. it has missed at least one run. A job with no heartbeat yet is
// "unknown" (e.g. a daily job just after deployment) and does not fail the
// check. Firestore being unreachable is "down".

const MIN = 60e3;

// Expected interval of every scheduled job, in minutes. Keep in step with the
// `schedule` of each job in index.js.
const JOB_INTERVAL_MIN = {
  escalateOverdueReports: 15,
  pagasaRegionalWatch: 60,
  rainfallWatch: 180,
  windyWindWatch: 180,
  resetRateLimits: 1440,
  archiveOldReports: 1440,
  deleteOldArchivedReports: 1440,
};
const SLACK_MIN = 10;

/**
 * @param {{firestoreOk: boolean,
 *          heartbeats: Record<string, {lastSuccessMs?: number|null, lastErrorMs?: number|null}>,
 *          nowMs: number}} input
 * @returns {{status: "ok"|"degraded"|"down",
 *            checks: Record<string, "ok"|"stale"|"failing"|"unknown"|"down">}}
 */
function assessHealth({ firestoreOk, heartbeats, nowMs }) {
  const checks = { firestore: firestoreOk ? "ok" : "down" };
  if (!firestoreOk) return { status: "down", checks };

  let degraded = false;
  for (const [job, interval] of Object.entries(JOB_INTERVAL_MIN)) {
    const hb = heartbeats[job];
    const ok = hb?.lastSuccessMs ?? null;
    const err = hb?.lastErrorMs ?? null;
    let state;
    if (ok === null && err === null) state = "unknown";
    else if (err !== null && (ok === null || err > ok)) state = "failing";
    else if (nowMs - ok > (2 * interval + SLACK_MIN) * MIN) state = "stale";
    else state = "ok";
    if (state === "failing" || state === "stale") degraded = true;
    checks[job] = state;
  }
  return { status: degraded ? "degraded" : "ok", checks };
}

module.exports = { assessHealth, JOB_INTERVAL_MIN };
