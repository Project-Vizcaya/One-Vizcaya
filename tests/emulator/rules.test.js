"use strict";

// Firestore security-rule tests, run against the real firestore.rules in the
// Firestore emulator (npm test — needs Java 11+). Rules are evaluated exactly
// as in production, including how separate `allow` statements combine: they
// are OR-ed, so a permissive rule elsewhere (e.g. the super-admin bypass) can
// grant access that a later `allow write: if false` does not take away.

const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeTestEnvironment, assertSucceeds, assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField, serverTimestamp, Timestamp,
  collection, query, where,
} = require("firebase/firestore");

let env;
const REPORT = "users/citizen/reports/r1";

const USERS = {
  super: { role: "super_admin" },
  prov: { role: "provincial_admin" },
  muni: { role: "municipal_admin", municipality: "Bambang" },
  muniOther: { role: "municipal_admin", municipality: "Solano" },
  muniNoTown: { role: "municipal_admin" },
  citizen: { role: "citizen", municipality: "Bambang", residencyStatus: "certified" },
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-onevizcaya",
    firestore: { rules: fs.readFileSync(path.join(__dirname, "../../firestore.rules"), "utf8") },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [uid, data] of Object.entries(USERS)) await setDoc(doc(db, "users", uid), data);
    await setDoc(doc(db, REPORT), {
      userId: "citizen", userPhone: "+639000000000", isAnonymous: false,
      municipality: "Bambang", barangay: "Poblacion", category: "Flooding",
      status: "reported", escalatedToProvince: false,
    });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();

/** A complete, valid "close without action" by `uid`. */
const closeBy = (uid, extra = {}) => ({
  status: "closed",
  disposition: "duplicate",
  dispositionReason: "Same flooding report as r0, filed twice.",
  dispositionBy: uid,
  dispositionAt: serverTimestamp(),
  ...extra,
});

// ── report disposition ─────────────────────────────────────────────────────

test("in-scope municipal admin can close a report with a valid disposition", async () => {
  await assertSucceeds(updateDoc(doc(as("muni"), REPORT), closeBy("muni")));
});

test("provincial admin can close a report anywhere", async () => {
  await assertSucceeds(updateDoc(doc(as("prov"), REPORT), closeBy("prov", { disposition: "false_report" })));
});

test("disposition must be stamped with the acting admin's own uid", async () => {
  await assertFails(updateDoc(doc(as("muni"), REPORT), closeBy("prov")));
});

test("a reason of at least 5 characters is required", async () => {
  await assertFails(updateDoc(doc(as("muni"), REPORT), closeBy("muni", { dispositionReason: "dup" })));
  await assertFails(updateDoc(doc(as("muni"), REPORT), closeBy("muni", { dispositionReason: deleteField() })));
});

test("only the four disposition values are accepted", async () => {
  await assertFails(updateDoc(doc(as("muni"), REPORT), closeBy("muni", { disposition: "spam" })));
});

test("dispositionAt must be the server's time, not a client-chosen one", async () => {
  await assertFails(updateDoc(doc(as("muni"), REPORT),
    closeBy("muni", { dispositionAt: Timestamp.fromDate(new Date("2020-01-01")) })));
});

test("'closed' requires a disposition, and a disposition requires 'closed'", async () => {
  await assertFails(updateDoc(doc(as("muni"), REPORT), { status: "closed" }));
  await assertFails(updateDoc(doc(as("muni"), REPORT), closeBy("muni", { status: "acknowledged" })));
});

test("an admin of another municipality cannot close the report", async () => {
  await assertFails(updateDoc(doc(as("muniOther"), REPORT), closeBy("muniOther")));
});

test("the reporting citizen cannot set or clear a disposition", async () => {
  await assertFails(updateDoc(doc(as("citizen"), REPORT), closeBy("citizen")));
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), REPORT), closeBy("muni")));
  await assertFails(updateDoc(doc(as("citizen"), REPORT), {
    status: "reported", disposition: deleteField(), dispositionReason: deleteField(),
  }));
});

test("the reporting citizen can no longer change their own report's status", async () => {
  await assertFails(updateDoc(doc(as("citizen"), REPORT), { status: "solved" }));
});

