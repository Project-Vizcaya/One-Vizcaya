# Wednesday Test Build — PR #137

What you are testing: **branch `claude/one-vizcaya-general-updates-QhJAr`** (PR #137, 13
commits on top of `main`). It does **not** include the experimental UI/UX redesign; that is
still on `claude/test-build-combined`.

What is new in PR #137:

| # | Change | Where |
|---|---|---|
| 1 | Privacy: residents see only **their own** resolved reports; the inbox is owner-only | App home, inbox |
| 2 | Admin setting "Overdue alerts open the report" | App: Settings → Notifications |
| 3 | Security fixes; deleting an account works again; super admins follow the report rules | App, console |
| 4 | Console pages load on demand (faster first load) | Console |
| 5 | DOST-PAGASA forecast, alerts and nearest station (**off** by default) | App weather, console |
| 6 | **Hazard Watch**: SOS, hazard reports, PAGASA, earthquakes (USGS on, PHIVOLCS off) | Console |
| 7 | Recent earthquakes near the province (only shows M3.5+ within 150 km in 48 h) | App: Emergency Contacts |
| 8 | **Post Maker**: branded images and captions; optional AI helper | Console |
| 9 | DPWH flood-control layer, official hazard links, town ZIP codes | Console Hazard Watch, app |
| 10 | Resident flood-control list (**off** until the Governor's office approves) | App: town info sheet |

> ⚠️ **One Firebase project (`one-vizcaya-app`) with real users.**
> 1. **Never approve an urgent or province-wide alert** unless every user in the town is a
>    test account. Approve, then Reject or Withdraw.
> 2. **Start every test report with "TEST –"** and close them at the end (§7).
> 3. **The production website stays on `main`.** The PR #137 console is tested on a preview
>    link (§3.4).
> 4. **Do not press "Show to residents"** for the flood-control list until the Governor's
>    office approves. Real residents would see it at once.

---

## 1. Prepare (Tuesday night)

- [ ] Gitignored files in place (runbook §1): `apps/mobile/lib/firebase_options.dart`,
      `apps/mobile/android/app/google-services.json`, `apps/mobile/android/key.properties` +
      keystore.
- [ ] Test accounts (Firebase **test phone numbers**): Admin A (`municipal_admin`, test
      town), Admin P (`provincial_admin`), Resident C (citizen, certified, test town). A
      second municipal admin (Admin B) if you also re-test alert approval.
- [ ] Two Android phones if possible, and a laptop with Chrome.
- [ ] Flutter 3.44+, Node 22, Firebase CLI logged in: `firebase use one-vizcaya-app`.
- [ ] Optional: the gcloud CLI, only if you want to try the AI helper (§5.6).

## 2. Get the code and run the tests (optional, ~5 min)

```bash
git fetch origin
git checkout claude/one-vizcaya-general-updates-QhJAr
git pull
cd apps/functions && npm install && npm test              # expect 120 pass
cd ../../tests/emulator && npm install && npm test        # expect 113 pass (needs Java)
cd ../../apps/mobile && flutter pub get && flutter test   # expect 60 pass
cd ../..
```

`flutter pub get` may change `apps/mobile/pubspec.lock` on your PC; don't commit that.

## 3. Deploy the backend (before testing, from the PR branch)

Rules and functions must go **together**: the new rules stop admin phones writing into a
resident's inbox, and the functions now write those entries.

### 3.1 Rules and storage
```bash
firebase deploy --only firestore:rules,storage
```
- [ ] Succeeds. (No index changes in this PR.)

### 3.2 Functions
```bash
cd apps/functions && npm install && cd ../..
firebase deploy --only functions
```
- [ ] Five new functions: `hazardWatch`, `pagasaMobileWatch`, `getPagasaForecast`,
      `postAssistStatus`, `draftPostText`.
- [ ] If asked to **delete** a function, answer **No** and write down its name.

### 3.3 Production website: leave it on `main`
Nothing to do. Main's console works with the new rules.

### 3.4 PR #137 console on a preview link
```bash
cd apps/web && npm install && npm run build && cd ../..
firebase hosting:channel:deploy wednesday-test --expires 7d
```
- [ ] Copy the URL it prints.
- [ ] Firebase Console → Authentication → Settings → **Authorized domains** → add that domain.
- [ ] Sign in there as Admin P.

### 3.5 Health check
- [ ] `https://us-central1-one-vizcaya-app.cloudfunctions.net/health` → `"status": "ok"`.
      `hazardWatch` may read `unknown` for the first 10 minutes.

## 4. Build and install the app

```bash
cd apps/mobile
flutter build apk --release
```
- [ ] Install `build/app/outputs/flutter-apk/app-release.apk` on both phones.

## 5. Test

### 5.1 Privacy (most important)
- [ ] As Resident C, file "TEST – privacy" and have Admin A mark it **Solved** (Ongoing →
      Solved with a note).
- [ ] Resident C's home "Recently resolved" shows **that report only**, no one else's.
- [ ] Resident C's inbox gets **one** entry and **one** push per status change (not two).
- [ ] Change status from the **console** too: the inbox entry still arrives (it never did
      before).

### 5.2 Admin alert-tap setting
- [ ] As Admin A: Settings → Notifications → "Overdue alerts open the report". Off: tapping
      an overdue alert opens the Admin Dashboard. On: it opens the report. (Overdue alerts
      come from the escalation job; you may have to wait for one or skip.)

### 5.3 Account deletion
- [ ] Make a throwaway resident (test number), file one "TEST –" report, then Settings →
      Delete account. It completes; the report shows as **archived** in the console.

### 5.4 Hazard Watch (console → Operations → Hazard Watch)
- [ ] Page loads; the counts and filters work.
- [ ] Open SOS and hazard reports for your area appear **first**.
- [ ] Bottom line: "USGS: updated … ago" within 10 minutes of deploying; "PHIVOLCS: off".
- [ ] Earthquakes in the last 7 days within 400 km appear (often a few). "Show on map" pans.
- [ ] Tick **Show DPWH flood-control structures**: about 85 blue diamonds (fewer for a
      municipal admin). Clicking one shows its description, town, type, year and completion,
      but **no** contractor or cost.
- [ ] As Admin P: the line "Resident app list … **hidden**" appears. **Don't press it** (§warning 4).
      As Admin A (municipal): the line does not appear.
- [ ] "Official hazard services": all six links open the right agency site.
- [ ] Hotlines bar shows 911 and your town's MDRRMO.

### 5.5 Post Maker (console → Post Maker)
- [ ] Start from an announcement, a broadcast and PAGASA. Text fills in.
- [ ] Try each format (Feed post, Square, Story, Landscape), with and without a photo.
      Headline and body never overlap the footer; long text gets "…".
- [ ] Download the PNG; Copy image; Copy caption in English, Tagalog, Ilocano.
- [ ] As Admin A: the issuer is locked to your town.
- [ ] Without an Anthropic key the **AI helper button is hidden**. That is correct.

### 5.6 AI helper (optional)
Only if you want it: follow `docs/post-maker.md` (store `ANTHROPIC_API_KEY` in Secret
Manager). Then:
- [ ] The button appears; it drafts a headline and caption using **only** your facts.
- [ ] It warns that the text goes to Anthropic. Never paste personal data.
- [ ] To turn it off: Firestore `config/ai` → `postAssistEnabled: false`.

### 5.7 App: Emergency Contacts and town info
- [ ] Emergency Contacts: new collapsed section **Official hazard services** (6). Each opens
      the agency's site in the browser.
- [ ] "Recent earthquakes near Nueva Vizcaya" appears **only** if a M3.5+ quake within
      150 km happened in the last 48 hours. Usually it's absent; that's correct.
- [ ] Tap your town name in the home header → info sheet shows **ZIP code** under the title.
- [ ] The info sheet has **no** flood-control section (it's switched off). Correct.
- [ ] Switch language to Tagalog and Ilocano: the new labels show in that language.

### 5.8 PAGASA forecast (optional)
It is **off** (`config/weather` → `pagasaMobileEnabled` missing or false), and the app shows
the international forecast as before.
- [ ] Off: the app shows nothing about PAGASA forecasts. Correct.
- [ ] Optional, since you have PAGASA's permission: set `pagasaMobileEnabled: true`, wait 5
      minutes, open Weather. If PAGASA data with the "not an official PAGASA app" notice
      appears, good. If the console Weather page shows errors, set it back to `false` and
      send me the error (our sample data is synthetic, so this is the first real run).

### 5.9 Quick checks
- [ ] Click through every console page once: each loads (pages now load on demand).
- [ ] Old app still on a real user's phone? Its "Recently resolved" may show an error or
      nothing: the old version tried to read other people's reports, which is now refused.
      Expected; they need the new app.

## 6. If something breaks

| Problem | What to do |
|---|---|
| Residents get no inbox entry on status change | Functions deployed? (§3.2) Check Functions → Logs for `notifyOnStatusChange` |
| Hazard Watch: "USGS: not updating" | Functions → Logs → `hazardWatch`. USGS may be briefly down; it retries every 10 min |
| PAGASA on and errors | Set `config/weather.pagasaMobileEnabled` to `false` |
| Need to undo the backend | `git checkout main && git pull`, then `firebase deploy --only firestore:rules,storage` and `firebase deploy --only functions` (answer **Yes** to deleting the five new functions only in this case) |

## 7. Clean up the same day
- [ ] Close every "TEST –" report (Close without action → Incomplete, "Wednesday test").
- [ ] No test alert left under "Alerts awaiting approval".
- [ ] `firebase hosting:channel:delete wednesday-test`, and remove its domain from
      Authorized domains.
- [ ] Flood-control list still **hidden**; PAGASA back to `false` unless you decided to keep it.

## 8. Report back
For each section: ✅ / ❌. For problems: phone model, Android version, screen, steps,
expected vs actual, screenshot. Then I fix what you found; once it passes, PR #137 can be
merged to `main` and the production website deployed from `main`.
