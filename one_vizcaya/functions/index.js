// DEPLOYMENT: requires Firebase Blaze (pay-as-you-go) plan.
// Run: cd functions && npm install && firebase deploy --only functions
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

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

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Reset ${snapshot.size} rate limit records`);
  }
);

// ── Set Admin Role ───────────────────────────────────────────────────────────
// Supports roles: 'admin', 'municipal_admin', 'provincial_admin', 'citizen'
exports.setAdminRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }

  const callerRole = request.auth.token.role;
  const allowedCallers = ["admin", "provincial_admin"];

  if (!allowedCallers.includes(callerRole)) {
    throw new HttpsError("permission-denied", "Only admins can assign roles.");
  }

  const { uid, role } = request.data;
  if (!uid) throw new HttpsError("invalid-argument", "UID is required.");

  const validRoles = ["admin", "municipal_admin", "provincial_admin", "citizen"];
  const targetRole = validRoles.includes(role) ? role : "municipal_admin";

  await admin.auth().setCustomUserClaims(uid, { role: targetRole });

  // Also update Firestore user document
  await admin.firestore().collection("users").doc(uid).set(
    { role: targetRole },
    { merge: true }
  );

  return { message: `User ${uid} role set to ${targetRole}.` };
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

    const { title, body, scope } = data;
    if (!title || !body) return;

    const db = admin.firestore();

    // Query users in the target scope
    let query = db.collection("users").where("fcmToken", "!=", null);
    if (scope && scope !== "All Province") {
      query = query.where("municipality", "==", scope);
    }

    const usersSnap = await query.get();
    if (usersSnap.empty) return;

    const tokens = usersSnap.docs
      .map((d) => d.data().fcmToken)
      .filter(Boolean);

    if (tokens.length === 0) return;

    // Send in batches of 500 (FCM limit)
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await admin
        .messaging()
        .sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
          android: {
            notification: {
              channelId: "one_vizcaya_broadcasts",
              priority: "high",
              color: "#1B5E20",
            },
          },
        })
        .catch((e) => console.error("Batch FCM failed:", e));
    }
  }
);
