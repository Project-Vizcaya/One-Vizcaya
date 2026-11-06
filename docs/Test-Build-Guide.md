# Saturday Test Build — Step-by-Step Guide

What you are testing: **branch `claude/test-build-combined`**, which is **P1 + P2 + P3 + the
experimental UI/UX redesign**. Everything except the UI redesign is already on `main` (PR #135).
The UI redesign goes to main later as its own PR, after your feedback.

> ⚠️ **There is only one Firebase project, `one-vizcaya-app`, and real users are on it.**
> Three rules for the whole day:
> 1. **Never approve an urgent or province-wide alert** unless every user in that town is a
>    test account. Approving sends a real push to real residents. Test approval, then
>    **Reject** or **Withdraw**.
> 2. **Start every test report's description with "TEST –"** and close them at the end (§7).
> 3. **The production website stays on `main`**. The redesigned console is tested on a
>    temporary preview link (§3.4), so real admins never see an unreviewed UI.

Tick each box as you go. Write down anything odd (screen, steps, what you expected) for §8.

---

## 1. Prepare tonight

### 1.1 Files (gitignored, never committed; runbook §1)
- [ ] `apps/mobile/lib/firebase_options.dart`
- [ ] `apps/mobile/android/app/google-services.json`
- [ ] `apps/mobile/android/key.properties` and the release keystore it points to

### 1.2 Test accounts
Use Firebase **test phone numbers** (runbook §3) so you are not limited by the SMS quota.

| Account | Role | Needed for |
|---|---|---|
| Admin A | `municipal_admin` of your test town | proposing alerts, lifecycle, referrals |
| Admin B | `municipal_admin` of **the same** town | approving A's alert (second approver) |
| Admin P | `provincial_admin` | province-wide approval, filing anywhere |
| Resident C | citizen, residency **certified**, in the test town | reporting, proxy reporting, inbox |
| Resident U | citizen, residency **not** certified | checking proxy reporting is refused |

- [ ] All five accounts exist, with roles granted through the normal nominate → approve flow.
- [ ] Pick a **test town**, and note how many real users it has. If any, never approve an
      alert for it.

### 1.3 Devices
- [ ] Two Android phones if possible: one small screen, one normal. Second-approver and
      background-delivery tests are much easier with two.
- [ ] A laptop for the web console (Chrome).

### 1.4 Tools on your PC
- [ ] Flutter (3.44 or later), Node 22, Firebase CLI (`firebase --version`), Java 21 (only
      needed to run the emulator tests).
- [ ] `firebase login`, then `firebase use one-vizcaya-app`.

---

## 2. Get the code

```bash
git fetch origin
git checkout claude/test-build-combined
git pull
```

- [ ] Copy the files from §1.1 into place.
- [ ] Optional, about 3 minutes: run the tests before deploying.
  ```bash
  cd apps/functions && npm install && npm test             # expect 91 pass
  cd ../../tests/emulator && npm install && npm test       # expect 79 pass (needs Java)
  cd ../../apps/mobile && flutter pub get && flutter test  # expect 45 pass
  ```

---

## 3. Deploy the backend (do this **before** testing, not during)

The rules, indexes and functions on `main` and on the test branch are **identical**, so
deploy them from **main**. That way production always matches main.

```bash
git checkout main && git pull
```

### 3.1 Rules and indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```
- [ ] Firebase Console → Firestore → **Indexes**: wait until the two new **`broadcasts`**
      indexes (`scope` + `timestamp`, `municipality` + `timestamp`) say **Enabled**. This can
      take several minutes. Until then the resident inbox shows no alerts.
- [ ] If the CLI offers to **delete** an index you did not remove, answer **No**.

### 3.2 Functions
```bash
cd apps/functions && npm install && cd ../..
firebase deploy --only functions
```
- [ ] New functions appear: `health`, `proposeAdminAlert`, `auditReportReferral`.
- [ ] If asked to delete a function, answer **No**, and write down its name.

### 3.3 Production website (from main)
```bash
cd apps/web && npm install && npm run build && cd ../..
firebase deploy --only hosting
```
This must be deployed together with the rules. The new rules refuse the old console's
direct urgent broadcasts; the new console sends them for approval instead.

### 3.4 Redesigned console on a preview link (from the test branch)
```bash
git checkout claude/test-build-combined
cd apps/web && npm install && npm run build && cd ../..
firebase hosting:channel:deploy saturday-test --expires 7d
```
- [ ] Copy the URL it prints (`https://one-vizcaya-app--saturday-test-….web.app`).
- [ ] Firebase Console → Authentication → Settings → **Authorized domains** → add that domain.
      Phone sign-in on the preview link fails without it.
- [ ] Open the preview link and sign in as Admin A.

### 3.5 Health check
- [ ] Open `https://us-central1-one-vizcaya-app.cloudfunctions.net/health`.
  - `"status": "ok"` → good.
  - `unknown` for daily jobs → normal on day one.
  - `down`, `failing` or `stale` → stop. Check Firebase Console → Functions → Logs before
    going further.

---

## 4. Build and install the app (from the test branch)

```bash
git checkout claude/test-build-combined
cd apps/mobile
```
1. [ ] Bump the version in `pubspec.yaml`: `version: 1.8.0+30` → **`1.9.0+31`**. The number
       after `+` must go up.
2. [ ] `flutter pub get`. It adds `workmanager` and the new font. If `pubspec.lock` changes,
       **don't commit it** unless only `workmanager` lines changed.
3. [ ] `flutter test` → 45 pass.
4. [ ] Build the sideload APK:
   ```bash
   flutter build apk --release --dart-define=FORCE_RECAPTCHA=true
   ```
   Output: `build/app/outputs/flutter-apk/`.
5. [ ] Install it on both phones. Uninstalling the old version first gives the cleanest
       start, but it clears any saved reports on that phone.
6. [ ] Sign in: phone 1 as **Admin A**, phone 2 as **Resident C**. Switch accounts later as
       the tests need.

---

## 5. Test — UI/UX redesign

Follow **`docs/experimental-uiux-test-checklist.md`** (on this branch). The most important
checks:
- [ ] **SOS screen on the small phone with large text** (Settings → Display → Font size →
      largest). The whole screen scrolls and **"I'm safe"** can be reached. This could not be
      tested automatically.
- [ ] New typeface in light and dark mode; no text too small; no yellow/black overflow stripes.
- [ ] Bottom bar labels and tap targets; My Reports card on the small phone.
- [ ] Web (preview link): visible keyboard focus, readable 12 px minimum text.

---

## 6. Test — P2 / P3 features

### 6.1 Offline and background delivery (Android) — *never tested on a device*
- [ ] Resident C: airplane mode **on** → file a "TEST –" report → the banner says it is saved.
- [ ] **Close the app completely** (swipe it away from recent apps).
- [ ] Airplane mode **off**. Wait up to ~5 minutes; don't open the app.
- [ ] On the web console the report appears **without the app being opened**. ✅ This is the
      new feature. If it only appears after opening the app, write down the phone model and
      Android version.
- [ ] Open the app: no duplicate report, and the banner is gone.

### 6.2 Second approver — **reject at the end, don't send**
- [ ] Admin A (preview console) → Broadcasts → compose → switch **Urgent** on → the button
      says **Request Approval** → send.
- [ ] Toast says "Sent for approval"; nothing was sent to the public.
- [ ] Admin A sees the alert under **Alerts awaiting approval** with **no Approve button**,
      only **Withdraw**.
- [ ] Admin B's phone gets an **"Approval needed"** push → tapping it opens the admin
      dashboard → the banner shows it → **Approve…** is offered.
- [ ] Admin B taps **Reject** with a note → it disappears for both.
- [ ] Repeat with a **province-wide** alert from Admin P: a municipal admin cannot approve it.
      Then **Withdraw**.
- [ ] Audit Log shows `admin_alert_proposed` and `admin_alert_rejected`.

### 6.3 Status lifecycle
- [ ] On a TEST report, "Solved" is greyed out ("from Ongoing only") until the status is
      **Ongoing**.
- [ ] Choosing Solved asks for "What was done" (at least 10 characters). It saves, and the
      detail shows **How it was resolved**.
- [ ] Mobile admin: "Mark Solved" appears only on Ongoing reports and asks for the note.
- [ ] Bulk status update no longer offers Solved.

### 6.4 Proxy reporting
- [ ] Resident C: Report a Problem → **"I'm filing this for someone else"** → enter a name →
      submit. The report shows "Filed on behalf of" in the console.
- [ ] Resident U: switching it on shows "Only officials and residents with certified residency…"
- [ ] Admin A (preview console) → Live Reports → **File for a resident** → the town is locked
      to Admin A's town.

### 6.5 Resident inbox
- [ ] Resident C → Notifications: recent alerts for the town and the province are listed.
      Tapping one shows the full text.
- [ ] Empty? Check the `broadcasts` indexes are **Enabled** (§3.1).

### 6.6 Referral and duplicates
- [ ] Console: Refer to Office → MDRRMO + name → saved, with "by admin … · recorded in the
      audit log".
- [ ] Mobile admin: the same report shows the referral; record a different office from the phone.
- [ ] File two TEST reports, same category and barangay, a few minutes apart → the detail of
      one lists the other under **Duplicates** → "Close it as a duplicate of this report" →
      it closes with the reason.

### 6.7 Console checks
- [ ] Live Reports: "Showing 100 of N", and **Show more** works when there are more than 100.
- [ ] Analytics: SLA targets show **Provisional**. Don't confirm them until the PDRRMO agrees.
- [ ] Broadcasts → **Recently sent** shows delivery counts for past alerts.

---

## 7. Clean up the same day
- [ ] Close every "TEST –" report with **Close without action → Incomplete**, reason
      "Saturday test build".
- [ ] No test alert is left under **Alerts awaiting approval**. Withdraw or reject any.
- [ ] Delete the preview channel when finished:
      `firebase hosting:channel:delete saturday-test`, and remove its domain from
      Authorized domains.
- [ ] Optional: put the old app back on any phone a real user relies on.

---

## 8. Report back

Post on tracker #134, or tell me directly:
- the result of each section (✅ / ❌), especially §5 SOS and §6.1 background delivery;
- for each problem: the phone model, Android version, screen, steps, expected and actual
  result, and a screenshot;
- your verdict on the UI redesign: keep as is, change specific things, or drop parts.

**Then:** I rebase the UI branch onto main with your changes, reusing the conflict fixes
already done on this branch, and open it as its own PR.

---

## 9. If something goes badly wrong

| Problem | What to do |
|---|---|
| Admins can't send any broadcast | Check §3.3 was deployed. The old console + new rules refuse urgent sends |
| Console shows no reports | Check the rules deploy succeeded; hard-refresh (Ctrl+Shift+R) |
| App won't sign in | `google-services.json` / SHA-1 (runbook §2); use test numbers |
| Need to undo the whole backend | `git checkout 1ec74da` (main before #135), then `firebase deploy --only firestore:rules,firestore:indexes,storage,hosting` and `firebase deploy --only functions` (answer **Yes** to deleting the three new functions only in this case), then `git checkout main` |

> **Safety:** for anything life-threatening during the test, residents still use 911, the
> PDRRMO hotline, radio and barangay officials, as the app itself says.
