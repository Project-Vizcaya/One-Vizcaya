# 🏛️ One Vizcaya: Community Reporting & Management System

***Isang Boses. Isang Vizcaya.***

> `One Vizcaya` is a cross-platform mobile application and intelligent administrative ecosystem built with Flutter and Firebase. It is engineered to bridge the communication gap between the ~530,106 citizens of Nueva Vizcaya and their Local Government Units (LGU) — routing critical field data from the local Barangay level all the way to the Provincial Capitol in real time.

> **Project status:** Feature-complete working prototype, developed by a Nueva Vizcaya State University team. Offered to the Provincial Government as a **managed service**, ready for a supervised pilot in a single municipality prior to wider rollout. See the [Deployment & Pilot Plan](#-master-development-roadmap-status), [Cost & Sustainability Plan](#-cost--sustainability-plan), and [Service Model](#-service-model-ownership--continuity).

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
11. [Cost & Sustainability Plan](#-cost--sustainability-plan)
12. [Service Model, Ownership & Continuity](#-service-model-ownership--continuity)

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
  * `http` — Live Wikipedia municipality summaries and announcement link metadata
  * `url_launcher` — Tappable hotlines, source links, Wikipedia, and the web admin portal
* **Geospatial Services:** Native Android `Geolocator` bindings, Google Maps API, Google Maps Visualization (heatmap layer), OpenStreetMap GeoJSON boundary data.

---

## 🔒 Privacy & Data Handling

One Vizcaya is designed **in accordance with Republic Act No. 10173 (Data Privacy Act of 2012)**. Upon adoption, the LGU becomes the data controller, and the system is built to support that responsibility:

* **Data minimization:** The app collects only what a report requires — category, location, optional photo, and a contact identity. No unnecessary personal data is gathered.
* **Informed consent:** A first-launch consent screen explains what data is collected, why, and how long it is retained, with auditable consent timestamps.
* **Defined retention:** Reports are auto-archived after 12 months and permanently deleted (with their photos) after 24 months by scheduled jobs, limiting indefinite data storage.
* **Access control:** Strict Firestore security rules ensure citizens can only access their own submissions, and admins only see data within their jurisdiction.
* **Compliance roadmap:** Final deployment includes coordination with the LGU legal office for **National Privacy Commission (NPC) registration** and designation of a **Data Protection Officer** from the LGU.

> *Note: This project is engineered to align with RA 10173. Formal compliance certification is completed jointly with the adopting LGU prior to public launch.*

---

## 🎨 UI, Theming & Identity
To instill local pride and immediately identify the active jurisdiction, the ecosystem features adaptive theming. Each municipality has a **definitive title** and a coordinated **three-color scheme** — a **Primary** (app bar / main), **Secondary** (accent / icons), and **Tertiary** (surface / cards) color — drawn from its geography, industries, and cultural identity. The interface re-themes automatically based on the selected jurisdiction.

| Municipality | Definitive Title | Primary (App Bar) | Secondary (Accent) | Tertiary (Surface) |
| :--- | :--- | :--- | :--- | :--- |
| **Alfonso Castañeda** | The Hydroelectric Powerhouse | `#8B0000` Deep Red | `#FFD700` Gold | `#F8EBEB` Soft Red Tint |
| **Ambaguio** | The Gateway to Mount Pulag | `#008080` Teal | `#FFA500` Orange | `#E5F2F2` Soft Teal Tint |
| **Aritao** | The Onion Capital | `#E27D60` Onion Coral | `#85DCBA` Leaf Green | `#FCEEEA` Soft Coral Tint |
| **Bagabag** | The Pineapple Haven | `#F4A460` Goldenrod | `#228B22` Pineapple Green | `#FDF6E3` Warm Yellow Tint |
| **Bambang** | The Agricultural Hub | `#800000` Maroon | `#FFFFFF` White | `#FDF5F5` Soft Maroon Tint |
| **Bayombong** | The Educational and Institutional Capital | `#006400` Dark Green | `#FFD700` Gold | `#E6EFE6` Soft Green Tint |
| **Diadi** | The Eco-Tourism Sanctuary | `#2E8B57` Sea Green | `#D2691E` Earth Brown | `#EAF3EE` Light Sea Green |
| **Dupax del Norte** | The Agro-Forestry Frontier | `#8B4513` Saddle Brown | `#556B2F` Olive Green | `#F3EBE6` Light Earth Tint |
| **Dupax del Sur** | The Heritage Capital | `#A52A2A` Burgundy | `#DAA520` Antique Gold | `#F6EAEA` Soft Burgundy Tint |
| **Kasibu** | The Citrus Capital of the Philippines | `#FF8C00` Citrus Orange | `#32CD32` Lime Green | `#FFF4E6` Light Orange Tint |
| **Kayapa** | The Summer Capital of Nueva Vizcaya | `#4682B4` Steel Blue | `#228B22` Forest Green | `#EDF2F6` Soft Blue Tint |
| **Quezon** | The Mineral Outpost | `#4169E1` Royal Blue | `#FFD700` Gold | `#EAEFFC` Light Blue Tint |
| **Santa Fe** | The Gateway to Cagayan Valley | `#556B2F` Dark Olive | `#8B0000` Brick Red | `#EEF0EA` Light Olive Tint |
| **Solano** | The Premier Commercial Core | `#0A369D` Deep Blue | `#FFC107` Amber | `#E6EBF5` Soft Blue Tint |
| **Villaverde** | The Trailblazer's Sanctuary | `#32CD32` Lime Green | `#FFA500` Sun Orange | `#EAFCEA` Light Lime Tint |

> Tapping the municipality seal on the home screen opens an **info sheet** about that town — its definitive title, founding, barangay list, and trivia — combining curated offline facts with a live, fact-checked summary from Wikipedia.

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

### 🔀 Tiered Routing (Not Just Upward Escalation)
Beyond upward escalation, admins can **route a report to the correct administrative tier** in one tap from the report detail view, with on-screen **criteria** for each tier so the decision is consistent and defensible:

| Tier | When it applies |
| :--- | :--- |
| **Barangay** | Very local, low-risk matters a barangay can resolve (stray animals, uncollected garbage, clogged local canals, minor streetlight/signage issues). |
| **Municipal** | Town-wide services and infrastructure beyond a single barangay's resources (municipal roads, local flooding/drainage, public health and safety). |
| **Provincial** | High-impact or cross-municipal incidents needing provincial resources (major disasters, provincial roads/bridges, large-scale hazards). |
| **Region II** | National/regional mandate or assets (national highways and bridges via DPWH Region II, region-wide calamities, matters beyond provincial capacity). |

This lets municipal admins push hyper-local issues **down** to the Barangay LGU as well as escalate them **up**, keeping each report at the most appropriate level.

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
- [x] **Tiered Report Routing** — transfer a report to the correct administrative tier (Barangay / Municipal / Provincial / Region II), with on-screen routing criteria, including routing *down* to the Barangay LGU.
- [x] **One-Tap Web Admin Portal** — jump from the in-app admin dashboard to the full web admin portal in the browser.
- [x] **Announcement Link Auto-Fill** — paste a source URL and auto-generate the headline and body from the page's Open Graph / meta tags (manual entry remains the fallback when a link exposes no preview).

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
- [x] **Announcement Bookmarks** with persistence, plus **sort (newest/oldest)** and **filter by posting agency**.
- [x] **Municipality Info Sheet** — tap the home seal to view a town's definitive title, founding, barangay list, and trivia (curated offline + live Wikipedia summary).
- [x] **Concise Report Descriptions** — 30-character minimum / 75-character maximum, with overflow characters shown struck-through in red so reporters can trim before submitting (keeps emergency reports fast to triage).
- [x] **Expanded Report Categories** — contemporary and frequently-reported options across every priority tier (e.g., Vehicular Accident, Hazardous Spill, Online Scam / Cyber Fraud, Traffic Obstruction, Internet/Telecom).
- [x] **Citizen Stats Card** with animated count-up.
- [x] **Haptic Feedback** on GPS attach and submit.
- [x] **In-App Review Prompt** after a report is resolved.
- [x] **Account Deletion** with 2-step type-to-confirm flow, cascading to photo evidence in Storage (no orphaned media).
- [x] **Download My Data** (RA 10173 access & portability) — exports profile, consent record, and all reports as JSON or PDF.
- [x] **In-App Data Privacy Request** (RA 10173) — access / correction / erasure / objection / portability / complaint requests logged for the DPO, with DPO + NPC contacts surfaced in-app.
- [x] **Full In-App Privacy Policy** (RA 10173) — complete, readable policy covering legal basis, data sharing, retention, international transfers, consent withdrawal, and rights; reachable from Settings, Login, and the Setup consent step.
- [x] **Expanded Emergency Hotlines** — national, provincial, and municipal contacts including mental-health & suicide-crisis lines (NCMH 1553, Hopeline, In Touch), women & child protection, health (DOH, PhilHealth), cybercrime, and citizen-service hotlines (8888, DOLE, DTI).
- [x] **EXIF Stripping** — photo metadata (hidden GPS, camera serial, timestamp) removed before upload for data minimization.
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
- [ ] **Staff Training & Support Onboarding:** Train LGU dispatch and admin staff to operate the dashboards, with an ongoing support channel under the service agreement.

---

## 💰 Cost & Sustainability Plan

One Vizcaya is engineered to be **extremely low-cost to operate**, with no vendor lock-in to a custom platform. The figures below use **Firebase Blaze (pay-as-you-go) standard pricing as of 2026** and are intentionally **conservative** — real costs are likely lower thanks to caching, offline persistence, and the free tier applied to every Firebase project.

> **Bottom line:** A single-municipality pilot runs at effectively **₱0/month**. Even a province-wide rollout is estimated at well under **₱5,000/month** — less than a single staff salary line, serving all 15 municipalities at once.

### Reference Pricing (Firebase Blaze, 2026)

| Resource | Free tier (per project) | Cost beyond free tier |
| :--- | :--- | :--- |
| Firestore document reads | 50,000 / day | $0.06 per 100,000 |
| Firestore document writes | 20,000 / day | $0.18 per 100,000 |
| Firestore storage | 1 GiB | $0.18 per GB / month |
| Cloud Storage (photos) | 5 GB stored | $0.026 per GB stored |
| Cloud Storage download | 1 GB / day | $0.12 per GB downloaded |
| Cloud Functions | 2,000,000 / month | $0.40 per million |
| Cloud Messaging (push) | Unlimited | **Free** |
| Analytics / Crashlytics | Unlimited | **Free** |

*Exchange rate used: US $1 ≈ ₱58 (rounded to ₱60 for safe budgeting).*

### How Cost Is Actually Driven
Firebase cost is driven by **activity, not population.** We pay for reads, writes, and stored photos — not for registered residents. Cost-control measures already in the design: offline persistence and local drafting (fewer redundant reads), client-side image compression (smaller storage/download bills), user-scoped sub-collections (efficient queries), dashboard pagination (20 reports at a time), and a 12-month auto-archive of resolved reports (flat storage over time).

### Usage Assumptions
Estimates model a **realistic active reporting population**, not total residents — government experience shows only a small fraction of citizens file a report in any month.

| Assumption | Value |
| :--- | :--- |
| Reports per active user / month | ~2 |
| Photos per report | ~2 (compressed to ~300 KB each) |
| Reads per report (views + triage + status checks) | ~50 |
| Writes per report (submit + status updates) | ~5 |
| % of population filing a report in a month | ~1% (conservative) |

### Scenario A — One Municipality (Pilot: Bambang)
**Population basis:** ≈ 90,000 residents → ~900 active reporters/mo → ~1,800 reports/mo.

| Resource | Monthly volume | Free tier covers? | Charge |
| :--- | :--- | :--- | :--- |
| Reads | ~90,000/mo (~3,000/day) | ✅ Yes | ₱0 |
| Writes | ~9,000/mo (~300/day) | ✅ Yes | ₱0 |
| Photo storage | ~1.1 GB | ✅ Within 5 GB | ~₱0–₱5 |
| Photo downloads | ~1.5 GB/mo | ✅ Mostly free | ~₱0–₱10 |
| Cloud Functions | <10,000/mo | ✅ Yes | ₱0 |

**🟢 Pilot total: ≈ ₱0 / month** — fits comfortably inside Firebase's free quotas. A 3-month pilot in one municipality costs the LGU essentially nothing.

### Scenario B — Three Municipalities (Cluster Rollout)
**Example:** Bambang + Solano + Bayombong ≈ 230,000 residents → ~2,300 active reporters/mo → ~4,600 reports/mo.

| Resource | Monthly volume | Charge |
| :--- | :--- | :--- |
| Reads | ~230,000/mo (~7,700/day) | ₱0 (within free) |
| Writes | ~23,000/mo (~770/day) | ₱0 (within free) |
| Photo storage | ~15–25 GB accumulated | ~₱30 |
| Photo downloads | ~4 GB/mo | ~₱20 |
| Cloud Functions | ~25,000/mo | ₱0 (within free) |

**🟡 Three-municipality total: ≈ ₱50–₱150 / month** — growth is almost entirely accumulated photo storage, kept in check by the 12-month archive policy.

### Scenario C — Province-Wide (All of Nueva Vizcaya)
**Population basis:** ≈ 530,106 residents → ~5,300 active reporters/mo (1%) → ~10,600 reports/mo. A **3% stress-test** models ~15,900 reporters → ~31,800 reports/mo.

| Resource | Volume @ 1% | Volume @ 3% (stress) | Charge (stress) |
| :--- | :--- | :--- | :--- |
| Reads | ~530,000/mo | ~1.6M/mo (~53k/day) | ~₱30 |
| Writes | ~53,000/mo | ~159,000/mo | ₱0 |
| Photo storage | grows ~6 GB/mo | ~100+ GB/yr | ~₱155/mo |
| Photo downloads | ~10 GB/mo | ~30 GB/mo | ~₱200/mo |
| Cloud Functions | ~55,000/mo | ~160,000/mo | ₱0 |
| Safety buffer (spikes) | — | — | +₱1,000–₱2,000 |

**🔴 Province-wide total: ≈ ₱500/month (normal) to ₱3,000–₱4,500/month (heavy usage + buffer).** Even at triple the expected adoption with a disaster-spike buffer, the full provincial system stays under ₱5,000/month.

### Summary

| Scale | Active reporters/mo | Reports/mo | Estimated monthly cost |
| :--- | :--- | :--- | :--- |
| **1 Municipality (Pilot)** | ~900 | ~1,800 | **≈ ₱0** |
| **3 Municipalities** | ~2,300 | ~4,600 | **≈ ₱50–₱150** |
| **Province-wide (normal)** | ~5,300 | ~10,600 | **≈ ₱500** |
| **Province-wide (stress + buffer)** | ~15,900 | ~31,800 | **≈ ₱3,000–₱4,500** |

### Honest Cost Risks
1. **Disaster spikes** — reads and uploads surge for a few days during a major typhoon; the buffer covers this, and it is temporary.
2. **SMS authentication** — phone-OTP login costs ~$0.01–$0.06 per SMS. Recommendation: use email/Google sign-in for citizens, reserving SMS only for the future accessibility fallback.
3. **Unoptimized future code** — careless real-time listeners cause read amplification; the BLoC architecture and pagination guard against this.
4. **Dropping the archive policy** — storage grows without bound if the 12-month auto-archive is removed. It must be kept.

*Estimates are for planning and are re-validated against live Firebase pricing before any procurement decision. Verify current municipal populations (PSA) and the peso–dollar rate before presenting.*

---

### Total Cost of Ownership: Two Separate Line Items

It is important to distinguish two different costs. Government budget officers will want this separation made explicit:

| Cost component | What it is | Who pays / how billed |
| :--- | :--- | :--- |
| **A. Cloud infrastructure** | The Firebase/Google Cloud usage detailed above (reads, writes, storage). | Passed through transparently — the LGU sees the actual bill, with no markup. |
| **B. Professional service** | Development team's work: hosting management, maintenance, security updates, feature development, training, and support. | A defined service fee under the engagement agreement. |

The infrastructure cost (A) is genuinely low — effectively ₱0 at pilot scale and under ₱5,000/month even province-wide. **The primary value the Provincial Government pays for is the service (B): a professional team that keeps the platform secure, updated, supported, and continuously improved**, rather than letting it decay as unmaintained code.

### Why a Managed Service Costs Less Than the Alternatives

A useful comparison for decision-makers:

| Option | Typical reality | One Vizcaya managed service |
| :--- | :--- | :--- |
| **Build in-house** | Hire and retain full-time developers; high salary cost; knowledge lost if staff leave. | No hiring burden; an experienced team already familiar with the system. |
| **Large software vendor** | Six- or seven-figure contracts; generic product not tailored to NV; slow change requests. | Purpose-built *for* Nueva Vizcaya, by people from the province; fast, direct iteration. |
| **One-time custom build** | Paid once, then abandoned; no one maintains it; security rots; eventually unusable. | Continuously maintained and improved for the life of the agreement. |
| **Do nothing** | Reports stay scattered; no data; slow disaster response. | Structured, mapped, trackable civic reporting. |

### Pilot vs. Operational Phases

* **Pilot phase (3 months, one municipality):** Infrastructure cost ≈ ₱0. The team can run the pilot at minimal or waived service cost to demonstrate value — a low-risk trial for the LGU.
* **Operational phase (post-pilot):** A service agreement is established, scoped to the municipalities adopting the platform, with infrastructure billed transparently and a defined professional service fee. Terms scale with the deployment — a single municipality is modest; a province-wide engagement is larger but still far below traditional government IT contracts.

> *Specific service fees are proposed separately and negotiated in line with government procurement regulations. The figures in this section cover infrastructure cost; the service component is quoted based on the agreed scope.*

---

## 🤝 Service Model, Ownership & Continuity

One Vizcaya is offered to the Provincial Government as a **managed service**, not a one-time code dump. The development team builds, hosts, maintains, and continuously improves the platform under a service agreement, while the LGU retains full control over its own data and operations. This keeps the platform professionally maintained, secure, and evolving — rather than becoming abandoned code that no one is responsible for.

### Who owns what
* **Software & intellectual property:** Retained by the development team. The LGU receives a **non-exclusive license to use** the platform for the province under the service agreement — the same model used by virtually all government software vendors.
* **Government data:** Owned entirely by the LGU. All citizen reports, media, and records belong to the Provincial Government and are exportable at any time. The team never claims ownership of public data.

### Why this protects the LGU (continuity, not dependency)
A common and fair concern is *"what if the developers disappear?"* This model addresses that directly:
* **Source-code escrow / continuity clause:** A copy of the full source and deployment documentation is held in escrow (or with the LGU legal office), released to the LGU if the team ever ceases to operate — so the province is never stranded.
* **Two-developer team, not a solo dependency:** The platform is maintained by a team, reducing single-person risk.
* **Standard, non-proprietary stack:** Flutter and Firebase are mainstream and widely supported. If the LGU ever changes providers, another competent developer can take over — there is no exotic lock-in.
* **Full documentation & data export:** Complete technical documentation and one-click data export are provided, so transition is always possible.

### What the service agreement covers
* Hosting setup and configuration on a dedicated project.
* Ongoing maintenance, security updates, and bug fixes.
* Feature development and improvements over time.
* Staff training and a support channel for LGU dispatchers and administrators.
* Cloud infrastructure costs (billed transparently — see the Cost & Sustainability Plan).

> *Engagement terms (service period, scope, and fees) are defined jointly with the Provincial Government in accordance with applicable government procurement rules.*

---

<p align="center">
  <b>Developed By the Project: Vizcaya Team</b><br>
  <b>Mysterious_Alarm</b> — Lead Developer<br>
  <b>Sean Godric Reyes</b> — Co-Developer<br>
  <b>Darius Acosta</b> — Co-Developer<br>
  <i>Nueva Vizcaya State University (NVSU)</i><br><br>
  <i>Designed in accordance with Republic Act No. 10173 — Data Privacy Act of 2012</i>
</p>
