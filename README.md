# 🏛️ One Vizcaya: Community Reporting & Management System

***Isang Boses. Isang Vizcaya.***

> `One Vizcaya` is a cross-platform mobile application and intelligent administrative ecosystem built with Flutter and Firebase. It is specifically engineered to bridge the communication gap between the ~530,106 citizens of Nueva Vizcaya and their Local Government Units (LGU) — routing critical field data from the local Barangay level all the way to the Provincial Capitol in real time.

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Aims](#-core-aims)
3. [Ecosystem Architecture](#%EF%B8%8F-ecosystem-architecture)
4. [Tech Stack](#-tech-stack)
5. [UI, Theming & Identity](#-ui-theming--identity)
6. [Multilingual Support](#-multilingual-support)
7. [Multi-Tiered Triage & Escalation Workflow](#%EF%B8%8F-multi-tiered-triage--escalation-workflow)
8. [Geospatial Architecture & Emergency Responders](#-geospatial-architecture--emergency-responders)
9. [Master Development Roadmap Status](#-master-development-roadmap-status)

---

## 📌 Project Overview
The One Vizcaya platform provides a centralized, multi-tenant hub where residents can report localized emergencies and infrastructure issues — ranging from public health crises to agricultural asset damage. By utilizing **real-time Firestore streams**, **dynamic GeoJSON administrative boundary mapping**, **offline queuing**, and **biometric authentication**, this platform eliminates bureaucratic delays, optimizes localized equipment dispatch, and provides provincial executives with a secure, empirical view of the entire province's health.

## 🌟 Core Aims
* **Civilian Empowerment:** Lower the technical barrier for rural communities to report active problems via an offline-first, media-optimized mobile app — available in English, Tagalog, and Ilocano.
* **Operational Integrity:** Stop fraudulent reporting at the network perimeter by verifying physical image hardware metadata (EXIF) at submission.
* **Administrative Load-Balancing:** Use hierarchical role-based partitioning so municipal offices handle localized issues while the Capitol monitors high-impact escalations.
* **Provincial Resource Strategy:** Give the Governor and Provincial Administrator empirical data arrays to see which towns resolve problems efficiently and where infrastructure budgets should be allocated.

---

## 🖥️ Ecosystem Architecture

One Vizcaya is not just a single mobile application; it is a unified, bidirectional data ecosystem composed of three major runtime components:

                       +-----------------------------+
                       |   Citizen Mobile Client     |
                       |        (Flutter)            |
                       +--------------+--------------+
                                      |
                            (Verified Submissions)
                                      |
                                      v
                       +-----------------------------+
                       |      Firebase Backend       |
                       |  (Firestore / Cloud Funcs)  |
                       +-------+-------------+-------+
                               |             |
                               v             v
    +-----------------------------+         +-----------------------------+
    |  Municipal Web Dashboard    |         |  Provincial Super-Admin UI  |
    |     (HTML5 / JS / Maps)     |         |   (God's-Eye View / Map)    |
    +-----------------------------+         +-----------------------------+


1. **The Citizen Mobile Client (Flutter):** An intuitive, high-performance application running native on citizen devices. Built to handle low-connectivity zones with offline report queuing, biometric login, dark mode, and full trilingual support.
2. **The LGU Web Command Dashboards (HTML5/JS):** A multi-tenant web console for every municipality. Enables dedicated dispatchers to evaluate reports, assign responders, manage SLA timers, export PDF reports, and broadcast announcements.
3. **The Provincial Super-Admin Command Hub:** A global view built for the Provincial Administrator and Governor's office. Overlays real-time heatmaps, tracks cross-municipal escalations, and serves as the ultimate command center during disaster scenarios.

---

## 🛠 Tech Stack
* **Mobile Frontend:** `Flutter` (Dart) with layered Clean Architecture, ValueNotifier-based reactive state management.
* **Web Dashboards:** `HTML5 / Vanilla JavaScript` with live integration with Google Maps JavaScript API and Chart.js analytics.
* **Backend Infrastructure:** `Firebase Suite`
  * *Cloud Firestore:* Real-time, distributed NoSQL document store with collectionGroup queries and granular security rules.
  * *Cloud Functions:* `Node.js` serverless triggers for FCM push notifications (per-user and batch broadcasts), demo data seeding, and role management.
  * *Firebase Storage:* Secure media buckets for field photo evidence with client-side compression.
  * *Firebase Authentication:* Phone OTP login with Identity Platform, supporting future TOTP MFA upgrade.
  * *Firebase Cloud Messaging:* Push notifications for status updates and LGU broadcasts, with tap-to-navigate routing.
  * *Firebase App Check:* Client attestation protecting all backend endpoints.
* **Key Flutter Packages:**
  * `app_links` — Deep link routing (`onevizcaya://status?reportId=xxx`)
  * `local_auth` — Biometric (fingerprint/face) login
  * `in_app_review` — Play Store rating prompt
  * `firebase_messaging` — FCM push with cold-start and background tap routing
  * `flutter_image_compress` — Client-side image compression before upload
  * `geolocator` — GPS coordinate capture for report geotagging
  * `shared_preferences` — Offline queue, bookmarks, dark mode, language persistence
* **Geospatial Services:** Native Android `Geolocator` bindings, Google Maps API, Google Maps Visualization (heatmap layer), OpenStreetMap GeoJSON boundary data.

---

## 🎨 UI, Theming & Identity
To instill local pride and immediately identify incoming accounts, the ecosystem features adaptive theming. The interface shifts colors depending on the authenticated jurisdiction, pulling inspiration from each town's distinct geography, major industries, and cultural seals.

| Municipality | Theme Identity | Dominant Hex | Regional Symbolism |
| :--- | :--- | :--- | :--- |
| **Bambang** | Agricultural Hub | `#E2725B` | Terracotta soil and clay pottery traditions |
| **Solano** | Commercial Center | `#FF4500` | Vibrant orange representing rapid economic trade |
| **Bayombong** | Provincial Capital | `#4169E1` | Royal blue for the seat of government and law |
| **Aritao** | Southern Gateway | `#2E8B57` | Eco-green symbolizing the valley entry checkpoints |
| **Bagabag** | Pineapple Capital | `#FFD700` | Golden yellow celebrating rich agricultural harvests |
| **Villaverde** | Historical Gateway | `#228B22` | Deep forest green representing pristine valley mountains |
| **Diadi** | Ecotourism Hub | `#008080` | Vibrant teal for the Magat River and local lakes |
| **Quezon** | Highland Haven | `#6A5ACD` | Serene deep purple mirroring the high mountain mists |
| **Santa Fe** | Mountain Gateway | `#708090` | Slate gray symbolizing the hard mountain passes and Dalton Pass |
| **Ambaguio** | Cloud Haven | `#87CEEB` | Sky blue celebrating high-altitude views and coffee peaks |
| **Kasibu** | Citrus Capital | `#FFA500` | Citrus orange representing the famous local orange orchards |
| **Dupax del Norte** | Cultural Heritage | `#800000` | Rich maroon celebrating indigenous historical roots |
| **Dupax del Sur** | Historic Town | `#A0522D` | Rustic sienna honoring centuries-old brick architecture |
| **Alfonso Castañeda** | Water Source | `#000080` | Navy blue honoring major rivers and reservoir resources |
| **Kayapa** | Vegetable Bowl | `#6B8E23` | Olive green reflecting upland farming and fresh produce |

---

## 🌐 Multilingual Support

One Vizcaya is one of the few LGU platforms in the Philippines with **native trilingual support**, ensuring accessibility across all demographics of Nueva Vizcaya.

| Language | Coverage | Notes |
| :--- | :--- | :--- |
| **English** | 100% | Default language |
| **Tagalog (Filipino)** | 100% | Full translation including FAQ content, dialog strings, error messages |
| **Ilocano** | 100% | Third language reflecting the province's dominant dialect |

All UI strings — including onboarding screens, report forms, settings dialogs, announcements, notifications, FAQ content, and error messages — are fully translated in all three languages. Citizens can switch language at any time from App Settings, with the selection persisted across sessions.

---

## 🏛️ Multi-Tiered Triage & Escalation Workflow

The core operational breakthrough of One Vizcaya is its automated **Hierarchical Escalation Engine**. Rather than overwhelming provincial executives with everyday local maintenance issues, the platform implements a secure, six-tier triage workflow:

* **Level 1: Field Capture (The Citizen):** A citizen discovers an issue (e.g., massive bridge degradation after a typhoon). They capture it on the mobile client. The app seals the report with GPS coordinates, timestamps, and optional photo evidence. Offline? The report is queued locally and auto-submitted when connectivity is restored.
* **Level 2: Perimeter Triage (Municipal Dispatch):** The report populates the local dashboard with an audio chime alert. A municipal dispatcher reviews the submission, checks SLA timers, and assigns a severity rating (`Low` to `Critical`).
* **Level 3: Municipal Action (Local Mitigation):** The validated report is assigned to a specific local responder (e.g., MDRRMO Bambang). The citizen receives a real-time push notification and can track progress via an animated step tracker.
* **Level 4: The Escalation Trigger:** If the local responder finds the emergency exceeds local capacity, the Municipal Administrator hits **"Escalate to Province"**.
* **Level 5: Provincial Command Center (The Super-Admin View):** The report instantly appears on the Provincial Command Hub, flagged with an **[ESCALATED]** banner and surfaced on the real-time heatmap.
* **Level 6: Provincial Resolution (Strategic Deployment):** The Provincial Action Team coordinates with entities like the **DPWH 1st District Engineering Office** to dispatch resources, resolving the crisis. Citizens receive a final resolution notification and can rate the response.

---

## 🛰️ Geospatial Architecture & Emergency Responders

To guarantee total spatial awareness for government executives, the administrative dashboard maps real-world coordinates onto live data vectors.

     +------------------------------------------------------------------------+
     | [View As: Bambang (Municipal) ▽]               [Role: Admin - Bambang] |
     +------------------------------------------------------------------------+
     |                                                                        |
     |      .,-""""-.            ====================================         |
     |    .'          '.                LIVE RESPONDER TRACKING               |
     |   /    /''''\   \          ====================================        |
     |  |    |BAMBANG|   |       [🚓] PNP Bambang MPS      (16.3756, 121.1033)|
     |  |   |        |   |       [🚒] BFP Fire Station     (16.3752, 121.1031)|
     |   \   \      /   /        [🏥] NV Provincial Hosp.  (16.3847, 121.1077)|
     |    '.  '-..-'  .'         [🚨] MDRRMO Command Center(16.3755, 121.1028)|
     |      '-......-'                                                        |
     |   (Dynamic GeoJSON Layer)       [🌡 Heatmap] [▣ Bulk Update] [⬇ PDF] |
     |                           [🔴 Critical Reports] [🟠 High] [🟢 Solved] |
     +------------------------------------------------------------------------+

### 🗺️ Precision GeoJSON Layering
Using customized **GeoJSON data layers**, when an administrator selects a municipality, the map renders a precise polygon outline defining the exact legal borders of that LGU — ensuring field incidents are cataloged under the correct municipal jurisdiction.

### 🚓 Fixed Asset Mapping (Pinpoint Tracking)
Emergency responder stations are mapped via native Firestore `GeoPoint` coordinates. Key provincial landmarks — including the **Region II Trauma and Medical Center (R2TMC)**, the **DPWH 1st District Engineering Office**, and all PNP and BFP stations across all 15 towns — are hardcoded via precise geodetic baselines.

### 🌡️ Real-Time Heatmap Visualization
The dashboard features a toggleable **Google Maps heatmap layer** overlaying report density across the province with an adjustable radius slider and legend overlay, enabling executives to instantly identify problem hotspots.

---

## 🗺 Master Development Roadmap Status

### 🔴 Critical Infrastructure & Core Security (100% Complete)
- [x] **Hierarchical Access Control (RBAC):** Custom security identifiers mapping users into `municipal_admin`, `provincial_admin`, and `super_admin` privilege tiers.
- [x] **Firestore Security Rules Overhaul:** Multi-layered database protection ensuring strict isolation between municipal tenant folders with global read for provincial super-admins.
- [x] **Verified EXIF Evidence System:** Mobile client forces automated extraction of physical image metadata (GPS/Timestamp) during capture, blocking gallery spoofing.
- [x] **The Admin Escalation Protocol:** Secure database trigger route allowing municipal offices to pass active document ownership to the provincial data layer.
- [x] **Firebase App Check:** Client attestation on all Firestore and Storage endpoints.
- [x] **XSS & Injection Hardening:** All dynamic HTML in the web dashboard uses data-* attribute delegation; no innerHTML string interpolation from user data.
- [x] **Memory Leak Prevention:** All Firestore stream subscriptions stored and cancelled on sign-out; duplicate listener guards with `_listenersActive` flags.

### 🟠 Dashboard Polish & Spatial Realism (100% Complete)
- [x] **GeoJSON Boundary Interceptor:** Dynamic map parsing drawing exact territorial boundaries on LGU toggle.
- [x] **Fixed-Asset Emergency Infrastructure Seeding:** High-precision coordinate profiles for every PNP, BFP, RHU, MDRRMO, and public hospital across all 15 municipalities.
- [x] **Quick-Filter Summary Arrays:** Five-point clickable status badges for instant chronological and priority filtering.
- [x] **Automated Data Seeders:** `seedDemoData` and `grantDemoAdminRole` Cloud Functions for ecosystem testing.
- [x] **Real-Time Heatmap:** Google Maps Visualization heatmap with radius slider and legend overlay.
- [x] **SLA Tracking Engine:** Per-category SLA hour constants (4h disaster, 72h infrastructure, etc.) with overdue badges and progress bars in the report detail modal.
- [x] **Bulk Status Operations:** Checkbox multi-select with a sticky action bar for batch status updates across multiple reports.
- [x] **PDF Export:** jsPDF-powered report generator with color-coded status, notes history, and smart filename output.
- [x] **Satisfaction Analytics:** Citizen feedback ratings dashboard with star display, low-rating alerts, and per-municipality breakdown table.
- [x] **Trend Analytics:** Chart.js weekly trend line chart tracking the top 3 report categories over 8 weeks.
- [x] **Canned Responses:** Pre-written response library organized by category for fast admin replies.
- [x] **Scheduled Announcements:** datetime-local input with Firestore Timestamp scheduling and countdown display.
- [x] **New Report Audio Alert:** Web Audio API chime + styled toast on incoming report via Firestore `docChanges()`.
- [x] **Session Timeout Security:** Inactivity warning with live countdown, auto-refresh option, and slide-in CSS notification.
- [x] **Delete Confirmation Modal:** Custom confirmation dialog with 3-second cooldown and real-time "DELETE" type-to-confirm validation.
- [x] **Keyboard Shortcuts:** `R` = Refresh, `F` = Filter, `E` = Export, `Esc` = Close modal.
- [x] **Notes History:** Timestamped notes with colored author avatars, character count, and timeago display.
- [x] **Responder Assignment:** Report detail modal with direct responder assignment to active field units.
- [x] **Per-Municipality Analytics:** Independent report counts, resolution rates, and trend data per municipality.
- [x] **Report Pagination:** Up to 256 simultaneous reports with real-time stream updates.

### 🟢 Mobile App Features (100% Complete)
- [x] **Offline Report Queue:** Reports submitted without connectivity are stored in SharedPreferences and auto-flushed on reconnect. Home screen shows a live queue count banner.
- [x] **Biometric Login:** Fingerprint/Face ID login via `local_auth` on the login screen (Android; requires FlutterFragmentActivity).
- [x] **Dark Mode:** System-wide dark theme toggle persisted across sessions via SharedPreferences.
- [x] **Deep Link Routing:** `onevizcaya://status?reportId=xxx` opens the app directly to the relevant report.
- [x] **FCM Tap Routing:** Tapping a push notification navigates directly to the relevant report — handled for both cold-start and background states.
- [x] **Report Step Tracker:** Animated 4-step progress tracker (Reported → Acknowledged → Ongoing → Solved) on every report card with pulse animation on the active step.
- [x] **Citizen Feedback & Rating:** 5-star rating sheet for resolved reports with animated stars, gradient colors, and Firestore persistence. Prevents duplicate submissions.
- [x] **Photo Viewer:** Full-screen Hero-animated photo viewer with swipe-down dismiss, pinch-to-zoom hint, and loading/error states.
- [x] **Share Report:** Native SMS share via url_launcher with a deep link to the specific report.
- [x] **Announcement Bookmarks:** Swipe-to-bookmark announcements with SharedPreferences persistence and a Bookmarked filter chip with count badge.
- [x] **Citizen Stats Card:** Animated count-up statistics in the profile screen (Total / Resolved / Pending) with a shimmer loading state.
- [x] **Haptic Feedback:** `HapticFeedback.lightImpact()` on GPS attach; `mediumImpact()` on report submit.
- [x] **In-App Review Prompt:** Play Store rating prompt shown once after a report is resolved.
- [x] **Account Deletion:** 2-step deletion flow with bullet-list consequences, type-to-confirm with live border color, and animated progress dialog.
- [x] **Image Compression:** `flutter_image_compress` automatically downscales field photos before upload to reduce citizen data usage.
- [x] **Trilingual UI:** English, Tagalog, and Ilocano — 100% of all visible strings translated including FAQ content, dialog strings, and error messages.

### 🟡 Planned — Pre-Production Deployment
- [ ] **Admin 2FA (TOTP):** Upgrade admin login to email + password + Google Authenticator TOTP as second factor via Firebase Identity Platform. *Planned for Provincial Government partnership deployment.*
- [ ] **iOS Build & App Store Submission:** TestFlight distribution and App Store listing.
- [ ] **Google Play Store Submission:** Production release on the Play Store.
- [ ] **Custom App Icon:** Commissioned artwork for the official provincial app icon.
- [ ] **Real LGU Content:** Replace placeholder FAQ and contact content with official Provincial Government data.
- [ ] **Provincial Escalation Dashboard:** Dedicated super-admin view for the Governor's office with cross-municipal aggregation.
- [ ] **DPWH / PDRRMO API Integration:** Direct pipeline to provincial emergency management systems.

---

<p align="center">
  <b>Developed By</b><br>
  Aaron Anthony A. Gano II<br>
  <i>Computer Science Department, Nueva Vizcaya State University (NVSU)</i><br><br>
  <i>In compliance with Republic Act No. 10173 — Data Privacy Act of 2012</i>
</p>