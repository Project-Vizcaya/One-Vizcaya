"use strict";

// Push delivery accounting for broadcasts and announcements (PDRRMO P2).
//
// FCM's sendEachForMulticast returns one result per token. We count them, and
// collect the tokens FCM says are permanently dead (app uninstalled, token
// rotated) so the caller can remove them from user profiles. Only these two
// error codes mean "this token will never work again"; anything else (quota,
// server unavailable, a bad payload) is a failure of this send, not of the
// token, and must not cause a token to be deleted.

const BATCH = 500; // FCM multicast limit
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/**
 * @param {{sendEachForMulticast: Function}} messaging  admin.messaging()
 * @param {{uid: string, token: string}[]} recipients
 * @param {object} message  multicast message without `tokens`
 * @returns {Promise<{attempted: number, delivered: number, failed: number,
 *   deadTokens: {uid: string, token: string}[]}>}
 */
async function sendWithAccounting(messaging, recipients, message) {
  const out = { attempted: recipients.length, delivered: 0, failed: 0, deadTokens: [] };
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    let res;
    try {
      res = await messaging.sendEachForMulticast({ ...message, tokens: batch.map((r) => r.token) });
    } catch (e) {
      // The whole batch was refused; no token is known to be dead.
      console.error("FCM batch failed:", e);
      out.failed += batch.length;
      continue;
    }
    res.responses.forEach((r, j) => {
      if (r.success) { out.delivered++; return; }
      out.failed++;
      if (DEAD_TOKEN_CODES.has(r.error?.code)) out.deadTokens.push(batch[j]);
    });
  }
  return out;
}

/**
 * Users with a token, one entry per user, ready for sendWithAccounting.
 * @param {{id: string, data: () => object}[]} userDocs
 */
function recipientsFrom(userDocs) {
  return userDocs
    .map((d) => ({ uid: d.id, token: d.data().fcmToken }))
    .filter((r) => typeof r.token === "string" && r.token.length > 0);
}

module.exports = { sendWithAccounting, recipientsFrom, DEAD_TOKEN_CODES, BATCH };
