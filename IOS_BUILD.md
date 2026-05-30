# One Vizcaya — iOS Build Guide

## Requirements

### Machine
| Requirement | Minimum |
|---|---|
| macOS | 14 (Sonoma) or later |
| Xcode | 16.x (from Mac App Store) |
| Flutter SDK | 3.32.x (`flutter upgrade`) |
| CocoaPods | 1.15+ (`sudo gem install cocoapods`) |
| Dart SDK | 3.9.x (bundled with Flutter) |
| Apple Developer Account | Paid ($99/yr) for device builds and App Store |

### Credentials / Files (not in git)
| File | Where to get it |
|---|---|
| `one_vizcaya/lib/firebase_options.dart` | Run `flutterfire configure` with the Firebase project |
| `one_vizcaya/ios/Runner/GoogleService-Info.plist` | Firebase Console → Project Settings → iOS app |
| Apple Developer Team ID | developer.apple.com → Membership |
| APNs Auth Key (`.p8`) | developer.apple.com → Keys (for FCM push notifications) |

---

## Step-by-Step Build

### 1. Clone and install Flutter dependencies
```bash
git clone https://github.com/Project-Vizcaya/One-Vizcaya.git
cd One-Vizcaya/one_vizcaya
flutter pub get
```

### 2. Add Firebase config files
- Copy `GoogleService-Info.plist` into `ios/Runner/` (drag into Xcode so it is added to the target).
- If `lib/firebase_options.dart` is missing, run:
  ```bash
  dart pub global activate flutterfire_cli
  flutterfire configure --project=<your-firebase-project-id>
  ```

### 3. Install CocoaPods
```bash
cd ios
pod install
cd ..
```

### 4. Open the workspace (not the .xcodeproj)
```bash
open ios/Runner.xcworkspace
```

### 5. Configure signing in Xcode
1. Select the **Runner** target → **Signing & Capabilities**.
2. Set your **Team** (Apple Developer Team ID).
3. Confirm Bundle ID is `com.onevizcaya.app`.
4. Xcode will auto-manage provisioning profiles if *Automatically manage signing* is checked.

### 6. Enable capabilities in Xcode
These are already declared in `Runner.entitlements` and `Info.plist` but must also be enabled in the Xcode Signing & Capabilities tab:
- **Push Notifications** — enables `aps-environment` entitlement
- **Associated Domains** — add `applinks:onevizcaya.page.link` for Firebase Dynamic Links
- **Sign In with Apple** (optional, if added later)

### 7. Build and run on a physical device
```bash
flutter run --release
```
Or press **Run** (▶) in Xcode with a connected iPhone.

### 8. Build a release archive for App Store / TestFlight
```bash
flutter build ipa --release
```
The `.ipa` is produced at `build/ios/ipa/one_vizcaya.ipa`.  
Upload via **Xcode Organizer** or `xcrun altool` / Transporter app.

---

## iOS-Specific Permissions Declared

| Permission | Info.plist Key | Used By |
|---|---|---|
| Location (in use) | `NSLocationWhenInUseUsageDescription` | Incident reports, geolocator |
| Location (always) | `NSLocationAlwaysAndWhenInUseUsageDescription` | Emergency alerts |
| Camera | `NSCameraUsageDescription` | Photo attachments on reports |
| Photo library (read) | `NSPhotoLibraryUsageDescription` | Photo attachments |
| Photo library (write) | `NSPhotoLibraryAddUsageDescription` | Save media |
| Face ID | `NSFaceIDUsageDescription` | Local auth / biometric login |

---

## Entitlements (`Runner.entitlements`)

| Entitlement | Value | Purpose |
|---|---|---|
| `aps-environment` | `development` / `production` | FCM push notifications (APNs) |
| `com.apple.developer.associated-domains` | `applinks:onevizcaya.page.link` | Firebase Dynamic Links deep linking |

> Change `aps-environment` to `production` for App Store builds.

---

## Deep Link URL Scheme

Registered in `Info.plist` under `CFBundleURLTypes`:
- Scheme: `onevizcaya://`
- Used by: `app_links` package to open report status from notifications

Example link: `onevizcaya://status?reportId=abc123`

---

## Firebase Services in Use (iOS)

| Service | Flutter Package | iOS Note |
|---|---|---|
| Auth | `firebase_auth` | Requires `GoogleService-Info.plist` |
| Firestore | `cloud_firestore` | Offline persistence enabled |
| Storage | `firebase_storage` | Used for report photo uploads |
| App Check | `firebase_app_check` | Uses `DeviceCheck` in Release, `debug` otherwise |
| Messaging (FCM) | `firebase_messaging` | Requires APNs key uploaded to Firebase Console |

---

## Minimum iOS Deployment Target

**iOS 13.0** — set in `ios/Podfile` and `project.pbxproj`.

---

## Common Issues

| Problem | Fix |
|---|---|
| `pod install` fails | Run `pod repo update` then retry |
| Push notifications not received on device | Upload APNs `.p8` key to Firebase Console → Project Settings → Cloud Messaging |
| Face ID not prompting | Confirm `NSFaceIDUsageDescription` is in `Info.plist` (already added) |
| Deep links not opening app | Verify URL scheme `onevizcaya` is registered and Associated Domains entitlement is active |
| Firebase App Check blocks requests | In debug builds `AppleProvider.debug` is used — register the debug token in Firebase Console |
| `GoogleService-Info.plist` missing | This file is gitignored — download from Firebase Console and add to `ios/Runner/` |
