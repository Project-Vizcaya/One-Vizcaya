# 🏛️ One Vizcaya: Community Reporting & Management System

***Nueva Vizcaya's Digital Bridge***

> `One Vizcaya` is a cross-platform mobile application built with Flutter and Firebase, designed to bridge the communication gap between the citizens of Nueva Vizcaya and their Local Government Units (LGU) — from the Barangay level all the way to the Provincial Capitol.

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Aims](#-core-aims)
3. [Tech Stack](#-tech-stack)
4. [UI & Theming](#-ui--theming)
5. [Architecture: Multi-Tiered Triage System](#%EF%B8%8F-architecture-multi-tiered-triage--escalation-system)
6. [Master Development Roadmap](#-master-development-roadmap)

---

## 📌 Project Overview
The application provides a centralized platform where residents can report local issues—ranging from infrastructure damage to public health concerns—directly to the authorities. By utilizing **real-time data**, **geospatial tagging**, and **verified EXIF metadata**, the project aims to streamline public service responses and foster a more transparent, digitally-inclusive community.

## 🌟 Core Aims
* **Empowerment:** Give every citizen a digital voice to contribute to the improvement of their municipality.
* **Efficiency:** Reduce the administrative overhead for the LGU by categorizing and geotagging reports automatically.
* **Transparency:** Provide a clear feedback loop where users can track the status of their reports from `"Pending"` to `"Solved"`.
* **Safety:** Facilitate rapid reporting of disaster-related incidents like flooding or landslides to improve local and provincial emergency response.

## 🛠 Tech Stack
* **Frontend:** `Flutter` (Dart)
* **Backend:** `Firebase` (Authentication, Firestore NoSQL, Cloud Storage)
* **State Management:** `BLoC` (Business Logic Component)
* **Location Services:** `Geolocator` and Google Maps API
* **Security:** `Firebase App Check` & Device EXIF Extraction

---

## 🎨 UI & Theming
The application features dynamic theming based on the specific municipality selected. Each town has a designated color palette inspired by its local culture, industry, or geography.

| Municipality | Theme Identity | Hex Code |
| :--- | :--- | :--- |
| **Bambang** | Agricultural Hub (Terracotta) | `#E2725B` |
| **Solano** | Commercial Center (Vibrant Orange) | `#FF4500` |
| **Bayombong** | Provincial Capital (Royal Blue) | `#4169E1` |
| **Aritao** | Gateway to the South (Eco Green) | `#2E8B57` |
| **Bagabag** | Pineapple Capital (Golden Yellow) | `#FFD700` |
| **Villaverde** | Historical Gateway (Forest Green) | `#228B22` |
| **Diadi** | Ecotourism Hub (Vibrant Teal) | `#008080` |
| **Quezon** | Highland Haven (Serene Purple) | `#6A5ACD` |
| **Santa Fe** | Mountain Gateway (Slate Gray) | `#708090` |
| **Ambaguio** | Cloud Haven (Sky Blue) | `#87CEEB` |
| **Kasibu** | Citrus Capital (Citrus Orange) | `#FFA500` |
| **Dupax del Norte** | Cultural Heritage (Maroon) | `#800000` |
| **Dupax del Sur** | Historic Town (Rustic Sienna) | `#A0522D` |
| **Alfonso Castañeda**| Water Source (Navy Blue) | `#000080` |
| **Kayapa** | Vegetable Bowl (Olive Green) | `#6B8E23` |

---

## 🏛️ Architecture: Multi-Tiered Triage & Escalation System

One Vizcaya is designed with an enterprise-grade hierarchical workflow. This architecture prevents the Provincial Government from being overwhelmed with minor complaints, ensuring the Capitol only sees **verified, high-level problems** that require immediate provincial resources.

### 📱 Level 1: The Origin (Reporting)
* **Actor:** The Citizen
* **Process:** A user experiences a community issue (e.g., flooding, massive potholes). They open the app, capture a photo, select a category, and submit the report.
* **Security Check:** The system automatically extracts and attaches verified EXIF metadata (Time, Date, GPS coordinates) from the device to prevent the upload of fake or outdated reports.

### 🛡️ Level 2: Municipal Triage (Verification & Filtering)
* **Actor:** Local Dispatch / Triage Officer
* **Process:** The report hits a municipal desk first. The officer reviews the EXIF data to verify authenticity and assigns a Priority Level (Critical, High, Medium, Low).
  * 🚫 *If fake/spam:* The report is immediately rejected.
  * ✅ *If valid:* It moves to Level 3.

### 🚜 Level 3: Local Action (Municipal/Barangay Response)
* **Actor:** Local LGU Responders
* **Process:** The verified report is routed to the correct local unit (e.g., Barangay Council for noise complaints, Municipal Engineering for minor road cracks, MDRRMO for accidents).
  * 🛠️ *If fixable locally:* A team is dispatched, the issue is resolved, and marked as **"Solved"** on the dashboard. The citizen receives an automated status notification.
  * ⚠️ *If beyond local capacity (lack of budget/heavy equipment):* It moves to Level 4.

### 🌉 Level 4: The Bridge (Escalation)
* **Actor:** Municipal Administrator / Escalation Officer
* **Process:** When a problem requires resources the municipality lacks (e.g., a bridge collapse, major landslide), the Municipal Admin reviews the data and triggers the **"Escalate to Province"** protocol.

### 🏛️ Level 5: Provincial Command (Oversight & Heavy Response)
* **Actor:** Provincial Dashboard (PDRRMO / Governor's Office)
* **Process:** The escalated report instantly appears on the Provincial Administrator's God's-Eye Dashboard, tagged with a critical "Escalated" badge. The Capitol gains immediate, real-time visibility of an issue requiring provincial intervention.

### 🤝 Level 6: Provincial Coordination & Action
* **Actor:** Provincial Action Team
* **Process:** The provincial desk takes ownership of the report. For major infrastructure issues, they directly coordinate with agencies like the **DPWH** or the Provincial Engineering Office. Live status updates are pushed back down the chain, keeping both the Municipality and the Citizen informed that provincial help has been deployed.

> **💡 The Value Proposition for the Provincial LGU:**
> This 6-level structure acts as a strict filter that **protects executive time**. By the time a report reaches the Capitol (Level 5), it has already been verified as authentic (Level 2), assessed by local experts on the ground (Level 3), and deemed absolutely necessary for provincial intervention (Level 4). 

---

## 🗺 Master Development Roadmap

This project follows a strict Software Development Life Cycle (SDLC), scaling from a local barangay prototype to a province-wide platform capable of serving all ~530,106 residents of Nueva Vizcaya.

### 🏗️ Phase 1: MVP & Core Architecture (Barangay Level)
_Goal: Prove the core concept works locally with clean, scalable code._
* **Clean Architecture & BLoC:** Organize the `Flutter` project into strict layers (`Data`, `Domain`, `Presentation`). Implement the **BLoC pattern** to strictly separate business logic from UI components.
* **Firestore Schema Optimization:** Implement a `users/{uid}/reports` sub-collection structure for fast, user-specific data loading.
* **Basic Location & Upload:** Implement the `geolocator` package to attach precise coordinates to reports.

### 🔐 Phase 2: Security, Media, & UX (Municipal Rollout)
_Goal: Protect user data, optimize performance, and lock down the reporting loop._
* **Verified Evidence (EXIF Integration):** Extract native camera timestamp and GPS data to prevent fraudulent report submissions.
* **Image Optimization:** Integrate `image_picker` and `flutter_image_compress` to resize photo evidence locally before hitting Firebase Storage.
* **Advanced Geolocation & Geofencing:** Add geocoding to automatically convert coordinates into local street names, and implement geofencing to reject spam reports outside provincial boundaries.
* **Firestore Security Rules:** Enforce strict backend rules ensuring citizens can only modify their own submissions and LGUs can only view their own jurisdiction.

### 🏛️ Phase 3: The Admin Ecosystem (Provincial Integration)
_Goal: Turn "One Vizcaya" into a real-time decision-making tool for the Local & Provincial Government._
* **Multi-Tenant Dashboard:** Upgrade the admin UI to feature Quick-Filters, Chronological Sorting, and a "Provincial View" toggle for super-admins.
* **Escalation Protocol:** Implement the "Escalate to Province" routing logic in Firestore.
* **Cloud Functions (Node.js):** Deploy backend triggers that automatically push notifications to the LGU dashboard when a `Disaster & Risk Management` report is submitted.
* **Data Visualization:** Integrate `fl_chart` to render heatmaps and pie charts showing which municipalities have the highest report volumes.

### 🧪 Phase 4: Testing, Performance, & Scale
_Goal: Battle-test the application for high traffic and diverse network environments._
* **Offline Persistence:** Pair `HydratedBloc` with Firestore's built-in offline persistence so citizens in remote areas can reliably draft and sync reports upon reconnecting to a network.
* **Hierarchical Access Control (RBAC):** Implement Firebase Auth Custom Claims (`municipal_admin`, `provincial_admin`) to strictly enforce data partitioning at the server level.
* **Beta Testing:** Deploy the finalized APK via **Firebase App Distribution** to community testers for rigorous field validation prior to official launch.

---

<p align="center">
  <b>Developed By</b><br>
  Aaron Anthony A. Gano II & Darius Acosta<br>
  <i>Computer Science Department, Nueva Vizcaya State University (NVSU)</i>
</p>
