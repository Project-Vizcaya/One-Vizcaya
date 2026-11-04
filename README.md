# 🏛️ One Vizcaya: Community Reporting & Emergency Response System

***Isang Boses. Isang Vizcaya.***

> `One Vizcaya` is a cross-platform civic-reporting and emergency-response ecosystem for the Province of Nueva Vizcaya, built as a **Turborepo monorepo** — a **Flutter** citizen app, a **React + TypeScript** LGU admin console, and a **Firebase Cloud Functions** backend. It bridges the gap between the ~530,106 residents of Nueva Vizcaya and their Local Government Units (LGU), routing field data and emergencies from the Barangay level all the way to the Provincial Capitol in real time.

> **Project status:** Feature-rich working prototype, developed by a Nueva Vizcaya State University team. Offered to the Provincial Government as a **managed service**, ready for a supervised pilot in a single municipality prior to wider rollout. See the [Development Roadmap](#-development-roadmap), [Future Features](#-future-features), [Cost & Sustainability Plan](#-cost--sustainability-plan), and [Service Model](#-service-model-ownership--continuity).

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Aims](#-core-aims)
3. [Repository Structure](#-repository-structure)
4. [Ecosystem Architecture](#-ecosystem-architecture)
5. [Tech Stack](#-tech-stack)
6. [Governance & Authority Architecture](#-governance--authority-architecture-government-hierarchy)
7. [Roles & Access Control](#-roles--access-control)
8. [Feature Catalogue](#-feature-catalogue)
9. [Emergency SOS & Live Location](#-emergency-sos--live-location)
10. [Photo Evidence & GPS Stamping](#-photo-evidence--gps-stamping)
11. [Multi-Tiered Triage & Routing](#-multi-tiered-triage--routing)
12. [Geospatial Architecture](#-geospatial-architecture)
13. [Privacy & Data Handling](#-privacy--data-handling)
14. [UI, Theming & Identity](#-ui-theming--identity)
15. [Multilingual Support](#-multilingual-support)
16. [Getting Started (Local Development)](#-getting-started-local-development)
17. [Deployment](#-deployment)
18. [Development Roadmap](#-development-roadmap)
19. [Current Limitations](#-current-limitations)
20. [Future Features](#-future-features)
21. [Cost & Sustainability Plan](#-cost--sustainability-plan)
22. [Service Model, Ownership & Continuity](#-service-model-ownership--continuity)

---

## 📌 Project Overview
One Vizcaya provides a centralized, multi-tenant hub where residents can report localized emergencies and infrastructure issues — from public-health concerns to agricultural asset damage — and trigger **live-location SOS beacons** in a crisis. Using **real-time Firestore streams**, **GeoJSON administrative boundaries**, **offline queuing**, **biometric authentication**, and **live GPS dispatch**, the platform reduces bureaucratic delay, speeds emergency response, and gives provincial executives a secure, data-driven view of the province.

Importantly, the platform is built to **feed and support existing LGU offices, hotlines, and disaster-management workflows — not to replace them.** It is a structured, mapped, trackable intake layer in front of the systems the province already operates.

## 🌟 Core Aims
* **Civilian Empowerment:** Lower the technical barrier for rural communities to report problems and call for help via an offline-tolerant, media-optimized app — in English, Tagalog, and Ilocano.
* **Faster Emergency Response:** When a resident presses SOS, responders receive the person's **live location** instantly — so an ambulance can reach the exact spot even if the caller can't speak.
* **Operational Integrity:** Reduce fraudulent reporting with **GPS-stamped camera evidence**, a **camera-vs-gallery trust signal**, and **rules-enforced human verification of every SOS** before any dispatch. *(Report review is operator practice rather than an enforced gate — see [Current Limitations](#-current-limitations).)*
* **Administrative Load-Balancing:** Hierarchical, tenant-isolated roles so barangay/municipal offices handle local issues while the Capitol monitors high-impact escalations.
* **Provincial Resource Strategy:** Give the Governor and Provincial Administrator empirical data on where problems concentrate and how efficiently each town resolves them.

---

## 📂 Repository Structure

A **Turborepo** monorepo. `apps/web` and `apps/functions` are npm workspaces; `apps/mobile` is a Flutter project with its own toolchain.

```
One-Vizcaya/
├── apps/
│   ├── mobile/            # Flutter citizen app (Dart) — Android/iOS
│   ├── web/               # React + TypeScript + Vite LGU admin console + public landing
│   └── functions/         # Firebase Cloud Functions v2 (Node.js)
├── firestore.rules        # Database security rules (the enforcement layer)
├── storage.rules          # Cloud Storage security rules
├── firestore.indexes.json # Composite indexes for collectionGroup / scoped queries
├── firebase.json          # Firebase project config (hosting, functions, rules)
├── turbo.json             # Turborepo task pipeline
├── package.json           # Workspace root (build/dev/deploy scripts)
└── docs/                  # Governance, integration briefs, runbooks
```

---

## 🖥️ Ecosystem Architecture

One Vizcaya is a unified, bidirectional data ecosystem with three runtime components on one Firebase backend:

```
        ┌─────────────────────────────┐        ┌─────────────────────────────┐
        │   Citizen Mobile App        │        │   Public Landing Page       │
        │        (Flutter)            │        │   (React — learn + get APK) │
        └──────────────┬──────────────┘        └──────────────┬──────────────┘
                       │  verified reports / SOS beacons       │
                       ▼                                       ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │                        Firebase Backend                           │
        │  Auth · Firestore · Storage · Cloud Functions v2 · FCM · App Check │
        └───────────────┬───────────────────────────────────┬───────────────┘
                        │  real-time streams (role-scoped)   │  FCM push
                        ▼                                     ▼
        ┌─────────────────────────────┐        ┌─────────────────────────────┐
        │  LGU Admin Console (React)  │        │  Provincial Command Hub     │
        │  Barangay / Municipal view  │        │  Province-wide + Users/Audit│
        └─────────────────────────────┘        └─────────────────────────────┘
```

1. **Citizen Mobile App (Flutter):** Native app for reporting, live-location SOS, announcements, weather, and emergency contacts. Built for low-connectivity zones with offline report queuing, biometric login, dark mode, and trilingual support.
2. **LGU Admin Console (React):** A single React app that serves both a **public landing page** (residents learn about the app and download the APK) and the **admin console** behind login. The console re-scopes itself to the operator's tier — Barangay, Municipal, Provincial, or Super Admin.
3. **Firebase Backend:** Firestore real-time database with rule-enforced tenant isolation, Cloud Functions v2 for push/automation, Storage for photo evidence, and FCM for notifications.

---

## 🛠 Tech Stack

### Mobile — `apps/mobile` (Flutter / Dart)
* **Framework:** Flutter (stable), layered architecture with reactive `ValueNotifier`/stream state.
* **Firebase:** `firebase_core`, `firebase_auth` (phone OTP), `cloud_firestore`, `firebase_storage`, `firebase_messaging` (FCM), `firebase_app_check`.
* **Key packages:** `geolocator` (GPS + live position stream for SOS), `image_picker`, `flutter_image_compress`, `qr_flutter` (citizen QR + photo geo-stamp), `mobile_scanner` (QR scan), `local_auth` (biometrics), `in_app_review`, `app_links` (deep links), `pdf`/`printing` (data export), `fl_chart` (analytics), `share_plus`, `url_launcher`, `shared_preferences`, `path_provider`, `intl`/`flutter_localizations` (EN/TL/ILO).

### Web — `apps/web` (React + TypeScript + Vite)
* **Framework:** React 18 + TypeScript, bundled with **Vite**.
* **Routing:** **TanStack Router** (file-based, auto-generated route tree) + **TanStack Query**.
* **State:** **Zustand** (auth + view scope).
* **UI:** **Tailwind CSS** + **shadcn/ui** (Radix primitives, `class-variance-authority`, `tailwind-merge`), `lucide-react` icons.
* **Maps:** **`@vis.gl/react-google-maps`** — choropleth, zone bubbles, report/responder pins, barangay polygons.
* **Charts:** **Recharts**. **PDF export:** `jsPDF` + `jspdf-autotable`.
* **Backend SDK:** Firebase JS SDK v10; `zod`, `date-fns`.

### Backend — `apps/functions` (Firebase Cloud Functions v2)
* **Runtime:** Node.js 22, `firebase-functions` v6, `firebase-admin` v12 — ~20 functions.
* **Responsibilities:** FCM push (status updates, announcements, broadcasts, **SOS dispatch to in-scope responders**), **role nomination → approval** (`onRoleRequestDecision`), residency certification, escalation audit, **scheduled rainfall watch** (OpenWeather → advisories), report auto-archive/cleanup, and demo seeding.

### Platform
* **Firebase:** Authentication (phone OTP), Cloud Firestore, Cloud Storage, Cloud Functions v2, Cloud Messaging (FCM), App Check.
* **Boundary data:** barangay & municipality polygons from [`faeldon/philippines-json-maps`](https://github.com/faeldon/philippines-json-maps) (2023 PSGC).

---

## 🏛️ Governance & Authority Architecture (Government Hierarchy)

One Vizcaya is deliberately modelled on the **real chain of governance** under the Local Government Code — **Barangay → City/Municipality → Province → Region II** — so authority, accountability, and data ownership line up one-to-one with how the Provincial Government of Nueva Vizcaya operates. Full treatment in **[`docs/Architecture-Governance-Design.md`](docs/Architecture-Governance-Design.md)** and **[`docs/Governance-Architecture.md`](docs/Governance-Architecture.md)**.

### The four-tier hierarchy

| Tier | Government Level | Represented In System As |
| :--- | :--- | :--- |
| **Tier 1** | Barangay (lowest LGU unit) | Barangay workspace — Punong Barangay / delegate & tanod |
| **Tier 2** | City / Municipality | Municipal dashboard — MLGU offices (MDRRMO, Engineering, RHU…) |
| **Tier 3** | Province | Provincial Command Hub — PA, PDRRMO, PPDO, PITD |
| **Tier 4** *(external)* | National / Regional agencies | Referral targets — DPWH Region II, DILG, NDRRMC… |

### The four-layer model (every tier must satisfy all four)

| Layer | The Question It Answers | How One Vizcaya guarantees it |
| :--- | :--- | :--- |
| **Governance** | *Who is in charge here?* | Custom-claim roles with bounded, non-overlapping scope |
| **Accountability** | *Who answers for this?* | One accountable owner per report; ownership transfers only via explicit, audited handoffs |
| **Data** | *What do we hold, and who owns it?* | Province is RA 10173 data **controller**; each LGU stewards its slice; the dev team is **processor, never owner** |
| **Technical** | *How does the system guarantee it?* | Enforced in **`firestore.rules` / `storage.rules` / Cloud Functions at the database layer — not just the UI** |

### Authority & accountability principles

- **Bounded authority.** A **Barangay admin** sees and acts **only within their own barangay** (scoped by `municipality` **and** `barangay` in the rules); a **Municipal admin** is confined to **their own town** (they cannot open another municipality's dashboard); **Provincial/Super** act province-wide. A higher tier can *view* what is below it but **cannot silently override** a lower tier's ownership.
- **Single accountable owner.** Every report has exactly **one** owner at any moment. Escalation up a tier happens **only when an admin formally routes it, never automatically.**
- **Append-only audit trail.** Every ownership/status transfer and privileged action (role approval, escalation approval, residency certification, SOS-abuse marking, account-deletion archival) writes an immutable `audit_logs` entry via Cloud Functions.

> These boundaries are enforced where they cannot be bypassed: the database security rules. The dashboards and app merely reflect them. See [`firestore.rules`](firestore.rules) — its header maps each design rule to the exact enforcing clause.

---

## 🔑 Roles & Access Control

Five roles, mapped to the government hierarchy. The legacy `admin` role has been **retired** and existing accounts migrated to `provincial_admin`.

| Role | Scope | Can do |
| :--- | :--- | :--- |
| `citizen` | Own data | Report, SOS, view own reports, manage privacy |
| `barangay_admin` | Own barangay | Reports **routed to their barangay**, certify residents, Live Emergencies in their barangay |
| `municipal_admin` | Own municipality | Town reports, announcements, analytics, responders, escalate/route, dispatch emergencies |
| `provincial_admin` | Province-wide | All of the above across every town + user management |
| `super_admin` | Everything | Unrestricted; **approves role nominations**; direct role assignment |

**Nominate → Approve workflow.** No admin below super-admin can grant a role directly. A municipal/provincial admin **nominates** a user (a `roleRequests` document); a **super admin approves**, and a Cloud Function (`onRoleRequestDecision`) applies the role server-side (Auth custom claim + profile) and audits it. Role scope (municipality + barangay) is captured at nomination.

**Role-tinted dashboards.** Each tier's dashboard is coloured by rank for at-a-glance clarity — Barangay green, Municipal blue, Provincial purple, Super Admin red.

---

## 🧩 Feature Catalogue

### Citizen Mobile App
- **Problem reporting** with category, priority, GPS, barangay, and **GPS-stamped photo evidence** (see below).
- **Emergency SOS with live location** (see [SOS section](#-emergency-sos--live-location)).
- **Offline report queue** — a report can be saved on the phone when there is no connection and is submitted on the next app launch, with a live queue-count banner; **SMS fallback** for zero-data areas. *See [Current Limitations](#-current-limitations) — the offline path is selected manually and the queue is not yet flushed automatically on reconnect.*
- **Residency verification** — certify as a Nueva Vizcaya resident (Barangay Certificate / gov ID) so you can report from anywhere; GPS-verified or admin-certified.
- **Announcements** — municipal + province-wide, with **bookmarks**, sort (newest/oldest), and filter by posting agency.
- **Weather** — current conditions + forecast per municipality, backed by a scheduled provincial **rainfall watch** that raises advisories.
- **Emergency contacts** — national, provincial, and municipal hotlines (PNP, BFP, MDRRMO/PDRRMO, hospitals) plus mental-health/crisis, women & child protection, health, cybercrime, and citizen-service lines. Placeholder numbers are clearly marked and non-dialable.
- **Report tracker** — animated status (Reported → Acknowledged → Ongoing → Solved) with real-time push updates and citizen feedback/rating.
- **Municipality identity** — adaptive theming + a home-seal info sheet (title, founding, barangays, trivia; curated offline + live Wikipedia summary).
- **Privacy & rights (RA 10173)** — first-launch consent, full in-app privacy policy, **Download My Data** (JSON/PDF), and in-app **data-subject requests** (access/correction/erasure/objection/portability/complaint).
- **Quality of life** — biometric login, dark mode, deep links (`onevizcaya://status?reportId=…`), FCM tap-routing, full-screen photo viewer, QR scan/share, haptics, in-app review prompt, trilingual UI.

### LGU Admin Console (Web)
- **Public landing page** for residents (overview + direct APK download).
- **Overview** dashboard, **Live Reports** (triage, status, notes, canned responses, PDF export), **Incident Map**, **Analytics** (Recharts), **Responders** directory, **Residency** approval queue, **Admin Users** (nominate/approve/filter/sort), **Announcements**, **Broadcast Alert**, **Audit Log**, and **Live Emergencies**.
- **Role-scoped** everything: a municipal admin only sees their town; a barangay admin only their barangay; provincial/super see the province with a town switcher.
- **4-level report routing** (Barangay/Municipal/Provincial/Region II) with on-screen criteria.
- **Announcement composer** with agency/source attribution and link import (auto-fills title + body from a source page's Open Graph/meta tags).

---

## 🚨 Emergency SOS & Live Location

Inspired by real gaps in 911-style dispatch (operators unable to pin a caller's location), One Vizcaya makes an emergency **self-locating**:

- **One-tap SOS** creates a live emergency **beacon** with the caller's exact GPS **before/while** the call connects — so responders have the location even if the caller can't speak.
- **Live tracking with graceful fallback** — while active, the phone streams its position into the beacon. GPS works with no signal and Firestore's offline queue coalesces updates, so a dropped connection holds the last-known position and **resumes live tracking automatically** when the connection is stable.
- **Real-time responder dispatch** — a **Live Emergencies** view (mobile banner + web page with map pins) shows open beacons **scoped to the operator's tier**, with one-tap **Navigate** (Google Maps to the exact coords), **Call**, **Dispatch**, and **Resolve**.
- **Instant push** — `onSosAlertCreated` sends a high-priority FCM to the in-scope responders (provincial/super province-wide, the town's municipal admin, the barangay's barangay admin) the moment a beacon fires.
- **Anti-abuse without false negatives** — every SOS is **operator-verified** (call/message → "Verify") before dispatch; repeat/rapid SOS are **soft-flagged** (sorted last, marked "verify first") but **never dropped**; marking an SOS as abuse increments a per-user tally that auto-flags repeat offenders. Citizens can't self-verify or clear a flag (rule-enforced).

---

## 📸 Photo Evidence & GPS Stamping

To make photo evidence trustworthy and instantly actionable:

- **GPS Map Camera-style stamp** — a photo taken with the in-app **camera** is stamped, baked into the pixels, with the **place** (barangay, municipality, Nueva Vizcaya), **latitude/longitude**, **date/time**, and a **QR code** that opens the exact spot in Google Maps. Rendered on a canvas with `qr_flutter`; survives the JPEG re-compress on upload, so it stays visible and tamper-evident wherever the image is viewed.
- **Camera-vs-gallery trust badge** — the report records `photoSource`, and admins see a green **"Live camera · GPS-stamped"** vs amber **"From gallery · unverified"** badge, so an operator can trust the evidence at a glance.
- **Data minimization** — raw EXIF (hidden GPS/serial/timestamp) is **stripped** before upload; the verified GPS/time we keep is stored explicitly on the report document.

---

## 🏛️ Multi-Tiered Triage & Routing

**No report is ever auto-dispatched or auto-escalated — every routing decision is made by an admin.** Note that the workflow does not yet *require* a verification step before a report can be closed (see [Current Limitations](#-current-limitations)). Beyond upward escalation, admins can **route a report to the correct administrative tier** in one tap, with on-screen criteria for each tier:

| Tier | When it applies |
| :--- | :--- |
| **Barangay** | Very local, low-risk matters a barangay can resolve (stray animals, uncollected garbage, clogged local canals, minor streetlight/signage issues). |
| **Municipal** | Town-wide services/infrastructure beyond a single barangay (municipal roads, local flooding/drainage, public health & safety). |
| **Provincial** | High-impact or cross-municipal incidents needing provincial resources (major disasters, provincial roads/bridges, large-scale hazards). |
| **Region II** | National/regional mandate or assets (national highways/bridges via DPWH Region II, region-wide calamities). |

Escalation to Provincial/Region II is an **auditable handoff** — it stamps who approved it and when, and only the owning municipality's admin can approve it.

---

## 🛰️ Geospatial Architecture

- **Barangay & municipal boundaries** — the incident map renders municipality choropleth polygons and, on drill-down, **barangay boundary polygons** for all 15 municipalities (266 barangays, from the faeldon 2023 PSGC GeoJSON), with a barangay filter.
- **Report density heat** — a green→yellow→red intensity overlay + per-municipality zone bubbles highlight hotspots; a time-range switch re-aggregates by recency.
- **Live positions** — report pins (exact GPS where available) and responder pins, plus SOS beacons with pulsing markers.
- **Scope-aware** — the map follows the dashboard's scope: a municipal/scoped view centres and zooms on that town instead of the whole province.

---

## 🔒 Privacy & Data Handling

Designed **in accordance with Republic Act No. 10173 (Data Privacy Act of 2012)**. Upon adoption, the LGU is the data controller; the system supports that responsibility:

* **Data minimization** — collects only what a report/SOS requires; raw EXIF stripped from photos.
* **Informed consent** — first-launch consent screen with auditable timestamps; full in-app privacy policy.
* **Data-subject rights** — in-app **Download My Data** (JSON/PDF) and access/correction/erasure/objection/portability/complaint requests logged for the DPO.
* **Defined retention** — reports auto-archived after 12 months and deleted (with photos) after 24 months by scheduled jobs.
* **Access control** — Firestore rules ensure citizens see only their own data and admins only their jurisdiction; **location on an SOS is readable only by the owner and in-scope responders**.
* **Compliance roadmap** — NPC registration and DPO designation completed jointly with the adopting LGU before public launch.

---

## 🎨 UI, Theming & Identity
Each municipality has a **definitive title** and a coordinated color scheme; the interface re-themes to the active jurisdiction. Text/icon contrast is computed automatically so any theme stays legible in light and dark mode.

| Municipality | Definitive Title | Primary (App Bar) |
| :--- | :--- | :--- |
| **Alfonso Castañeda** | The Hydroelectric Powerhouse | `#8B0000` Deep Red |
| **Ambaguio** | The Gateway to Mount Pulag | `#008080` Teal |
| **Aritao** | The Onion Capital | `#E27D60` Onion Coral |
| **Bagabag** | The Pineapple Haven | `#F4A460` Goldenrod |
| **Bambang** | The Agricultural Hub | `#800000` Maroon |
| **Bayombong** | The Educational & Institutional Capital | `#006400` Dark Green |
| **Diadi** | The Eco-Tourism Sanctuary | `#2E8B57` Sea Green |
| **Dupax del Norte** | The Agro-Forestry Frontier | `#8B4513` Saddle Brown |
| **Dupax del Sur** | The Heritage Capital | `#A52A2A` Burgundy |
| **Kasibu** | The Citrus Capital of the Philippines | `#FF8C00` Citrus Orange |
| **Kayapa** | The Summer Capital of Nueva Vizcaya | `#4682B4` Steel Blue |
| **Quezon** | The Mineral Outpost | `#4169E1` Royal Blue |
| **Santa Fe** | The Gateway to Cagayan Valley | `#556B2F` Dark Olive |
| **Solano** | The Premier Commercial Core | `#0A369D` Deep Blue |
| **Villaverde** | The Trailblazer's Sanctuary | `#32CD32` Lime Green |

---

## 🌐 Multilingual Support

Native **trilingual** support — **English**, **Tagalog (Filipino)**, and **Ilocano** — across onboarding, report forms, settings, announcements, notifications, FAQ, and error messages. Language is switchable any time and persisted across sessions.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- **Node.js 22+** and **npm 10+** (web + functions)
- **Flutter (stable)** with the Android/iOS toolchains (mobile)
- **Firebase CLI** (`npm i -g firebase-tools`) with access to the Firebase project
- Local secret files (git-ignored, obtained from the team): `apps/mobile/lib/firebase_options.dart`, `apps/mobile/android/app/google-services.json`, and any `secrets.dart` / `key.properties`. A `restore-secrets.bat` helper is provided for Windows.

### Web admin console (`apps/web`)
```bash
npm install                 # from repo root (installs web + functions workspaces)
npm run dev                 # Turborepo → Vite dev server for apps/web
# or, directly:
cd apps/web && npm run dev
```
Build: `npm run build:web` (root) or `npm run build` in `apps/web` (`tsc -b && vite build`).

### Mobile app (`apps/mobile`)
```bash
cd apps/mobile
flutter pub get
flutter run                 # on a connected device/emulator
flutter build apk --release # release APK
```

### Cloud Functions (`apps/functions`)
```bash
cd apps/functions
npm install
firebase deploy --only functions   # from the repo root
```

> **Monorepo command rule:** run `flutter` from `apps/mobile`, `npm` (web) from `apps/web`, and `firebase` from the **repo root**.

---

## 📦 Deployment

| Target | Command (from repo root) |
| :--- | :--- |
| Firestore rules + indexes | `firebase deploy --only firestore:rules,firestore:indexes` |
| Cloud Functions | `firebase deploy --only functions` |
| Cloud Storage rules | `firebase deploy --only storage` |
| Web console (build + hosting) | `npm run build:web && firebase deploy --only hosting` |
| Mobile | `cd apps/mobile && flutter build apk --release` (then distribute / Play) |

Some administrative one-shots run as callable functions by a super admin (e.g. `seedResponders`, `migrateLegacyAdmins`). Full build/deploy/phone-auth steps — including the Google Play Internal Testing route that fixes real-number login — are in [`docs/Computer-Shop-Runbook.md`](docs/Computer-Shop-Runbook.md).

---

## 🗺 Development Roadmap

> *"Implemented" indicates a feature is built and functioning in the development environment; field validation occurs during the pilot.*

### 🔴 Core Infrastructure & Security — *Implemented*
- [x] **Hierarchical RBAC** — five roles (citizen → barangay → municipal → provincial → super), custom claims + rule enforcement.
- [x] **Nominate → super-admin approval** workflow for all role grants; legacy `admin` role retired & migrated.
- [x] **Tenant isolation in rules** — municipal admins confined to their town, barangay admins to their barangay, at the database layer.
- [x] **Firebase App Check**, phone-OTP auth, biometric app-lock.
- [x] **Append-only audit logs** for privileged actions.

### 🟠 Reporting & Dashboards — *Implemented*
- [x] **4-level report routing** (Barangay/Municipal/Provincial/Region II) with criteria, on both mobile and web.
- [x] **GPS-stamped camera evidence** + camera/gallery trust badge; EXIF stripping.
- [x] **Offline report queue** (manually selected; flushes on next app start) + SMS fallback; residency gate.
- [x] **Incident map** — municipality choropleth, **barangay boundary polygons**, zone bubbles, report/responder pins, scope-aware centring, barangay filter.
- [x] **Analytics** (Recharts web / fl_chart mobile), **PDF export**, notes history, canned responses, responder assignment.
- [x] **Announcements** (agency attribution, link import) + **broadcasts**; **weather** + scheduled **rainfall watch**.
- [x] **Role-scoped, role-tinted dashboards**; provincial town switcher.

### 🟢 Emergency & Trust — *Implemented*
- [x] **Emergency SOS with live location** + real-time responder dispatch + high-priority FCM.
- [x] **Operator verification + soft abuser flagging** (never blocks a real emergency).
- [x] **Expanded emergency-contacts directory** (national/provincial/municipal + crisis lines).

### 🟡 Pre-Production & Deployment — *Planned*
- [ ] **Field pilot (single municipality)** — supervised 3-month pilot with real users & LGU staff.
- [ ] **NPC registration & DPO designation** — jointly with the adopting LGU.
- [ ] **iOS build & App Store** (TestFlight + listing); **Google Play** production release.
- [ ] **Real LGU content** — official FAQ, hotlines, and responder data from the province.
- [ ] **Staff training & support onboarding** for dispatchers and admins.

---

## ⚠️ Current Limitations

Stated plainly, so that reviewers can assess this build on what it actually
does today rather than on intent. Each item is tracked for the pre-pilot work.

**Connectivity**
- Saved (offline) reports are sent automatically **while the app is running** — on start, sign-in, return to the foreground, and every 60 s. If the app is closed, they are sent the next time it is opened; there is no background delivery.
- Connectivity is detected by a real reachability probe, not by the OS network state, so detection can lag by up to a minute.

**Report workflow**
- The status lifecycle (`reported → acknowledged → under_review → ongoing → solved`) is **not enforced**: an admin may move a report straight to `solved`. Validation is operator practice, not a gate. (SOS verification *is* enforced in `firestore.rules`.)
- Routing targets an administrative **tier**; separately, the web console can record a **referral to a named office** (MDRRMO, BDRRMC, BFP, PNP and others), attributed and audited. Recording a referral **does not notify the office**, and the mobile admin app does not show or set referrals yet.
- Reports can be deleted only through a server function that requires a reason and records **who deleted** the report; direct deletes are refused by `firestore.rules`. Closing a report *without action* remains the recommended route for false, duplicate, incomplete or unverifiable reports.

**Alerts**
- **Urgent** and **province-wide** admin alerts need a **second admin's approval** before anything is sent; the proposer cannot approve their own. Routine single-town alerts still publish immediately. Automated weather alerts are only drafted and reach the public after an in-scope admin approves them. If no second admin is available, an urgent alert waits (it expires after 6 hours), so **keep at least two admins per town reachable**, and keep radio, barangay and hotline channels for life-threatening warnings.
- Residents can re-read the 20 most recent broadcasts addressed to them (province-wide or their profile town) in the in-app inbox. Older alerts are not shown.
- Each broadcast and announcement records how many phones Firebase Cloud Messaging accepted it for and how many failed, and dead registrations are removed. "Accepted" is not proof that a phone displayed it; there is no per-phone read receipt.

**Positioning**
- The "supplements rather than replaces 911 / hotlines / radio" notice is shown on the report screen but **not yet on the SOS screen**.
- Its Tagalog and Ilocano wording, and several newer citizen messages, **await native-speaker review** — see `docs/translation-review.md`.
- There is no **proxy / on-behalf-of reporting**, so a barangay official or family member cannot formally file for a resident who has no smartphone.

**Measurement**
- Acknowledgement, referral and resolution times are stamped server-side from this release on, so **reports filed before it have no response timings**.
- SLA targets are set by priority and overdue reports alert the responsible admins, but the targets stay labelled **provisional** until the PDRRMO confirms them.
- The Analytics page counts every report in scope. The dashboard home, report table and map still show the **256 most recent** reports, so the home-screen totals understate at scale.
- A public `health` endpoint reports whether Firestore is reachable and every scheduled job is still running (200 when healthy, 503 otherwise), but **no uptime monitor is pointed at it yet**. Once deployed, add a Google Cloud Monitoring uptime check on `https://us-central1-one-vizcaya-app.cloudfunctions.net/health` with an alert to the operators; until then nobody is told when the service is down.

**Testing**
- Automated tests now cover the security rules and the alert-approval function (`tests/emulator`, against the Firestore emulator), the PAGASA parser and TenDay client (`apps/functions`), and the mobile offline queue and PAGASA model (`apps/mobile/test`). **No load, stress or failover testing** has been performed.

---

## 🔮 Future Features

Planned enhancements beyond the current build:

### Emergency & response
- **Live SOS tracking on a moving map** — continuous "blue-dot" tracking of a moving person for responders (on top of the current one-shot + live updates).
- **Two-way SOS chat** — operator ↔ citizen text thread on an active beacon for callers who can type but not speak.
- **Reverse-geocoded street address** on the photo stamp and SOS card (Google Geocoding API) and an optional **static-map thumbnail** on the stamp.
- **Responder mobile app / role** — field responders receive assignments and update status from their own device; ETA + arrival confirmation.
- **DPWH / PDRRMO system integration** — a direct pipeline into provincial emergency systems (see [`docs/PDRRMO-Integration-Brief.md`](docs/PDRRMO-Integration-Brief.md)).

### Trust, security & access
- **Admin 2FA (TOTP)** — authenticator second factor for admin accounts via Firebase Identity Platform.
- **App Check enforcement hardening** + rate-limiting/WAF posture against SOS/report flooding at the infrastructure layer.
- **Accessibility fallback** — SMS / hotline / proxy-reporting path for residents without smartphones.
- **Duplicate-report clustering** — auto-group nearby reports of the same incident to cut operator load.

### Data & intelligence
- **Predictive hotspot analytics** — flood/landslide risk overlays combining rainfall watch + historical reports.
- **Cross-municipal executive dashboard** — comparative resolution-time and SLA scorecards for the Governor's office.
- **Public transparency portal** — an opt-in, anonymized public map of resolved community issues.
- **In-app announcement scheduling & templates** for LGU communications teams.

### Platform
- **Push-to-web parity** for admins (browser notifications for new SOS/critical reports).
- **Localization expansion** — additional dialects and full accessibility (screen-reader) passes.
- **Automated backups & data-export scheduling** for the LGU's records.

---

## 💰 Cost & Sustainability Plan

One Vizcaya is engineered to be **extremely low-cost to operate**, with no vendor lock-in. Figures use **Firebase Blaze (pay-as-you-go) standard pricing** and are intentionally **conservative**.

> **Bottom line:** A single-municipality pilot runs at effectively **₱0/month**. A province-wide rollout is estimated well under **₱5,000/month** — less than a single staff salary line, serving all 15 municipalities.

### How cost is driven
Firebase cost is driven by **activity, not population** — reads, writes, and stored photos, not registered residents. Cost controls already in the design: offline persistence & local drafting, client-side image compression, user-scoped sub-collections, dashboard pagination, and a 12-month auto-archive of resolved reports.

### Summary

| Scale | Active reporters/mo | Reports/mo | Estimated monthly cost |
| :--- | :--- | :--- | :--- |
| **1 Municipality (Pilot)** | ~900 | ~1,800 | **≈ ₱0** (within free quotas) |
| **3 Municipalities** | ~2,300 | ~4,600 | **≈ ₱50–₱150** |
| **Province-wide (normal)** | ~5,300 | ~10,600 | **≈ ₱500** |
| **Province-wide (stress + buffer)** | ~15,900 | ~31,800 | **≈ ₱3,000–₱4,500** |

### Honest cost risks
1. **Disaster spikes** — reads/uploads (and SOS) surge for a few days during a major typhoon; the buffer covers this and it is temporary.
2. **SMS authentication** — phone-OTP costs ~$0.01–$0.06 per SMS; reserve SMS for auth/accessibility only.
3. **Unoptimized listeners** — careless real-time queries amplify reads; pagination + scoped streams guard against this.
4. **Dropping the archive policy** — storage grows unbounded without the 12-month auto-archive; it must be kept.

### Two separate line items
| Cost component | What it is | Billing |
| :--- | :--- | :--- |
| **A. Cloud infrastructure** | Firebase/Google Cloud usage | Passed through transparently, no markup |
| **B. Professional service** | Hosting, maintenance, security updates, features, training, support | Defined service fee under the engagement agreement |

> Infrastructure (A) is genuinely low; the primary value the Province pays for is the **service (B)** — a professional team keeping the platform secure, updated, supported, and improving. Full detail (pricing tables, scenarios A–C) is available on request. *Estimates are re-validated against live Firebase pricing before any procurement decision.*

---

## 🤝 Service Model, Ownership & Continuity

One Vizcaya is offered as a **managed service**, not a one-time code dump. The team builds, hosts, maintains, and improves the platform under a service agreement, while the LGU retains full control of its data.

### Who owns what
* **Software & IP:** retained by the development team; the LGU receives a **non-exclusive license to use** the platform for the province.
* **Government data:** owned entirely by the LGU — all citizen reports, media, and records belong to the Provincial Government and are exportable at any time.

### Continuity (not dependency)
* **Source-code escrow / continuity clause** — a copy of the full source + deployment docs is held in escrow (or with the LGU legal office), released to the LGU if the team ever ceases to operate.
* **Team, not a solo dependency**; **standard, non-proprietary stack** (Flutter + Firebase + React); **full documentation & one-click data export**.

### What the agreement covers
Hosting setup, ongoing maintenance & security updates, feature development, staff training & support, and transparently-billed cloud infrastructure.

> *Engagement terms (period, scope, fees) are defined jointly with the Provincial Government under applicable government procurement rules.*

---

<p align="center">
  <b>Developed By the Project: Vizcaya Team</b><br>
  <b>Aaron Anthony A. Gano II</b> — Lead Developer<br>
  <b>Sean Godric Reyes</b> — Co-Developer<br>
  <b>Darius Acosta</b> — Co-Developer<br>
  <i>Nueva Vizcaya State University (NVSU)</i><br><br>
  <i>Designed in accordance with Republic Act No. 10173 — Data Privacy Act of 2012</i>
</p>
