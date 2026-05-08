# One Vizcaya: Community Reporting & Management System

***Nueva Vizcaya's Digital Bridge***

> A cross-platform mobile application designed to bridge the communication gap between the citizens of Bambang, Nueva Vizcaya, and their Local Government Unit (LGU).

## Table of Contents
* [Project Overview](#project-overview)
* [Core Aims](#core-aims)
* [Tech Stack & Architecture](#tech-stack--architecture)
* [UI & Theming](#ui--theming)
* [Development Roadmap](#development-roadmap)

## Project Overview

The application provides a centralized platform where residents can report local issues—ranging from infrastructure damage to public health concerns—directly to the authorities. By utilizing <ins>real-time</ins> data and geospatial tagging, the project aims to streamline public service responses and foster a more transparent, digitally-inclusive community.

**This project is _extremely_ important for modernizing local LGU efficiency.** It aims to eventually scale to serve all ~530,106<sub>residents</sub> of the province.

## Core Aims

* **Empowerment:** Give every citizen a digital voice to contribute to the improvement of their municipality.
* **Efficiency:** Reduce the administrative overhead for the LGU by categorizing and geotagging reports automatically.
* **Transparency:** Provide a clear feedback loop where users can track the status of their reports from `Pending` to `Resolved`.
* **Safety:** Facilitate rapid reporting of disaster-related incidents like flooding or landslides to improve local emergency response.

## Tech Stack & Architecture

This project is built using modern mobile development frameworks and serverless cloud architecture.

* **Frontend:** `Flutter` (Dart)
* **Backend:** `Firebase` (Authentication, Firestore NoSQL, Cloud Storage)
* **State Management:** `Provider`
* **Location Services:** `Geolocator` and Google Maps API

To initialize the project locally, run the following commands:
```bash
flutter clean
flutter pub get
flutter run -d chrome
