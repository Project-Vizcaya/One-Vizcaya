# One Vizcaya: Community Reporting & Management System

***Nueva Vizcaya's Digital Bridge***

> `One Vizcaya` is a cross-platform mobile application built with Flutter and Firebase, designed to bridge the communication gap between the citizens of Bambang, Nueva Vizcaya, and their Local Government Unit (LGU).

## Table of Contents
* [Project Overview](#project-overview)
* [Core Aims](#core-aims)
* [Tech Stack](#tech-stack)
* [UI & Theming](#ui-theming)
* [Master Development Roadmap](#development-roadmap)

<a id="project-overview"></a>
## 📌 Project Overview

The application provides a centralized platform where residents can report local issues—ranging from infrastructure damage to public health concerns—directly to the authorities. By utilizing <ins>real-time data</ins> and geospatial tagging, the project aims to streamline public service responses and foster a more transparent, digitally-inclusive community.

<a id="core-aims"></a>
## 🌟 Core Aims

* **Empowerment:** Give every citizen a digital voice to contribute to the improvement of their municipality.
* **Efficiency:** Reduce the administrative overhead for the LGU by categorizing and geotagging reports automatically.
* **Transparency:** Provide a clear feedback loop where users can track the status of their reports from `"Pending"` to `"Resolved"`.
* **Safety:** Facilitate rapid reporting of disaster-related incidents like flooding or landslides to improve local emergency response.

<a id="tech-stack"></a>
## 🛠 Tech Stack

* **Frontend:** `Flutter` (Dart)
* **Backend:** `Firebase` (Authentication, Firestore NoSQL, Cloud Storage)
* **State Management:** `BLoC` (Business Logic Component)
* **Location Services:** `Geolocator` and Google Maps API

---

<a id="ui-theming"></a>
## 🎨 UI & Theming

The application features dynamic theming based on the specific municipality selected. Each town has a designated color palette inspired by its local culture, industry, or geography.

* **Bambang** _(Agricultural Hub)_: Uses an earthy terracotta theme `#E2725B`
* **Solano** _(Commercial Center)_: Uses a vibrant orange/red theme `#FF4500`
* **Bayombong** _(Provincial Capital)_: Uses a formal royal blue theme `#4169E1`
* **Aritao** _(Gateway to the South)_: Uses an eco-friendly green theme `#2E8B57`
* **Bagabag** _(Pineapple Capital)_: Uses a golden yellow theme `#FFD700`
* **Villaverde** _(Historical Gateway)_: Uses a rich forest green theme `#228B22`
* **Diadi** _(Ecotourism Hub)_: Uses a vibrant teal theme `#008080`
* **Quezon** _(Highland Haven)_: Uses a serene purple theme `#6A5ACD`
* **Santa Fe** _(Mountain Gateway)_: Uses a cool slate gray theme `#708090`
* **Ambaguio** _(Cloud Haven)_: Uses a sky blue theme `#87CEEB`
* **Kasibu** _(Citrus Capital)_: Uses a bright citrus orange theme `#FFA500`
* **Dupax del Norte** _(Cultural Heritage)_: Uses a classic maroon theme `#800000`
* **Dupax del Sur** _(Historic Town)_: Uses a rustic sienna theme `#A0522D`
* **Alfonso Castañeda** _(Water Source)_: Uses a deep navy blue theme `#000080`
* **Kayapa** _(Vegetable Bowl)_: Uses an organic olive green theme `#6B8E23`

---

<a id="development-roadmap"></a>
## 🗺 Master Development Roadmap

This project follows a strict Software Development Life Cycle (SDLC), scaling from a local barangay prototype to a province-wide platform capable of serving all ~530,106 residents of Nueva Vizcaya.

### 🏗️ Phase 1: MVP & Core Architecture (Barangay Level)
_Goal: Prove the core concept works locally with clean, scalable code._

* **Clean Architecture & BLoC:** Organize the `Flutter` project into strict layers: `Data` (Repositories, Firebase calls, and Models with fromJson/toJson), `Domain` (Pure Dart Entities), and `Presentation` (UI). Implement the **BLoC pattern** (`flutter_bloc`) to strictly separate business logic from UI components via Events and States.
* **Enums & Constants:** Convert the category list into a formal `enum` in Dart to guarantee type safety.
* **Firestore Schema Optimization:** Implement a `users/{uid}/reports` sub-collection structure for fast, user-specific data loading.
* **Basic Location & Upload:** Implement the `geolocator` package to attach precise coordinates to reports.
* **Error Boundaries:** Implement `try-catch` blocks across all Firebase repositories, yielding specific `ErrorStates` to trigger UI "Toast" fallbacks for areas with weak mobile data.

### 🔐 Phase 2: Security, Media, & UX (Municipal Rollout)
_Goal: Protect user data, optimize performance, and lock down the reporting loop._

* **Predictable State Management:** Utilize `MultiBlocProvider` to handle global app states (e.g., `AuthBloc` for user sessions, `ReportBloc` for submission tracking), ensuring predictable state transitions and preventing data loss.
* **Image Optimization:** Integrate `image_picker` and `flutter_image_compress` to resize photo evidence locally before hitting Firebase Storage to conserve quotas.
* **Advanced Geolocation & Geofencing:** Add geocoding to automatically convert coordinates into Bambang street names, and implement geofencing to reject spam reports outside provincial boundaries.
* **Firestore Security Rules:** Enforce strict backend rules ensuring citizens can only modify their own submissions. 
* **Sensitive Data Masking:** Secure API keys by utilizing `.gitignore` for `firebase_options.dart`.

### 📱 Phase 3: The Admin Ecosystem (LGU Integration)
_Goal: Turn "One Vizcaya" into a real-time decision-making tool for the Local Government Unit._

* **LGU Web Portal:** Build a companion `Flutter Web` dashboard as a completely separate repository to keep concerns clean. Share the `Domain` layer between the mobile app and the web portal as a separate Dart package.
* **Composite Indexing:** Configure Firebase indexes to allow the LGU to query reports by `category` **AND** `timestamp` simultaneously.
* **Cloud Functions (Node.js):** Deploy backend triggers that automatically push notifications to the LGU dashboard when a `Disaster & Risk Management` report is submitted.
* **Data Visualization:** Integrate `fl_chart` to render heatmaps and pie charts showing which barangays have the highest report volumes.

### 🧪 Phase 4: Testing, Performance, & Scale (Provincial Ready)
_Goal: Battle-test the application for high traffic and diverse network environments._

* **Offline Persistence:** Pair `HydratedBloc` (for UI state preservation) with Firestore's built-in offline persistence (`FirebaseFirestore.instance.settings = Settings(persistenceEnabled: true)`) so citizens in remote areas can reliably draft and sync reports upon reconnecting to a network.
* **Hierarchical Access Control (RBAC):** Implement Firebase Auth Custom Claims to separate "Citizen" access from "Admin" access. Strictly mirror these Custom Claims within the Firestore Security Rules—relying on backend enforcement, not just the UI—so a Barangay Captain only views their jurisdiction, while the Mayor views the entire municipality.
* **Performance Profiling:** Utilize Antigravity DevTools to eliminate memory leaks, ensuring smooth performance on budget Android devices.
* **Beta Testing:** Deploy the finalized APK via **Firebase App Distribution** to community testers for rigorous field validation prior to official launch.

   
---

# Master Milestone: Security, UI, and Alpha Testing

## 🥇 Priority 1: Critical Security & RA 10173 Compliance
*Must be completed before any UI work to ensure data safety.*

- [ ] **Git History Audit:** Check repository history for `firebase_options.dart`. If exposed, rotate Firebase API keys immediately. Ensure `.gitignore` is properly configured.
- [ ] **Lock Down Firestore Rules:** Deploy strict security rules ensuring users can only read/write their own reports.
- [ ] **Data Minimization & Privacy:** Audit the registration flow to ensure only Name, Number, and Municipality are collected. Build `PrivacyPolicyScreen.dart`.
- [ ] **RBAC Implementation:** Structure the database for "Citizen" vs. "Admin" roles, mirroring this logic in Firestore Security Rules, not just the UI.

## 🥈 Priority 2: UI Polish & Demo-Readiness
*Clean up the first impression for potential stakeholders.*

- [ ] **Dashboard Layout:** Convert the 4-column icon grid to a spacious 3-column layout. 
- [ ] **Section Headers:** Group icons under "Citizen Services" and "Information & Support".
- [ ] **Local Emergency Contacts:** Implement the 15 municipality hotlines using a static Dart `const Map` or local `.json` file. **Do not use Firestore for this** to save database reads and ensure offline availability.

## 🥉 Priority 3: Dynamic Widgets (Making it Alive)
*Replacing dead space with active community data.*

- [ ] **Community Impact Feed:** Build the scrolling `ListView` for resolved reports.
- [ ] **Live Announcements Carousel:** Implement the swipeable LGU news feed at the top.
- [ ] **Agri-Weather Widget:** Integrate OpenWeatherMap API. **Crucial:** Build a hardcoded UI fallback state for when the device has no internet or the API fails.

## 🛡️ Priority 4: Backend Protections (Pre-Alpha)
*Securing the reporting loop before real users touch it.*

- [ ] **SMS Throttling:** Implement a 180-second UI cooldown timer on the "Resend SMS" button.
- [ ] **Bot Protection:** Enable Firebase App Check to secure the authentication endpoints.
- [ ] **Anti-Spam Rules:** Implement a 5-minute cooldown on the "Submit Report" button via UI (`SharedPreferences`) and enforce it strictly via Firestore Rules using the `timestamp` field.

## 🧪 Priority 5: The 10-User Alpha Test
*Controlled real-world testing to iron out bugs.*

- [ ] **Build APK:** Run `flutter build apk --split-per-abi` to generate optimized, lightweight packages.
- [ ] **Distribute to Alpha Group:** Use Firebase App Distribution to send the app to **10 trusted testers** (family/classmates). Gather feedback and fix critical bugs before scaling to 50 users. 
*(Note: Do not implement `in_app_update` for this phase, as it conflicts with App Distribution).*

## 🎯 Priority 6: LGU Pitch Prep (Post-Alpha)
*Only to be executed when the app is stable and bug-free.*

- [ ] **Academic Shield:** Secure formal endorsement from the Computer Science department.
- [ ] **Security Whitepaper:** Draft the 2-page document detailing Google Cloud encryption and RA 10173 compliance.
- [ ] **Schedule LGU Demos:** Target Bayombong and Solano administrators using the live, split-screen demo strategy.

Developed by Aaron Anthony A. Gano II, 3<sup>rd</sup>-Year Computer Science Student at NVSU.
