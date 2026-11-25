# Test Build (Friday and Sunday) — Step-by-Step Guide

What you are testing: **branch `claude/test-build-combined`**, which is everything:

| Part | What | Status |
|---|---|---|
| P1–P3 | PDRRMO response work (alerts approval, lifecycle, proxy reporting, offline delivery…) | On `main` (PR #135) |
| PR #137 | Privacy fix, Hazard Watch, Post Maker, PAGASA source, earthquakes, DPWH data, **incident IDs**, **"Call first" on Report a Problem** | Draft PR, not on `main` yet |
| UI/UX | Experimental redesign of Nov 4 (typeface, bottom bar, SOS layout, console contrast) **plus** the Nov 25 home redesign and municipal colour guide (§5.2) | Only on this branch |
| Console | **Privacy Requests** page for the Data Protection Officer (§6.9) | PR #137 |
| Command Hub | PDRRMO Command Hub + responder site prototype (`command-hub/`, mock data) | Runs on the PC you work on (§8) |

After your feedback: PR #137 is merged to `main`, then the redesign goes to `main` as its own PR.

> ⚠️ **There is only one Firebase project, `one-vizcaya-app`, and real users are on it.**
> 1. **Never approve an urgent or province-wide alert** unless every user in that town is a
>    test account. Approving sends a real push to real residents. Approve, then **Reject**
>    or **Withdraw**.
> 2. **Start every test report's description with "TEST –"** and close them at the end (§9).
> 3. **The production website stays on `main`.** The test console is on a temporary preview
>    link (§3.4), so real admins never see unreviewed screens.
> 4. **Don't press "Show to residents"** (flood-control list, Hazard Watch) until the
>    Governor's office approves. Real residents would see it immediately.
> 5. **Don't actually call** from the new "Call first" buttons: they dial the real PDRRMO
>    hotline and 911. Check that the dialer opens with the number, then back out.

Tick each box as you go. Write down anything odd (screen, steps, what you expected) for §10.

**The day at a glance**

| When | What | Time |
|---|---|---|
| Tonight | §1: tools, downloads, secret files, test numbers, accounts, dry-run build | ~1 h |
| Morning | §2 pull → §3 deploy backend → §4 build and install the app | ~1 h |
| Midday | §5 redesign → §6 PR #137 → §7 P1–P3 (→ §8 Command Hub, optional) | 2–3 h |
| Same day | §9 clean up → §10 send me the results | 20 min |

---

## 1. Prepare tonight (about 1 hour, all of it checkable)

**Why tonight:** installs, downloads, account approvals and a first build are what eat a
test morning. Do them now; tomorrow is only *pull → deploy → build → test*.

**Use Git Bash on Windows** (it comes with Git for Windows). Every command in this guide is
written for it. In Windows PowerShell 5 or plain `cmd`, some lines (`&&` chains, `cat`,
`VAR=value command`) fail.

### 1.1 Tools — install, then confirm each one

| Run this | You should see | If not |
|---|---|---|
| `git --version` | any version | install Git for Windows |
| `node -v` | `v22.x` | install Node 22 LTS (nodejs.org) |
| `firebase --version` | `13.x` or newer | `npm install -g firebase-tools` |
| `flutter --version` | `3.44` or newer | `flutter upgrade` |
| `flutter doctor` | ✓ for Flutter and **Android toolchain** | follow its hints; `flutter doctor --android-licenses` |
| `adb version` | any version | comes with Android Studio's platform-tools |
| `java -version` | `21` (only for the emulator tests in §2) | Temurin 21; skip if you won't run them |

- [ ] All rows above checked.
- [ ] `firebase login` (as the project owner account), then `firebase use one-vizcaya-app`.
      `firebase projects:list` shows `one-vizcaya-app` with **(current)**.

### 1.2 Code and downloads (so tomorrow doesn't wait on the internet)

```bash
git clone https://github.com/Project-Vizcaya/One-Vizcaya.git   # skip if you already have it
cd One-Vizcaya
git fetch origin
git checkout claude/test-build-combined
git pull

(cd apps/functions && npm install)
(cd apps/web && npm install)
(cd command-hub && npm install)
(cd tests/emulator && npm install)      # only if you will run the emulator tests
(cd apps/mobile && flutter pub get)
```
- [ ] All finished without errors. (`npm` warnings are fine; errors are not.)
- [ ] `git log --oneline -1` — write the commit here: `__________`. Tomorrow `git pull`
      picks up anything I push overnight.

### 1.3 Secret files (gitignored; runbook §1)

Copy them from your USB / `one-vizcaya-secrets.zip`:

| File | Goes in | Check |
|---|---|---|
| `firebase_options.dart` | `apps/mobile/lib/` | `ls apps/mobile/lib/firebase_options.dart` |
| `google-services.json` | `apps/mobile/android/app/` | `ls apps/mobile/android/app/google-services.json` |
| `key.properties` + the upload keystore it names | `apps/mobile/android/` (+ `app/`) | optional: without it the APK is signed with your debug keystore |
| your **stable** `debug.keystore` | `~/.android/debug.keystore` (Windows: `C:\Users\<you>\.android\`) | the same one since day one |

- [ ] Files in place. **Never `git add` them.** `git status` must not list any of them.

### 1.4 Firebase Console (10 minutes)

- [ ] Authentication → Sign-in method → Phone → **Phone numbers for testing**: one number +
      6-digit code per test account in §1.5. Test numbers skip SMS, reCAPTCHA and the daily
      quota (runbook §3). Write them down.
- [ ] You can open Authentication → Settings → **Authorized domains** (you'll add the
      preview link there tomorrow, §3.4).
- [ ] Usage and billing shows the **Blaze** plan (functions deploys need it).

### 1.5 Test accounts — create and approve tonight

Approvals take several steps, so finish them now.

| Account | Role | Needed for |
|---|---|---|
| Admin A | `municipal_admin` of your test town | proposing alerts, lifecycle, referrals |
| Admin B | `municipal_admin` of **the same** town | approving A's alert (second approver) |
| Admin P | `provincial_admin` | province-wide approval, Hazard Watch switch, filing anywhere |
| Resident C | citizen, residency **certified**, in the test town | reporting, proxy, inbox, privacy, incident IDs |
| Resident U | citizen, residency **not** certified | checking proxy reporting is refused |
| Resident D | throwaway citizen | account deletion (§6.3) |

- [ ] Each account signs in on the **current** app and has its role (nominate → approve).
- [ ] Pick a **test town**: ________. Real users in it: ____. If any, **never approve an
      alert** for it tomorrow.

### 1.6 Phones and PC

- [ ] Two Android phones (one small screen if possible), **charged**, cables/charger packed.
- [ ] On each: Settings → allow installing apps from your file manager or Chrome
      ("Install unknown apps"); Location **on**; Chrome up to date.
- [ ] Write down each phone's model and Android version (for the report, §10):
      ______________________
- [ ] The PC with Chrome, on the same Wi-Fi as the phones.
- [ ] Optional, for the Command Hub on a phone (§8): install `cloudflared`
      (`winget install Cloudflare.cloudflared`). Not needed for the main test.

### 1.7 Dry-run build (catches Android problems while there is time to fix them)

```bash
cd apps/mobile
flutter build apk --release --dart-define=FORCE_RECAPTCHA=true
```
- [ ] It ends with `✓ Built build/app/outputs/flutter-apk/app-release.apk`. Don't install
      it yet: tomorrow you pull and rebuild with the version bump (§4).
- [ ] The key that signed it is one Firebase knows (phone sign-in on a sideloaded APK needs
      this): `cd android && ./gradlew signingReport` (the build created `gradlew`) → the
      **SHA-1** under `Variant: release` → Firebase Console → Project settings → the Android
      app → it is in the SHA fingerprint list. Then `cd ..`.
- [ ] Optional, 1 minute: `cd command-hub && npm run build` ends with
      `✓ Compiled successfully`.

### 1.8 Note the way back

- [ ] `git rev-parse origin/main` → write it here: `__________`. That is what production
      runs today; §11 uses it if you need to undo.

### Ready?

All boxes in §1 ticked = tomorrow is about 1 hour of deploy and build, then testing. If
anything in §1 failed and you can't fix it, tell me tonight with the exact error text.

---

## 2. Get the latest code (Wednesday morning, 5 minutes)

```bash
git checkout claude/test-build-combined
git pull
```
- [ ] The secret files from §1.3 are still in place (`git pull` never touches them).
- [ ] If `git pull` brought new commits, re-run the installs from §1.2 for the folders that
      changed (`git diff --stat HEAD@{1}` shows which).
- [ ] Optional, about 5 minutes: run the tests.
  ```bash
  (cd apps/functions && npm test)          # expect 130 pass
  (cd tests/emulator && npm test)          # expect 121 pass (needs Java)
  (cd apps/mobile && flutter test)         # expect 77 pass
  (cd command-hub && npm test)             # expect 44 pass
  ```
  If I fixed something overnight the counts may be slightly higher; any **fail** = stop and
  tell me.

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
      `draftPostText`, `onReportCreated`, `incidentStatusUpdate` (some may already exist if
      you deployed `main` before). `incidentStatusUpdate` stays unused: the Command Hub
      link is off (`config/hub`), and only a super admin can switch it on.
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

### 5.2 Home screen and colours (new, Nov 25)
Switch the municipality (tap the town name at the top) through **Bambang** (maroon),
**Villaverde** (lime), **Kasibu** (orange) and **Solano** (navy). In each one:
- [ ] The page background is the same light neutral grey for every town (not tinted).
- [ ] Headings ("Announcements", "Citizen Services"…), "See all" and the town name are easy to
      read. Before, they were faint in Villaverde, Kasibu, Bagabag and Aritao.
- [ ] **Report Problem** is the only solid town-coloured tile; **Emergency Contacts** is soft
      red; the other five are white with a town-coloured icon.
- [ ] Press and hold a tile: it sinks and fills with a soft tint. Let go: it springs back
      with a small bounce and a light vibration. A quick tap still shows it.
- [ ] Bottom bar: the selected item's label is readable (white on the town colour, or on its
      darker shade in light towns).
- [ ] Announcement card: white with a thin bar in the town colour and a label. Post a
      "TEST –" announcement for the town: it shows a **NEW** tag whose dot pulses a few times,
      a tinted outline, and a coloured dot under the cards. Urgent ones are labelled URGENT in red.
- [ ] Dark mode (phone settings): headings in Bambang read as rose, not alarm red; nothing is
      too faint.
- [ ] Phone setting **Remove animations** on (Settings → Accessibility): tiles only change
      tint, no movement; the NEW dot does not pulse.
- [ ] Also look at: Support & FAQs header, What's New dialog, Settings switches, Residency
      screen, Emergency Contacts icons, the town info sheet. Text on town colours should be
      readable in all four towns.

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
- [ ] Resident D files one "TEST –" report, then Settings → Delete account. The dialog lists
      **profile and sign-in** as deleted and a box says **"Your reports are kept"** (archived
      LGU records, deleted 24 months after filing). It completes, the final message says the
      reports are kept, and the report shows as **archived** in the console.

### 6.4 Hazard Watch (preview console → Operations → Hazard Watch)
- [ ] Page loads; counts and filters work. Your area's open SOS and hazard reports come **first**.
- [ ] Bottom line: "USGS: updated … ago" within 10 minutes of deploying; "PHIVOLCS: off".
- [ ] Recent earthquakes within 400 km appear (usually a few). "Show on map" pans to them.
- [ ] **DPWH flood-control structures** → switch **Show on map**: about 85 grey squares (fewer
      as Admin A). Clicking one shows description, town, type, year, completion, with **no**
      contractor or cost.
- [ ] As Admin P: "Resident app list · **Hidden**" appears. **Don't press "Show to residents".**
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

### 6.8 Incident IDs and "Call first" (new)
- [ ] Resident C files a "TEST –" report. Within a few seconds the report card shows
      **Incident ID: NV-<TOWN>-<date>-<6 characters>** (e.g. `NV-BAM-20261125-3F9A2C`); the
      copy button says "Incident ID copied".
- [ ] File one in another town too: the town part differs (`BAM` Bambang, `BYB` Bayombong,
      `SOL` Solano…, full list in `docs/command-hub.md`).
- [ ] Preview console → Live Reports: the ID is under the category; typing part of it in
      the search box finds the report; the report detail's title is the ID.
- [ ] Mobile admin → report detail: an **Incident ID** row.
- [ ] Report a Problem opens with **"Emergency? Call first."**: a big **Call PDRRMO**, then
      **Call 911** and **SOS**. Tap Call PDRRMO: the dialer opens with the number. **Back out,
      don't call.** Tap SOS: the "Send Emergency SOS?" dialog appears. **Press Cancel.**
- [ ] Small phone with large text: the three buttons fit, nothing is cut off.
- [ ] Tagalog and Ilocano: the box is translated.

### 6.9 Privacy Requests (console → Administration → Privacy Requests; provincial login)
- [ ] Resident C: Settings → Location & Privacy → Data Privacy Request → "Access my data",
      details "TEST – privacy request". Send.
- [ ] The request appears on the page as **New** with the resident's name and phone.
- [ ] Set it to **In review** with a note → Save. Then **Completed** → Save. "Last updated by"
      shows your name. "Open" no longer counts it; "All" still shows it.

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

## 8. Command Hub prototype (any PC, optional, about 30 min)

Runs on any Windows PC with Node.js (the computer-shop PC is fine; nothing is tied to one
machine) with **invented data**. It is **not** connected to One Vizcaya (the link stays off).
Nothing you do here reaches real residents. On a shop PC that resets when restarted, redo
`npm install` in `command-hub` and recreate `.env.local` each session.

Create a file `command-hub/.env.local` (Notepad is fine; no `.txt` at the end) with:
```
HUB_SESSION_SECRET=any-long-random-text-1234567890
HUB_SIMULATOR_TOKEN=demo-simulator-token-123456
```
Then, in Git Bash:
```bash
cd command-hub
npm run build && npm start        # leave it running; open http://localhost:3100
```
- [ ] PC browser: sign in as **PDRRMO EOC operator**. Live map shows 5 units on duty and
      the incident list; status colours have icons and labels.
- [ ] Second browser window (or a private window): sign in as **BAM-AMB-01** → the responder
      screen. Allow location. (Phones need HTTPS for location: for a phone test, run a tunnel
      such as `cloudflared tunnel --url http://localhost:3100` and open the https address it
      prints.)
- [ ] Operator → **Incidents** → pick the Bambang flooding → **Assign** BAM-AMB-01. The
      responder screen shows **Confirm dispatch**; tap it → **En route**. The operator sees the
      ETA; the citizen-facing line says what the reporter would see.
- [ ] Responder: **Google Maps** / **Waze** open navigation to the pin.
- [ ] Operator → **Hotline call log**: type your **practice number** in Number, a nature, the
      town and a location. A matching open incident is offered under "Already reported?".
      Plain Enter does nothing; **Ctrl+Enter** saves. Try both "attach" and "new incident".
- [ ] Movement without driving (second terminal):
      `HUB_SIMULATOR_TOKEN=demo-simulator-token-123456 npm run replay -- --unit u-nv-amb-01 --speed 10`
      → NV-AMB-01 moves on the live map; **Replay** plays its track back.
- [ ] Sign in as **MDRRMO Solano operator**: only Solano's units and incidents.
- [ ] Operator → **Audit log**: assignments, calls and "view_citizen_location…" rows.
- [ ] Phone width and dark mode look right (no cut-off text, readable contrast).
- [ ] Stop with Ctrl+C. Data is in memory only and disappears.

## 9. Clean up the same day
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

## 10. Report back

Tell me directly or post on tracker #134:
- ✅ / ❌ for each section, especially §6.1 privacy, §7.1 background delivery and the SOS screen;
- for each problem: phone model, Android version, screen, steps, expected vs actual, screenshot;
- your verdict on the UI redesign: keep, change specific things, or drop parts;
- for the Command Hub (§8): what PDRRMO would need changed before showing it to Sir Robert.

**Then:** I fix what you found, PR #137 goes to `main`, and the redesign follows as its own PR.

---

## 11. If something goes badly wrong

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
