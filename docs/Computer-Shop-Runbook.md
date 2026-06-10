# Computer-Shop Runbook — Build, Deploy & Phone-Auth Fix

> A self-contained fallback guide for building the **APK/AAB** and the **website**,
> deploying Firebase, and fixing the **real-number phone-login failure** — written
> so you can pick it up cold on a shared computer. Nothing here needs the chat
> history.

## Table of Contents
1. [Files you MUST bring (secrets are gitignored)](#1-files-you-must-bring-secrets-are-gitignored)
2. [The phone-login failure — what it is and isn't](#2-the-phone-login-failure--what-it-is-and-isnt)
3. [Fast demo fix: test numbers](#3-fast-demo-fix-test-numbers)
4. [Build the mobile app (APK / AAB)](#4-build-the-mobile-app-apk--aab)
5. [Build & deploy the website](#5-build--deploy-the-website)
6. [Deploy Firebase rules / indexes / functions](#6-deploy-firebase-rules--indexes--functions)
7. [The real cure: Play Internal Testing](#7-the-real-cure-play-internal-testing)
8. [Version bumping](#8-version-bumping)

---

## 1. Files you MUST bring (secrets are gitignored)

The repo clones **without secrets** on a fresh machine. Carry these on a USB and
drop them back into place before building, or the build/Firebase will fail.
They are intentionally git-ignored — **never commit them.**

| File | Goes in | Purpose |
| :--- | :--- | :--- |
| `firebase_options.dart` | `apps/mobile/lib/` | Firebase config for the Dart app |
| `google-services.json` | `apps/mobile/android/app/` | Android Firebase config |
| `secrets.dart` | `apps/mobile/lib/` | API keys (e.g. Maps) |
| `debug.keystore` | wherever you point it (see §4) | Your **stable** debug signing key (same one since day one) |
| `key.properties` | `apps/mobile/android/` | Points the release build at the upload keystore (see §7) |
| `upload-keystore.jks` | `apps/mobile/android/app/` | Release/upload signing key for Play uploads |

> Tip: keep a single zipped `one-vizcaya-secrets.zip` on the USB and unzip into
> the repo root so paths land correctly.

---

## 2. The phone-login failure — what it is and isn't

**Symptom:** signing in with a *real* number shows
*"Verification failed: This request is missing a valid app identifier… Play
Integrity checks and reCAPTCHA checks were unsuccessful."* — but a **test
number works fine**.

**What it is NOT (ruled out — don't waste time here):**
- ❌ Your **SHA keys** — unchanged. Same `debug.keystore` since day one; the
  SHA-1/SHA-256 are registered and identical. The error wording is misleading;
  it is generic "both attestation paths failed," not a literal fingerprint
  mismatch.
- ❌ **Play Integrity API** — already enabled in Google Cloud.
- ❌ **App Check enforcement** — Authentication is on **Monitoring**, not
  Enforced, so App Check is **not** blocking anything. (Do **NOT** click
  *Enforce* while verified-requests sit at 0% — it would deny 100% of traffic.)

**What it actually is:** a **daily quota / anti-abuse throttle.** A *sideloaded
debug* build can't mint a passing **Play Integrity** token (App Check metrics
showed ~100% unverified), so every real-number attempt falls back to reCAPTCHA
and draws from a small daily allotment of unverified phone verifications. Heavy
testing over a few days exhausts it → real numbers get refused until it resets
(~midnight US-Pacific). **Test numbers are exempt**, which is why they keep
working. (Blaze is already enabled, so this is the *unverified-request* throttle,
not the Spark SMS cap.)

**Confirm the exact cause — no cable needed.** The app now prints the error
**code** right on the login screen, e.g. *"Verification failed
[too-many-requests]: …"*. Read it off the phone:
- `too-many-requests` / `quota-exceeded` → the daily throttle (wait for reset).
- `missing-app-credential` / app-verification → Play Integrity + reCAPTCHA both
  failed (sideloaded-build attestation).

Cable-free alternatives if you want the full system log:
- **Wireless debugging (no USB):** Android 11+ → Settings → Developer options →
  **Wireless debugging** → *Pair device with pairing code*. On the shop PC:
  `adb pair <ip>:<port>` (enter code) → `adb connect <ip>:<port>` →
  `adb logcat | grep -iE "FirebaseAuth|quota|too-many|missing-app|Integrity"`.
  (Phone and PC must be on the same Wi-Fi.)
- **Firebase Console signals (no PC at all):** Authentication → Usage, and
  App Check → metrics (the ~100% *unverified* rate is the throttle's fingerprint).

You usually don't even need the log: **test number works + real number fails +
App Check shows 100% unverified** is already conclusive.

**Permanent fix:** ship through **Play Internal Testing** (§7) so Play Integrity
attests the app and requests flip to *verified*.

---

## 3. Fast demo fix: test numbers

Firebase Console → **Authentication → Sign-in method → Phone →
"Phone numbers for testing"** → add the real number + a fixed 6-digit code.
That number then bypasses Play Integrity, reCAPTCHA, **and** the quota — no SMS
sent. Use this for any live presentation.

---

## 4. Build the mobile app (APK / AAB)

From `apps/mobile`:

```bash
flutter pub get

# Debug-signed release APK (sideload for quick tests; output below)
flutter build apk --release
#  → build/app/outputs/flutter-apk/   (and one-vizcaya-<versionName>.apk)

# App Bundle for Google Play upload (needed for Internal Testing, §7)
flutter build appbundle --release
#  → build/app/outputs/bundle/release/app-release.aab
```

**Signing logic** (`android/app/build.gradle.kts`): the release build signs with
the **upload keystore IF `key.properties` exists**, otherwise it falls back to
the **debug keystore**. So:
- For quick sideload testing → no `key.properties` needed (debug-signed).
- For Play upload → `key.properties` + `upload-keystore.jks` **required** (Play
  rejects debug-signed bundles).

If `flutter` isn't installed on the shop PC: install the Flutter SDK, run
`flutter doctor`, accept Android licenses (`flutter doctor --android-licenses`).

---

## 5. Build & deploy the website

The web admin is `apps/web` (React + Vite + TanStack Router).

```bash
# from repo root
npm install
npm run build:web        # turbo build of the web app  → apps/web/dist
```

Or directly:
```bash
cd apps/web && npm install && npm run build   # tsc -b && vite build
```

> **Gotcha:** if you added a new route under `apps/web/src/routes/`, `tsc -b`
> can fail because `routeTree.gen.ts` isn't regenerated yet. Run
> `npx vite build` once (it regenerates the route tree), then `npm run build`.

Deploy hosting:
```bash
firebase deploy --only hosting
```

---

## 6. Deploy Firebase rules / indexes / functions

From the **repo root** (config files live here):

```bash
firebase login
firebase use one-vizcaya-app

# Security rules + indexes (what we changed for the governance/residency work)
firebase deploy --only firestore:rules,firestore:indexes,storage

# Cloud Functions (residency triggers, audit logs, SOS, etc.)
firebase deploy --only functions

# Everything at once
firebase deploy
```

If prompted to **delete** an index or function you didn't intend to remove,
answer **No** — a partial local config can otherwise drop server resources.

---

## 7. The real cure: Play Internal Testing

Goal: distribute through a Play track so **Play Integrity can attest** the app →
real-number login works and the throttle disappears. (Blaze already on.)

### A. Play Console (one-time)
1. **play.google.com/console** → pay the one-time **$25** → accept terms.
2. **Create app** → "One Vizcaya" → App → Free.

> **No $25 yet?** Play Internal Testing is the *only* route to true Play
> Integrity attestation, so the permanent cure waits until you can register.
> Until then, this works at **zero cost**:
> - **Demos → test numbers** (bypass everything; §3).
> - **Real-number proof → 1–2 sign-ins per day.** Because SHA-1 is registered,
>   the **reCAPTCHA fallback** still verifies real numbers — you just can't
>   exceed the small daily unverified allotment, so don't hammer it.
> - **Distributing builds to teammates → Firebase App Distribution (free):**
>   `firebase appdistribution:distribute app-release.apk --app <androidAppId> --groups testers`.
>   Note: it eases *handing out* the APK but is still a sideloaded build — it
>   does **not** grant Play Integrity, so the throttle math is unchanged.
> The $25 is one-time and unlocks attestation permanently — worth budgeting.

### B. Make an uploadable signed build
Play rejects debug-signed uploads, so create an **upload key** (once):
```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
Put it at `apps/mobile/android/app/upload-keystore.jks`, then create
`apps/mobile/android/key.properties`:
```
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=upload
storeFile=upload-keystore.jks
```
**Back up the `.jks` + passwords.** Build the bundle: `flutter build appbundle --release` (§4).

### C. Upload
1. Play Console → **Testing → Internal testing → Create new release**.
2. **Accept Play App Signing** (let Google manage the app signing key).
3. Upload `app-release.aab` → name it → **Review → Start rollout**.
4. **Testers** tab → add tester Google accounts → **Copy link**.
5. Open the link on the test phone → become a tester → **install from Play**.

### D. ⚠️ Critical — register the Play App Signing SHA
Google re-signs the app, so its **own** key's fingerprint must be in Firebase or
Play Integrity still fails.
1. Play Console → **Test and release → App integrity → Play app signing**.
2. Copy the **App signing key** `SHA-1` **and** `SHA-256` (grab the Upload key
   ones too).
3. Firebase → **Project Settings → Your apps → Android → Add fingerprint** →
   paste **both**.
4. Firebase → **App Check → Android app → Play Integrity** → add that
   **SHA-256**.
5. No rebuild needed — SHA changes apply server-side within minutes.

### E. Verify
Install from the Play link on a real device → sign in with a real number → watch
Firebase **App Check → verified requests** climb off 0%. Once it's reliably
~100%, you *may* later flip App Check to **Enforce** (not before).

---

## 8. Version bumping

Edit `apps/mobile/pubspec.yaml`:
```
version: <name>+<buildNumber>     # e.g. 1.3.12+16
```
- The number **after `+`** is the Android `versionCode` — it must **increase**
  for every Play upload (Play rejects a reused code).
- The part **before `+`** is the visible `versionName`.

Bump the build number each time you push a new Internal Testing build.
