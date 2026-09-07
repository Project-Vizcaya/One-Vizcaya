// DEPLOYMENT: requires Firebase Blaze (pay-as-you-go) plan.
// Run: cd functions && npm install && firebase deploy --only functions
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

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
    };

    const newLabel = statusLabels[after.status] || after.status;
    const category = after.category || "Your report";

    const message = {
      token: fcmToken,
      notification: {
        title: `Report Status Updated: ${newLabel}`,
        body: `${category} is now marked as "${newLabel}" by the LGU.`,
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
exports.resetRateLimits = onSchedule(
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

// ── Seed Demo Data ───────────────────────────────────────────────────────────
// Call this once from the Firebase Console or with the Admin SDK.
// Creates realistic demo reports across Bambang, Bayombong, and Solano.
exports.seedDemoData = onCall(async (request) => {
  const db = admin.firestore();

  // ── Demo user profiles ──────────────────────────────────────────────────
  // These represent the municipal admin and provincial admin demo accounts.
  // Phone logins must be created separately in Firebase Auth Console:
  //   admin_bambang  → phone: use your designated demo number
  //   pa_office      → phone: use provincial admin demo number
  const demoUsers = [
    {
      uid: "demo_bambang_admin",
      data: {
        name: "Municipal Admin — Bambang",
        phoneNumber: "+639000000001",
        municipality: "Bambang",
        role: "municipal_admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    {
      uid: "demo_bayombong_admin",
      data: {
        name: "Municipal Admin — Bayombong",
        phoneNumber: "+639000000002",
        municipality: "Bayombong",
        role: "municipal_admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    {
      uid: "demo_solano_admin",
      data: {
        name: "Municipal Admin — Solano",
        phoneNumber: "+639000000003",
        municipality: "Solano",
        role: "municipal_admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
    {
      uid: "demo_provincial_admin",
      data: {
        name: "Provincial Administrator's Office — Nueva Vizcaya",
        phoneNumber: "+639000000010",
        municipality: "All",
        role: "provincial_admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    },
  ];

  // ── Demo reports ────────────────────────────────────────────────────────
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const demoReports = [
    // ── Bambang ─────────────────────────────────────────────────────────
    {
      userId: "demo_bambang_admin",
      report: {
        category: "Provincial Road Damage",
        description: "Large section of pavement has collapsed near the Bambang market entrance. Vehicles have to swerve dangerously. Estimated 3m x 4m sinkhole.",
        location: "Maharlika Highway, Brgy. Poblacion, Bambang",
        municipality: "Bambang",
        status: "reported",
        priority: "critical",
        priorityScore: 95,
        duplicateCount: 4,
        latitude: 16.3839,
        longitude: 121.1003,
        userPhone: "+639065630944",
        imageUrl: "",
        escalatedToProvince: true,
        escalatedAt: admin.firestore.Timestamp.fromDate(daysAgo(0)),
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(1)),
      },
    },
    {
      userId: "demo_bambang_admin",
      report: {
        category: "Flooding / Severe Drainage Issue",
        description: "Cagayan River overflow has submerged portions of Brgy. Wangal. At least 20 families need evacuation assistance. Water level rising.",
        location: "Brgy. Wangal, Bambang — near irrigation channel",
        municipality: "Bambang",
        status: "ongoing",
        priority: "critical",
        priorityScore: 100,
        duplicateCount: 7,
        latitude: 16.3891,
        longitude: 121.1045,
        userPhone: "+639175861838",
        imageUrl: "",
        escalatedToProvince: true,
        escalatedAt: admin.firestore.Timestamp.fromDate(daysAgo(0)),
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(2)),
      },
    },
    {
      userId: "demo_bambang_admin",
      report: {
        category: "Infrastructure & Roads",
        description: "Multiple deep potholes on the access road to Brgy. Banggot causing accidents especially at night. Two motorcycles have already overturned.",
        location: "Brgy. Banggot Junction, Bambang",
        municipality: "Bambang",
        status: "ongoing",
        priority: "high",
        priorityScore: 72,
        duplicateCount: 2,
        latitude: 16.3750,
        longitude: 121.0988,
        userPhone: "+639065630944",
        imageUrl: "",
        escalatedToProvince: false,
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(3)),
      },
    },
    {
      userId: "demo_bambang_admin",
      report: {
        category: "Public Lighting & Utilities",
        description: "Street lights along the main road near Bambang National High School have been out for 5 days. Students walking home at night are at risk.",
        location: "National Highway near BNHS, Bambang",
        municipality: "Bambang",
        status: "reported",
        priority: "medium",
        priorityScore: 50,
        duplicateCount: 1,
        latitude: 16.3822,
        longitude: 121.1012,
        userPhone: "+639175444946",
        imageUrl: "",
        escalatedToProvince: false,
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(5)),
      },
    },

    // ── Bayombong ────────────────────────────────────────────────────────
    {
      userId: "demo_bayombong_admin",
      report: {
        category: "Bridge Damage / Blockage",
        description: "Concrete guardrail on the Bayombong bridge has completely collapsed on the downstream side. Span shows visible cracking. Urgent structural inspection needed.",
        location: "Magat River Bridge, Bayombong — near Capitol",
        municipality: "Bayombong",
        status: "reported",
        priority: "critical",
        priorityScore: 98,
        duplicateCount: 3,
        latitude: 16.4845,
        longitude: 121.1499,
        userPhone: "+639153116455",
        imageUrl: "",
        escalatedToProvince: true,
        escalatedAt: admin.firestore.Timestamp.fromDate(daysAgo(0)),
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(1)),
      },
    },
    {
      userId: "demo_bayombong_admin",
      report: {
        category: "Landslide / Soil Erosion",
        description: "Soil erosion along the mountain slope in Brgy. Sto. Domingo is threatening to block the road. Cracks visible on the road surface — possible sinkhole forming.",
        location: "Brgy. Sto. Domingo, Bayombong — mountain access road",
        municipality: "Bayombong",
        status: "reported",
        priority: "critical",
        priorityScore: 90,
        duplicateCount: 2,
        latitude: 16.4920,
        longitude: 121.1560,
        userPhone: "+639187654321",
        imageUrl: "",
        escalatedToProvince: false,
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(2)),
      },
    },
    {
      userId: "demo_bayombong_admin",
      report: {
        category: "Water & Sewage Systems",
        description: "Burst water main at the Bayombong public market area. Water has been out for 2 days in 3 barangays. Market vendors and residents severely affected.",
        location: "Public Market Area, Bayombong Centro",
        municipality: "Bayombong",
        status: "ongoing",
        priority: "high",
        priorityScore: 68,
        duplicateCount: 5,
        latitude: 16.4801,
        longitude: 121.1482,
        userPhone: "+639153116455",
        imageUrl: "",
        escalatedToProvince: false,
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(4)),
      },
    },

    // ── Solano ───────────────────────────────────────────────────────────
    {
      userId: "demo_solano_admin",
      report: {
        category: "Provincial Road Damage",
        description: "Major section of the Solano–Bayombong highway has developed serious cracks after recent rains. Road base visibly eroding. Heavy trucks are worsening the damage.",
        location: "Maharlika Highway km 243, Solano",
        municipality: "Solano",
        status: "reported",
        priority: "high",
        priorityScore: 80,
        duplicateCount: 3,
        latitude: 16.5209,
        longitude: 121.1806,
        userPhone: "+639274008033",
        imageUrl: "",
        escalatedToProvince: true,
        escalatedAt: admin.firestore.Timestamp.fromDate(daysAgo(1)),
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(3)),
      },
    },
    {
      userId: "demo_solano_admin",
      report: {
        category: "Environmental & Sanitation",
        description: "Illegal dumping site discovered behind the Solano commercial district. Waste is leaching into the drainage canal. Foul smell reported by residents.",
        location: "Behind Solano Wet Market, near drainage canal",
        municipality: "Solano",
        status: "reported",
        priority: "medium",
        priorityScore: 45,
        duplicateCount: 1,
        latitude: 16.5240,
        longitude: 121.1820,
        userPhone: "+639360620305",
        imageUrl: "",
        escalatedToProvince: false,
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(6)),
      },
    },
    {
      userId: "demo_solano_admin",
      report: {
        category: "Peace & Order Disturbance",
        description: "Illegal road obstruction by vendors blocking the school zone in front of Solano West Central School. Parents and school buses cannot pass during dismissal.",
        location: "Solano West Central School, Brgy. 8, Solano",
        municipality: "Solano",
        status: "solved",
        priority: "medium",
        priorityScore: 40,
        duplicateCount: 0,
        latitude: 16.5190,
        longitude: 121.1798,
        userPhone: "+639274008033",
        imageUrl: "",
        escalatedToProvince: false,
        reportedAt: admin.firestore.Timestamp.fromDate(daysAgo(10)),
      },
    },
  ];

  // Write all seeded documents using rolling batches (max 490 ops each) to
  // stay safely under Firestore's 500-write-per-batch limit.
  let batch = db.batch();
  let opCount = 0;

  // Write user profiles
  for (const { uid, data } of demoUsers) {
    const ref = db.collection("users").doc(uid);
    batch.set(ref, data, { merge: true });
    opCount++;
    if (opCount >= 490) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  // Write reports as sub-documents
  for (const { userId, report } of demoReports) {
    const ref = db.collection("users").doc(userId).collection("reports").doc();
    batch.set(ref, report);
    opCount++;
    if (opCount >= 490) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    batch = db.batch();
    opCount = 0;
  }

  // ── Seed demo announcements ──────────────────────────────────────────────
  const announcements = [
    {
      title: "DPWH Road Assessment: Bambang–Solano Highway",
      body: "The Department of Public Works and Highways (DPWH) Region II will conduct a road condition assessment along the Bambang–Solano segment of Maharlika Highway on May 20–21. Expect lane closures from 8 AM to 5 PM.",
      municipality: "All",
      isUrgent: false,
      postedBy: "DPWH – Nueva Vizcaya DEO",
      sourceUrl: "",
      sourceLabel: "",
      imageUrl: "",
      timestamp: admin.firestore.Timestamp.fromDate(daysAgo(1)),
    },
    {
      title: "URGENT: Evacuation Advisory — Cagayan River Flood Warning",
      body: "PDRRMO Nueva Vizcaya issues a YELLOW alert for communities along the Cagayan River in Bambang and Bayombong. Residents in flood-prone zones are advised to prepare go-bags and await evacuation instructions.",
      municipality: "All",
      isUrgent: true,
      postedBy: "PDRRMO Nueva Vizcaya",
      sourceUrl: "",
      sourceLabel: "",
      imageUrl: "",
      timestamp: admin.firestore.Timestamp.fromDate(daysAgo(0)),
    },
    {
      title: "Provincial Road Rehabilitation: Phase 2 Update",
      body: "The Provincial Government of Nueva Vizcaya announces the completion of Phase 2 road rehabilitation covering Bayombong–Bagabag section. Phase 3 (Solano–Bambang) is scheduled to begin June 2025.",
      municipality: "All",
      isUrgent: false,
      postedBy: "Office of the Provincial Governor — Nueva Vizcaya",
      sourceUrl: "",
      sourceLabel: "",
      imageUrl: "",
      timestamp: admin.firestore.Timestamp.fromDate(daysAgo(3)),
    },
    {
      title: "Free Medical Mission — Bambang Poblacion",
      body: "The Municipal Health Office of Bambang, in coordination with the Provincial Hospital, will conduct a Free Medical Mission at Bambang Gymnasium on May 18, 8 AM – 4 PM. Services include general check-up, dental, and eye care.",
      municipality: "Bambang",
      isUrgent: false,
      postedBy: "MHO Bambang",
      sourceUrl: "",
      sourceLabel: "",
      imageUrl: "",
      timestamp: admin.firestore.Timestamp.fromDate(daysAgo(2)),
    },
    {
      title: "Notice of Water Service Interruption — Bayombong",
      body: "The Bayombong Water District will conduct emergency repairs on a burst main affecting Brgy. Centro and Brgy. Magapuy. Water service will be interrupted on May 16 from 8 AM to 6 PM.",
      municipality: "Bayombong",
      isUrgent: true,
      postedBy: "Bayombong Water District",
      sourceUrl: "",
      sourceLabel: "",
      imageUrl: "",
      timestamp: admin.firestore.Timestamp.fromDate(daysAgo(1)),
    },
  ];

  for (const ann of announcements) {
    const ref = db.collection("announcements").doc();
    batch.set(ref, ann);
    opCount++;
    if (opCount >= 490) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) await batch.commit();

  return {
    message: "Demo data seeded successfully.",
    usersCreated: demoUsers.length,
    reportsCreated: demoReports.length,
    announcementsCreated: announcements.length,
  };
});

// ── Auto-archive reports older than 12 months ───────────────────────────────
// Runs daily at 2 AM Manila time. Marks reports with reportedAt > 12 months
// as 'archived' so they no longer appear in active admin views.
exports.archiveOldReports = onSchedule(
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

    const toArchive = snapshot.docs.filter(
      (d) => d.data().status !== "archived"
    );

    if (toArchive.length === 0) {
      console.log("archiveOldReports: nothing to archive");
      return;
    }

    // Use rolling batches to stay under Firestore's 500-write limit
    let batch = db.batch();
    let count = 0;
    for (const doc of toArchive) {
      batch.update(doc.ref, {
        status: "archived",
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

// ── Setup demo admin claims ──────────────────────────────────────────────────
// Call this with the UID of your real Firebase Auth users to grant admin roles.
// Example: { uid: "REAL_UID_FROM_FIREBASE_AUTH", role: "municipal_admin" }
// TODO: REMOVE THIS FUNCTION BEFORE PRODUCTION LAUNCH
exports.grantDemoAdminRole = onCall(async (request) => {
  // SECURITY: restrict to known admin UIDs only; remove before public launch
  const ALLOWED_DEMO_UIDS = []; // add your UID here to enable
  if (!ALLOWED_DEMO_UIDS.includes(request.auth?.uid)) {
    throw new HttpsError('permission-denied', 'Not authorized');
  }

  const { uid, role } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "UID is required.");

  const validRoles = ["municipal_admin", "provincial_admin", "admin"];
  const targetRole = validRoles.includes(role) ? role : "municipal_admin";

  await admin.auth().setCustomUserClaims(uid, { role: targetRole });
  await admin.firestore().collection("users").doc(uid).set(
    { role: targetRole },
    { merge: true }
  );

  return { message: `Granted ${targetRole} to ${uid}` };
});

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
    if (usersSnap.empty) return;

    const tokens = usersSnap.docs
      .map((d) => d.data().fcmToken)
      .filter(Boolean);

    if (tokens.length === 0) return;

    // Distinguish an urgent broadcast in the notification tray: a 🚨 URGENT
    // title prefix, and routing to the dedicated high-importance "urgent"
    // channel the app registers (heads-up banner + sound + vibration + red
    // accent). Routine broadcasts stay on the calm "broadcasts" channel.
    // The raw title/body are still sent in the data payload so the in-app
    // presenter can render its own urgent takeover without the prefix.
    const pushTitle = urgent ? `🚨 URGENT · ${title}` : title;

    // Send in batches of 500 (FCM limit)
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await admin
        .messaging()
        .sendEachForMulticast({
          tokens: batch,
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
        })
        .catch((e) => console.error("Batch FCM failed:", e));
    }
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
    if (usersSnap.empty) return;

    const tokens = usersSnap.docs.map((d) => d.data().fcmToken).filter(Boolean);
    if (tokens.length === 0) return;

    const isUrgent = data.isUrgent === true;
    // Urgent announcements get the same tray distinction as urgent broadcasts:
    // a 🚨 URGENT title prefix and routing to the high-importance "urgent"
    // channel (heads-up + sound + red accent). Routine announcements land on
    // the calm "announcements" channel.
    const pushTitle = isUrgent ? `🚨 URGENT · ${title}` : title;
    const pushBody = (body || "").slice(0, 240);

    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await admin
        .messaging()
        .sendEachForMulticast({
          tokens: batch,
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
        })
        .catch((e) => console.error("Announcement FCM batch failed:", e));
    }
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
exports.fetchLinkPreview = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const url = String(request.data?.url || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new HttpsError("invalid-argument", "Enter a valid http(s) link.");
  }

  let html = "";
  try {
    const resp = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OneVizcayaBot/1.0; +https://nuevavizcaya.gov.ph)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    html = await resp.text();
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

/**
 * Scheduled rainfall watch (PANaHON-style automatic weather alerts). Every 3
 * hours it checks the short-term forecast for each municipality and, when
 * meaningful rain is imminent, sends a push to that town's users via a broadcast
 * (which onNewBroadcast delivers over FCM). A 6-hour per-municipality cooldown
 * prevents spam.
 *
 * Requires the OPENWEATHER_API_KEY environment variable on the functions
 * runtime (e.g. `firebase functions:secrets:set OPENWEATHER_API_KEY` or a
 * .env entry). Without it the job logs a warning and no-ops — nothing breaks.
 */
exports.rainfallWatch = onSchedule(
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

        await db.collection("broadcasts").add({
          title,
          body,
          scope: muni,
          type: "weather",
          source: "rainfallWatch",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        await alertRef.set(
          { lastAlertMs: now, municipality: muni },
          { merge: true }
        );
        console.log(
          `rainfallWatch: alerted ${muni} (pop ${maxPop}, rain ${totalRain}).`
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
exports.windyWindWatch = onSchedule(
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

        await db.collection("broadcasts").add({
          title,
          body,
          scope: muni,
          urgent: severe,
          type: "weather",
          source: "windyWindWatch",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        await alertRef.set(
          { lastWindAlertMs: now, municipality: muni },
          { merge: true }
        );
        console.log(`windyWindWatch: alerted ${muni} (gust ${maxGust} km/h).`);
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
async function deleteImageByUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return;
  try {
    // Download URLs look like:
    //   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<ENCODED_PATH>?alt=media&token=...
    const match = imageUrl.match(/\/o\/([^?]+)/);
    if (!match) return;
    const objectPath = decodeURIComponent(match[1]);
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
    await deleteImageByUrl(data.imageUrl);
  }
);

// ── RA 10173 retention: purge reports older than 24 months ───────────────────
// Runs daily at 3 AM Manila time. The privacy policy commits to deleting
// archived reports after 24 months; archiveOldReports only marks them at 12
// months. This job deletes report documents (and their photos) past 24 months,
// which also triggers cleanupReportImageOnDelete for Storage cleanup.
exports.deleteOldArchivedReports = onSchedule(
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

    if (snapshot.empty) {
      console.log("deleteOldArchivedReports: nothing to delete");
      return;
    }

    // Delete photos first (best-effort), then the docs in rolling batches.
    let batch = db.batch();
    let count = 0;
    let deleted = 0;
    for (const doc of snapshot.docs) {
      await deleteImageByUrl(doc.data().imageUrl);
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
    console.log(`deleteOldArchivedReports: deleted ${deleted} reports older than 24 months`);
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