test("another admin can still add notes to a closed report", async () => {
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), REPORT), closeBy("muni")));
  await assertSucceeds(updateDoc(doc(as("prov"), REPORT), { notes: ["Checked again; duplicate confirmed."] }));
});

const reopenBy = (uid) => ({
  status: "under_review", disposition: deleteField(), dispositionReason: deleteField(),
  dispositionBy: deleteField(), dispositionAt: deleteField(), duplicateOf: deleteField(),
  reopenedBy: uid,
});

test("an admin can re-open a closed report, stamped with their own uid", async () => {
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), REPORT), closeBy("muni")));
  await assertSucceeds(updateDoc(doc(as("prov"), REPORT), reopenBy("prov")));
});

test("re-opening without (or with someone else's) reopenedBy is refused", async () => {
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), REPORT), closeBy("muni")));
  await assertFails(updateDoc(doc(as("muni"), REPORT), { ...reopenBy("muni"), reopenedBy: deleteField() }));
  await assertFails(updateDoc(doc(as("muni"), REPORT), reopenBy("prov")));
});

test("ordinary admin status changes still work", async () => {
  await assertSucceeds(updateDoc(doc(as("muni"), REPORT), { status: "acknowledged" }));
  await assertSucceeds(updateDoc(doc(as("muni"), REPORT), { status: "solved" }));
});

test("escalation approval still requires the owning town's admin and their uid", async () => {
  await assertSucceeds(updateDoc(doc(as("muni"), REPORT), { escalatedToProvince: true, escalatedBy: "muni" }));
});

// ── PAGASA products (Stage 5 item 10) ──────────────────────────────────────

test("any signed-in user can read the PAGASA document; anonymous cannot", async () => {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "pagasa_products/nueva_vizcaya"), { provider: "PAGASA" }));
  await assertSucceeds(getDoc(doc(as("citizen"), "pagasa_products/nueva_vizcaya")));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "pagasa_products/nueva_vizcaya")));
});

test("citizens and provincial admins cannot write the PAGASA document", async () => {
  await assertFails(setDoc(doc(as("citizen"), "pagasa_products/nueva_vizcaya"), { provider: "fake" }));
  await assertFails(setDoc(doc(as("prov"), "pagasa_products/nueva_vizcaya"), { provider: "fake" }));
});

test("a super admin can no longer write the PAGASA document or alert drafts", async () => {
  // Previously the global bypass let them (rules are OR-ed, so the
  // collections' own `allow write: if false` could not stop it).
  await assertFails(setDoc(doc(as("super"), "pagasa_products/nueva_vizcaya"), { provider: "fake" }));
  await assertFails(setDoc(doc(as("super"), "alert_drafts/d1"), { status: "approved" }));
});

test("a super admin can still read them, and still write everything else", async () => {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "pagasa_products/nueva_vizcaya"), { provider: "PAGASA" }));
  await assertSucceeds(getDoc(doc(as("super"), "pagasa_products/nueva_vizcaya")));
  await assertSucceeds(updateDoc(doc(as("super"), REPORT), { notes: ["super admin note"] }));
  await assertSucceeds(setDoc(doc(as("super"), "config/sla"), { provisional: true }));
  await assertSucceeds(setDoc(doc(as("super"), "users/someone"), { role: "citizen" }));
});

test("the super-admin bypass itself still grants writes (a collection no other rule covers)", async () => {
  // Guards against the bypass silently erroring: the collections above all
  // have their own rules granting super admins, so they cannot detect it.
  await assertSucceeds(setDoc(doc(as("super"), "zz_bypass_only/x"), { a: 1 }));
  await assertFails(setDoc(doc(as("prov"), "zz_bypass_only/x"), { a: 1 }));
});

// ── broadcast scope (from #133) ────────────────────────────────────────────

