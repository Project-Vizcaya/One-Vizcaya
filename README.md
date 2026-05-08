# One Vizcaya: Community Reporting & Management System

***Nueva Vizcaya's Digital Bridge***

> `One Vizcaya` is a cross-platform mobile application built with Flutter and Firebase, designed to bridge the communication gap between the citizens of Bambang, Nueva Vizcaya, and their Local Government Unit (LGU).

## Table of Contents
* [Project Overview](#project-overview)
* [Core Aims](#core-aims)
* [Tech Stack](#tech-stack)
* [UI & Theming](#ui--theming)
* [Development Roadmap](#development-roadmap)

## 📌 Project Overview

The application provides a centralized platform where residents can report local issues—ranging from infrastructure damage to public health concerns—directly to the authorities. By utilizing <ins>real-time data</ins> and geospatial tagging, the project aims to streamline public service responses and foster a more transparent, digitally-inclusive community.

## 🌟 Core Aims

* **Empowerment:** Give every citizen a digital voice to contribute to the improvement of their municipality.
* **Efficiency:** Reduce the administrative overhead for the LGU by categorizing and geotagging reports automatically.
* **Transparency:** Provide a clear feedback loop where users can track the status of their reports from `"Pending"` to `"Resolved"`.
* **Safety:** Facilitate rapid reporting of disaster-related incidents like flooding or landslides to improve local emergency response.

## 🛠 Tech Stack

* **Frontend:** `Flutter` (Dart)
* **Backend:** `Firebase` (Authentication, Firestore NoSQL, Cloud Storage)
* **State Management:** `BLoC` (Business Logic Component)
* **Location Services:** `Geolocator` and Google Maps API

---
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

## 🗺 Master Development Roadmap

This project follows a strict Software Development Life Cycle (SDLC), scaling from a local barangay prototype to a province-wide platform capable of serving all ~530,106 residents of Nueva Vizcaya.

### 🏗️ Phase 1: MVP & Core Architecture (Barangay Level)
_Goal: Prove the core concept works locally with clean, scalable code._

* **Clean Architecture & BLoC:** Organize the `Flutter` project into strict layers: `Data` (Repositories/Firebase calls), `Domain` (Models), and `Presentation` (UI). Implement the **BLoC pattern** (`flutter_bloc`) to strictly separate business logic from UI components via Events and States.
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

* **LGU Web Portal:** Build a companion `Flutter Web` dashboard. Use Firebase Auth Custom Claims to separate "Citizen" access from "Admin" access.
* **Composite Indexing:** Configure Firebase indexes to allow the LGU to query reports by `category` **AND** `timestamp` simultaneously.
* **Cloud Functions (Node.js):** Deploy backend triggers that automatically push notifications to the LGU dashboard when a `Disaster & Risk Management` report is submitted.
* **Data Visualization:** Integrate `fl_chart` to render heatmaps and pie charts showing which barangays have the highest report volumes.

### 🧪 Phase 4: Testing, Performance, & Scale (Provincial Ready)
_Goal: Battle-test the application for high traffic and diverse network environments._

* **Offline Persistence:** Enable Firestore offline mode and implement `HydratedBloc` so citizens in remote areas can draft reports that auto-sync upon reconnecting to a network.
* **Hierarchical Access Control (RBAC):** Upgrade the LGU portal logic so a Barangay Captain only views their jurisdiction, while the Mayor views the entire municipality.
* **Performance Profiling:** Utilize Antigravity DevTools to eliminate memory leaks, ensuring smooth performance on budget Android devices.
* **Beta Testing:** Deploy the finalized APK via **Firebase App Distribution** to community testers for rigorous field validation prior to official launch.
* 
---
Developed by Aaron Anthony Gano, 3<sup>rd</sup>-Year Computer Science Student at NVSU.
