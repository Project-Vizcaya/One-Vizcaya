// DEPLOYMENT: requires Firebase Blaze (pay-as-you-go) plan.
// Run: cd functions && npm install && firebase deploy --only functions
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// ── Scheduled-job heartbeats (P2, uptime) ────────────────────────────────────
// Every scheduled job is declared through scheduled(), which records when it
// last succeeded or threw in system_health/{job}. The public `health` endpoint
// reads these to tell whether a job has stopped running.
const { assessHealth, JOB_INTERVAL_MIN } = require("./health/health");

function scheduled(name, opts, handler) {
  return onSchedule(opts, async (event) => {
    const ref = admin.firestore().collection("system_health").doc(name);
    const now = () => admin.firestore.FieldValue.serverTimestamp();
    try {
      const out = await handler(event);
      await ref.set({ lastSuccessAt: now() }, { merge: true })
        .catch((e) => console.error(`heartbeat ${name}:`, e));
      return out;
    } catch (e) {
      await ref.set({ lastErrorAt: now(), lastError: String(e?.message ?? e).slice(0, 300) }, { merge: true })
        .catch((e2) => console.error(`heartbeat ${name}:`, e2));
      throw e;
    }
  });
}

// ── Audit trail: record account deletions ────────────────────────────────────
// When a citizen deletes their account the app removes their profile but
// ARCHIVES (retains) their reports as official LGU records (PPDO requirement).
// This trigger records the deletion immutably in audit_logs.
exports.onUserDeleted = onDocumentDeleted("users/{userId}", async (event) => {
  const uid = event.params.userId;
  const data = (event.data && event.data.data()) || {};
  await admin.firestore().collection("audit_logs").add({
    action: "account_deleted",
    targetUid: uid,
    reporterName: data.name || null,
    municipality: data.municipality || null,
    note: "Personal profile removed; reports retained and archived as LGU records.",
    at: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ── Residency certification: apply an admin's decision server-side ───────────
// When a Barangay/Municipal admin approves (or rejects) a residency request,
// this trigger sets the citizen's residencyStatus = 'certified' (only the
// server may grant 'certified') and writes an append-only audit entry.
exports.onResidencyDecision = onDocumentUpdated(
  "verificationRequests/{reqId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return; // only on the decision change
    if (after.status !== "approved" && after.status !== "rejected") return;

    const db = admin.firestore();
    if (after.status === "approved" && after.uid) {
      await db.collection("users").doc(after.uid).set({
        residencyStatus: "certified",
        verifiedBy: after.decidedBy || null,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        verifiedBarangay: after.barangay || null,
      }, { merge: true });
    }
    await db.collection("audit_logs").add({
      action: after.status === "approved" ? "residency_certified" : "residency_rejected",
      targetUid: after.uid || null,
      municipality: after.municipality || null,
      barangay: after.barangay || null,
      decidedBy: after.decidedBy || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// ── Audit trail: record Municipal → Provincial escalation approvals ──────────
// Writes an immutable audit_logs entry whenever a report is approved for
// escalation (escalatedToProvince flips false → true), capturing who approved
// it and when — the auditable Municipal → Provincial handoff (gov review #2).
exports.auditEscalationApproval = onDocumentUpdated(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    if (before.escalatedToProvince === true || after.escalatedToProvince !== true) {
      return; // only on the false → true approval transition
    }
    await admin.firestore().collection("audit_logs").add({
      action: "escalation_approved",
      reportId: event.params.reportId,
      reportOwnerUid: event.params.userId,
      municipality: after.municipality || null,
      approvedBy: after.escalatedBy || null,
      category: after.category || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// ── Audit trail: record report dispositions (PDRRMO §8) ──────────────────────
// A report closed without action (false / duplicate / incomplete /
// unverifiable) — or re-opened — gets an immutable audit entry. Unlike a
// Firestore delete, this CAN name the actor: firestore.rules requires
// dispositionBy to equal the acting admin's own uid.
const DISPOSITION_LABELS = {
  false_report: "false report",
  duplicate: "duplicate",
  incomplete: "incomplete",
  unverifiable: "could not be verified",
};

exports.auditReportDisposition = onDocumentUpdated(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    const was = before.disposition || null;
    const now = after.disposition || null;
    if (was === now && before.dispositionReason === after.dispositionReason) return;

    await admin.firestore().collection("audit_logs").add({
      action: now ? "report_disposed" : "report_reopened",
      reportId: event.params.reportId,
      reportOwnerUid: event.params.userId,
      municipality: after.municipality || null,
      category: after.category || null,
      disposition: now,
      previousDisposition: was,
      reason: now ? after.dispositionReason || null : null,
      duplicateOf: now === "duplicate" ? after.duplicateOf || null : null,
      // Both are rule-enforced to be the acting admin's own uid.
      decidedBy: now ? after.dispositionBy || null : after.reopenedBy || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// ── Referral to a named office (P2, PDRRMO) ─────────────────────────────────
// Every set or change of `referral` is audited, so the full referral history
// survives a re-referral (the report keeps only the current one).
// firestore.rules require referral.by == the acting admin and referral.at ==
// the server time, and do not allow a referral to be removed.
exports.auditReportReferral = onDocumentUpdated(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after || !after.referral) return;
    if (JSON.stringify(before.referral || null) === JSON.stringify(after.referral)) return;
    const r = after.referral;
    await admin.firestore().collection("audit_logs").add({
      action: before.referral ? "report_rereferred" : "report_referred",
      reportId: event.params.reportId,
      reportOwnerUid: event.params.userId,
      municipality: after.municipality || null,
      category: after.category || null,
      officeType: r.officeType || null,
      officeName: r.officeName || null,
      contact: r.contact || null,
      note: r.note || null,
      previousOffice: before.referral
        ? `${before.referral.officeType || ""} ${before.referral.officeName || ""}`.trim()
        : null,
      referredBy: r.by || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// ── Response timeline: acknowledgedAt / referredAt / resolvedAt (§14) ────────
// Stamped server-side for every client; see ./reports/milestones.js for the
// exact definitions. The time stored is when the change itself happened
// (event.time), not when this trigger happened to run.
const { milestoneUpdates } = require("./reports/milestones");

exports.stampReportMilestones = onDocumentUpdated(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    const when = admin.firestore.Timestamp.fromDate(new Date(event.time));
    const u = milestoneUpdates(before, after, when, admin.firestore.FieldValue.delete());
    // Only writes when a milestone is missing, so its own follow-up update
    // is a no-op rather than a loop.
    if (Object.keys(u).length) await event.data.after.ref.update(u);
  }
);

// ── Escalation of overdue reports (PDRRMO §7, §14) ───────────────────────────
// Every 15 minutes, finds OPEN reports past their SLA target (config/sla, see
// ./reports/sla.js) and alerts the responsible admins once per report: the
// town's municipal admins always, and provincial admins too for critical and
// high priority — or when the town has no municipal admin to receive it.
// Each escalation is stamped on the report (slaEscalatedAt) and audited.
// While the targets are still the provisional defaults, the alert says so.
const { resolveSla, slaBreach, OPEN_STATUSES } = require("./reports/sla");
// Bounds one run's time; oldest first, so the worst cases go first. In the
// emulator load test (tests/emulator/load) 2000 overdue reports clear in one
// run in under a second, far inside the 120 s timeout.
const ESCALATIONS_PER_RUN = 5000;
// Up to this many newly overdue reports per town per run get one push each
// (linked to the report); more than that get ONE summary push for the town,
// so a disaster backlog does not bury admins in hundreds of notifications.
const PER_REPORT_PUSH_MAX = 3;

exports.escalateOverdueReports = scheduled("escalateOverdueReports", 
  { schedule: "every 15 minutes", timeZone: "Asia/Manila", timeoutSeconds: 120 },
  async () => {
    const db = admin.firestore();
    const sla = resolveSla((await db.doc("config/sla").get()).data());
    // Uses the existing (status, reportedAt) collection-group index.
    const snap = await db.collectionGroup("reports")
      .where("status", "in", OPEN_STATUSES)
      .orderBy("reportedAt")
      .get();
    const now = Date.now();

    // Group newly overdue reports by town and by tier of who is alerted.
    const groups = new Map();
    let total = 0;
    for (const d of snap.docs) {
      if (total >= ESCALATIONS_PER_RUN) break;
      const r = d.data();
      const b = slaBreach(r, sla, now);
      if (!b) continue;
      total++;
      const urgentTier = b.priority === "critical" || b.priority === "high";
      const key = `${r.municipality || ""}|${urgentTier}`;
      if (!groups.has(key)) groups.set(key, { municipality: r.municipality || null, urgentTier, items: [] });
      groups.get(key).items.push({ d, r, b });
    }

    const openFor = (h) => (h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`);
    const send = (tokens, msg) => (async () => {
      for (let i = 0; i < tokens.length; i += 500) {
        await admin.messaging().sendEachForMulticast({ ...msg, tokens: tokens.slice(i, i + 500) });
      }
    })();

    for (const g of groups.values()) {
      try {
        let tokens = await adminTokensFor(db, g.municipality, { includeProvincial: g.urgentTier });
        if (!tokens.length && !g.urgentTier) tokens = await adminTokensFor(db, g.municipality);
        const android = {
          priority: "high",
          notification: { channelId: g.urgentTier ? "one_vizcaya_urgent" : "one_vizcaya_reports" },
        };
        const town = g.municipality || "Nueva Vizcaya";
        if (g.items.length <= PER_REPORT_PUSH_MAX) {
          for (const { d, r, b } of g.items) {
            const body = `${r.category || "A report"} in ${town} has been open ${openFor(b.hoursOpen)} ` +
              `(target ${b.hoursAllowed} h${sla.provisional ? ", provisional" : ""}).` +
              (b.unacknowledged ? " No one has responded yet." : "");
            await send(tokens, {
              notification: { title: `Overdue ${b.priority} report`, body },
              data: { type: "report_overdue", reportId: d.id, userId: d.ref.parent.parent.id },
              android,
            });
          }
        } else {
          const n = g.items.length;
          const silent = g.items.filter((x) => x.b.unacknowledged).length;
          const oldest = Math.max(...g.items.map((x) => x.b.hoursOpen));
          await send(tokens, {
            notification: {
              title: `${n} ${g.urgentTier ? "high-priority " : ""}reports overdue in ${town}`,
              body: `Oldest open ${openFor(oldest)}.` +
                (silent ? ` ${silent} not yet responded to.` : "") +
                (sla.provisional ? " Targets are provisional." : ""),
            },
            data: { type: "report_overdue_summary", municipality: g.municipality || "", count: String(n) },
            android,
          });
        }

        // Stamp and audit every report, batched (2 writes each).
        for (let i = 0; i < g.items.length; i += 200) {
          const batch = db.batch();
          for (const { d, r, b } of g.items.slice(i, i + 200)) {
            batch.update(d.ref, {
              slaEscalatedAt: admin.firestore.FieldValue.serverTimestamp(),
              slaHoursAllowed: b.hoursAllowed,
            });
            batch.set(db.collection("audit_logs").doc(), {
              action: "report_sla_breached",
              reportId: d.id,
              reportOwnerUid: d.ref.parent.parent.id,
              municipality: r.municipality || null,
              priority: b.priority,
              hoursAllowed: b.hoursAllowed,
              hoursOpen: Math.round(b.hoursOpen * 10) / 10,
              unacknowledged: b.unacknowledged,
              slaProvisional: sla.provisional,
              notifiedAdmins: tokens.length,
              summarised: g.items.length > PER_REPORT_PUSH_MAX,
              at: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          await batch.commit();
        }
      } catch (e) {
        // Not stamped, so the next run retries this group.
        console.error(`escalateOverdueReports ${g.municipality} failed:`, e);
      }
    }
    if (total) console.log(`escalateOverdueReports: escalated ${total} report(s) in ${groups.size} group(s).`);
  }
);

// ── Notify citizen when report status changes ────────────────────────────────
exports.notifyOnStatusChange = onDocumentUpdated(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (!before || !after) return;
    if (before.status === after.status) return;

    const userId = event.params.userId;
    const isAnonymous = after.isAnonymous === true;
    if (isAnonymous) return; // no notification for anonymous reports

    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) return;

    const fcmToken = userDoc.data().fcmToken;
    if (!fcmToken) return;

    const statusLabels = {
      reported: "Reported",
      acknowledged: "Acknowledged",
      under_review: "Under Review",
      ongoing: "In Progress",
      solved: "Resolved",
      closed: "Closed",
    };

    const newLabel = statusLabels[after.status] || after.status;
    const category = after.category || "Your report";
    // A closed report tells the reporter WHY in plain terms (the category
    // only — the admin's free-text reason may hold internal notes), and how
    // to object, rather than implying it was resolved.
    const body = after.status === "closed"
      ? `${category} was closed without action (${DISPOSITION_LABELS[after.disposition] || "closed"}). ` +
        "If you believe this is a mistake, contact your LGU."
      : `${category} is now marked as "${newLabel}" by the LGU.`;

    const message = {
      token: fcmToken,
      notification: {
        title: `Report Status Updated: ${newLabel}`,
        body,
      },
      data: {
        reportId: event.params.reportId,
        newStatus: after.status,
      },
      android: {
        priority: "high",
        notification: { channelId: "report_updates" },
      },
    };

    try {
      await admin.messaging().send(message);
    } catch (err) {
      console.error("FCM send failed:", err.message);
    }
  }
);

// ── Rate limiting: track sub-collection report submissions ──────────────────
exports.trackSubReportRate = onDocumentCreated(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const userId = event.params.userId;
    const rateLimitRef = admin.firestore().collection("rate_limits").doc(userId);

    return admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);

      if (!doc.exists) {
        transaction.set(rateLimitRef, {
          count: 1,
          lastReset: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const docData = doc.data();
        const lastReset = docData.lastReset ? docData.lastReset.toDate() : new Date();
        const hoursSinceReset = Math.abs(new Date() - lastReset) / 36e5;

        if (hoursSinceReset > 24) {
          transaction.set(rateLimitRef, {
            count: 1,
            lastReset: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.update(rateLimitRef, { count: (docData.count || 0) + 1 });
        }
      }
    });
  }
);

// ── Reset rate limits daily at midnight Manila time ──────────────────────────
exports.resetRateLimits = scheduled("resetRateLimits", 
  { schedule: "0 0 * * *", timeZone: "Asia/Manila" },
  async () => {
    const db = admin.firestore();
    const snapshot = await db.collection("rate_limits").get();
    if (snapshot.empty) return;

    // Use rolling batches to stay under Firestore's 500-write limit
    let batch = db.batch();
    let count = 0;
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      if (count >= 490) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
    console.log(`Reset ${snapshot.size} rate limit records`);
  }
);

// Canonical role set. The legacy 'admin' role is RETIRED — it is no longer
// assignable; any legacy 'admin' account is migrated to 'provincial_admin'
// (see migrateLegacyAdmins). Kept out of VALID_ROLES so it can't be re-granted.
const VALID_ROLES = [
  "citizen",
  "barangay_admin",
  "municipal_admin",
  "provincial_admin",
  "super_admin",
];

// Apply a role to a user everywhere it must live: the Auth custom claim (drives
// security-rule checks fast) and the Firestore profile (source of truth + UI).
async function applyRole(uid, role, municipality, barangay) {
  await admin.auth().setCustomUserClaims(uid, { role });
  const profile = { role };
  if (municipality !== undefined && municipality !== null) {
    profile.municipality = municipality;
  }
  // Barangay only means anything for a barangay_admin; clear it otherwise so a
  // re-scoped account never keeps a stale barangay grant.
  profile.barangay = role === "barangay_admin" ? barangay || "" : null;
  await admin.firestore().collection("users").doc(uid).set(profile, { merge: true });
}

// Resolve the caller's effective role the same way the Firestore security rules'
// role() helper does: trust the Auth custom claim first (fast, no read), but fall
// back to the users/{uid} profile document when the claim is missing. Roles can
// be set by a direct Firestore write (which never touches the custom claim), so a
// legitimate super_admin may have role only in their profile until their next
// token refresh — without this fallback those accounts are locked out of every
// admin-only callable, including the very ones (setAdminRole/migrateLegacyAdmins)
// that would repair their claim. Returns null when neither source has a role.
async function resolveCallerRole(request) {
  const claimRole = request.auth?.token?.role;
  if (claimRole) return claimRole;
  const uid = request.auth?.uid;
  if (!uid) return null;
  const doc = await admin.firestore().collection("users").doc(uid).get();
  return doc.exists ? doc.data()?.role ?? null : null;
}

// ── Set Admin Role (direct) ──────────────────────────────────────────────────
// Direct role assignment is now a SUPER-ADMIN-only power. Everyone below the
// super admin must go through the nominate → approve workflow (roleRequests +
// onRoleRequestDecision). This keeps a single accountable approver for every
// elevation and prevents a provincial admin from unilaterally minting admins.
exports.setAdminRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if ((await resolveCallerRole(request)) !== "super_admin") {
    throw new HttpsError(
      "permission-denied",
      "Only a super admin may assign roles directly. Use nominate → approve."
    );
  }

  const { uid, role, municipality, barangay } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "UID is required.");
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Invalid role: ${role}`);
  }

  await applyRole(uid, role, municipality, barangay);
  await admin.firestore().collection("audit_logs").add({
    action: "role_assigned_direct",
    targetUid: uid,
    role,
    municipality: municipality || null,
    barangay: barangay || null,
    decidedBy: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { message: `User ${uid} role set to ${role}.` };
});

// ── Role-request approval (#8: nominate → super-admin approval) ───────────────
// An admin NOMINATES a user for a role by creating a roleRequests document
// (status 'pending'). A super_admin approves or rejects it. Firestore rules
// forbid clients from writing the user's `role` field directly — the role only
// changes here, server-side, when a request is approved. That gives every
// elevation a single accountable approver and an immutable audit trail.
exports.onRoleRequestDecision = onDocumentUpdated(
  "roleRequests/{reqId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return; // only on the decision change
    if (after.status !== "approved" && after.status !== "rejected") return;

    const db = admin.firestore();
    if (
      after.status === "approved" &&
      after.targetUid &&
      VALID_ROLES.includes(after.requestedRole)
    ) {
      await applyRole(
        after.targetUid,
        after.requestedRole,
        after.municipality,
        after.barangay
      );
    }
    await db.collection("audit_logs").add({
      action: after.status === "approved" ? "role_request_approved" : "role_request_rejected",
      targetUid: after.targetUid || null,
      role: after.requestedRole || null,
      municipality: after.municipality || null,
      barangay: after.barangay || null,
      nominatedBy: after.nominatedBy || null,
      decidedBy: after.decidedBy || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);

// ── One-time migration: retire the legacy 'admin' role ───────────────────────
// Promotes every remaining role:'admin' account to 'provincial_admin' (same
// authority the rules always gave it) in both the Auth claim and the profile.
// Super-admin only; safe to re-run (idempotent).
exports.migrateLegacyAdmins = onCall(async (request) => {
  if (!request.auth || (await resolveCallerRole(request)) !== "super_admin") {
    throw new HttpsError("permission-denied", "Super admin only.");
  }
  const db = admin.firestore();
  const snap = await db.collection("users").where("role", "==", "admin").get();
  let migrated = 0;
  for (const d of snap.docs) {
    await applyRole(d.id, "provincial_admin", d.data().municipality, null);
    migrated++;
  }
  await db.collection("audit_logs").add({
    action: "legacy_admin_migration",
    count: migrated,
    decidedBy: request.auth.uid,
    at: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { migrated };
});

// ── Auto-archive reports older than 12 months ───────────────────────────────
// Runs daily at 2 AM Manila time. Marks reports with reportedAt > 12 months
// as 'archived' so they no longer appear in active admin views.
const { archiveUpdate, dueForDeletion, reportPhotoPathOk } = require("./reports/retention");

exports.archiveOldReports = scheduled("archiveOldReports", 
  { schedule: "0 2 * * *", timeZone: "Asia/Manila" },
  async () => {
    const db = admin.firestore();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

    // Firestore allows an inequality on only ONE field per query, so we filter
    // by reportedAt in the query and exclude already-archived docs in code.
    const snapshot = await db
      .collectionGroup("reports")
      .where("reportedAt", "<", cutoffTs)
      .get();

    // Rule (and statusBeforeArchive) in ./reports/retention.js.
    const nowMs = Date.now();
    const toArchive = snapshot.docs
      .map((d) => ({ ref: d.ref, update: archiveUpdate(d.data(), nowMs) }))
      .filter((x) => x.update);

    if (toArchive.length === 0) {
      console.log("archiveOldReports: nothing to archive");
      return;
    }

    // Use rolling batches to stay under Firestore's 500-write limit
    let batch = db.batch();
    let count = 0;
    for (const doc of toArchive) {
      batch.update(doc.ref, {
        ...doc.update,
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      if (count >= 490) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
    console.log(`archiveOldReports: archived ${toArchive.length} reports`);
  }
);

/**
 * Sends a push notification via FCM when a new notification document
 * is created in users/{userId}/notifications/{notifId}.
 */
exports.onNewNotification = onDocumentCreated(
  "users/{userId}/notifications/{notifId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const userId = event.params.userId;

    // Get the user's FCM token
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return;

    const fcmToken = userDoc.data()?.fcmToken;
    if (!fcmToken) return;

    const title = data.title || "One Vizcaya Update";
    const body = data.body || "";

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        android: {
          notification: {
            channelId: "one_vizcaya_reports",
            priority: "high",
            color: "#2E7D32",
          },
        },
        data: {
          type: data.type || "notification",
          reportId: data.reportId || "",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });
    } catch (e) {
      console.error("FCM send failed:", e);
    }
  }
);

// ── Push delivery accounting (P2) ───────────────────────────────────────────
const { sendWithAccounting, recipientsFrom } = require("./messaging/delivery");

// Writes the per-alert delivery counts onto the alert document and removes
// tokens FCM reported as permanently dead, so future alerts do not keep
// counting them as failures. A token is removed only if the profile still holds
// that same token (the app may have registered a new one in the meantime).
async function finishDelivery(ref, result) {
  const db = admin.firestore();
  await ref.update({
    delivery: {
      attempted: result.attempted,
      delivered: result.delivered,
      failed: result.failed,
      invalidTokensRemoved: result.deadTokens.length,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  });
  for (const { uid, token } of result.deadTokens) {
    const userRef = db.collection("users").doc(uid);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (snap.exists && snap.data().fcmToken === token) {
        tx.update(userRef, { fcmToken: admin.firestore.FieldValue.delete() });
      }
    }).catch((e) => console.error(`Could not prune token for ${uid}:`, e));
  }
}

/**
 * Sends a push notification to all users in a municipality
 * when a broadcast document is created.
 */
exports.onNewBroadcast = onDocumentCreated(
  "broadcasts/{broadcastId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { title, body, scope, municipality, urgent } = data;
    if (!title || !body) return;

    const db = admin.firestore();

    // Resolve the target municipality across all writers:
    //   • admin composer: scope="all" (province-wide) or scope="municipality" + municipality field
    //   • rainfallWatch:  scope=<municipality name>
    //   • legacy:         scope="All Province"
    let targetMuni = null;
    if (municipality) {
      targetMuni = municipality;
    } else if (
      scope &&
      !["all", "All Province", "municipality"].includes(scope)
    ) {
      targetMuni = scope; // scope is itself a municipality name
    }

    // Firestore can't combine an inequality (fcmToken != null) with an equality
    // on a different field without a composite index, so for a scoped broadcast
    // we filter by municipality and drop token-less users in code below.
    const query = targetMuni
      ? db.collection("users").where("municipality", "==", targetMuni)
      : db.collection("users").where("fcmToken", "!=", null);

    const usersSnap = await query.get();
    const recipients = recipientsFrom(usersSnap.docs);

    // Distinguish an urgent broadcast in the notification tray: a 🚨 URGENT
    // title prefix, and routing to the dedicated high-importance "urgent"
    // channel the app registers (heads-up banner + sound + vibration + red
    // accent). Routine broadcasts stay on the calm "broadcasts" channel.
    // The raw title/body are still sent in the data payload so the in-app
    // presenter can render its own urgent takeover without the prefix.
    const pushTitle = urgent ? `🚨 URGENT · ${title}` : title;

    // Batches of 500 (FCM limit) and per-token accounting: messaging/delivery.js.
    const result = await sendWithAccounting(admin.messaging(), recipients, {
      notification: { title: pushTitle, body },
      // Data payload lets the app recognise a broadcast: in the foreground it
      // presents the in-app urgent takeover / heads-up banner (and suppresses
      // the generic toast), and a tray tap opens the same presentation.
      data: {
        type: "broadcast",
        urgent: urgent ? "true" : "false",
        title: String(title),
        body: String(body),
      },
      android: {
        priority: "high",
        notification: {
          channelId: urgent ? "one_vizcaya_urgent" : "one_vizcaya_broadcasts",
          notificationPriority: urgent ? "PRIORITY_MAX" : "PRIORITY_HIGH",
          visibility: "public",
          defaultSound: true,
          color: urgent ? "#8B0000" : "#1B5E20",
        },
      },
    });
    await finishDelivery(event.data.ref, result);
  }
);

/**
 * Sends a push notification when a new announcement is posted, so citizens are
 * alerted the same way they are for report updates and broadcasts. Targets the
 * announcement's municipality (or every user when municipality == "All").
 * The announcement itself is the record — the mobile inbox reads it directly,
 * so no per-user notification documents are fanned out here.
 */
exports.onNewAnnouncement = onDocumentCreated(
  "announcements/{announcementId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const title = data.title;
    const body = data.body;
    const municipality = data.municipality || "All";
    if (!title) return;

    const db = admin.firestore();

    // Province-wide → every user with a token; otherwise only that town's users.
    // Match "all" case-insensitively (web writes "all", seed data uses "All").
    const isAllScope = String(municipality).toLowerCase() === "all";
    const query = isAllScope
      ? db.collection("users").where("fcmToken", "!=", null)
      : db.collection("users").where("municipality", "==", municipality);

    const usersSnap = await query.get();
    const recipients = recipientsFrom(usersSnap.docs);

    const isUrgent = data.isUrgent === true;
    // Urgent announcements get the same tray distinction as urgent broadcasts:
    // a 🚨 URGENT title prefix and routing to the high-importance "urgent"
    // channel (heads-up + sound + red accent). Routine announcements land on
    // the calm "announcements" channel.
    const pushTitle = isUrgent ? `🚨 URGENT · ${title}` : title;
    const pushBody = (body || "").slice(0, 240);

    const result = await sendWithAccounting(admin.messaging(), recipients, {
      notification: { title: pushTitle, body: pushBody },
      android: {
        priority: "high",
        notification: {
          channelId: isUrgent ? "one_vizcaya_urgent" : "one_vizcaya_announcements",
          notificationPriority: isUrgent ? "PRIORITY_MAX" : "PRIORITY_DEFAULT",
          visibility: "public",
          defaultSound: true,
          color: isUrgent ? "#8B0000" : "#1B5E20",
        },
      },
      data: {
        type: "announcement",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
    });
    await finishDelivery(event.data.ref, result);
  }
);

// ── Emergency SOS: alert responders the instant a beacon is created ──────────
// When a citizen presses SOS, push a high-priority notification to every admin
// who can act on it — provincial/super admins (province-wide), the municipal
// admin of the caller's town, and the barangay admin of the caller's barangay —
// so dispatch starts immediately instead of waiting for someone to be watching
// a screen. The push carries the coordinates so it can deep-link to the map.
exports.onSosAlertCreated = onDocumentCreated(
  "sos_alerts/{alertId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const db = admin.firestore();
    const municipality = data.municipality || "";
    const barangay = data.barangay || "";
    const uid = data.uid;
    const alertRef = event.data.ref;

    // ── Soft anti-abuse flag (never blocks; operators still verify) ──────────
    // Flag this beacon if the person is firing SOS in rapid succession or has a
    // history of false/abuse dispositions. Flagged alerts are shown last and
    // marked "verify before dispatch" — a real emergency is never dropped.
    let flagReason = null;
    try {
      // Burst detection: > 3 SOS within a 10-minute rolling window.
      const rateRef = db.collection("sos_rate").doc(uid);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(rateRef);
        const now = Date.now();
        const winMs = 10 * 60 * 1000;
        const d = snap.exists ? snap.data() : null;
        const start = d && d.windowStart ? d.windowStart.toMillis() : 0;
        let count = d ? d.count || 0 : 0;
        if (now - start < winMs) {
          count += 1;
        } else {
          count = 1;
        }
        tx.set(rateRef, {
          count,
          windowStart: now - start < winMs && d && d.windowStart
            ? d.windowStart
            : admin.firestore.FieldValue.serverTimestamp(),
          lastAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        if (count > 3) flagReason = "rapid repeated SOS";
      });

      // Prior-abuse history on the citizen's profile.
      if (!flagReason && uid) {
        const u = (await db.collection("users").doc(uid).get()).data() || {};
        if (u.sosFlagged === true || (u.sosAbuseCount || 0) >= 2) {
          flagReason = "prior false / abuse reports";
        }
      }
    } catch (e) {
      console.error("SOS anti-abuse check failed (fail-open):", e);
    }
    if (flagReason) {
      await alertRef.set({ flagged: true, flagReason }, { merge: true })
        .catch((e) => console.error("SOS flag write failed:", e));
    }

    // Admin roles are held by very few users, so query by role and filter scope
    // in memory — avoids scanning a whole town's citizens.
    const [provSnap, muniSnap, brgySnap] = await Promise.all([
      db.collection("users")
        .where("role", "in", ["provincial_admin", "admin", "super_admin"]).get(),
      db.collection("users").where("role", "==", "municipal_admin").get(),
      db.collection("users").where("role", "==", "barangay_admin").get(),
    ]);

    const tokens = new Set();
    provSnap.forEach((d) => { if (d.data().fcmToken) tokens.add(d.data().fcmToken); });
    muniSnap.forEach((d) => {
      const u = d.data();
      if (u.fcmToken && u.municipality === municipality) tokens.add(u.fcmToken);
    });
    brgySnap.forEach((d) => {
      const u = d.data();
      if (u.fcmToken && u.municipality === municipality &&
          (u.barangay || "") === barangay) {
        tokens.add(u.fcmToken);
      }
    });

    const list = Array.from(tokens);
    if (list.length === 0) {
      console.log("SOS created but no responder tokens in scope.");
      return;
    }

    const where = [
      barangay ? `Brgy. ${barangay}` : null,
      municipality || null,
    ].filter(Boolean).join(", ");
    const title = flagReason ? "⚠ SOS (flagged — verify)" : "🚨 EMERGENCY SOS";
    const body = `${data.name || "A resident"} needs help${where ? ` in ${where}` : ""}. `
      + (flagReason ? `Flagged (${flagReason}) — verify first.` : "Tap to verify & dispatch.");

    for (let i = 0; i < list.length; i += 500) {
      await admin.messaging().sendEachForMulticast({
        tokens: list.slice(i, i + 500),
        notification: { title, body },
        android: {
          priority: "high",
          notification: {
            // An SOS is always time-critical — use the high-importance urgent
            // channel so responders get a heads-up banner + sound + red accent.
            channelId: "one_vizcaya_urgent",
            notificationPriority: "PRIORITY_MAX",
            visibility: "public",
            defaultSound: true,
            color: "#C62828",
          },
        },
        data: {
          type: "sos_alert",
          alertId: event.params.alertId,
          lat: data.lat != null ? String(data.lat) : "",
          lng: data.lng != null ? String(data.lng) : "",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      }).catch((e) => console.error("SOS FCM batch failed:", e));
    }
  }
);

// ── SOS abuse accounting ─────────────────────────────────────────────────────
// When an operator closes an SOS as 'abuse', increment that citizen's abuse
// tally; once it reaches the threshold the profile is flagged so their FUTURE
// SOS are auto-marked "verify first" (they are never blocked — an operator
// still checks every one, guarding against false positives). Every decision is
// audited.
exports.onSosAlertUpdated = onDocumentUpdated(
  "sos_alerts/{alertId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    if (before.disposition === after.disposition) return; // only on decision
    const uid = after.uid;
    if (!uid) return;

    const db = admin.firestore();
    if (after.disposition === "abuse") {
      const userRef = db.collection("users").doc(uid);
      const newCount = await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const c = ((snap.data() || {}).sosAbuseCount || 0) + 1;
        tx.set(userRef, {
          sosAbuseCount: c,
          sosFlagged: c >= 2, // auto-flag once a pattern emerges
        }, { merge: true });
        return c;
      });
      await db.collection("audit_logs").add({
        action: "sos_marked_abuse",
        targetUid: uid,
        alertId: event.params.alertId,
        municipality: after.municipality || null,
        abuseCount: newCount,
        decidedBy: after.resolvedBy || null,
        at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

/**
 * Interim "Import from link" helper for announcements. Given a public post URL
 * (e.g. the Governor's Office Facebook page, a news site, or a gov advisory),
 * fetches the page server-side (avoids browser CORS) and returns its Open Graph
 * metadata so an admin can review and publish it as an announcement with one
 * click — no manual retyping. This does NOT auto-post; a human still confirms.
 *
 * NOTE: this reads a page's public preview tags (the same thing a link preview
 * in Messenger/Viber does). The full Graph-API integration that auto-syncs an
 * official Page comes later, once the project has an approved government
 * contract and Page access.
 */
const { previewUrlAllowed } = require("./links/preview");

exports.fetchLinkPreview = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  // Admins only (it serves the announcement composer), public https hosts
  // only, with a time and size limit: otherwise any signed-in user could use
  // the server to fetch arbitrary or internal addresses.
  const callerRole = await resolveCallerRole(request);
  if (!["municipal_admin", "admin", "provincial_admin", "super_admin"].includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can fetch link previews.");
  }
  const url = String(request.data?.url || "").trim();
  if (!previewUrlAllowed(url)) {
    throw new HttpsError("invalid-argument", "Enter a valid public https link.");
  }

  let html = "";
  try {
    // Follow at most 3 redirects by hand, re-checking each hop, so a public
    // page cannot redirect the server to an internal address.
    let target = url;
    let resp;
    for (let hop = 0; ; hop++) {
      resp = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OneVizcayaBot/1.0; +https://nuevavizcaya.gov.ph)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      if (resp.status < 300 || resp.status >= 400) break;
      const next = new URL(resp.headers.get("location") || "", target).toString();
      if (hop >= 3 || !previewUrlAllowed(next)) throw new Error("redirect not allowed");
      target = next;
    }
    html = (await resp.text()).slice(0, 500000);
  } catch (e) {
    console.error("fetchLinkPreview error:", e);
    throw new HttpsError("unavailable", "Could not fetch that link.");
  }

  const decode = (s) =>
    (s || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&nbsp;/gi, " ")
      // Any remaining decimal / hex numeric entity → its character.
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/\s+/g, " ")
      .trim();

  // Read a meta tag's content in either attribute order. The closing quote is
  // matched with a backreference (\1) so a value that contains the *other*
  // quote — e.g. content="Mayor's office announced…" — is captured in full
  // instead of being truncated at the first apostrophe (the N4 bug).
  const meta = (prop) => {
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*?content=(["'])([\\s\\S]*?)\\1`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=(["'])([\\s\\S]*?)\\1[^>]*?(?:property|name)=["']${prop}["']`,
        "i"
      ),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m) return decode(m[2]);
    }
    return "";
  };

  const titleTag = () => {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? decode(m[1]) : "";
  };

  // Last-resort body: pull the first few real paragraphs from the article so a
  // news link still fills the message even when the page ships no
  // og:description / twitter:description (common on some CMSs).
  const firstParagraphs = () => {
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ");
    const ps = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => decode(m[1].replace(/<[^>]+>/g, " ")))
      .filter((t) => t.length > 40);
    return ps.slice(0, 3).join("\n\n");
  };

  let siteName = meta("og:site_name");
  if (!siteName) {
    try {
      siteName = new URL(url).hostname.replace(/^www\./i, "");
    } catch (_) {
      siteName = "";
    }
  }

  return {
    title: meta("og:title") || meta("twitter:title") || titleTag(),
    description:
      meta("og:description") ||
      meta("twitter:description") ||
      meta("description") ||
      firstParagraphs(),
    image: meta("og:image") || meta("og:image:url") || meta("twitter:image"),
    siteName,
    url: meta("og:url") || url,
  };
});

// Municipality coordinates — mirror of the mobile WeatherService list, used by
// the scheduled rainfall watch below.
const NV_MUNICIPALITY_COORDS = {
  Bambang: [16.3833, 121.0667],
  Bayombong: [16.4833, 121.15],
  Solano: [16.5167, 121.1833],
  Aritao: [16.3, 121.0333],
  Bagabag: [16.5833, 121.2333],
  Villaverde: [16.65, 121.2667],
  Diadi: [16.6, 121.3],
  Quezon: [16.2333, 121.0167],
  "Santa Fe": [16.1667, 120.9833],
  Ambaguio: [16.2167, 121.1167],
  Kasibu: [16.3167, 121.2667],
  "Dupax del Norte": [16.5, 121.1],
  "Dupax del Sur": [16.4667, 121.0833],
  "Alfonso Castañeda": [16.1833, 121.2167],
  Kayapa: [16.35, 120.9167],
};

// ── Automated alerts need a human (PDRRMO §2) ───────────────────────────────
// The 29 Sept reply to the PA commits that "no alert or public announcement
// should go out through One Vizcaya unless it has first been reviewed and
// approved by an authorized PDRRMO or municipal officer". The weather watchers
// previously wrote straight to `broadcasts`, which onNewBroadcast pushes to the
// public immediately — including PRIORITY_MAX urgent alerts. They now write a
// DRAFT here; nothing reaches the public until an in-scope admin approves it
// through decideAlertDraft. In-scope admins are pushed an "approval needed"
// notice (admins only, never the public).
const ALERT_DRAFT_TTL_MS = 6 * 60 * 60 * 1000; // a stale weather alert must not go out late
const { needsSecondApprover, canPropose, decisionError, PROVINCIAL_ROLES } = require("./alerts/approval");

async function draftAutomatedAlert(db, { title, body, municipality, urgent, source, evidence }) {
  const ref = await db.collection("alert_drafts").add({
    title,
    body,
    municipality,
    urgent: urgent === true,
    type: "weather",
    source,
    // The readings that triggered it, so the approver can judge it.
    evidence: evidence || null,
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ALERT_DRAFT_TTL_MS),
  });
  await notifyAdminsOfDraft(db, ref.id, municipality, title, urgent === true)
    .catch((e) => console.error("draft notification failed:", e));
  return ref.id;
}

// FCM tokens of the admins responsible for a municipality: its municipal
// admins, plus provincial-tier admins when includeProvincial is set.
async function adminTokensFor(db, municipality, { includeProvincial = true } = {}) {
  const [provSnap, muniSnap] = await Promise.all([
    includeProvincial
      ? db.collection("users").where("role", "in", PROVINCIAL_ROLES).get()
      : Promise.resolve({ forEach: () => {} }),
    db.collection("users").where("role", "==", "municipal_admin").get(),
  ]);
  const tokens = new Set();
  provSnap.forEach((d) => { if (d.data().fcmToken) tokens.add(d.data().fcmToken); });
  muniSnap.forEach((d) => {
    const u = d.data();
    if (u.fcmToken && u.municipality === municipality) tokens.add(u.fcmToken);
  });
  return Array.from(tokens);
}

async function notifyAdminsOfDraft(db, draftId, municipality, title, urgent, { kind = "automated", excludeToken = null } = {}) {
  const list = (await adminTokensFor(db, municipality)).filter((t) => t !== excludeToken);
  const who = kind === "admin" ? "a second admin" : "an admin";
  for (let i = 0; i < list.length; i += 500) {
    await admin.messaging().sendEachForMulticast({
      tokens: list.slice(i, i + 500),
      notification: {
        title: `Approval needed: ${kind} ${urgent ? "URGENT " : ""}${municipality ? "" : "province-wide "}alert`,
        body: `${title} — not sent to the public until ${who} approves it.`,
      },
      data: { type: "alert_draft", draftId },
      android: {
        priority: "high",
        notification: { channelId: urgent ? "one_vizcaya_urgent" : "one_vizcaya_broadcasts" },
      },
    });
  }
}

// Approve or reject a pending automated alert. Approval creates the broadcast
// (which onNewBroadcast then delivers) with approvedBy set; both outcomes are
// audited. Runs in a transaction so a draft can be decided exactly once.
exports.decideAlertDraft = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const { draftId, decision, note } = request.data || {};
  if (typeof draftId !== "string" || !["approve", "reject"].includes(decision)) {
    throw new HttpsError("invalid-argument", "draftId and decision (approve|reject) are required.");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();
  const role = await resolveCallerRole(request);
  const profile = (await db.collection("users").doc(uid).get()).data() || {};
  const cleanNote = typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : null;

  return db.runTransaction(async (tx) => {
    const ref = db.collection("alert_drafts").doc(draftId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Draft not found.");
    const d = snap.data();
    // Scope, expiry and the second-approver rule: ./alerts/approval.js.
    const err = decisionError(d, {
      uid, role, profileMunicipality: profile.municipality, decision, nowMs: Date.now(),
    });
    if (err) throw new HttpsError(err.code, err.message);
    const isAdminAlert = !!d.requestedBy;

    const now = admin.firestore.FieldValue.serverTimestamp();
    let broadcastId = null;
    if (decision === "approve") {
      const bRef = db.collection("broadcasts").doc();
      broadcastId = bRef.id;
      tx.set(bRef, {
        title: d.title,
        body: d.body,
        // A town name, or "all" for a province-wide alert (onNewBroadcast and
        // the resident inbox both read scope this way).
        scope: d.municipality || "all",
        urgent: d.urgent === true,
        type: d.type || "weather",
        source: d.source || null,
        draftId,
        ...(isAdminAlert ? { sentBy: d.requestedBy } : {}),
        approvedBy: uid,
        timestamp: now,
      });
    }
    tx.update(ref, {
      status: decision === "approve" ? "approved" : "rejected",
      decidedBy: uid,
      decidedAt: now,
      note: cleanNote,
      broadcastId,
    });
    tx.set(db.collection("audit_logs").doc(), {
      action: `${isAdminAlert ? "admin" : "automated"}_alert_${decision === "approve" ? "approved" : "rejected"}`,
      requestedBy: d.requestedBy || null,
      draftId,
      broadcastId,
      municipality: d.municipality || null,
      urgent: d.urgent === true,
      source: d.source || null,
      decidedBy: uid,
      note: cleanNote,
      at: now,
    });
    return { status: decision === "approve" ? "approved" : "rejected", broadcastId };
  });
});

// Propose an urgent or province-wide alert for a second admin's approval
// (P2, PDRRMO §2). firestore.rules no longer let a client create such a
// broadcast directly; it becomes a pending draft that decideAlertDraft sends
// once a DIFFERENT in-scope admin approves it. Routine single-town alerts
// are still written straight to `broadcasts` by the console.
exports.proposeAdminAlert = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const { title, body, urgent, municipality } = request.data || {};
  const t = typeof title === "string" ? title.trim() : "";
  const b = typeof body === "string" ? body.trim() : "";
  if (t.length < 3 || t.length > 120 || b.length < 3 || b.length > 1000) {
    throw new HttpsError("invalid-argument", "A title (3–120 characters) and message (3–1000) are required.");
  }
  const town = typeof municipality === "string" && municipality.trim() ? municipality.trim() : null;
  const isUrgent = urgent === true;
  if (!needsSecondApprover({ urgent: isUrgent, municipality: town })) {
    throw new HttpsError("invalid-argument", "Routine single-town alerts are sent directly; no approval is needed.");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();
  const role = await resolveCallerRole(request);
  const profile = (await db.collection("users").doc(uid).get()).data() || {};
  if (!canPropose(role, profile.municipality, town)) {
    throw new HttpsError("permission-denied",
      town ? "You can only send alerts for your own municipality." : "Only a provincial admin can send a province-wide alert.");
  }

  const ref = db.collection("alert_drafts").doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(ref, {
    title: t,
    body: b,
    municipality: town,
    urgent: isUrgent,
    type: "admin",
    source: "Admin",
    evidence: null,
    status: "pending",
    requestedBy: uid,
    requestedByName: typeof profile.name === "string" ? profile.name : null,
    createdAt: now,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + ALERT_DRAFT_TTL_MS),
  });
  batch.set(db.collection("audit_logs").doc(), {
    action: "admin_alert_proposed",
    draftId: ref.id,
    municipality: town,
    urgent: isUrgent,
    requestedBy: uid,
    at: now,
  });
  await batch.commit();
  await notifyAdminsOfDraft(db, ref.id, town, t, isUrgent, { kind: "admin", excludeToken: profile.fcmToken || null })
    .catch((e) => console.error("draft notification failed:", e));
  return { draftId: ref.id };
});

/**
 * Scheduled rainfall watch (PANaHON-style automatic weather alerts). Every 3
 * hours it checks the short-term forecast for each municipality and, when
 * meaningful rain is imminent, DRAFTS an alert for that town; it reaches the
 * public only after an in-scope admin approves it (see draftAutomatedAlert).
 * A 6-hour per-municipality cooldown prevents repeated drafts.
 *
 * Requires the OPENWEATHER_API_KEY environment variable on the functions
 * runtime (e.g. `firebase functions:secrets:set OPENWEATHER_API_KEY` or a
 * .env entry). Without it the job logs a warning and no-ops — nothing breaks.
 */
exports.rainfallWatch = scheduled("rainfallWatch", 
  // The `secrets` binding makes the OPENWEATHER_API_KEY set via
  // `firebase functions:secrets:set` available as process.env at runtime.
  { schedule: "0 */3 * * *", timeZone: "Asia/Manila", secrets: ["OPENWEATHER_API_KEY"] },
  async () => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.warn("rainfallWatch: OPENWEATHER_API_KEY not set — skipping.");
      return;
    }

    const db = admin.firestore();
    const now = Date.now();
    const COOLDOWN_MS = 6 * 60 * 60 * 1000;

    for (const [muni, [lat, lon]] of Object.entries(NV_MUNICIPALITY_COORDS)) {
      try {
        const alertRef = db.collection("weather_alerts").doc(muni);
        const alertSnap = await alertRef.get();
        const lastMs = alertSnap.exists ? alertSnap.data().lastAlertMs || 0 : 0;
        if (now - lastMs < COOLDOWN_MS) continue;

        const url =
          "https://api.openweathermap.org/data/2.5/forecast" +
          `?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=2`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();
        const slots = data.list || [];
        if (slots.length === 0) continue;

        let maxPop = 0;
        let totalRain = 0;
        for (const s of slots) {
          maxPop = Math.max(maxPop, s.pop || 0);
          totalRain += (s.rain && s.rain["3h"]) || 0;
        }

        const heavy = totalRain >= 7.5; // mm over the window
        const likely = maxPop >= 0.7 && totalRain >= 1.0;
        if (!heavy && !likely) continue;

        const title = heavy
          ? `⛈ Heavy rain expected — ${muni}`
          : `☔ Rain likely — ${muni}`;
        const body =
          `${Math.round(maxPop * 100)}% chance, about ` +
          `${totalRain.toFixed(1)} mm in the next few hours. ` +
          "Plan ahead and stay safe.";

        await draftAutomatedAlert(db, {
          title,
          body,
          municipality: muni,
          urgent: false,
          source: "rainfallWatch",
          evidence: { provider: "OpenWeather", maxPop, totalRainMm: totalRain },
        });
        await alertRef.set(
          { lastAlertMs: now, municipality: muni },
          { merge: true }
        );
        console.log(
          `rainfallWatch: drafted alert for ${muni} (pop ${maxPop}, rain ${totalRain}).`
        );
      } catch (e) {
        console.error(`rainfallWatch ${muni} error:`, e);
      }
    }
  }
);

// ── Windy point-forecast helper ──────────────────────────────────────────────
// Calls the Windy Point Forecast API (api.windy.com) for one coordinate and
// returns a simplified next-hours series. The API key is never exposed to the
// browser — it lives in the WINDY_API_KEY secret and is only used server-side.
// Returns null on any failure so callers can no-op gracefully.
async function fetchWindyPointForecast(lat, lon, apiKey) {
  try {
    const resp = await fetch("https://api.windy.com/api/point-forecast/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lon,
        model: "gfs",
        parameters: ["wind", "windGust", "temp", "precip"],
        levels: ["surface"],
        key: apiKey,
      }),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    const ts = d.ts || [];
    const u = d["wind_u-surface"] || [];
    const v = d["wind_v-surface"] || [];
    const gust = d["gust-surface"] || [];
    const tempK = d["temp-surface"] || [];
    const precip = d["past3hprecip-surface"] || [];
    const series = [];
    for (let i = 0; i < ts.length; i++) {
      const windMs = Math.hypot(u[i] ?? 0, v[i] ?? 0);
      series.push({
        ts: ts[i],
        windKmh: Math.round(windMs * 3.6),
        gustKmh: Math.round((gust[i] ?? windMs) * 3.6),
        tempC: tempK[i] != null ? Math.round(tempK[i] - 273.15) : null,
        // Windy returns 3-hourly accumulated precip in metres → mm.
        precipMm: precip[i] != null ? +(precip[i] * 1000).toFixed(1) : 0,
      });
    }
    return series;
  } catch (e) {
    console.error("fetchWindyPointForecast error:", e);
    return null;
  }
}

// ── Windy forecast (admin, on-demand) ────────────────────────────────────────
// Powers the web console Weather widget. Admin-only; proxies the Windy Point
// Forecast API so the key stays server-side. Pass {lat,lon} or {municipality}.
// ── Official PAGASA products for Nueva Vizcaya (public, no token) ─────────────
// Reads PAGASA's published Northern Luzon PRSD regional forecast page and stores
// the Nueva Vizcaya provincial forecast, 5-day extended outlook, regional
// synopsis (incl. tropical cyclone information), heavy-rainfall warning status
// and thunderstorm information. Parsing lives in ./pagasa-public/regional.js;
// see that file for the source, the true geographic coverage of each product,
// and what is deliberately not inferred.
//
// Separate from ./pagasa/ (the authenticated TenDay API), which stays
// unconnected until a token and its documentation exist.
//
// Hourly: forecasts are issued a few times a day, thunderstorm advisories ad
// hoc. One ~250 KB page per hour from one server is a negligible load. On
// failure the last good data is KEPT (never overwritten with blanks) and the
// error is recorded alongside it, so the app can show how stale it is.
const { parseNlprsd, SOURCE_URL: NLPRSD_URL } = require("./pagasa-public/regional");

exports.pagasaRegionalWatch = scheduled("pagasaRegionalWatch", 
  { schedule: "every 60 minutes", timeZone: "Asia/Manila", timeoutSeconds: 60 },
  async () => {
    const ref = admin.firestore().collection("pagasa_products").doc("nueva_vizcaya");
    try {
      const res = await fetch(NLPRSD_URL, {
        headers: {
          "User-Agent": "OneVizcaya/1.0 (+https://one-vizcaya-app.web.app)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`PAGASA NLPRSD page returned HTTP ${res.status}`);
      const product = parseNlprsd(await res.text(), new Date().toISOString());
      await ref.set({
        ...product,
        lastSuccessAt: admin.firestore.FieldValue.serverTimestamp(),
        lastError: null,
      });
      if (product.parseWarnings.length) {
        console.warn("pagasaRegionalWatch parse warnings:", product.parseWarnings);
      }
    } catch (e) {
      console.error("pagasaRegionalWatch failed:", e);
      // merge: keep the last good product; record the failure next to it.
      await ref.set(
        {
          lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
          lastError: String(e && e.message ? e.message : e).slice(0, 500),
        },
        { merge: true },
      );
    }
  }
);

// ── Citizen weather proxy (OpenWeather) ──────────────────────────────────────
// The mobile app used to call OpenWeather directly with a key compiled into the
// APK, where anyone could extract it. This proxies the same four calls
// server-side with the OPENWEATHER_API_KEY secret (already used by
// rainfallWatch), so no weather credential ships in the app. It is also the
// pattern a future PAGASA TenDay integration must follow: that API's `token`
// may only ever live in Secret Manager.
//
// Responses are returned RAW so the app's existing parser is unchanged.
// `current` and `forecast` are required (as they were client-side); `aqi` and
// `uvi` are optional and come back null on failure. The provider is labelled
// so the app never presents this data as PAGASA's.
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const weatherCache = new Map(); // per-instance; key = rounded "lat,lon"

exports.getWeather = onCall(
  { secrets: ["OPENWEATHER_API_KEY"] },
  async (request) => {
    // Authenticated users only, so this cannot become an open proxy that
    // spends the Province's OpenWeather quota.
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }
    const lat = Number(request.data?.lat);
    const lon = Number(request.data?.lon);
    // Philippine bounding box — rejects arbitrary-coordinate abuse.
    if (
      !Number.isFinite(lat) || !Number.isFinite(lon) ||
      lat < 4 || lat > 22 || lon < 116 || lon > 127
    ) {
      throw new HttpsError("invalid-argument", "Coordinates outside the Philippines.");
    }
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "Weather service not configured.");
    }

    // ~1 km cells: nearby users share one upstream call per 10 minutes.
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const hit = weatherCache.get(key);
    if (hit && Date.now() - hit.at < WEATHER_CACHE_TTL_MS) return hit.value;

    const base = "https://api.openweathermap.org/data/2.5";
    // `units=metric` matches what the app requested for weather/forecast;
    // air_pollution and uvi were requested without it and are unit-free.
    const get = async (path, required, metric) => {
      const q = `lat=${lat}&lon=${lon}&appid=${apiKey}${metric ? "&units=metric" : ""}`;
      try {
        const res = await fetch(`${base}/${path}?${q}`, {
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) {
          if (required) {
            throw new HttpsError("unavailable", `Upstream ${path} returned ${res.status}.`);
          }
          return null;
        }
        return await res.json();
      } catch (e) {
        if (required) {
          if (e instanceof HttpsError) throw e;
          throw new HttpsError("unavailable", `Upstream ${path} unreachable.`);
        }
        return null;
      }
    };

    const [current, forecast, aqi, uvi] = await Promise.all([
      get("weather", true, true),
      get("forecast", true, true),
      get("air_pollution", false, false),
      get("uvi", false, false),
    ]);

    const value = {
      provider: "OpenWeather",
      retrievedAt: new Date().toISOString(),
      current, forecast, aqi, uvi,
    };
    weatherCache.set(key, { at: Date.now(), value });
    return value;
  }
);

exports.getWindyForecast = onCall(
  { secrets: ["WINDY_API_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be authenticated.");
    }
    const role = await resolveCallerRole(request);
    if (
      !["admin", "municipal_admin", "provincial_admin", "super_admin"].includes(
        role
      )
    ) {
      throw new HttpsError("permission-denied", "Admins only.");
    }
    const apiKey = process.env.WINDY_API_KEY;
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "Windy API key not configured. Set it with: firebase functions:secrets:set WINDY_API_KEY"
      );
    }

    let { lat, lon } = request.data || {};
    const muni = request.data?.municipality;
    if ((lat == null || lon == null) && muni && NV_MUNICIPALITY_COORDS[muni]) {
      [lat, lon] = NV_MUNICIPALITY_COORDS[muni];
    }
    // Default to the provincial capital (Bayombong) when nothing is supplied.
    if (lat == null || lon == null) [lat, lon] = NV_MUNICIPALITY_COORDS.Bayombong;

    const series = await fetchWindyPointForecast(lat, lon, apiKey);
    if (!series) {
      throw new HttpsError("unavailable", "Windy forecast is unavailable right now.");
    }
    // Trim to the next ~24h (8 three-hourly slots) to keep the payload small.
    return { lat, lon, municipality: muni || null, series: series.slice(0, 8) };
  }
);

// ── Windy strong-wind watch (scheduled) ──────────────────────────────────────
// Complements rainfallWatch (which covers RAIN via OpenWeatherMap) by adding
// strong-WIND advisories from Windy — Windy's specialty — so the two don't
// duplicate each other. No-ops without a WINDY_API_KEY. Broadcasts are scoped
// per municipality and rate-limited by a per-muni cooldown.
// Runs every 3h for fresher advisories: 8 runs/day × 15 municipalities
// ≈ 120 Point-Forecast calls/day. Watch Windy's free-tier quota; if it's tight,
// raise this back to "0 */6 * * *" or reduce the municipality set.
exports.windyWindWatch = scheduled("windyWindWatch", 
  { schedule: "0 */3 * * *", timeZone: "Asia/Manila", secrets: ["WINDY_API_KEY"] },
  async () => {
    const apiKey = process.env.WINDY_API_KEY;
    if (!apiKey) {
      console.warn("windyWindWatch: WINDY_API_KEY not set — skipping.");
      return;
    }
    const db = admin.firestore();
    const now = Date.now();
    const COOLDOWN_MS = 6 * 60 * 60 * 1000;
    const STRONG_GUST_KMH = 60; // advisory threshold
    const SEVERE_GUST_KMH = 85; // urgent threshold

    for (const [muni, [lat, lon]] of Object.entries(NV_MUNICIPALITY_COORDS)) {
      try {
        const alertRef = db.collection("weather_alerts").doc(muni);
        const alertSnap = await alertRef.get();
        const lastMs = alertSnap.exists
          ? alertSnap.data().lastWindAlertMs || 0
          : 0;
        if (now - lastMs < COOLDOWN_MS) continue;

        const series = await fetchWindyPointForecast(lat, lon, apiKey);
        if (!series || series.length === 0) continue;

        // Look at roughly the next 24h.
        const window = series.slice(0, 8);
        const maxGust = window.reduce((m, s) => Math.max(m, s.gustKmh), 0);
        if (maxGust < STRONG_GUST_KMH) continue;

        const severe = maxGust >= SEVERE_GUST_KMH;
        const title = severe
          ? `🌀 Severe winds expected — ${muni}`
          : `💨 Strong winds expected — ${muni}`;
        const body =
          `Wind gusts up to about ${maxGust} km/h are expected in the next ` +
          "several hours. Secure loose objects and stay indoors when it peaks.";

        await draftAutomatedAlert(db, {
          title,
          body,
          municipality: muni,
          urgent: severe,
          source: "windyWindWatch",
          evidence: { provider: "Windy", maxGustKmh: maxGust },
        });
        await alertRef.set(
          { lastWindAlertMs: now, municipality: muni },
          { merge: true }
        );
        console.log(`windyWindWatch: drafted alert for ${muni} (gust ${maxGust} km/h).`);
      } catch (e) {
        console.error(`windyWindWatch ${muni} error:`, e);
      }
    }
  }
);

// ── RA 10173: storage cleanup helper ─────────────────────────────────────────
// Derives the Storage object path from a Firebase download URL and deletes it.
// Used to guarantee no orphaned photo evidence (with embedded EXIF/location)
// survives report or account deletion.
async function deleteImageByUrl(imageUrl, ownerUid) {
  if (!imageUrl || typeof imageUrl !== "string") return;
  try {
    // Download URLs look like:
    //   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<ENCODED_PATH>?alt=media&token=...
    const match = imageUrl.match(/\/o\/([^?]+)/);
    if (!match) return;
    const objectPath = decodeURIComponent(match[1]);
    // imageUrl is written by the reporter's client, so it is not trusted: only
    // that reporter's own report photo ("report_images/<uid>_...") is ever
    // deleted. Otherwise a crafted URL could make this delete any file.
    if (!reportPhotoPathOk(objectPath, ownerUid)) {
      console.warn(`deleteImageByUrl: refused path outside the owner's report photos: ${objectPath}`);
      return;
    }
    await admin.storage().bucket().file(objectPath).delete();
  } catch (e) {
    // Already deleted or unreadable — safe to ignore.
    console.log(`deleteImageByUrl: skipped (${e.message})`);
  }
}

// ── Cascade-delete photo evidence when a report is removed ───────────────────
// Fires whenever a report document is deleted (citizen account deletion, admin
// purge, or the retention job below). Removes the linked Storage image so the
// Right to Erasure is fully honoured, not just at the Firestore layer.
exports.cleanupReportImageOnDelete = onDocumentDeleted(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    await deleteImageByUrl(data.imageUrl, event.params.userId);
  }
);

// ── Audit trail: record report deletions ─────────────────────────────────────
// PDRRMO §8 asks for measures to manage false/incomplete/duplicate reports and
// §3 for accountability over the records. Until now a report could be deleted
// permanently with NO audit entry at all, so a report could disappear without
// trace. This records every deletion immutably.
//
// It also doubles as the RA 10173 disposal record PDRRMO §9 asks for, by
// distinguishing an operator deletion from the 24-month retention purge
// (deleteOldArchivedReports). Age is used to tell them apart because a
// Firestore trigger carries no auth context.
//
// NOTE: for the same reason this cannot record WHO deleted the report. Rules
// restrict report deletion to provincial admins, so the actor set is small, but
// full attribution needs deletion routed through a callable that verifies the
// caller — tracked as follow-up work.
const { deletionAudit } = require("./reports/deletion");

exports.onReportDeleted = onDocumentDeleted(
  "users/{userId}/reports/{reportId}",
  async (event) => {
    const data = (event.data && event.data.data()) || {};
    // Who and why come from the stamp deleteReportWithReason writes just
    // before deleting; see ./reports/deletion.js for what is (not) inferred.
    const { cause, deletedBy, reason } = deletionAudit(data, Date.now());

    await admin
      .firestore()
      .collection("audit_logs")
      .add({
        action: "report_deleted",
        cause,
        deletedBy,
        reason,
        targetUid: event.params.userId,
        reportId: event.params.reportId,
        category: data.category || null,
        municipality: data.municipality || null,
        barangay: data.barangay || null,
        status: data.status || null,
        priority: data.priority || null,
        reportedAt: data.reportedAt || null,
        at: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch((e) => console.error("onReportDeleted audit write failed:", e));
  }
);

// ── Attributed report deletion (PDRRMO §8, §3) ───────────────────────────────
// The only route by which an app user can delete a report (firestore.rules
// forbids client deletes). Same authority as before — provincial admins — but
// a reason is required and the caller is recorded. For a false, duplicate,
// incomplete or unverifiable report, closing it without action is preferred:
// that keeps the report on record.
exports.deleteReportWithReason = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
  const { userId, reportId, reason } = request.data || {};
  if (typeof userId !== "string" || !userId || typeof reportId !== "string" || !reportId) {
    throw new HttpsError("invalid-argument", "userId and reportId are required.");
  }
  const why = typeof reason === "string" ? reason.trim() : "";
  if (why.length < 5) {
    throw new HttpsError("invalid-argument", "A reason of at least 5 characters is required.");
  }
  const role = await resolveCallerRole(request);
  if (!PROVINCIAL_ROLES.includes(role)) {
    throw new HttpsError("permission-denied",
      "Only provincial administrators can delete reports. To record a false or duplicate report, close it without action instead.");
  }
  const ref = admin.firestore().collection("users").doc(userId).collection("reports").doc(reportId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Report not found.");

  // Stamp who and why, then delete: onReportDeleted reads these from the
  // deleted document's final snapshot to write a single attributed entry.
  await ref.update({
    deletionRequestedBy: request.auth.uid,
    deletionReason: why.slice(0, 500),
    deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await ref.delete();
  return { deleted: true };
});

// ── RA 10173 retention: purge reports older than 24 months ───────────────────
// Runs daily at 3 AM Manila time. The privacy policy commits to deleting
// archived reports after 24 months; archiveOldReports only marks them at 12
// months. This job deletes report documents (and their photos) past 24 months,
// which also triggers cleanupReportImageOnDelete for Storage cleanup.
exports.deleteOldArchivedReports = scheduled("deleteOldArchivedReports", 
  { schedule: "0 3 * * *", timeZone: "Asia/Manila" },
  async () => {
    const db = admin.firestore();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);
    const cutoffTs = admin.firestore.Timestamp.fromDate(cutoff);

    const snapshot = await db
      .collectionGroup("reports")
      .where("reportedAt", "<", cutoffTs)
      .get();

    // Only reports that went through the archive step (./reports/retention.js).
    const nowMs = Date.now();
    const due = snapshot.docs.filter((d) => dueForDeletion(d.data(), nowMs));
    const skipped = snapshot.size - due.length;
    if (skipped) {
      console.warn(`deleteOldArchivedReports: ${skipped} report(s) older than 24 months are not archived; ` +
        "kept until archiveOldReports archives them.");
    }
    if (due.length === 0) {
      console.log("deleteOldArchivedReports: nothing to delete");
      return;
    }

    // Delete photos first (best-effort), then the docs in rolling batches.
    let batch = db.batch();
    let count = 0;
    let deleted = 0;
    for (const doc of due) {
      await deleteImageByUrl(doc.data().imageUrl, doc.ref.parent.parent.id);
      batch.delete(doc.ref);
      count++;
      deleted++;
      if (count >= 490) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
    console.log(`deleteOldArchivedReports: deleted ${deleted} archived reports older than 24 months`);
  }
);

// ── Seed responders collection with verified Nueva Vizcaya contacts ──────────
// Phone numbers sourced from the One Vizcaya mobile app (emergency_contacts_screen.dart).
// PNP numbers are verified; BFP numbers marked as UNVERIFIED use a placeholder
// pattern (09171112222 etc.) from the mobile app and must be confirmed with each
// Municipal BFP station before use. Call this once from Firebase Console.
exports.seedResponders = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be authenticated.");
  const callerRole = await resolveCallerRole(request);
  if (!["admin", "provincial_admin", "super_admin"].includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can seed responders.");
  }

  const db = admin.firestore();

  // National / provincial contacts shared across all municipalities
  const nationalContacts = [
    { name: "National Emergency Hotline",  phone: "911",            type: "general",        municipality: "All" },
    { name: "NDRRMC Operations Center",    phone: "02-8911-5061",   type: "disaster",       municipality: "All" },
    { name: "NDRRMC Hotline",              phone: "09178990098",    type: "disaster",       municipality: "All" },
    { name: "DPWH – Region II Hotline",    phone: "078-396-0796",   type: "infrastructure", municipality: "All" },
    { name: "DPWH Nueva Vizcaya DEO",      phone: "09175000100 #",    type: "infrastructure", municipality: "All" },
    { name: "PDRRMO Nueva Vizcaya",        phone: "09171227150",    type: "disaster",       municipality: "All" },
  ];

  // Municipality-specific responders.
  // CONVENTION: a phone ending in " #" is a PLACEHOLDER / unverified number —
  // it must be confirmed with the office before use, and the trailing "#" makes
  // it non-dialable so it fails safe (never calls a random stranger). Numbers
  // without "#" are verified.
  //   PNP     — verified from official LGU records
  //   MDRRMO  — verified from the official PDRRMO Nueva Vizcaya hotline poster
  //   BFP     — mostly UNVERIFIED placeholders (marked "#"); confirm per station
  //   Hospital— NV Provincial Hospital verified; a reused number is marked "#"
  const localResponders = [
    // Alfonso Castañeda
    { name: "PNP Alfonso Castañeda",  phone: "09193262160", type: "police",  municipality: "Alfonso Castañeda", verified: true },
    { name: "BFP Alfonso Castañeda",  phone: "09171112222 #", type: "fire",    municipality: "Alfonso Castañeda", verified: false },
    { name: "MDRRMO / PDRRMO",        phone: "09702410684", type: "disaster",municipality: "Alfonso Castañeda", verified: true },

    // Ambaguio
    { name: "PNP Ambaguio",           phone: "09061675646", type: "police",  municipality: "Ambaguio", verified: true },
    { name: "BFP Ambaguio",           phone: "09171113333 #", type: "fire",    municipality: "Ambaguio", verified: false },
    { name: "MDRRMO / PDRRMO",        phone: "09650469390", type: "disaster",municipality: "Ambaguio", verified: true },

    // Aritao
    { name: "PNP Aritao",             phone: "09164956244", type: "police",  municipality: "Aritao", verified: true },
    { name: "BFP Aritao",             phone: "09171114444 #", type: "fire",    municipality: "Aritao", verified: false },
    { name: "MDRRMO Aritao",          phone: "09979722741", type: "disaster",municipality: "Aritao", verified: true },

    // Bagabag
    { name: "PNP Bagabag",            phone: "09175063958", type: "police",  municipality: "Bagabag", verified: true },
    { name: "BFP Bagabag",            phone: "09171115555 #", type: "fire",    municipality: "Bagabag", verified: false },
    { name: "MDRRMO Bagabag",         phone: "09266324196", type: "disaster",municipality: "Bagabag", verified: true },

    // Bambang
    { name: "PNP Bambang",            phone: "09065630944", type: "police",  municipality: "Bambang", verified: true },
    { name: "BFP Bambang",            phone: "09175444946", type: "fire",    municipality: "Bambang", verified: true },
    { name: "NV Provincial Hospital", phone: "09228680843", type: "medical", municipality: "Bambang", verified: true },
    { name: "MDRRMO Bambang",         phone: "09560193138", type: "disaster",municipality: "Bambang", verified: true },

    // Bayombong
    { name: "PNP Bayombong",                phone: "09153116455", type: "police",  municipality: "Bayombong", verified: true },
    { name: "BFP Bayombong",                phone: "09187654321 #", type: "fire",    municipality: "Bayombong", verified: false },
    { name: "Nueva Vizcaya Prov. Hospital", phone: "09228680843", type: "medical", municipality: "Bayombong", verified: true },
    { name: "PDRRMO Nueva Vizcaya",         phone: "09176584579", type: "disaster",municipality: "Bayombong", verified: true },

    // Diadi
    { name: "PNP Diadi",              phone: "09989673133", type: "police",  municipality: "Diadi", verified: true },
    { name: "BFP Diadi",              phone: "09171116666 #", type: "fire",    municipality: "Diadi", verified: false },
    { name: "Diadi Emergency Hospital",phone: "09228680843 #", type: "medical", municipality: "Diadi", verified: true },
    { name: "MDRRMO / PDRRMO",        phone: "09161258875", type: "disaster",municipality: "Diadi", verified: true },

    // Dupax del Norte
    { name: "PNP Dupax del Norte",    phone: "09989673134", type: "police",  municipality: "Dupax del Norte", verified: true },
    { name: "BFP Dupax del Norte",    phone: "09171117777 #", type: "fire",    municipality: "Dupax del Norte", verified: false },
    { name: "Dupax District Hospital",phone: "0788081178",  type: "medical", municipality: "Dupax del Norte", verified: true },
    { name: "MDRRMO / PDRRMO",        phone: "09176589565", type: "disaster",municipality: "Dupax del Norte", verified: true },

    // Dupax del Sur
    { name: "PNP Dupax del Sur",      phone: "09989673135", type: "police",  municipality: "Dupax del Sur", verified: true },
    { name: "BFP Dupax del Sur",      phone: "09171118888 #", type: "fire",    municipality: "Dupax del Sur", verified: false },
    { name: "MDRRMO / PDRRMO",        phone: "09175927920", type: "disaster",municipality: "Dupax del Sur", verified: true },

    // Kasibu
    { name: "PNP Kasibu",             phone: "09055889533", type: "police",  municipality: "Kasibu", verified: true },
    { name: "BFP Kasibu",             phone: "09171119999 #", type: "fire",    municipality: "Kasibu", verified: false },
    { name: "Kasibu Municipal Hospital",phone: "09273659546", type: "medical", municipality: "Kasibu", verified: true },
    { name: "MDRRMO Kasibu",          phone: "09777785675", type: "disaster",municipality: "Kasibu", verified: true },

    // Kayapa
    { name: "PNP Kayapa",             phone: "09175168649", type: "police",  municipality: "Kayapa", verified: true },
    { name: "BFP Kayapa",             phone: "09172221111 #", type: "fire",    municipality: "Kayapa", verified: false },
    { name: "MDRRMO Kayapa",          phone: "09164946926", type: "disaster",municipality: "Kayapa", verified: true },

    // Quezon
    { name: "PNP Quezon",             phone: "09351346735", type: "police",  municipality: "Quezon", verified: true },
    { name: "BFP Quezon",             phone: "09172223333 #", type: "fire",    municipality: "Quezon", verified: false },
    { name: "MDRRMO Quezon",          phone: "09068606785", type: "disaster",municipality: "Quezon", verified: true },

    // Santa Fe
    { name: "PNP Santa Fe",           phone: "09164625062", type: "police",  municipality: "Santa Fe", verified: true },
    { name: "BFP Santa Fe",           phone: "09172224444 #", type: "fire",    municipality: "Santa Fe", verified: false },
    { name: "MDRRMO Santa Fe",        phone: "09562465185", type: "disaster",municipality: "Santa Fe", verified: true },

    // Solano
    { name: "PNP Solano",             phone: "09274008033", type: "police",  municipality: "Solano", verified: true },
    { name: "BFP Solano",             phone: "09360620305", type: "fire",    municipality: "Solano", verified: true },
    { name: "R2TMC Medical",          phone: "09068195569", type: "medical", municipality: "Solano", verified: true },
    { name: "MDRRMO Solano",          phone: "09263833744", type: "disaster",municipality: "Solano", verified: true },

    // Villaverde
    { name: "PNP Villaverde",         phone: "09062683761", type: "police",  municipality: "Villaverde", verified: true },
    { name: "BFP Villaverde",         phone: "09172225555 #", type: "fire",    municipality: "Villaverde", verified: false },
    { name: "MDRRMO Villaverde",      phone: "09178067038", type: "disaster",municipality: "Villaverde", verified: true },
  ];

  const allResponders = [...nationalContacts.map(r => ({ ...r, verified: true })), ...localResponders];

  let batch = db.batch();
  let opCount = 0;
  let written = 0;

  for (const responder of allResponders) {
    // Use a deterministic ID so re-seeding is idempotent
    const id = `${responder.municipality}_${responder.type}_${responder.name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 100);

    const ref = db.collection("responders").doc(id);
    batch.set(ref, {
      ...responder,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    opCount++;
    written++;

    if (opCount >= 490) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) await batch.commit();

  return {
    message: "Responders seeded successfully.",
    total: written,
    note: "BFP numbers marked verified:false are placeholder values — confirm with each municipal BFP station.",
  };
});

// ── Health endpoint (P2, uptime) ─────────────────────────────────────────────
// Public, unauthenticated GET for an uptime monitor (e.g. a Google Cloud
// Monitoring uptime check). 200 only when everything is healthy; 503 when
// Firestore is unreachable or a scheduled job has stopped or is failing, so
// the monitor alerts. The body names checks and states only; no error text.
exports.health = onRequest({ timeoutSeconds: 15, cors: false, invoker: "public" }, async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const heartbeats = {};
  let firestoreOk = true;
  try {
    const snap = await Promise.race([
      admin.firestore().collection("system_health").get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
    ]);
    const ms = (v) => (v && typeof v.toMillis === "function" ? v.toMillis() : null);
    snap.forEach((d) => {
      if (!(d.id in JOB_INTERVAL_MIN)) return;
      heartbeats[d.id] = { lastSuccessMs: ms(d.data().lastSuccessAt), lastErrorMs: ms(d.data().lastErrorAt) };
    });
  } catch (e) {
    console.error("health: Firestore check failed:", e);
    firestoreOk = false;
  }
  const result = assessHealth({ firestoreOk, heartbeats, nowMs: Date.now() });
  res.status(result.status === "ok" ? 200 : 503)
    .json({ ...result, checkedAt: new Date().toISOString() });
});