test("a municipal admin may broadcast only to their own town", async () => {
  await assertSucceeds(setDoc(doc(as("muni"), "broadcasts/b1"), { scope: "municipality", municipality: "Bambang" }));
  // The legacy `scope: <town>` spelling is no longer accepted from clients:
  // `municipality` is required so the target is unambiguous (P2).
  await assertFails(setDoc(doc(as("muni"), "broadcasts/b2"), { scope: "Bambang" }));
  await assertFails(setDoc(doc(as("muni"), "broadcasts/b3"), { scope: "all" }));
  await assertFails(setDoc(doc(as("muni"), "broadcasts/b4"), { scope: "municipality", municipality: "Solano" }));
});

test("an admin with no municipality on their profile cannot reach everyone", async () => {
  await assertFails(setDoc(doc(as("muniNoTown"), "broadcasts/b5"), { scope: "all", municipality: "" }));
});

// ── second approver for urgent / province-wide alerts (P2) ─────────────────

test("province-wide or urgent broadcasts cannot be written directly — not even by a super admin", async () => {
  // These go through proposeAdminAlert -> a second admin's approval.
  await assertFails(setDoc(doc(as("prov"), "broadcasts/b6"), { scope: "all" }));
  await assertFails(setDoc(doc(as("super"), "broadcasts/b7"), { scope: "all" }));
  const town = { scope: "municipality", municipality: "Bambang" };
  await assertFails(setDoc(doc(as("muni"), "broadcasts/b8"), { ...town, urgent: true }));
  await assertFails(setDoc(doc(as("prov"), "broadcasts/b9"), { ...town, urgent: true }));
  await assertFails(setDoc(doc(as("super"), "broadcasts/b10"), { ...town, urgent: true }));
  // Routine single-town alerts still go out directly.
  await assertSucceeds(setDoc(doc(as("prov"), "broadcasts/b11"), { ...town, urgent: false }));
  await assertSucceeds(setDoc(doc(as("super"), "broadcasts/b12"), town));
});

test("super admins can still read and delete broadcasts", async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "broadcasts/z"), { scope: "all" }));
  await assertSucceeds(getDoc(doc(as("super"), "broadcasts/z")));
  await assertSucceeds(deleteDoc(doc(as("super"), "broadcasts/z")));
});

// ── automated alert drafts (P1, PDRRMO §2) ─────────────────────────────────

async function seedDraft() {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "alert_drafts/d1"), {
      title: "Strong winds", municipality: "Bambang", status: "pending", urgent: true,
    }));
}

test("the town's admin and provincial admins can read its alert drafts", async () => {
  await seedDraft();
  await assertSucceeds(getDoc(doc(as("muni"), "alert_drafts/d1")));
  await assertSucceeds(getDoc(doc(as("prov"), "alert_drafts/d1")));
});

test("other towns' admins and citizens cannot read alert drafts", async () => {
  await seedDraft();
  await assertFails(getDoc(doc(as("muniOther"), "alert_drafts/d1")));
  await assertFails(getDoc(doc(as("citizen"), "alert_drafts/d1")));
});

test("no client can approve a draft by writing it directly", async () => {
  await seedDraft();
  await assertFails(updateDoc(doc(as("muni"), "alert_drafts/d1"), { status: "approved" }));
  await assertFails(updateDoc(doc(as("prov"), "alert_drafts/d1"), { status: "approved" }));
});

test("the console's pending-drafts queries are allowed exactly as written", async () => {
  await seedDraft();
  const pending = (fs, ...extra) =>
    getDocs(query(collection(fs, "alert_drafts"), where("status", "==", "pending"), ...extra));
  // Municipal admin: must filter to their own town (PendingAlertsCard does).
  await assertSucceeds(pending(as("muni"), where("municipality", "==", "Bambang")));
  await assertFails(pending(as("muni")));
  await assertFails(pending(as("muni"), where("municipality", "==", "Solano")));
  // Provincial admin: province-wide query is allowed.
  await assertSucceeds(pending(as("prov")));
});

// ── attributed deletion (P2, PDRRMO §8) ────────────────────────────────────

test("no client can delete a report directly — not even a super admin", async () => {
  // Deletion goes only through deleteReportWithReason, which records who.
  await assertFails(deleteDoc(doc(as("prov"), REPORT)));
  await assertFails(deleteDoc(doc(as("super"), REPORT)));
  await assertFails(deleteDoc(doc(as("citizen"), REPORT)));
});

