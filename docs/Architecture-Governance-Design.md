# One Vizcaya — Architecture & Governance Design

*A unified design linking the governmental hierarchy of Nueva Vizcaya to the
One Vizcaya platform.*

**Working draft v0.1** — prepared in response to the Technical Review Committee
(PA, PDRRMO, PPDO, PITD), June 2026.

> **Companion documents:** [`Governance-Architecture.md`](./Governance-Architecture.md)
> (the condensed Barangay → Region II reference) and
> [`PITD-Infrastructure-Memo.md`](./PITD-Infrastructure-Memo.md) (Blaze
> hardening). The enforcement claims here are realised in the repository's
> [`firestore.rules`](../firestore.rules), [`storage.rules`](../storage.rules),
> and [`apps/functions/index.js`](../apps/functions/index.js).

---

## Purpose of This Document

At the first review, the committee correctly observed that One Vizcaya was
presented as a working application but **not yet as an architecture that mirrors
how the Provincial Government actually operates** — from the Province down to the
Barangays. This document answers four questions at every level: **WHO has
authority, WHO is accountable, HOW data flows, and HOW each real government
office connects.** It is a working draft offered for the committee to correct and
co-own, not a finished claim. Items needing the committee's confirmation are
flagged **[CONFIRM WITH PPDO/PITD]**.

### How to Read the Confirmation Flags

Where this draft makes an assumption about Nueva Vizcaya's specific government
structure, it is marked **[CONFIRM WITH PPDO/PITD]**. These are deliberate
invitations for the committee to correct us — turning their feedback into shared
ownership of the final design. Bring this document to the next meeting and
resolve each flag together.

---

## 1. Design Principles

The architecture rests on four principles the committee's feedback made explicit:

1. **Mirror the real hierarchy.** The system's structure follows the actual
   chain of governance under the Local Government Code: **Province →
   City/Municipality → Barangay**, with their real offices.
2. **Clear authority at every level.** Every level has a defined set of
   *who-can-see* and *who-can-act*. No undefined or overlapping authority.
3. **Defined accountability.** Every report has a **single accountable owner at
   any moment**; responsibility transfers explicitly, never implicitly.
4. **Bidirectional, traceable data flow.** Information flows up (reports,
   escalations) and down (assignments, advisories, broadcasts) along defined
   paths, with a full audit trail.

---

## 2. The Four-Layer Model

To have structural integrity, the design defines four layers that must line up at
every level of government. **A gap in any layer at any level is a design defect.**

| Layer | What It Defines | The Question It Answers |
| :--- | :--- | :--- |
| **Governance** | Roles, authority, who controls what | *Who is in charge here?* |
| **Accountability** | Ownership of each report and action | *Who answers for this?* |
| **Data** | What information lives at this level, who owns it | *What do we hold, and who owns it?* |
| **Technical** | How the software enforces the above | *How does the system guarantee it?* |

Sections 4–7 define each layer across all three government levels. Section 3
first establishes the hierarchy itself.

---

## 3. The Governmental Hierarchy (Structure)

One Vizcaya maps onto the three-tier structure of Philippine local government,
with a fourth external tier for national/regional agencies.

| Tier | Government Level | Represented In System As |
| :--- | :--- | :--- |
| **Tier 1** | Barangay (lowest LGU unit) | Barangay workspace — barangay officials & tanod |
| **Tier 2** | City / Municipality | Municipal dashboard — MLGU offices (MDRRMO, Engineering, RHU, etc.) |
| **Tier 3** | Province | Provincial Command Hub — PA, PDRRMO, PPDO, PITD |
| **Tier 4** *(external)* | National / Regional agencies | Referral targets — DPWH Region II, DILG, NDRRMC, etc. |

> **Note on the Barangay tier.** The committee asked us to define this level
> fully. Under the Local Government Code, the Barangay is the basic unit of
> governance, led by the **Punong Barangay** (Barangay Captain) with the
> Sangguniang Barangay and Barangay Tanod for peace and order.

