# Fill-In Checklist — what to fill in, where, and who

Everything a person has to type, paste, copy, approve or decide. Gathered from the code,
the config and every doc (25 Nov 2026). Tick as you go.

- **Part A–B:** you, for the Friday and Sunday test builds.
- **Part C:** other people (PDRRMO, PA, legal office, translators, LGUs) before going live.
- **Part D:** later or optional.

Sheets in this folder that others fill in and send back:
[`translation-review.md`](translation-review.md) (native Tagalog and Ilocano speakers) and
[`hotline-verification.md`](hotline-verification.md) (LGUs, PDRRMO, MDRRMOs).

---

## A. Before Friday (you)

| ✓ | What | Where | Notes |
|:-:|---|---|---|
| ☐ | Copy `firebase_options.dart` | `apps/mobile/lib/` | From your USB. Gitignored: never commit. |
| ☐ | Copy `google-services.json` | `apps/mobile/android/app/` | From your USB (source: Firebase Console → Project settings → Android app). |
| ☐ | Copy `key.properties` + `upload-keystore.jks` (optional) | `apps/mobile/android/` and `apps/mobile/android/app/` | Without them the APK is signed with your debug keystore. |
| ☐ | Restore your stable `debug.keystore` | `C:\Users\<you>\.android\debug.keystore` | The same one since day one. `restore-secrets.bat` (repo root) copies all of these from `C:\Users\Administrator\Downloads`; edit the paths if yours differ. |
| ☐ | `secrets.dart` | — | Listed in the runbook, but no app code uses it now. Not needed. |
| ☐ | `firebase login`, then `firebase use one-vizcaya-app` | Git Bash | Owner account. |
| ☐ | Phone numbers for testing (one number + 6-digit code per account) | Firebase Console → Authentication → Sign-in method → Phone | Write them in the Test Build Guide §1.4. |
| ☐ | Check the Blaze plan is on | Firebase Console → Usage and billing | Functions deploys need it. |
| ☐ | Six test accounts with roles (Admin A, Admin B, Admin P, Resident C, U, D) | App + console (nominate → approve) | Guide §1.5. Also write the test town and its real-user count. |
| ☐ | Two Android phones ready; write model + Android version | Guide §1.6 | |
| ☐ | Signing key SHA-1 registered | Firebase Console → Project settings → Android app → SHA fingerprints | Guide §1.7 (`./gradlew signingReport`). |
| ☐ | Commit hash and `origin/main` hash | Guide §1.2 and §1.8 | Your way back if you must undo. |
| ☐ | Optional: Render account + Blueprint for the Command Hub | render.com → New → Blueprint | Guide §1.9; steps in [`../4-app-and-website/command-hub.md`](../4-app-and-website/command-hub.md). Write the link in §1.9. |

## B. During the test (you)

