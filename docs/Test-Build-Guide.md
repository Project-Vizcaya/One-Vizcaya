# Wednesday Test Build — Step-by-Step Guide

What you are testing: **branch `claude/test-build-combined`**, which is everything:

| Part | What | Status |
|---|---|---|
| P1–P3 | PDRRMO response work (alerts approval, lifecycle, proxy reporting, offline delivery…) | On `main` (PR #135) |
| PR #137 | Privacy fix, Hazard Watch, Post Maker, PAGASA source, earthquakes, DPWH data | Draft PR, not on `main` yet |
| UI/UX | Experimental redesign (typeface, bottom bar, SOS layout, console contrast) | Only on this branch |

After your feedback: PR #137 is merged to `main`, then the redesign goes to `main` as its own PR.

> ⚠️ **There is only one Firebase project, `one-vizcaya-app`, and real users are on it.**
> 1. **Never approve an urgent or province-wide alert** unless every user in that town is a
>    test account. Approving sends a real push to real residents. Approve, then **Reject**
>    or **Withdraw**.
> 2. **Start every test report's description with "TEST –"** and close them at the end (§8).
> 3. **The production website stays on `main`.** The test console is on a temporary preview
>    link (§3.4), so real admins never see unreviewed screens.
> 4. **Don't press "Show to residents"** (flood-control list, Hazard Watch) until the
>    Governor's office approves. Real residents would see it immediately.

Tick each box as you go. Write down anything odd (screen, steps, what you expected) for §9.
Budget: about 30 min setup the night before, 1 hour deploy and build, 2–3 hours testing.

---

## 1. Prepare (Tuesday night)

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
| Admin P | `provincial_admin` | province-wide approval, Hazard Watch switch, filing anywhere |
| Resident C | citizen, residency **certified**, in the test town | reporting, proxy, inbox, privacy |
| Resident U | citizen, residency **not** certified | checking proxy reporting is refused |
| Resident D | throwaway citizen | account deletion (§6.3) |

- [ ] All accounts exist, with roles granted through the normal nominate → approve flow.
- [ ] Pick a **test town** and note how many real users it has. If any, never approve an
      alert for it.

### 1.3 Devices
- [ ] Two Android phones if possible: one small screen, one normal.
- [ ] A laptop with Chrome for the console.

### 1.4 Tools on your PC
- [ ] Flutter 3.44+, Node 22, Firebase CLI, Java 21 (only for the emulator tests).
- [ ] `firebase login`, then `firebase use one-vizcaya-app`.

---

## 2. Get the code (Wednesday morning)

```bash
git fetch origin
git checkout claude/test-build-combined
git pull
```
- [ ] Copy the files from §1.1 into place.
- [ ] Optional, about 5 minutes: run the tests.
  ```bash
  cd apps/functions && npm install && npm test             # expect 120 pass
  cd ../../tests/emulator && npm install && npm test       # expect 113 pass (needs Java)
  cd ../../apps/mobile && flutter pub get && flutter test  # expect 72 pass
  cd ../..
  ```

---

## 3. Deploy the backend (before testing, not during)

The rules and functions on this branch are **identical** to PR #137's, so deploy them from
here. Rules and functions must go **together**: the new rules stop admin phones writing into
a resident's inbox, and the functions now write those entries.

### 3.1 Rules, indexes, storage
```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```
- [ ] Firebase Console → Firestore → **Indexes**: the two **`broadcasts`** indexes (`scope` +
      `timestamp`, `municipality` + `timestamp`) say **Enabled**. This can take several
      minutes; until then the resident inbox shows no alerts.
- [ ] If the CLI offers to **delete** an index you did not remove, answer **No**.

### 3.2 Functions
```bash
cd apps/functions && npm install && cd ../..
firebase deploy --only functions
```
- [ ] New functions appear, including `health`, `proposeAdminAlert`, `auditReportReferral`,
      `hazardWatch`, `pagasaMobileWatch`, `getPagasaForecast`, `postAssistStatus`,
      `draftPostText` (some may already exist if you deployed `main` before).
- [ ] If asked to **delete** a function, answer **No** and write down its name.

### 3.3 Production website (from `main`)
The old console doesn't work with the new rules for urgent alerts, so production must be at
least `main`. Always build right before deploying: `firebase deploy` uploads whatever is in
`apps/web/dist`.
```bash
git checkout main && git pull
cd apps/web && npm install && npm run build && cd ../..
firebase deploy --only hosting
git checkout claude/test-build-combined
```

### 3.4 Test console on a preview link (from this branch)
```bash
cd apps/web && npm install && npm run build && cd ../..
firebase hosting:channel:deploy wednesday-test --expires 7d
```
- [ ] Copy the URL it prints (`https://one-vizcaya-app--wednesday-test-….web.app`).
- [ ] Firebase Console → Authentication → Settings → **Authorized domains** → add that
      domain. Phone sign-in on the preview link fails without it.
- [ ] Open the preview link and sign in as Admin P.

### 3.5 Health check
- [ ] Open `https://us-central1-one-vizcaya-app.cloudfunctions.net/health`.
  - `"status": "ok"` → good. `unknown` for daily jobs, or for `hazardWatch` in its first
    10 minutes → normal.
  - `down`, `failing` or `stale` → stop. Check Firebase Console → Functions → Logs.

---

## 4. Build and install the app

```bash
cd apps/mobile
```
1. [ ] Bump the version in `pubspec.yaml`: `version: 1.8.0+30` → **`1.9.0+31`**. The number
       after `+` must go up. (Don't commit this; I'll set it on `main`.)
2. [ ] `flutter pub get`. If `pubspec.lock` changes, **don't commit it**.
3. [ ] Build the sideload APK:
   ```bash
   flutter build apk --release --dart-define=FORCE_RECAPTCHA=true
   ```
   Output: `build/app/outputs/flutter-apk/app-release.apk`.
4. [ ] Install it on both phones. Uninstalling the old version first gives the cleanest
       start, but clears any reports saved offline on that phone.
5. [ ] Sign in: phone 1 as **Admin A**, phone 2 as **Resident C**. Switch accounts as needed.

---

## 5. Test — UI/UX redesign

Follow **`docs/experimental-uiux-test-checklist.md`**. The most important checks:
- [ ] **SOS screen on the small phone with large text** (Settings → Display → Font size →
      largest). The whole screen scrolls and **"I'm safe"** can be reached.
- [ ] New typeface in light and dark mode; no text too small; no yellow/black overflow stripes.
- [ ] Bottom bar labels and tap targets; My Reports card on the small phone.
- [ ] Web (preview link): visible keyboard focus, readable text.

---

## 6. Test — PR #137 (new since Saturday's plan)

### 6.1 Privacy (most important)
- [ ] Resident C files "TEST – privacy". Admin A sets it **Ongoing**, then **Solved** with a note.
- [ ] Resident C's home "Recently resolved" shows **only their own** reports, nobody else's.
      Empty state reads "None of your reports is resolved yet".
- [ ] Resident C's inbox gets **one** entry and **one** push per status change (not two).
- [ ] Change a status from the **console**: the inbox entry still arrives (before, it didn't).

### 6.2 Admin alert-tap setting
- [ ] Admin A: Settings → Notifications → "Overdue alerts open the report". Off: tapping an
      overdue alert opens the Admin Dashboard; on: it opens the report. (Overdue alerts come
      from the escalation job; skip if none arrives.)

### 6.3 Account deletion
- [ ] Resident D files one "TEST –" report, then Settings → Delete account. It completes,
      and the report shows as **archived** in the console.

### 6.4 Hazard Watch (preview console → Operations → Hazard Watch)
- [ ] Page loads; counts and filters work. Your area's open SOS and hazard reports come **first**.
- [ ] Bottom line: "USGS: updated … ago" within 10 minutes of deploying; "PHIVOLCS: off".
- [ ] Recent earthquakes within 400 km appear (usually a few). "Show on map" pans to them.
- [ ] Tick **Show DPWH flood-control structures**: about 85 blue diamonds (fewer as Admin A).
      Clicking one shows description, town, type, year, completion, with **no** contractor or cost.
- [ ] As Admin P: "Resident app list … **hidden**" appears. **Don't press it.**
      As Admin A: the line is absent.
- [ ] "Official hazard services": all six links open the right agency site.
- [ ] Hotlines bar: 911 and your town's MDRRMO.

### 6.5 Post Maker (preview console → Post Maker)
- [ ] "Start from" an announcement, a broadcast and a PAGASA item: text fills in.
- [ ] Each format (Feed post, Square, Story, Landscape), with and without a photo. Text never
      overlaps the footer; long text ends with "…".
- [ ] Download PNG; Copy image; Copy caption in English, Tagalog, Ilocano.
- [ ] As Admin A: the issuer is locked to your town.
- [ ] No AI button. Correct: it appears only after you add an Anthropic key
      (`docs/post-maker.md`). Optional; skip on Wednesday.

### 6.6 App: Emergency Contacts and town info
- [ ] Emergency Contacts: new collapsed section **Official hazard services** (6); each opens
      the agency site.
- [ ] "Recent earthquakes near Nueva Vizcaya" shows **only** after a M3.5+ quake within
      150 km in the last 48 hours. Usually absent; that's correct.
- [ ] Tap the town name in the home header: the info sheet shows the **ZIP code**, and **no**
      flood-control section (switched off).
- [ ] Switch to Tagalog and Ilocano: the new labels follow.

### 6.7 PAGASA forecast (optional)
Off by default (`config/weather.pagasaMobileEnabled` missing or `false`); the app shows the
international forecast as before.
- [ ] Optional, since you have PAGASA's permission: set `pagasaMobileEnabled: true`, wait 5
      minutes, open Weather. PAGASA data with the "not an official PAGASA app" notice → good.
      Errors on the console Weather page → set it back to `false` and send me the error (this
      is the first run against the real PAGASA service).

---

## 7. Test — P1 to P3 (never tested on a device yet)

### 7.1 Offline and background delivery (Android)
- [ ] Resident C: airplane mode **on** → file a "TEST –" report → the banner says it is saved.
- [ ] **Close the app completely** (swipe it away from recent apps).
- [ ] Airplane mode **off**. Wait up to ~5 minutes; don't open the app.
- [ ] The report appears on the console **without the app being opened**. If it only appears
      after opening the app, note the phone model and Android version.
- [ ] Open the app: no duplicate report, and the banner is gone.

### 7.2 Second approver — **reject at the end, don't send**
- [ ] Admin A (preview console) → Broadcasts → compose → **Urgent** on → the button says
      **Request Approval** → send. Toast: "Sent for approval"; nothing went public.
- [ ] Admin A sees it under **Alerts awaiting approval** with only **Withdraw**.
- [ ] Admin B's phone gets **"Approval needed"** → tap → dashboard banner → **Approve…** offered.
- [ ] Admin B taps **Reject** with a note → it disappears for both.
- [ ] Province-wide alert from Admin P: a municipal admin cannot approve it. **Withdraw**.
- [ ] Audit Log shows `admin_alert_proposed` and `admin_alert_rejected`.

### 7.3 Status lifecycle
- [ ] "Solved" is greyed out ("from Ongoing only") until the report is **Ongoing**.
- [ ] Solved asks "What was done" (10+ characters); the detail shows **How it was resolved**.
- [ ] Mobile admin: "Mark Solved" only on Ongoing reports, with the note.
- [ ] Bulk status update doesn't offer Solved.

### 7.4 Proxy reporting
- [ ] Resident C: Report a Problem → **"I'm filing this for someone else"** → name → submit.
      The console shows "Filed on behalf of".
- [ ] Resident U: the switch says only officials and certified residents can.
- [ ] Admin A (console) → Live Reports → **File for a resident**: town locked to Admin A's.

### 7.5 Resident inbox
- [ ] Resident C → Notifications: recent alerts for the town and province; tapping shows the text.
- [ ] Empty? Check the `broadcasts` indexes are **Enabled** (§3.1).

### 7.6 Referral and duplicates
- [ ] Console: Refer to Office → MDRRMO + name → saved, "recorded in the audit log".
- [ ] Mobile admin: the same report shows the referral; record a different office from the phone.
- [ ] Two TEST reports, same category and barangay, minutes apart → **Duplicates** lists the
      other → "Close it as a duplicate of this report" → closes with the reason.

### 7.7 Console checks
- [ ] Click through every console page once: each loads (pages now load on demand).
- [ ] Live Reports: "Showing 100 of N", and **Show more** works past 100.
- [ ] Analytics: SLA targets show **Provisional**. Don't confirm until the PDRRMO agrees.
- [ ] Broadcasts → **Recently sent** shows delivery counts.

---

## 8. Clean up the same day
- [ ] Close every "TEST –" report: **Close without action → Incomplete**, reason
      "Wednesday test build".
- [ ] No test alert left under **Alerts awaiting approval**.
- [ ] `firebase hosting:channel:delete wednesday-test`, and remove its domain from
      Authorized domains.
- [ ] Flood-control list still **hidden**; `pagasaMobileEnabled` back to `false` unless you
      decided to keep it on.
- [ ] Undo the version bump in `pubspec.yaml` (`git checkout apps/mobile/pubspec.yaml
      apps/mobile/pubspec.lock`).
- [ ] Residents still on the **old** app: their "Recently resolved" may show "Unable to load"
      (the old app read other people's reports, which is now refused). Give them the new app.

---

## 9. Report back

Tell me directly or post on tracker #134:
- ✅ / ❌ for each section, especially §6.1 privacy, §7.1 background delivery and the SOS screen;
- for each problem: phone model, Android version, screen, steps, expected vs actual, screenshot;
- your verdict on the UI redesign: keep, change specific things, or drop parts.

**Then:** I fix what you found, PR #137 goes to `main`, and the redesign follows as its own PR.

---

## 10. If something goes badly wrong

| Problem | What to do |
|---|---|
| Admins can't send any broadcast | Check §3.3 (production website from `main`) was deployed |
| Console shows no reports | Check the rules deploy succeeded; hard-refresh (Ctrl+Shift+R) |
| App won't sign in | `google-services.json` / SHA-1 (runbook §2); use test numbers; build with `FORCE_RECAPTCHA=true` |
| Residents get no inbox entry on status change | Functions deployed (§3.2)? Functions → Logs → `notifyOnStatusChange` |
| Hazard Watch: "USGS: not updating" | Functions → Logs → `hazardWatch`. It retries every 10 minutes |
| PAGASA errors | `config/weather.pagasaMobileEnabled` → `false` |
| Undo PR #137's backend only | `git checkout main && git pull`, then `firebase deploy --only firestore:rules,storage` and `firebase deploy --only functions` (answer **Yes** to deleting the five PR #137 functions only in this case) |

> **Safety:** for anything life-threatening during the test, residents still use 911, the
> PDRRMO hotline, radio and barangay officials, as the app itself says.
