"use strict";

// Firestore security-rule tests, run against the real firestore.rules in the
// Firestore emulator (npm test — needs Java 11+). Rules are evaluated exactly
// as in production, including how separate `allow` statements combine: they
// are OR-ed, so a permissive rule elsewhere (e.g. the super-admin bypass) can
// grant access that a later `allow write: if false` does not take away.

const { test, before, after, beforeEach } = require("node:test");
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
  await assertSucceeds(setDoc(doc(as("muni"), "broadcasts/b2"), { scope: "Bambang" }));
  await assertFails(setDoc(doc(as("muni"), "broadcasts/b3"), { scope: "all" }));
  await assertFails(setDoc(doc(as("muni"), "broadcasts/b4"), { scope: "municipality", municipality: "Solano" }));
});

test("an admin with no municipality on their profile cannot reach everyone", async () => {
  await assertFails(setDoc(doc(as("muniNoTown"), "broadcasts/b5"), { scope: "all", municipality: "" }));
});

test("a provincial admin may broadcast province-wide", async () => {
  await assertSucceeds(setDoc(doc(as("prov"), "broadcasts/b6"), { scope: "all" }));
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