| ✓ | What | Where | Notes |
|:-:|---|---|---|
| ☐ | Deploy rules + indexes + storage, then functions, then production website from `main` | Git Bash, guide §3.1–§3.3 | Rules and functions go **together**. If the CLI offers to delete anything, answer **No**. |
| ☐ | Preview link domain → Authorized domains | Firebase Console → Authentication → Settings | Guide §3.4. Remove it after Sunday (§9.2). |
| ☐ | Version bump `1.8.0+30` → `1.9.0+31` (don't commit) | `apps/mobile/pubspec.yaml` line 4 | Guide §4. Undo after Sunday. |
| ☐ | Command Hub on the PC: `.env.local` with two lines | `command-hub/.env.local` | Guide §8 B. Recreate each session on a shop PC that resets. |
| ☐ | Optional: PAGASA switch on, then back off | Firestore → `config/weather` → `pagasaMobileEnabled` | Guide §6.7. |
| ☐ | Don't press Send in the SMS app after an offline report | Phone | It opens to a placeholder number (`+639123456789`). See C. |
| ☐ | Results for Friday, then Sunday | Tracker #134 or message | Guide §10. |
| ☐ | End of each day on the shop PC: `firebase logout`, delete the secret files, sign out of Chrome | PC | Guide §9.4. |

## C. Before going live (other people)

| ✓ | What | Where it goes | Who |
|:-:|---|---|---|
| ☐ | **Real SMS hotline per town** (every town now falls back to the placeholder `+639123456789`) | `apps/mobile/lib/core/constants/app_constants.dart`, `municipalityHotlines` and `defaultHotline` | MDRRMOs / LGUs give the numbers; dev team enters them |
| ☐ | Verified emergency numbers and government-office details | [`hotline-verification.md`](hotline-verification.md) sections A and B | LGUs, PDRRMO, MDRRMOs |
| ☐ | Tagalog and Ilocano review, and translations for English-only screens | [`translation-review.md`](translation-review.md) sections A, B, C (+ reviewer name and date) | Native speakers |
| ☐ | Legal sign-off on the updated Data Privacy Notice (25 Nov); retention periods for notification history and SOS locations; responders' location before the Command Hub goes live | `PRIVACY.md` (repo root) §7 and §12 | DPO / Provincial Legal Office |
| ☐ | Official Data Protection Officer email (the app shows a guess) | `apps/mobile/lib/core/constants/app_constants.dart`, `dpoEmail` | PA / Provincial Government |
| ☐ | NPC registration; designate the DPO; someone owns the console **Privacy Requests** page | Console → Administration → Privacy Requests | PA / LGU legal office |
| ☐ | Confirm the PDRRMO hotline `0917 122 7150` shown on the website and app | `apps/web/src/components/landing/SiteChrome.tsx`, `AppConstants.pdrrmoHotline` | PDRRMO |
| ☐ | Confirm the website's endorsement wording (Ref. No. G-373, June 11, 2026) against the signed letter | `apps/web/src/components/landing/LandingPage.tsx` (hero and "Reviewed by the Province") | PA (Office of the Provincial Administrator) |
| ☐ | First pilot municipality for the website | `apps/web/src/components/landing/LandingPage.tsx`, `PILOT_LGUS` | PA / PDRRMO decide |
| ☐ | Team contact email for the website (none shown yet); Terms of Use (none exist) | Website footer | You / PA |
| ☐ | Provincial seal on the website — only with written permission | Website | PA |
| ☐ | SLA targets: PDRRMO agrees the hours, then "Confirm as approved targets" | Console → Analytics | PDRRMO, then a provincial admin |
| ☐ | Flood-control list for residents: "Show to residents" only after approval | Console → Hazard Watch | Governor's office / PA |
| ☐ | At least two reachable admins in every town | Console → Admin Users | LGUs |
| ☐ | Health monitoring: uptime check on `/health` with an alert to the duty officer | Google Cloud Monitoring ([`../4-app-and-website/Operator-Guide.md`](../4-app-and-website/Operator-Guide.md) §5) | Technical administrator |
| ☐ | Open questions in the committee documents (OpCen number, broadcast authority, NDRRMC format, data residency…) | [`../3-agencies-and-legal/PDRRMO-Integration-Brief.md`](../3-agencies-and-legal/PDRRMO-Integration-Brief.md) §5; [`../3-agencies-and-legal/Architecture-Governance-Design.md`](../3-agencies-and-legal/Architecture-Governance-Design.md) §9 | PDRRMO, PPDO, PITD |
| ☐ | Agreed service fee and procurement route | [`../3-agencies-and-legal/Cost-and-Value-Statement.md`](../3-agencies-and-legal/Cost-and-Value-Statement.md) §4.1, §8 | PA, Budget Office, BAC |

## D. Later or optional

| ✓ | What | Where | Who |
|:-:|---|---|---|
| ☐ | PHIVOLCS earthquake feed: written permission, then a real page saved as the test sample | Firestore `config/hazards.phivolcsEnabled`; `apps/functions/hazards/fixtures/phivolcs.txt` ([`../4-app-and-website/hazards.md`](../4-app-and-website/hazards.md)) | You ask; PHIVOLCS grants |
| ☐ | PAGASA: replace the sample responses with real ones; check station coordinates | `apps/functions/pagasa-mobile/fixtures/`, `stations.js` ([`../4-app-and-website/weather.md`](../4-app-and-website/weather.md)) | Dev team |
| ☐ | Post Maker AI helper: Anthropic key with a monthly spend limit; note it in the DPO's records | Secret Manager `ANTHROPIC_API_KEY` ([`../4-app-and-website/post-maker.md`](../4-app-and-website/post-maker.md)) | Technical administrator; DPO |
| ☐ | Connect One Vizcaya to the Command Hub: `HUB_BRIDGE_SECRET` + `config/hub` switches | Secret Manager; Firestore ([`../4-app-and-website/command-hub.md`](../4-app-and-website/command-hub.md), "Bridge") | Super admin, after PDRRMO agrees |
| ☐ | Command Hub production: real database and sign-in (the demo buttons must not go live) | `command-hub/` | Co-dev |
| ☐ | Website APK download: put the built APK at `apps/web/public/downloads/One-Vizcaya.apk` before building the site | [`../../apps/web/public/downloads/README.md`](../../apps/web/public/downloads/README.md) | You, when the pilot starts |
| ☐ | Vercel preview of the website (optional; add its domain to Authorized domains) | `vercel.json`; Vercel dashboard | You |
| ☐ | iPhone build: Apple Developer account, Team ID, `GoogleService-Info.plist`; the doc still uses old paths | [`../1-build-and-test/iOS-Build.md`](../1-build-and-test/iOS-Build.md) | You (account); dev team (doc) |
