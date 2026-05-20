# 🏛️ One Vizcaya: Community Reporting & Management System

***Nueva Vizcaya's Digital Bridge***

> `One Vizcaya` is a cross-platform mobile application and intelligent administrative ecosystem built with Flutter, React, and Firebase. It is specifically engineered to bridge the communication gap between the ~530,106 citizens of Nueva Vizcaya and their Local Government Units (LGU) — routing critical field data from the local Barangay level all the way to the Provincial Capitol in real time.

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Aims](#-core-aims)
3. [Ecosystem Architecture](#%EF%B8%8F-ecosystem-architecture)
4. [Tech Stack](#-tech-stack)
5. [UI, Theming & Identity](#-ui-theming--identity)
6. [Multi-Tiered Triage & Escalation Workflow](#%EF%B8%8F-multi-tiered-triage--escalation-workflow)
7. [Geospatial Architecture & Emergency Responders](#-geospatial-architecture--emergency-responders)
8. [Master Development Roadmap Status](#-master-development-roadmap-status)

---

## 📌 Project Overview
The One Vizcaya platform provides a centralized, multi-tenant hub where residents can report localized emergencies and infrastructure issues—ranging from public health crises to agricultural asset damage. By utilizing **real-time WebSocket-style streams**, **dynamic GeoJSON administrative boundary mapping**, and **cryptographically verified device EXIF metadata**, this platform eliminates bureaucratic delays, optimizes localized equipment dispatch, and provides provincial executives with a secure, empirical view of the entire province's health.

## 🌟 Core Aims
* **Civilian Empowerment:** Lower the technical barrier for rural communities to report active problems via an offline-first, media-optimized mobile app.
* **Operational Integrity:** Stop fraudulent reporting at the network perimeter by verifying physical image hardware metadata (EXIF) at submission.
* **Administrative Load-Balancing:** Use hierarchical role-based partitioning so municipal offices handle localized issues while the Capitol monitors high-impact escalations.
* **Provincial Resource Strategy:** Give the Governor and Provincial Administrator empirical data arrays to see which towns resolve problems efficiently and where infrastructure budgets should be allocated.

---

## 🖥️ Ecosystem Architecture

One Vizcaya is not just a single mobile application; it is a unified, bidirectional data ecosystem composed of three major runtime components:

                       +-----------------------------+
                       |   Citizen Mobile Client     |
                       |      (Flutter/BLoC)         |
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
    |     (React / GeoJSON)       |         |   (God's-Eye View / Map)    |
    +-----------------------------+         +-----------------------------+
                        


1. **The Citizen Mobile Client (Flutter):** An intuitive, high-performance application running native on citizen devices. Built to handle low-connectivity zones, capture hardware-level telemetry, and cache data gracefully.
2. **The LGU Web Command Dashboards (React/JS/HTML5):** A multi-tenant web console localized for every municipality. Enables dedicated dispatchers to evaluate reports, contact local responders, and manage public announcements.
3. **The Provincial Super-Admin Command Hub:** A global view built for the Provincial Administrator and Governor's office. It overlays real-time heatmaps, tracks cross-municipal escalations, and serves as the ultimate command center during disaster scenarios.

---

## 🛠 Tech Stack
* **Mobile Frontend:** `Flutter` (Dart) utilizing strict layered Clean Architecture.
* **Web Dashboards:** `HTML5 / JavaScript / Tailwind CSS` with live integration with Google Maps Javascript Data Layers.
* **State Management:** Strict `BLoC (Business Logic Component)` pattern mapping descriptive immutable States to explicit User Events.
* **Backend Infrastructure:** `Firebase Suite`
  * *Cloud Firestore:* Real-time, distributed NoSQL document arrays with complex collectionGroup querying rules.
  * *Cloud Functions:* `Node.js` serverless triggers executing critical backend actions like seeding demo arrays and updating Custom Auth Claims.
  * *Firebase Storage:* Secure media buckets protected by file type validations.
* **Geospatial Services:** Native Android `Geolocator` bindings, Google Maps API, and localized OpenStreetMap **GeoJSON Administrative Boundary Data**.

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
| **Alfonso Castañeda**| Water Source | `#000080` | Navy blue honoring major rivers and reservoir resources |
| **Kayapa** | Vegetable Bowl | `#6B8E23` | Olive green reflecting upland farming and fresh produce |

---

## 🏛️ Multi-Tiered Triage & Escalation Workflow

The core operational breakthrough of One Vizcaya is its automated **Hierarchical Escalation Engine**. Rather than overwhelming provincial executives with everyday local maintenance issues, the platform implements a secure, six-tier triage workflow:

* **Level 1: Field Capture (The Citizen):** A citizen discovers an issue (e.g., massive bridge degradation after a typhoon). They capture it on the mobile client. The app seals the file with unalterable device GPS and time tags.
* **Level 2: Perimeter Triage (Municipal Dispatch):** The report populates the local dashboard. A municipal dispatcher checks the validation flags. If a submission is deemed fraudulent or out-of-bounds, it is purged. Valid reports receive an administrative severity rating (`Low` to `Critical`).
* **Level 3: Municipal Action (Local Mitigation):** The validated report is piped directly to the specific local emergency unit (e.g., MDRRMO Bambang, or the Municipal Health Office). 
* **Level 4: The Escalation Trigger:** If the local responder arrives on-site and finds the emergency exceeds local budgets or requires heavy machinery the town does not possess, the Municipal Administrator hits the **"Escalate to Province"** node.
* **Level 5: Provincial Command Center (The Super-Admin View):** The report instantly shifts out of the municipal-only scope. It flashes onto the Provincial Command Hub dashboard in the Capitol, flagged with an isolated, high-visibility purple **[ESCALATED]** banner.
* **Level 6: Provincial Resolution (Strategic Deployment):** The Provincial Action Team reviews the telemetry and coordinates directly with major provincial entities like the **DPWH 1st District Engineering Office** or provincial engineering reserves to dispatch heavy equipment to the municipality, resolving the crisis.

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
     |   (Dynamic GeoJSON Layer)                                              |
     |                           [🔴 Critical Reports] [🟠 High] [🟢 Solved] |
     +------------------------------------------------------------------------+

### 🗺️ Precision GeoJSON Layering
The system strips out arbitrary circular map markers and replaces them with official, boundary-accurate geographic maps. Using customized **GeoJSON data layers**, when an administrator selects a municipality (e.g., *Villaverde* or *Diadi*), the map instantly clears previous shapes and renders a precise green polygon outline defining the exact legal borders of that LGU. This ensures that field incidents are explicitly cataloged under the correct municipal jurisdiction.

### 🚓 Fixed Asset Mapping (Pinpoint Tracking)
Emergency responder stations are mapped directly onto the dashboard utilizing native Firestore `GeoPoint` coordinates. This completely eliminates spatial baseline shifts, forcing pins to snap directly to actual highway alignments and structural building footings. 

Key provincial landmarks—such as the **Region II Trauma and Medical Center (R2TMC)** in Bayombong, the **DPWH 1st District Engineering Office**, and the individual Municipal Police (PNP) and Fire (BFP) stations across all 15 towns—are hardcoded via precise geodetic baselines to ensure perfect operational accuracy during high-stakes presentations.

---

## 🗺 Master Development Roadmap Status

### 🔴 Critical Infrastructure & Core Security (100% Complete)
- [x] **Hierarchical Access Control (RBAC):** Completed backend integration using custom security identifiers mapping users into separate `municipal_admin` vs `provincial_admin` privilege tiers.
- [x] **Firestore Security Rules Overhaul:** Deployed complex, multi-layered database protection rules ensuring strict isolation between municipal tenant folders while granting global read access to provincial super-admins.
- [x] **Verified EXIF Evidence System:** Mobile client forces automated extraction of physical image metadata (GPS/Timestamp) directly during shutter firing, blocking gallery spoofing attacks.
- [x] **The Admin Escalation Protocol:** Implemented a secure database trigger route allowing municipal offices to pass active document ownership to the provincial data layer with a single click.

### 🟠 Dashboard Polish & Spatial Realism (100% Complete)
- [x] **GeoJSON Boundary Interceptor:** Built dynamic map parsing logic that draws exact territorial boundaries whenever an LGU view is toggled.
- [x] **Fixed-Asset Emergency Infrastructure Seeding:** Hardcoded high-precision coordinate profiles for every single PNP, BFP, RHU, MDRRMO, and public hospital across all 15 municipalities.
- [x] **Quick-Filter Summary Arrays:** Integrated five-point clickable status badges on the administrative dashboard for instant chronological and priority filtering.
- [x] **Automated Data Seeders:** Node.js backend features functional `seedDemoData` and `grantDemoAdminRole` routines to allow immediate ecosystem testing without empty interface loops.

### 🟡 Next Milestone: Advanced Analytical Scale (In Progress)
- [ ] **Client-Side Image Compression Execution:** Integrate `flutter_image_compress` to automatically downscale 5MB+ field captures to <500KB to reduce citizen data expenses.
- [ ] **Automated SLA Resolution Timers:** Implement a `resolvedAt` timestamp calculation field to display exact municipal average repair timeframes to the Governor's office.
- [ ] **Executive PDF/Excel Export Module:** Add an automated document generator allowing the Provincial Administrator to instantly print clean physical spreadsheets of filtered emergency events for legislative Capitol meetings.

---

<p align="center">
  <b>Developed By</b><br>
  Aaron Anthony A. Gano II & Darius Acosta<br>
  <i>Computer Science Department, Nueva Vizcaya State University (NVSU)</i>
</p>
