# 🏛️ One Vizcaya: Community Reporting & Management System

***Isang Boses. Isang Vizcaya.***

> `One Vizcaya` is a cross-platform mobile application and intelligent administrative ecosystem built with Flutter and Firebase. It is engineered to bridge the communication gap between the ~530,106 citizens of Nueva Vizcaya and their Local Government Units (LGU) — routing critical field data from the local Barangay level all the way to the Provincial Capitol in real time.

> **Project status:** Feature-complete working prototype, developed as an academic project at Nueva Vizcaya State University. Ready for a supervised pilot deployment in a single municipality prior to wider rollout. See the [Deployment & Pilot Plan](#-master-development-roadmap-status) and [Cost & Sustainability Plan](./COSTS.md).

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Aims](#-core-aims)
3. [Ecosystem Architecture](#%EF%B8%8F-ecosystem-architecture)
4. [Tech Stack](#-tech-stack)
5. [Privacy & Data Handling](#-privacy--data-handling)
6. [UI, Theming & Identity](#-ui-theming--identity)
7. [Multilingual Support](#-multilingual-support)
8. [Multi-Tiered Triage & Escalation Workflow](#%EF%B8%8F-multi-tiered-triage--escalation-workflow)
9. [Geospatial Architecture & Emergency Responders](#-geospatial-architecture--emergency-responders)
10. [Master Development Roadmap Status](#-master-development-roadmap-status)
11. [Cost & Sustainability](#-cost--sustainability)
12. [Governance, Ownership & Handover](#-governance-ownership--handover)

---

## 📌 Project Overview
The One Vizcaya platform provides a centralized, multi-tenant hub where residents can report localized emergencies and infrastructure issues — ranging from public health concerns to agricultural asset damage. By utilizing **real-time Firestore streams**, **dynamic GeoJSON administrative boundary mapping**, **offline queuing**, and **biometric authentication**, the platform is designed to reduce bureaucratic delays, optimize localized equipment dispatch, and give provincial executives a secure, data-driven view of the province.

Importantly, the platform is built to **feed and support existing LGU offices, hotlines, and disaster-management workflows — not to replace them.** It acts as a structured, mapped, trackable intake layer in front of the systems the province already operates.

## 🌟 Core Aims
* **Civilian Empowerment:** Lower the technical barrier for rural communities to report active problems via an offline-first, media-optimized mobile app — available in English, Tagalog, and Ilocano.
* **Operational Integrity:** Reduce fraudulent reporting by verifying image hardware metadata (EXIF) at submission and ensuring every report is human-reviewed before any response is dispatched.
* **Administrative Load-Balancing:** Use hierarchical role-based partitioning so municipal offices handle localized issues while the Capitol monitors high-impact escalations.
* **Provincial Resource Strategy:** Give the Governor and Provincial Administrator empirical data to see which towns resolve problems efficiently and where infrastructure budgets may be best allocated.

---

## 🖥️ Ecosystem Architecture

One Vizcaya is a unified, bidirectional data ecosystem composed of three major runtime components:

```
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
    |     (HTML5 / JS / Maps)     |         |   (Province-Wide View)      |
    +-----------------------------+         +-----------------------------+
```

1. **The Citizen Mobile Client (Flutter):** An intuitive, high-performance application running natively on citizen devices. Built to handle low-connectivity zones with offline report queuing, biometric login, dark mode, and full trilingual support.
2. **The LGU Web Command Dashboards (HTML5/JS):** A multi-tenant web console for every municipality. Enables dedicated dispatchers to evaluate reports, assign responders, manage SLA timers, export PDF reports, and broadcast announcements.
3. **The Provincial Super-Admin Command Hub:** A province-wide view built for the Provincial Administrator and Governor's office. Overlays real-time heatmaps, tracks cross-municipal escalations, and serves as a command center during disaster scenarios.

---

## 🛠 Tech Stack
* **Mobile Frontend:** `Flutter` (Dart) with layered Clean Architecture and reactive state management.
* **Web Dashboards:** `HTML5 / Vanilla JavaScript` with live integration of the Google Maps JavaScript API and Chart.js analytics.
* **Backend Infrastructure:** `Firebase Suite`
  * *Cloud Firestore:* Real-time, distributed NoSQL document store with collectionGroup queries and granular security rules.
  * *Cloud Functions:* `Node.js` serverless triggers for FCM push notifications, demo data seeding, and role management.
  * *Firebase Storage:* Secure media buckets for field photo evidence with client-side compression.
  * *Firebase Authentication:* Phone OTP login with Identity Platform, supporting future TOTP MFA upgrade.
  * *Firebase Cloud Messaging:* Push notifications for status updates and LGU broadcasts, with tap-to-navigate routing.
  * *Firebase App Check:* Client attestation protecting backend endpoints.
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

## 🔒 Privacy & Data Handling

One Vizcaya is designed **in accordance with Republic Act No. 10173 (Data Privacy Act of 2012)**. Upon adoption, the LGU becomes the data controller, and the system is built to support that responsibility:

* **Data minimization:** The app collects only what a report requires — category, location, optional photo, and a contact identity. No unnecessary personal data is gathered.
* **Informed consent:** A first-launch consent screen explains what data is collected, why, and how long it is retained, with auditable consent timestamps.
* **Defined retention:** Resolved reports are auto-archived after a defined retention period to limit indefinite data storage.
* **Access control:** Strict Firestore security rules ensure citizens can only access their own submissions, and admins only see data within their jurisdiction.
* **Compliance roadmap:** Final deployment includes coordination with the LGU legal office for **National Privacy Commission (NPC) registration** and designation of a **Data Protection Officer** from the LGU.

> *Note: This project is engineered to align with RA 10173. Formal compliance certification is completed jointly with the adopting LGU prior to public launch.*

---

## 🎨 UI, Theming & Identity
To instill local pride and immediately identify the active jurisdiction, the ecosystem features adaptive theming. The interface shifts colors depending on the authenticated jurisdiction, drawing from each town's geography, industries, and cultural identity.

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

One Vizcaya offers **native trilingual support**, designed for accessibility across the demographics of Nueva Vizcaya.

| Language | Coverage | Notes |
| :--- | :--- | :--- |
| **English** | 100% | Default language |
| **Tagalog (Filipino)** | 100% | Full translation including FAQ content, dialog strings, error messages |
| **Ilocano** | 100% | Third language reflecting a widely spoken local language |

All UI strings — onboarding, report forms, settings dialogs, announcements, notifications, FAQ content, and error messages — are translated across all three languages. Citizens can switch language at any time from App Settings, with the selection persisted across sessions.

---

## 🏛️ Multi-Tiered Triage & Escalation Workflow

The core operational design of One Vizcaya is its **Hierarchical Escalation Engine**. Rather than overwhelming provincial executives with everyday local maintenance issues, the platform implements a secure, six-tier triage workflow. **No report is ever auto-dispatched — a human reviews every submission before any response is taken.**

* **Level 1 — Field Capture (The Citizen):** A citizen captures an issue (e.g., bridge degradation after a typhoon) on the mobile client. The app seals the report with GPS coordinates, timestamps, and optional photo evidence. Offline reports are queued locally and auto-submitted when connectivity is restored.
* **Level 2 — Perimeter Triage (Municipal Dispatch):** The report populates the local dashboard with an audio chime alert. A municipal dispatcher reviews the submission, checks SLA timers, and assigns a severity rating (`Low` to `Critical`).
* **Level 3 — Municipal Action (Local Mitigation):** The validated report is assigned to a specific local responder (e.g., MDRRMO). The citizen receives a real-time push notification and tracks progress via an animated step tracker.
* **Level 4 — The Escalation Trigger:** If the emergency exceeds local capacity, the Municipal Administrator selects **"Escalate to Province."**
* **Level 5 — Provincial Command Center (Super-Admin View):** The report appears on the Provincial Command Hub, flagged with an **[ESCALATED]** banner and surfaced on the real-time heatmap.
* **Level 6 — Provincial Resolution (Strategic Deployment):** The Provincial Action Team coordinates with entities such as the **DPWH District Engineering Office** to dispatch resources. Citizens receive a final resolution notification and can rate the response.

---

## 🛰️ Geospatial Architecture & Emergency Responders

To support spatial awareness for government executives, the administrative dashboard maps real-world coordinates onto live data.

```
     +------------------------------------------------------------------------+
     | [View As: Bambang (Municipal) v]               [Role: Admin - Bambang] |
     +------------------------------------------------------------------------+
     |                                                                        |
     |      .,-""""-.            ====================================         |
     |    .'          '.                LIVE RESPONDER TRACKING               |
     |   /    /''''\   \          ====================================        |
     |  |    |BAMBANG|   |       [PNP] Bambang MPS        (16.3756, 121.1033) |
     |  |   |        |   |       [BFP] Fire Station       (16.3752, 121.1031) |
     |   \   \      /   /        [HOS] NV Provincial Hosp. (16.3847, 121.1077)|
     |    '.  '-..-'  .'         [DRR] MDRRMO Command      (16.3755, 121.1028) |
     |      '-......-'                                                        |
     |   (Dynamic GeoJSON Layer)       [Heatmap] [Bulk Update] [PDF Export]    |
     |                           [Critical Reports] [High] [Solved]           |
     +------------------------------------------------------------------------+
```

### 🗺️ Precision GeoJSON Layering
Using customized **GeoJSON data layers**, selecting a municipality renders a precise polygon outline of that LGU's legal borders — ensuring field incidents are cataloged under the correct municipal jurisdiction.

### 🚓 Fixed Asset Mapping (Pinpoint Tracking)
Emergency responder stations are mapped via native Firestore `GeoPoint` coordinates. Key provincial landmarks — including the **Region II Trauma and Medical Center (R2TMC)**, **DPWH District Engineering Offices**, and PNP and BFP stations across the 15 municipalities — are mapped via precise geodetic baselines.

### 🌡️ Real-Time Heatmap Visualization
The dashboard features a toggleable **Google Maps heatmap layer** overlaying report density across the province, with an adjustable radius slider and legend, enabling executives to quickly identify problem hotspots.

---

## 🗺 Master Development Roadmap Status

> *Status reflects the working prototype. "Implemented" indicates a feature is built and functioning in the development environment; field validation occurs during the pilot phase.*

### 🔴 Core Infrastructure & Security — *Implemented*
- [x] **Hierarchical Access Control (RBAC):** Custom claims mapping users into `municipal_admin`, `provincial_admin`, and `super_admin` tiers.
- [x] **Firestore Security Rules:** Multi-layered protection isolating municipal tenant data, with province-wide read for super-admins.
- [x] **Verified EXIF Evidence System:** Mobile client extracts image metadata (GPS/timestamp) at capture to reduce gallery spoofing.
- [x] **Admin Escalation Protocol:** Secure route allowing municipal offices to pass report ownership to the provincial layer.
- [x] **Firebase App Check:** Client attestation on Firestore and Storage endpoints.
- [x] **XSS & Injection Hardening:** Dashboard uses `data-*` attribute delegation; no `innerHTML` interpolation of user data.
- [x] **Memory Leak Prevention:** Firestore stream subscriptions tracked and cancelled on sign-out; duplicate-listener guards.

### 🟠 Dashboard & Spatial Tooling — *Implemented*
- [x] **GeoJSON Boundary Rendering** on LGU toggle.
- [x] **Fixed-Asset Emergency Infrastructure Seeding** for PNP, BFP, RHU, MDRRMO, and hospitals across all 15 municipalities.
- [x] **Quick-Filter Status Badges** for chronological and priority filtering.
- [x] **Automated Data Seeders** (`seedDemoData`, `grantDemoAdminRole`) for testing.
- [x] **Real-Time Heatmap** with radius slider and legend.
- [x] **SLA Tracking Engine** with per-category targets, overdue badges, and progress bars.
- [x] **Bulk Status Operations** via multi-select action bar.
- [x] **PDF Export** (jsPDF) with status colors, notes history, and smart filenames.
- [x] **Satisfaction Analytics** with star ratings, low-rating alerts, and per-municipality breakdown.
- [x] **Trend Analytics** (Chart.js) tracking top categories over 8 weeks.
- [x] **Canned Responses** library organized by category.
- [x] **Scheduled Announcements** with Firestore Timestamp scheduling.
- [x] **New-Report Audio Alert** via Firestore `docChanges()`.
- [x] **Session Timeout Security** with inactivity warning and countdown.
- [x] **Delete Confirmation Modal** with cooldown and type-to-confirm.
- [x] **Keyboard Shortcuts** (`R`/`F`/`E`/`Esc`).
- [x] **Notes History** with author avatars and timeago.
- [x] **Responder Assignment** from the report detail modal.
- [x] **Per-Municipality Analytics** (counts, resolution rates, trends).
- [x] **Report Pagination** with real-time stream updates.

### 🟢 Mobile App Features — *Implemented*
- [x] **Offline Report Queue** with live queue-count banner and auto-flush on reconnect.
- [x] **Biometric Login** (fingerprint/Face ID) via `local_auth`.
- [x] **Dark Mode** persisted across sessions.
- [x] **Deep Link Routing** (`onevizcaya://status?reportId=xxx`).
- [x] **FCM Tap Routing** for cold-start and background states.
- [x] **Animated Report Step Tracker** (Reported → Acknowledged → Ongoing → Solved).
- [x] **Citizen Feedback & Rating** with duplicate-submission prevention.
- [x] **Full-Screen Photo Viewer** with Hero animation and pinch-to-zoom.
- [x] **Share Report** via native SMS deep link.
- [x] **Announcement Bookmarks** with persistence and filter chip.
- [x] **Citizen Stats Card** with animated count-up.
- [x] **Haptic Feedback** on GPS attach and submit.
- [x] **In-App Review Prompt** after a report is resolved.
- [x] **Account Deletion** with 2-step type-to-confirm flow.
- [x] **Image Compression** before upload to reduce citizen data usage.
- [x] **Trilingual UI** (English / Tagalog / Ilocano).

### 🟡 Planned — Pre-Production & Deployment
- [ ] **Field Pilot (Single Municipality):** Supervised 3-month pilot with real users and LGU staff before wider rollout.
- [ ] **Admin 2FA (TOTP):** Email + password + authenticator second factor via Firebase Identity Platform.
- [ ] **NPC Registration & DPO Designation:** Completed jointly with the adopting LGU.
- [ ] **Accessibility Fallback:** SMS / hotline / proxy-reporting path for residents without smartphones.
- [ ] **iOS Build & App Store Submission** (TestFlight + listing).
- [ ] **Google Play Store Submission** (production release).
- [ ] **Custom App Icon:** Commissioned official provincial artwork.
- [ ] **Real LGU Content:** Official FAQ and contact data from the Provincial Government.
- [ ] **DPWH / PDRRMO Integration:** Direct pipeline to provincial emergency systems.
- [ ] **Staff Training & Handover:** Train LGU IT personnel to own and maintain the system.

---

## 💰 Cost & Sustainability

One Vizcaya is engineered to be **extremely low-cost to operate**, with no vendor lock-in to a custom platform. A full breakdown — including Firebase pricing math for a single-municipality pilot, a three-municipality cluster, and a province-wide rollout — is documented separately:

➡️ **See [COSTS.md](./COSTS.md) for the full Cost & Sustainability Plan.**

| Scale | Estimated monthly cost |
| :--- | :--- |
| Single municipality (pilot) | ≈ ₱0 (within Firebase free tier) |
| Three municipalities | ≈ ₱50–₱150 |
| Province-wide (with safety buffer) | under ₱5,000 |

*Estimates are for planning and are re-validated against live Firebase pricing before any procurement decision.*

---

## 🤝 Governance, Ownership & Handover

This system is **not dependent on a single developer.**

* **Source-code ownership** is turned over to the adopting LGU, along with full setup and deployment documentation.
* **Billing** runs under the LGU's own Google Cloud account, so the province directly controls and monitors all spending, with budget alerts configured.
* **Maintenance** is supported by training LGU IT staff during the pilot, ensuring the system outlives any individual's involvement.
* **Technology choices** (Flutter, Firebase, standard web) are mainstream and maintainable by any competent developer the LGU engages in the future.

---

<p align="center">
  <b>Developed By</b><br>
 (<i>Mysterious_Alarm</i>)<br>
  <i>BS Computer Science (Robotics), Nueva Vizcaya State University (NVSU)</i><br><br>
  <i>Designed in accordance with Republic Act No. 10173 — Data Privacy Act of 2012</i>
</p>
