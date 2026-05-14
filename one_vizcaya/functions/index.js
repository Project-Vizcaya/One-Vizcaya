const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// ── Track report submissions for rate limiting ──
exports.trackReportRate = onDocumentCreated(
  "problem_reports/{reportId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return null;

    const data = snap.data();
    const userId = data.userId;
    if (!userId) return null;

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
        const lastReset = docData.lastReset
          ? docData.lastReset.toDate()
          : new Date();
        const now = new Date();
        const hoursSinceReset = Math.abs(now - lastReset) / 36e5;

        if (hoursSinceReset > 24) {
          transaction.set(rateLimitRef, {
            count: 1,
            lastReset: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.update(rateLimitRef, {
            count: (docData.count || 0) + 1,
          });
        }
      }
    });
  }
);

// ── Also track sub-collection reports ──
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
        const lastReset = docData.lastReset
          ? docData.lastReset.toDate()
          : new Date();
        const now = new Date();
        const hoursSinceReset = Math.abs(now - lastReset) / 36e5;

        if (hoursSinceReset > 24) {
          transaction.set(rateLimitRef, {
            count: 1,
            lastReset: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.update(rateLimitRef, {
            count: (docData.count || 0) + 1,
          });
        }
      }
    });
  }
);

// ── Reset all rate limits daily at midnight Philippines time ──
exports.resetRateLimits = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Manila" },
  async () => {
    const db = admin.firestore();
    const snapshot = await db.collection("rate_limits").get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Reset ${snapshot.size} rate limit records at midnight Manila time`);
  }
);

// ── Set Admin Role for LGU staff ──
exports.setAdminRole = onCall(async (request) => {
  // Only existing admins can promote others
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only admins can assign roles."
    );
  }

  const { uid } = request.data;
  if (!uid) {
    throw new HttpsError("invalid-argument", "UID is required.");
  }

  await admin.auth().setCustomUserClaims(uid, { role: "admin" });
  return { message: `User ${uid} is now an admin.` };
});