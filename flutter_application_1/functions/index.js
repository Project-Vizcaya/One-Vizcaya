const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

exports.trackReportRate = onDocumentCreated("problem_reports/{reportId}", async (event) => {
    // In V2, the snapshot is inside event.data
    const snap = event.data;
    if (!snap) return null;

    const data = snap.data();
    const userId = data.userId;

    if (!userId) return null;

    const rateLimitRef = admin.firestore().collection("rate_limits").doc(userId);

    // Use a transaction to safely count reports
    return admin.firestore().runTransaction(async (transaction) => {
        const doc = await transaction.get(rateLimitRef);

        if (!doc.exists) {
            // First report ever! Set count to 1.
            transaction.set(rateLimitRef, {
                count: 1,
                lastReset: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            const docData = doc.data();
            const lastReset = docData.lastReset ? docData.lastReset.toDate() : new Date();
            const now = new Date();

            // Calculate hours since the last reset
            const hoursSinceReset = Math.abs(now - lastReset) / 36e5;

            if (hoursSinceReset > 24) {
                // It's been a day! Reset their spam count back to 1.
                transaction.set(rateLimitRef, {
                    count: 1,
                    lastReset: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Still within 24 hours, add 1 to their count.
                transaction.update(rateLimitRef, {
                    count: (docData.count || 0) + 1
                });
            }
        }
    });
});