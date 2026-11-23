"use strict";

// Callable logic for the Post Maker AI helper, with its dependencies passed in
// so it can be tested without Claude or Secret Manager.

const { validate, buildParams, parseResponse, AssistError, dayKey, DAILY_LIMIT, MODEL } = require("./postAssist");

const ADMIN_ROLES = ["municipal_admin", "admin", "provincial_admin", "super_admin"];

class PostAssistService {
  /**
   * @param {FirebaseFirestore.Firestore} db
   * @param {{readKey: () => Promise<string|null>, makeClient: (key: string) => any,
   *          now?: () => number, serverTimestamp: () => any, isRetryable?: (e: any) => boolean}} deps
   */
  constructor(db, deps) {
    this.db = db;
    this.deps = { now: Date.now, isRetryable: () => false, ...deps };
  }

  async available() {
    const cfg = (await this.db.doc("config/ai").get()).data() || {};
    if (cfg.postAssistEnabled === false) return false;
    return !!(await this.deps.readKey());
  }

  /** @returns {Promise<{headline: string, caption: string, model: string, remainingToday: number}>} */
  async draft(uid, role, data) {
    if (!ADMIN_ROLES.includes(role)) throw new AssistError("permission-denied", "Only admins can use the AI helper.");
    const input = validate(data);
    const cfg = (await this.db.doc("config/ai").get()).data() || {};
    if (cfg.postAssistEnabled === false) throw new AssistError("failed-precondition", "The AI helper is switched off.");
    const key = await this.deps.readKey();
    if (!key) throw new AssistError("failed-precondition", "The AI helper is not set up (no API key).");

    // Per-admin daily limit, counted before the call so a burst cannot exceed it.
    const usageRef = this.db.doc(`ai_usage/${uid}_${dayKey(this.deps.now())}`);
    const used = await this.db.runTransaction(async (tx) => {
      const n = ((await tx.get(usageRef)).data() || {}).count || 0;
      if (n >= DAILY_LIMIT) return null;
      tx.set(usageRef, { uid, day: dayKey(this.deps.now()), count: n + 1 }, { merge: true });
      return n + 1;
    });
    if (used === null) {
      throw new AssistError("resource-exhausted", `Daily limit of ${DAILY_LIMIT} AI drafts reached. Try again tomorrow.`);
    }

    let msg;
    try {
      msg = await this.deps.makeClient(key).beta.messages.create(buildParams(input));
    } catch (e) {
      console.error("draftPostText: Claude request failed:", e && e.status, e && e.message);
      throw new AssistError("unavailable",
        this.deps.isRetryable(e) ? "The AI service is busy. Try again in a minute." : "The AI service could not be reached.");
    }
    const out = parseResponse(msg);

    // Audited without the text itself: who, when, what kind, how long.
    await this.db.collection("audit_logs").add({
      action: "ai_post_draft",
      uid,
      issuer: input.issuer,
      template: input.template,
      lang: input.lang,
      inputChars: input.headline.length + input.body.length,
      outputChars: out.headline.length + out.caption.length,
      model: out.model || MODEL,
      at: this.deps.serverTimestamp(),
    });
    return { ...out, remainingToday: Math.max(0, DAILY_LIMIT - used) };
  }
}

module.exports = { PostAssistService, ADMIN_ROLES };