```
   EXTERNAL ─────────▶  TIER 4 · REGION II (DPWH / DILG / NDRRMC)
                                ▲   referral (provincial decision)
                        TIER 3 · PROVINCE (PA / PDRRMO / PPDO / PITD)
                                ▲   APPROVE escalation  ← rule-guarded gate
                        TIER 2 · MUNICIPALITY (MLGU offices)
                                ▲   route down / handle
                        TIER 1 · BARANGAY (Punong Barangay / tanod)
                                ▲   files report (verified resident)
                                 CITIZEN (verified NV resident)
```

---

## 4. Governance Layer — Who Has Authority

This layer resolves the committee's concern that authority and control were
unclear at each level. Each role has an **explicit, bounded scope of authority**
— it can see and act only within its level and the levels it legitimately
oversees.

### 4.1 Role & Authority Matrix

| Role (system) | Government Position | Scope of Authority |
| :--- | :--- | :--- |
| **Barangay Admin** | Punong Barangay / delegate | View & act on reports **within their barangay only**; certify residents of that barangay |
| **Municipal Dispatcher** | MLGU office staff (e.g. MDRRMO) | View & triage all reports in their municipality; assign to responders |
| **Municipal Admin** | Municipal Administrator | All municipal authority **+ escalate to province** |
| **Provincial Office** | PDRRMO / PPDO / PITD | View province-wide data within their functional domain |
| **Provincial Super-Admin** | PA's Office | Full province-wide authority; final escalation owner |
| **System Steward** | PITD-designated | Technical administration; **cannot alter report content** |

> **System-role mapping.** In `firestore.rules` these map to the custom-claim
> roles `barangay_admin`, `municipal_admin`, `provincial_admin` / `admin`, and
> `super_admin`. The "Municipal Dispatcher" and "Municipal Admin" distinction is
> a workflow role inside the municipal tier. **[CONFIRM WITH PPDO/PITD]** the
> exact offices that should hold each.

### 4.2 The Authority Principle

Authority is **hierarchical and non-overlapping**: a higher tier can *view* what
is below it, but **cannot silently override a lower tier's ownership** without an
explicit, logged action (assignment or escalation). This prevents the "unclear
control" problem — at any moment, **exactly one role holds action authority** over
a given report.

---

## 5. Accountability Layer — Who Answers For What

This layer resolves the committee's concern that accountability was undefined.
The core rule: **every report has exactly ONE accountable owner at any moment,
and ownership transfers only through explicit, audited handoffs.**

### 5.1 The Single-Owner Rule

- **On submission**, a report's first accountable owner is the receiving
  Municipal Dispatcher (or Barangay Admin, if routed to barangay).
- **On assignment**, accountability moves to the named responder unit (e.g.,
  Municipal Engineering). The handoff is timestamped and attributed.
- **On escalation**, accountability transfers up a tier **only when the Municipal
  Admin formally escalates** — never automatically.
- **On resolution**, the owner at time of resolution is recorded as accountable
  for the outcome, and the citizen rates that resolution.

### 5.2 Accountability Trail

Every transfer of ownership is written to an **immutable audit log**: who held
it, when, what action they took, and to whom it passed. At any point in a
report's life, the question *"who is answerable for this right now?"* has a
single, provable answer — precisely the integrity the committee asked for.

---

## 6. Data Layer — What Lives Where & Who Owns It

This layer resolves the committee's concern that data flow up and down the
hierarchy was unclear. It defines what data exists at each level, who owns it,
and the defined paths along which it moves.

### 6.1 Data Ownership by Level

| Level | Data Held | Data Owner |
| :--- | :--- | :--- |
| **Citizen** | Own reports, profile, consent record | The citizen (with LGU as controller) |
| **Barangay** | Reports within the barangay | Barangay LGU |
| **Municipality** | All municipal reports, responder records, analytics | Municipal LGU |
| **Province** | Province-wide aggregates, escalated reports, cross-municipal analytics | Provincial Government |

> **Overarching principle:** the Provincial Government owns all data within its
> jurisdiction as the **data controller** under RA 10173; lower LGUs own and
> steward their own slice. The development team is the **data processor, never an
> owner.**

### 6.2 Bidirectional Data Flow

- **Upward flow** (reports & escalations): Citizen → Barangay/Municipal intake →
  *(if escalated)* Province → *(if referred)* Region II agency. **Each hop is
  logged.**
