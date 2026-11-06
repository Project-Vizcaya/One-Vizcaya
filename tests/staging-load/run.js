#!/usr/bin/env node
"use strict";

// Load test for a STAGING Firebase project (P2, PDRRMO §12). Measures what the
// emulator cannot: real Firestore write latency and real Cloud Function
// trigger latency in the deployed region, plus the public health endpoint.
//
// SAFETY
//  - Refuses the production project (one-vizcaya-app). Use a separate project
//    with the same rules, indexes and functions deployed.
//  - Writes only synthetic users "loadtest_<run>_<n>" and their reports, each
//    tagged loadTest: <run>, and deletes them (and their rate-limit docs)
//    afterwards unless --keep is given.
//  - Never writes broadcasts or announcements, so no phone receives a push.
//  - Uses the Admin SDK, which bypasses security rules: rules evaluation time
//    is not included (the emulator suite covers rules correctness).
//
// USAGE
//   cd tests/staging-load && npm install
//   GOOGLE_APPLICATION_CREDENTIALS=staging-sa.json \
//     node run.js --project one-vizcaya-staging [--reports 300] [--concurrency 25]
//                 [--region us-central1] [--health 30] [--keep] [--skip-triggers]
// Also runs against the Firestore emulator (FIRESTORE_EMULATOR_HOST) with
// --skip-triggers --health 0, to check the script itself.

const admin = require("firebase-admin");

const PRODUCTION = "one-vizcaya-app";

function args(argv) {
  const out = { reports: 300, concurrency: 25, region: "us-central1", health: 30, keep: false, skipTriggers: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--project") out.project = next();
    else if (a === "--reports") out.reports = Number(next());
    else if (a === "--concurrency") out.concurrency = Number(next());
    else if (a === "--region") out.region = next();
    else if (a === "--health") out.health = Number(next());
    else if (a === "--keep") out.keep = true;
    else if (a === "--skip-triggers") out.skipTriggers = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};
const summary = (label, xs, extra = "") =>
  console.log(`${label.padEnd(34)} n=${String(xs.length).padStart(4)}  p50=${pct(xs, 50)} ms  p95=${pct(xs, 95)} ms  max=${pct(xs, 100)} ms${extra}`);

async function pool(items, size, fn) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

async function waitFor(check, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await check()) return Date.now() - t0;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function main() {
  const o = args(process.argv.slice(2));
  if (!o.project) throw new Error("--project <staging project id> is required.");
  if (o.project === PRODUCTION) {
    throw new Error(`Refusing to load-test the production project "${PRODUCTION}". Use a staging project.`);
  }
  if (!(o.reports > 0 && o.concurrency > 0)) throw new Error("--reports and --concurrency must be positive.");

  admin.initializeApp({ projectId: o.project });
  const db = admin.firestore();
  const run = `${Date.now().toString(36)}`;
  const uid = (i) => `loadtest_${run}_${i}`;
  console.log(`Project ${o.project} · run ${run} · ${o.reports} reports at concurrency ${o.concurrency}` +
    (process.env.FIRESTORE_EMULATOR_HOST ? " · EMULATOR" : ""));

  const ids = Array.from({ length: o.reports }, (_, i) => i);
  const failures = [];

  // 1. Synthetic citizens.
  for (let i = 0; i < ids.length; i += 400) {
    const b = db.batch();
    ids.slice(i, i + 400).forEach((n) => b.set(db.doc(`users/${uid(n)}`), {
      role: "citizen", municipality: "Load Test", residencyStatus: "certified", loadTest: run,
    }));
    await b.commit();
  }

  // 2. Report-creation burst: write latency.
  const writeMs = (await pool(ids, o.concurrency, async (n) => {
    const t0 = performance.now();
    try {
      await db.doc(`users/${uid(n)}/reports/r1`).set({
        userId: uid(n), userPhone: "+639000000000", isAnonymous: false,
        municipality: "Load Test", barangay: "Load Test", category: "Other",
        description: "Synthetic load-test report. Safe to delete.",
        status: "reported", priority: "low", loadTest: run,
        reportedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return performance.now() - t0;
    } catch (e) {
      failures.push(`create ${n}: ${e.message}`);
      return null;
    }
  })).filter((x) => x !== null);
  summary("Report create (write latency)", writeMs);

  if (!o.skipTriggers) {
    // 3. Create-trigger latency: trackSubReportRate writes rate_limits/{uid}.
    const sample = ids.slice(0, Math.min(50, ids.length));
    const createTrig = await pool(sample, 10, (n) =>
      waitFor(async () => (await db.doc(`rate_limits/${uid(n)}`).get()).exists, 60e3));
    summary("Create trigger (until rate_limits)", createTrig.filter((x) => x !== null),
      `  timeouts=${createTrig.filter((x) => x === null).length}`);

    // 4. Update-trigger latency: stampReportMilestones sets acknowledgedAt.
    const ackTrig = await pool(sample, 10, async (n) => {
      const ref = db.doc(`users/${uid(n)}/reports/r1`);
      await ref.update({ status: "acknowledged" });
      return waitFor(async () => !!(await ref.get()).data()?.acknowledgedAt, 60e3);
    });
    summary("Update trigger (until acknowledgedAt)", ackTrig.filter((x) => x !== null),
      `  timeouts=${ackTrig.filter((x) => x === null).length}`);
  }

  // 5. Health endpoint.
  if (o.health > 0) {
    const url = `https://${o.region}-${o.project}.cloudfunctions.net/health`;
    const codes = {};
    const healthMs = [];
    for (let i = 0; i < o.health; i++) {
      const t0 = performance.now();
      try {
        const r = await fetch(url, { cache: "no-store" });
        codes[r.status] = (codes[r.status] || 0) + 1;
        healthMs.push(performance.now() - t0);
      } catch (e) {
        codes.error = (codes.error || 0) + 1;
      }
    }
    summary("GET /health", healthMs, `  status=${JSON.stringify(codes)}`);
  }

  // 6. Clean up everything this run wrote.
  if (!o.keep) {
    for (let i = 0; i < ids.length; i += 130) {
      const b = db.batch();
      ids.slice(i, i + 130).forEach((n) => {
        b.delete(db.doc(`users/${uid(n)}/reports/r1`));
        b.delete(db.doc(`users/${uid(n)}`));
        b.delete(db.doc(`rate_limits/${uid(n)}`));
      });
      await b.commit();
    }
    console.log(`Cleaned up ${ids.length} synthetic users and reports. ` +
      "onReportDeleted records each deletion as 'unattributed' in staging audit_logs (expected).");
  } else {
    console.log(`Kept data. Remove with: users/loadtest_${run}_* (field loadTest == "${run}").`);
  }

  if (failures.length) {
    console.error(`${failures.length} failure(s):\n  ${failures.slice(0, 10).join("\n  ")}`);
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
