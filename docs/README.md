# One Vizcaya documents — start here

## For the Friday and Sunday test builds

1. [`1-build-and-test/Test-Build-Guide.md`](1-build-and-test/Test-Build-Guide.md) — the step-by-step guide for both days.
2. [`2-fill-in/Fill-In-Checklist.md`](2-fill-in/Fill-In-Checklist.md) — everything to fill in, where, and who.
3. [`1-build-and-test/Computer-Shop-Runbook.md`](1-build-and-test/Computer-Shop-Runbook.md) — background when something in the build fails (secret files, phone sign-in, APK).

Repository root: [`../README.md`](../README.md) (project overview), [`../PRIVACY.md`](../PRIVACY.md)
(the Data Privacy Notice; the website's `/privacy` page reads this file, so it stays at the root).

## Folders

| Folder | What is in it | Who reads it |
|---|---|---|
| [`1-build-and-test/`](1-build-and-test/) | How to build, install and test the app, website and Command Hub | You and the dev team |
| [`2-fill-in/`](2-fill-in/) | What to fill in and where; sheets other people complete and send back | You, translators, LGUs |
| [`3-agencies-and-legal/`](3-agencies-and-legal/) | Documents for PDRRMO, PA, PITD, PPDO, the Budget Office and the legal office | Agencies and the committee |
| [`4-app-and-website/`](4-app-and-website/) | How each feature works (app, console, website, Command Hub) and the design rules | Dev team, admins, operators |
| [`archive/`](archive/) | Older documents kept for history; not up to date | — |

## Every document

### 1-build-and-test
| Document | What it is | Status |
|---|---|---|
| [Test-Build-Guide.md](1-build-and-test/Test-Build-Guide.md) | Friday/Sunday plan: prepare, deploy, build, test each feature, clean up, report | Current (25 Nov) |
| [Computer-Shop-Runbook.md](1-build-and-test/Computer-Shop-Runbook.md) | Secret files to bring, phone sign-in, APK/AAB and website builds, deploys, Play Internal Testing | Mostly current; `secrets.dart` is no longer needed |
| [experimental-uiux-test-checklist.md](1-build-and-test/experimental-uiux-test-checklist.md) | Detailed tick list for the Nov 4 UI redesign (test branch only) | Current for its checks; build steps are in the Test Build Guide |
| [iOS-Build.md](1-build-and-test/iOS-Build.md) | Building for iPhone on a Mac | **Outdated:** old `one_vizcaya/` paths and Firebase Dynamic Links (shut down 2025). Update before use |

Test suites have their own notes: [`../tests/emulator/load/README.md`](../tests/emulator/load/README.md),
[`../tests/staging-load/README.md`](../tests/staging-load/README.md), [`../command-hub/README.md`](../command-hub/README.md).

### 2-fill-in
| Document | What it is | Who fills it in |
|---|---|---|
| [Fill-In-Checklist.md](2-fill-in/Fill-In-Checklist.md) | Every value, file, approval and decision still needed, with where it goes | You; lists what others must do |
| [translation-review.md](2-fill-in/translation-review.md) | Tagalog and Ilocano wording to check, and English-only screens to translate | Native speakers |
| [hotline-verification.md](2-fill-in/hotline-verification.md) | Placeholder emergency numbers and government-office details to confirm | LGUs, PDRRMO, MDRRMOs |

### 3-agencies-and-legal
These were prepared for the June 2026 Technical Review Committee and the agencies that
followed. They are kept as submitted. Where the system has changed since, it is noted here
rather than rewritten.

| Document | For | Written | Changed since |
|---|---|---|---|
| [PDRRMO-Integration-Brief.md](3-agencies-and-legal/PDRRMO-Integration-Brief.md) | PDRRMO | Jun–Aug 2026 | SLA targets are now by priority (critical 2 h, high 24 h, medium 72 h, low 7 days, provisional until PDRRMO agrees). Newer features not in it: Hazard Watch, Post Maker, incident IDs, "Call first", referrals, Command Hub prototype. Contains your personal contact details: check before sharing |
| [PITD-Infrastructure-Memo.md](3-agencies-and-legal/PITD-Infrastructure-Memo.md) | PITD | Aug 2026 | Hardening checklist status (App Check enforcement, backups, budget alerts) not re-checked since |
| [Architecture-Governance-Design.md](3-agencies-and-legal/Architecture-Governance-Design.md) | Committee (PA, PDRRMO, PPDO, PITD) | Jun–Aug 2026 (draft v0.1) | "Municipal Dispatcher" and "System Steward" roles were not built; the Command Hub is a separate prototype; the console now has a Privacy Requests page |
| [Governance-Architecture.md](3-agencies-and-legal/Governance-Architecture.md) | PA, PITD, committee (short version of the above) | Aug 2026 | Provincial admins can **read** every report in the province (only acting on escalations is gated); newer audited actions not listed |
| [Cost-and-Value-Statement.md](3-agencies-and-legal/Cost-and-Value-Statement.md) | PA, Budget Office, BAC, Legal Office | Aug 2026 | Service-fee figure and procurement route still to be agreed; small arithmetic inconsistencies in the hour and fee tables |
| [Cost-Analysis.md](3-agencies-and-legal/Cost-Analysis.md) | PA, PITD, budget readers (detailed Firebase cost model) | Aug 2026 | Re-check prices against current Firebase pricing before procurement; reports are also deleted 24 months after filing |

### 4-app-and-website
| Document | What it is | Status |
|---|---|---|
| [Operator-Guide.md](4-app-and-website/Operator-Guide.md) | Day-to-day manual for console staff: roles, reports, referrals, SLA, alerts, health check | Current for P1–P3; does not yet cover Hazard Watch, Post Maker, Privacy Requests |
| [command-hub.md](4-app-and-website/command-hub.md) | Incident IDs, "Call first", the Firebase ↔ Command Hub bridge, the Hub prototype, hosting it on Render | Current |
| [hazards.md](4-app-and-website/hazards.md) | Hazard Watch page and the earthquake feeds (USGS on, PHIVOLCS off until permission) | Current |
| [flood-control.md](4-app-and-website/flood-control.md) | DPWH flood-control data, ZIP codes, official hazard links; switching the resident list on | Current (data snapshot Aug 2025) |
| [post-maker.md](4-app-and-website/post-maker.md) | Post Maker images and captions; the optional AI helper | Current |
| [weather.md](4-app-and-website/weather.md) | PAGASA and other weather sources, switches, permission and disclosure | Current |
| [design-system.md](4-app-and-website/design-system.md) | Colours, type and spacing for the console, website and Command Hub | Current for web; the resident app follows the municipal colour guide |
| [municipal-color-guide.md](4-app-and-website/municipal-color-guide.md) | Colour guide for the resident app: shared colours and each town's colours (test branch only) | Applied on the test branch; the app uses slightly darker status colours for contrast (`app_colors.dart`) |

### archive
| Document | What it is |
|---|---|
| [2026-05-pitch-meeting-QA.md](archive/2026-05-pitch-meeting-QA.md) | Internal rehearsal notes for the first pitch meeting (May 2026). Several answers no longer match the system; not for agencies |
