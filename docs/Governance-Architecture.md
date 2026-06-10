# One Vizcaya — Governance Architecture
### Barangay → Municipal → Provincial → Region II
#### Authority, single-owner accountability, and audit trail at every tier

This document responds to the Provincial Government's directive to establish a
proper architectural design that mirrors the real governmental hierarchy, with
**bounded authority per role**, a **single accountable owner per report at any
moment**, and an **append-only audit trail for every ownership/status transfer**
— all enforced at the **database security-rules layer**, not just the UI.

---

## 1. The hierarchy

```
                        ┌─────────────────────────────┐
   EXTERNAL  ──────────▶│   REGION II (DPWH / NDRRMC)  │   national/regional assets
                        └──────────────▲──────────────┘
                                       │  escalate (provincial decision)
                        ┌──────────────┴──────────────┐
                        │   PROVINCIAL  (PA / PDRRMO)  │   province-wide, approved only
                        └──────────────▲──────────────┘
                                       │  APPROVE escalation  ← gate (rules)
                        ┌──────────────┴──────────────┐
                        │   MUNICIPAL  (LGU admin)     │   triages all town reports
                        └──────────────▲──────────────┘
                                       │  route down / handle
                        ┌──────────────┴──────────────┐
                        │   BARANGAY  (Barangay admin) │   certifies residents,
                        └──────────────▲──────────────┘   handles very local issues
                                       │  files report (verified resident)
                        ┌──────────────┴──────────────┐
                        │   CITIZEN  (verified resident)│
                        └─────────────────────────────┘
```

Each tier has a **defined, bounded scope**. Authority flows **down** (a higher
tier can route a report to a lower one) and accountability flows **up** (a report
only moves up when the lower tier explicitly approves it).

---

## 2. Roles & bounded authority (enforced in `firestore.rules`)

| Role | Scope | May do | May NOT do |
| :--- | :--- | :--- | :--- |
| **Citizen** | Own data | File reports (only if a **verified NV resident**); read own reports | Submit anonymously; read others' reports |
| **Barangay admin** | One barangay | **Certify residents** of their barangay; handle very local matters | Approve escalations; act province-wide |
| **Municipal admin** | One municipality | Triage/own all reports in their town; **approve escalation to Provincial**; manage announcements/responders; certify residents (fallback) | Approve another town's reports; act province-wide |
| **Provincial admin** | All municipalities | See/act on **approved** escalations province-wide; delete/archive; assign roles | Bypass the municipal approval gate |
| **Super admin** | Everything | Unrestricted | — |

**Key rule-layer enforcements**
- A **report's `create`** is denied unless it carries the verified submitter
  identity (`userId`, `userPhone`, `isAnonymous == false`) **and** the owner's
  `residencyStatus ∈ {gps_verified, certified, grandfathered}`.
- An **escalation** (`escalatedToProvince: false → true`) is allowed **only** for
  a **Municipal admin of that report's own municipality**, and must stamp
  `escalatedBy = their uid`.
- A **`certified` residency status** can be granted **only server-side** (the
  approval trigger) — a citizen can never self-certify.
- A user may **erase their own profile**, but a **report is not deletable by its
  owner** — on account deletion it is **archived and retained** as an LGU record.

---

## 3. Single accountable owner per report (ownership transfer)

A report has exactly one accountable tier at any moment, recorded on the document:

```
 reported ──▶ MUNICIPAL (handlingLevel=municipal)
                 │
                 ├─ route down ─▶ BARANGAY (handlingLevel=barangay)
                 │
                 └─ APPROVE escalation (Municipal admin) ─▶ PROVINCIAL
                        • sets escalatedToProvince=true
                        • stamps escalatedBy + escalatedAt
                        • report now visible/actionable to Provincial ONLY
                                 │
                                 └─ PROVINCIAL routes to REGION II (DPWH/NDRRMC)
```

The Provincial tier **cannot see or act on** a report until the Municipal admin
approves it — enforced in both the mobile and web dashboards **and** the rules.

---

## 4. Append-only audit trail (`audit_logs`)

Every ownership/status transfer and privileged action writes an immutable entry
(created by server-side Cloud Functions; admins can read, only super-admin can
alter):

| Event | Logged by | Captures |
| :--- | :--- | :--- |
| **Escalation approved** (Municipal→Provincial) | `auditEscalationApproval` | reportId, municipality, **approvedBy**, time |
| **Residency certified / rejected** | `onResidencyDecision` | targetUid, barangay, **decidedBy**, time |
| **Account deleted** (reports retained) | `onUserDeleted` | targetUid, municipality, reporter name, time |

---

## 5. Data & registration flow

```
  Citizen registers ─▶ GPS inside NV?  ── yes ─▶ residencyStatus = gps_verified ─▶ can report
                                       └─ no  ─▶ upload Barangay Cert / NV ID
                                                     │
                                                     ▼
                                         Barangay admin (or Municipal fallback)
                                         reviews in the web "Residency" queue
                                                     │ approve
                                                     ▼
                                    server trigger ─▶ residencyStatus = certified
                                                     └─▶ audit entry
                                              (now reports from ANYWHERE)
```

---

## 6. How the six committee changes reinforce the architecture

| Change | Architectural effect |
| :--- | :--- |
| ① No anonymous reporting | Every report has a single, identified, accountable submitter |
| ② Municipal→Provincial approval chain | Real, audited ownership transfer with a bounded approver |
| ③ Geo-restrict (Option 3) + Barangay-admin role | Adds the bottom tier; the barangay certifies its own residents (single-owner accountability at the base) |
| ④ One-command PDRRMO contact | Direct citizen→PDRRMO emergency channel |
| ⑤ Blaze hardening | Enterprise security envelope for the whole hierarchy |
| ⑥ Deletion → archival | Reports remain official records of the accountable tier |

---

## 7. Security posture (enforced, not cosmetic)
- All authority boundaries above are enforced in **`firestore.rules`** and
  **`storage.rules`**, validated server-side — the UI merely reflects them.
- Privileged status changes (`certified`, escalation, deletion archival) run
  through **Cloud Functions** so they cannot be forged by a client.
- Recommended next step for the committee: enable **Firebase App Check
  enforcement** and **PITR + scheduled backups** on the Blaze plan (see
  `PITD-Infrastructure-Memo.md`).

*Prepared by the Project: Vizcaya Team for the Provincial Government of Nueva
Vizcaya. Diagrams are conceptual; exact role/permission definitions live in
`firestore.rules`.*