test("the report-delete exclusion does not stop super admins deleting other things", async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "zz_bypass_only/y"), { a: 1 }));
  await assertSucceeds(deleteDoc(doc(as("super"), "zz_bypass_only/y")));
});

// ── SLA targets (P2, PDRRMO §7/§14) ────────────────────────────────────────

test("only provincial admins can change SLA targets; admins can read them", async () => {
  await assertSucceeds(setDoc(doc(as("prov"), "config/sla"), { hoursByPriority: { critical: 2 }, provisional: true }));
  await assertFails(setDoc(doc(as("muni"), "config/sla"), { hoursByPriority: { critical: 999 } }));
  await assertFails(setDoc(doc(as("citizen"), "config/sla"), { hoursByPriority: { critical: 999 } }));
  await assertSucceeds(getDoc(doc(as("muni"), "config/sla")));
});

// ── uncapped report queries, used by every console page (P2) ──────────────

test("the console's uncapped report queries are allowed exactly as written", async () => {
  const { collectionGroup, orderBy } = require("firebase/firestore");
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "users/brgy"),
    { role: "barangay_admin", municipality: "Bambang", barangay: "Poblacion" }));
  // Same shape as useReports(): no limit().
  const reports = (fs, ...scope) =>
    getDocs(query(collectionGroup(fs, "reports"), ...scope, orderBy("reportedAt", "desc")));
  await assertSucceeds(reports(as("muni"), where("municipality", "==", "Bambang")));
  await assertSucceeds(reports(as("prov"), where("escalatedToProvince", "==", true)));
  await assertSucceeds(reports(as("brgy"),
    where("municipality", "==", "Bambang"), where("barangay", "==", "Poblacion")));
  // Dropping the limit does not widen scope.
  await assertFails(reports(as("muni"), where("municipality", "==", "Solano")));
  await assertFails(reports(as("brgy"), where("municipality", "==", "Bambang")));
});

// ── push delivery counts are server-written (P2) ───────────────────────────

test("admins cannot write an alert's delivery counts themselves", async () => {
  const b = { title: "t", body: "b", scope: "municipality", municipality: "Bambang" };
  await assertSucceeds(setDoc(doc(as("muni"), "broadcasts/x1"), b));
  await assertFails(setDoc(doc(as("muni"), "broadcasts/x2"), { ...b, delivery: { delivered: 9999 } }));
  await assertFails(setDoc(doc(as("prov"), "broadcasts/x3"), { ...b, delivery: { delivered: 9999 } }));

  const a = { title: "t", body: "b", municipality: "Bambang" };
  await assertSucceeds(setDoc(doc(as("muni"), "announcements/y1"), a));
  await assertFails(setDoc(doc(as("muni"), "announcements/y2"), { ...a, delivery: { delivered: 1 } }));
  await env.withSecurityRulesDisabled((ctx) =>
    updateDoc(doc(ctx.firestore(), "announcements/y1"), { delivery: { delivered: 3 } }));
  // Editing the announcement keeps working; changing the counts does not.
  await assertSucceeds(updateDoc(doc(as("muni"), "announcements/y1"), { body: "edited" }));
  await assertFails(updateDoc(doc(as("prov"), "announcements/y1"), { delivery: { delivered: 9999 } }));
});

test("system_health is server-only, even for super admins", async () => {
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "system_health/escalateOverdueReports"), { lastSuccessAt: Timestamp.now() }));
  await assertFails(setDoc(doc(as("super"), "system_health/escalateOverdueReports"), { lastSuccessAt: Timestamp.now() }));
  await assertFails(getDoc(doc(as("prov"), "system_health/escalateOverdueReports")));
  await assertFails(getDoc(doc(as("citizen"), "system_health/escalateOverdueReports")));
});

// ── citizen broadcast inbox (P2) ───────────────────────────────────────────

