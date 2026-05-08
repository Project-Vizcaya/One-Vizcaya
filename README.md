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
* **State Management:** `Provider`
* **Location Services:** `Geolocator` and Google Maps API

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

## 🗺 Development Roadmap

### Phase 1: Foundation & Core Reporting
* Implement Firebase Phone Authentication for secure, verified user access.
* Develop the **Professional Service Reporting** module with 8+ specialized categories (Sanitation, Infrastructure, Health, etc.).
* Integrate Geospatial tagging to automatically attach coordinates to every report.

### Phase 2: Media & UX Enhancement
* Enable Firebase Storage integration for photo evidence attachments.
* Implement a "My Reports" dashboard for users to monitor submission history and status updates.
* Refine UI/UX for the Samsung Galaxy ecosystem and high-mid-tier Android devices.

### Phase 3: Administrative Ecosystem
* Develop a separate Admin Dashboard (`Flutter Web`) for LGU personnel to manage and filter reports.
* Implement Firebase Cloud Functions for automated notifications to relevant departments based on report categories.

### Phase 4: Optimization & Scalability
* Add offline persistence for reports filed in areas with weak mobile data.
* Perform rigorous field testing with community beta testers to ensure data accuracy and app stability.

---
Developed by Aaron Anthony Gano, 3<sup>rd</sup>-Year Computer Science Student at NVSU.