- **Downward flow** (assignments, advisories, broadcasts): Province or
  Municipality → responder units → status updates and notifications → Citizen.
  Announcements and evacuation alerts also flow downward to citizens directly.
- **Lateral flow** (routing): a report can be routed to the correct tier
  (Barangay / Municipal / Provincial / Region II), **including routing DOWN to a
  barangay** for a purely local matter.

---

## 7. Technical Layer — How the System Enforces It

This layer shows PITD that the governance, accountability, and data rules above
are **not just policy — they are enforced in software at the database level, not
merely in the user interface.**

### 7.1 Enforcement Mechanisms

| Design Rule | Technical Enforcement | Where in this repo |
| :--- | :--- | :--- |
| Bounded authority per role | Custom auth claims + Firestore Security Rules at the DB layer | `firestore.rules` (`role()`, `isMunicipalAdmin()`, barangay scoping) |
| Single accountable owner | Owner/handler fields on every report; transfers only via controlled, logged ops | `firestore.rules` reports rule; `problem_report.dart` |
| Audit trail | Append-only event log (actor, action, timestamp, from→to) | `audit_logs` rule; `apps/functions/index.js` triggers |
| Tenant data isolation | Municipal data partitioned; cross-tenant read only for authorized provincial roles | `firestore.rules` reports / verificationRequests |
| Data ownership / export | Per-level scoped queries; full export to LGU on request (RA 10173 portability) | `dataRequests` rules; web dashboards |
| Escalation control | Ownership transfer is a privileged, rule-guarded write — not an open update | `approvingEscalation()` in `firestore.rules` |

### 7.2 Integration Points (External Tier 4)

- **DPWH Region II** — for national-highway and major-infrastructure referrals.
- **PDRRMO ↔ NDRRMC chain** — for disaster escalation beyond provincial capacity.
- **Other provincial systems** — via documented APIs / webhooks, scoped per PITD
  direction.

---

## 8. End-to-End Walkthrough (Integrity Check)

To demonstrate the design holds together with no gaps, here is a single report
traced through all four layers and all relevant levels:

1. **A resident reports a damaged barangay road.**
   *Data:* created, owned by citizen + LGU. *Governance:* enters municipal
   intake. *Accountability:* Municipal Dispatcher becomes owner. *Technical:*
   written with owner field + audit entry.
2. **Dispatcher verifies and routes to the Barangay tier** since it is purely
   local. *Accountability* transfers to Barangay Admin, logged. *Authority:* the
   barangay now controls it.
3. **Barangay resolves it; marks Solved, citizen notified and rates it.**
   *Accountability:* barangay recorded as resolver. *Data:* resolution stored at
   barangay + municipal levels.
4. **If instead it were a collapsed provincial bridge**, the Municipal Admin
   escalates to Province (Tier 3). *Accountability* transfers up, logged.
   Province may refer to DPWH Region II at Tier 4.

At every step, **exactly one owner is accountable**, authority is bounded to the
correct level, data ownership is defined, and the technical layer enforces and
logs it. That continuity is the structural integrity the committee asked us to
establish.

---

## 9. Open Questions for the Committee

We bring these to the next meeting to finalize the design **with** the committee,
rather than presenting assumptions as fact:

1. Confirm the exact barangay-level roles that should have system access.
2. Confirm provincial-office functional-domain views (which office sees which
   data).
3. Confirm whether accountability maps to a **named official** or to the
   **office**.
4. Confirm which existing PGNV systems One Vizcaya should integrate with.
5. Confirm the official escalation chain for disasters (PDRRMO → provincial →
   NDRRMC).
6. Confirm data-residency and any DICT / provincial IT policy requirements
   (PITD).

---

## Our Posture at the Next Meeting

We are **not defending a finished design** — we are presenting a *structurally
complete framework* and asking the committee to correct the specifics only they
know. Resolving the open questions together makes the final architecture
genuinely theirs as much as ours. That shared ownership is what we are aiming
for.

---

*Project: Vizcaya Team — Mysterious_Alarm · Reyes · Acosta —
[github.com/Project-Vizcaya/One-Vizcaya](https://github.com/Project-Vizcaya/One-Vizcaya)*