test("residents can re-read the broadcasts addressed to them, with the app's queries", async () => {
  const { orderBy, limit } = require("firebase/firestore");
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const t = Timestamp.now();
    await setDoc(doc(db, "broadcasts/prov"), { title: "p", scope: "all", timestamp: t });
    await setDoc(doc(db, "broadcasts/legacy"), { title: "l", scope: "All Province", timestamp: t });
    await setDoc(doc(db, "broadcasts/draft"), { title: "d", scope: "Bambang", timestamp: t });
    await setDoc(doc(db, "broadcasts/town"), { title: "t", scope: "municipality", municipality: "Bambang", timestamp: t });
    await setDoc(doc(db, "broadcasts/other"), { title: "o", scope: "municipality", municipality: "Solano", timestamp: t });
    await setDoc(doc(db, "users/noTown"), { role: "citizen" });
  });
  const c = as("citizen"); // profile town: Bambang
  const byScope = (fs, towns) => getDocs(query(collection(fs, "broadcasts"),
    where("scope", "in", ["all", "All Province", ...towns]), orderBy("timestamp", "desc"), limit(20)));
  const byMuni = (fs, town) => getDocs(query(collection(fs, "broadcasts"),
    where("municipality", "==", town), orderBy("timestamp", "desc"), limit(20)));

  const a = await assertSucceeds(byScope(c, ["Bambang"]));
  assert.deepEqual(a.docs.map((d) => d.id).sort(), ["draft", "legacy", "prov"]);
  const b = await assertSucceeds(byMuni(c, "Bambang"));
  assert.deepEqual(b.docs.map((d) => d.id), ["town"]);

  // Another town's alerts stay closed, by query or by direct read.
  await assertFails(byMuni(c, "Solano"));
  await assertFails(byScope(c, ["Solano"]));
  await assertFails(getDoc(doc(c, "broadcasts/other")));
  await assertFails(getDocs(collection(c, "broadcasts"))); // unscoped
  await assertSucceeds(getDoc(doc(c, "broadcasts/town")));

  // No town on the profile: province-wide only.
  await assertSucceeds(byScope(as("noTown"), []));
  await assertFails(byMuni(as("noTown"), ""));
  // Signed-out: nothing.
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "broadcasts/prov")));
});

// ── referral to a named office (P2) ────────────────────────────────────────

const referBy = (uid, extra = {}) => ({
  referral: {
    officeType: "MDRRMO", officeName: "MDRRMO Bambang", contact: "", note: "",
    by: uid, at: serverTimestamp(), ...extra,
  },
});

test("an in-scope admin can refer a report to a named office, attributed to them", async () => {
  await assertSucceeds(updateDoc(doc(as("muni"), REPORT), referBy("muni")));
  // Re-referral replaces it.
  await assertSucceeds(updateDoc(doc(as("prov"), REPORT), referBy("prov", { officeType: "BFP", officeName: "BFP Bambang" })));
});

test("a referral must be stamped with the acting admin and the server time", async () => {
  await assertFails(updateDoc(doc(as("muni"), REPORT), referBy("prov")));
  await assertFails(updateDoc(doc(as("muni"), REPORT),
    referBy("muni", { at: Timestamp.fromDate(new Date("2020-01-01")) })));
});

test("a referral needs a listed office type, a real name and no extra fields", async () => {
  await assertFails(updateDoc(doc(as("muni"), REPORT), referBy("muni", { officeType: "Mayor" })));
  await assertFails(updateDoc(doc(as("muni"), REPORT), referBy("muni", { officeName: "x" })));
  await assertFails(updateDoc(doc(as("muni"), REPORT), referBy("muni", { note: "n".repeat(501) })));
  await assertFails(updateDoc(doc(as("muni"), REPORT), referBy("muni", { priority: "critical" })));
});

test("a referral cannot be removed, and other edits still work once referred", async () => {
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), REPORT),
    { referral: { officeType: "MDRRMO", officeName: "MDRRMO Bambang", by: "muni", at: Timestamp.now() } }));
  await assertFails(updateDoc(doc(as("muni"), REPORT), { referral: deleteField() }));
  await assertSucceeds(updateDoc(doc(as("muni"), REPORT), { status: "acknowledged" }));
});

test("outsiders and the reporter cannot set a referral", async () => {
  await assertFails(updateDoc(doc(as("muniOther"), REPORT), referBy("muniOther")));
  await assertFails(updateDoc(doc(as("citizen"), REPORT), referBy("citizen")));
});
