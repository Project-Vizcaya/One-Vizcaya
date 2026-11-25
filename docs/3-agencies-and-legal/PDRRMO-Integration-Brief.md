# One Vizcaya — PDRRMO Integration Brief
### How the Platform Supports Disaster Response in Nueva Vizcaya
#### Prepared for the Provincial Disaster Risk Reduction and Management Office

---

> **The core commitment:** One Vizcaya does not replace your existing workflows,
> radio network, hotlines, or command structure. It adds a **structured,
> geotagged, photo-verified intake layer** in front of what you already run —
> so your dispatchers act on better information, faster, without changing how
> PDRRMO operates today.

---

## 1. Before and After One Vizcaya

This table shows what changes for PDRRMO — and what stays exactly the same.

| Situation | Without One Vizcaya | With One Vizcaya |
| :--- | :--- | :--- |
| **Citizen reports flooding** | Calls hotline; dispatcher writes it down by hand; no location, no photo | Files a geotagged, photo-verified report in under 60 seconds; dispatcher sees it pinned on a map with a verified photo |
| **Locating the incident** | Dispatcher asks "where exactly?" — often gets a vague barangay name | GPS coordinates captured automatically at submission; plotted on the dashboard map |
| **Photo evidence** | Rarely attached; hard to share quickly | Camera photos are **GPS-stamped** at capture — location, timestamp, and a Google-Maps QR baked into the image — and clearly marked as a live camera capture vs. a gallery upload |
| **Dispatcher's view** | Scattered calls, notes, texts from multiple channels | Single prioritized queue; disaster-category reports surface at the top with a 4-hour SLA timer |
| **Radio and hotlines** | Your primary channel | **Unchanged — radio and hotlines remain your operational backbone.** One Vizcaya is a parallel intake channel, not a replacement |
| **False or recycled reports** | Hard to filter; waste dispatcher time | Live camera captures are GPS-stamped and flagged "verified" vs. an "unverified" gallery upload; every report is tied to a verified, identified resident — no anonymous submissions |
| **Citizen follow-up** | Citizen calls back repeatedly to ask what happened | Citizen receives push notifications at every status change; can see live progress without calling |
| **After the incident** | Scattered notes, hard to compile | Full timestamped audit trail per report; exportable PDF for your after-action report to NDRRMC |

---

## 2. The One-Command Emergency Contact

### Current status in the app
One Vizcaya includes a **Hotline Directory** covering national, provincial, and
municipal emergency contacts — including PDRRMO, PNP, BFP, MDRRMO, and crisis
lines. This is accessible from the app's home screen at any time, even without
an active report.

### What PDRRMO asked for
PDRRMO requested a **"one-command contact"** — a single action that connects
a resident to emergency services without navigating menus.

### Implemented — Emergency SOS with live location
A dedicated **SOS button** is on the app home screen. One tap:

```
┌─────────────────────────────────────┐
│                                     │
│   🚨  EMERGENCY SOS                 │
│   Shares your live location +       │
│   calls the hotline                 │
│                                     │
│   [ SEND SOS ]                      │
│                                     │
└─────────────────────────────────────┘
```

- **Live location** — the moment SOS is pressed, the app captures the person's
  GPS and opens a live **beacon**, then keeps streaming their position while the
  emergency is active — so responders reach the exact spot even if the caller
  can't speak. It falls back to the last-known position with no signal and
  resumes live tracking automatically when the connection returns.
- **Call the hotline** — the same screen dials the PDRRMO Operations Center.
- **Real-time dispatch** — operators see open beacons in a **Live Emergencies**
  view (map pins + one-tap Navigate/Call/Dispatch/Resolve), scoped to their
  tier, and receive a **high-priority push** the instant an SOS fires.
- **Abuse-resistant** — every SOS is **operator-verified** (call/message) before
  dispatch; rapid/repeat SOS are soft-flagged and deprioritised but never
  dropped, so a genuine emergency is always seen.

> **Status:** the Hotline Directory **and** the one-tap SOS with live location,
> real-time dispatch, and abuse verification are **implemented** — built as a
> direct result of this committee's feedback and ready to demo.
> **[CONFIRM WITH PDRRMO]** the correct OpCen number to dial, and whether an
> SMS fallback is needed for residents with no data signal.

---

## 3. Disaster-Specific Workflow (Typhoon / Flood / Landslide Scenario)

This section addresses PDRRMO's specific concern: *"during a major disaster,
reports will surge. How does the system prevent your office from being
paralyzed by volume?"*

### 3.1 Priority Queuing

Disaster-category reports (`Flooding`, `Landslide`, `Structural Damage`,
`Medical Emergency`) are automatically surfaced at the **top of the
municipal and provincial dashboards** with a **4-hour SLA timer** —
visually distinct from non-emergency categories (roads: 72 hours,
infrastructure: 48 hours). Dispatchers see the most critical items first,
not a flat chronological list.

### 3.2 Heatmap — Cluster Detection, Not Individual Reports

During a surge, the PDRRMO dashboard shows a **real-time heatmap** of
report density across the province. Ten reports from one barangay become
**one visible hotspot** on the map — giving your dispatcher an immediate
picture of where the disaster is concentrated without reading individual
reports line by line.

```
  Province-wide view during a typhoon:

  ░░░░▓▓████▓▓░░░░    ← dense cluster = affected area
  ░░░▓██████████▓░░
  ░░░░▓▓████▓░░░░░░
  ░░░░░░░▓▓░░░░░░░░   [heatmap radius adjustable by dispatcher]

  Each cluster is tappable — opens the filtered report list
  for that barangay, sorted by severity.
```

### 3.3 Bulk Operations During a Surge

When an entire area is affected, your dispatcher does not need to open
and update each report individually. The **bulk-select action bar** lets
a dispatcher:

1. Check all reports in an affected barangay
2. Set status to `Acknowledged — Evacuation Underway` in a single action
3. The system pushes a notification to all affected citizens simultaneously

This addresses the "paralysis by volume" problem directly.

### 3.4 Offline Queue — Reports Survive Signal Loss

In upland barangays and during severe weather, signal is unreliable.
One Vizcaya handles this explicitly:

- A resident **drafts a report with no signal** — it is stored on their
  device with timestamp and GPS already captured.
- When signal returns — even briefly — the report **auto-submits** to
  the queue with its original timestamp.
- Dispatchers see a `[QUEUED OFFLINE]` label on these reports so they
  know the timing reflects the actual incident, not the upload time.

This means reports from the most affected, lowest-connectivity areas
are **not lost** — they arrive as soon as signal permits, with correct
location and time data intact.

### 3.5 Broadcast — PDRRMO Pushes Alerts to Citizens

One Vizcaya is not only inbound. PDRRMO can use the **Announcement
Broadcasting** feature to push evacuation orders, shelter locations,
and advisory notices to all app users in a specified municipality within
seconds — no separate SMS blast system needed.

> **[CONFIRM WITH PDRRMO]** whether evacuation broadcast should be
> scoped by municipality or by specific barangay, and whether PDRRMO
> or the Municipal DRRMO holds broadcast authority during a declared
> calamity.

### 3.6 Your Existing Systems Stay in Place

| Existing PDRRMO capability | One Vizcaya relationship |
| :--- | :--- |
| Radio network | **Unchanged.** One Vizcaya does not touch this |
| Hotlines (OpCen) | **Unchanged, now also reachable one-tap from the app** |
| MDRRMO coordination | **Feeds into** — reports routed to the correct MDRRMO with GPS pre-attached |
| NDRRMC reporting chain | **Feeds** — exportable incident reports with full timestamps for after-action submissions |
| Evacuation protocols | **Unchanged.** One Vizcaya broadcasts, it does not command |

The authority to declare evacuations, deploy resources, and issue orders
**remains entirely with PDRRMO and its chain of command.** The app
provides information and communication tools — never authority.

---

## 4. Integration with the Governance Architecture

For completeness, here is how One Vizcaya's disaster workflow maps to the
provincial hierarchy defined in `Governance-Architecture.md`:

| Disaster scenario | System behaviour |
| :--- | :--- |
| Local flooding (barangay-level) | Report → Municipal queue → routed down to Barangay admin → resolved locally |
| Major flood (municipal-level) | Report → Municipal queue → MDRRMO assigned → resolved at municipal level |
| Multi-barangay / provincial disaster | Municipal Admin **approves escalation** → report surfaces on PDRRMO Provincial Hub with `[ESCALATED]` banner |
| Beyond provincial capacity | Provincial Admin refers to **Region II** (DPWH / NDRRMC) — external Tier 4 referral |

The escalation gate (Municipal Admin must approve before anything reaches
Provincial) ensures PDRRMO's command hub **is not cluttered with local
matters** — only verified, escalated incidents reach the provincial level.

---

## 5. Open Questions for the PDRRMO Meeting

We bring these specifically for PDRRMO to answer — these are not things
we can decide without your operational expertise:

1. What is the correct PDRRMO OpCen number(s) for the one-tap emergency dial?
2. During a declared calamity, who holds broadcast authority — PDRRMO or the
   Municipal DRRMO?
3. Should evacuation alerts be scoped by municipality or by barangay?
4. Are there specific report categories we are missing that PDRRMO uses
   operationally (e.g. "road blocked — relief convoy cannot pass")?
5. Does PDRRMO require integration with an existing incident-management or
   NDRRMC reporting system, and if so, what format does it expect?
6. What is PDRRMO's current escalation protocol to NDRRMC — and where does
   One Vizcaya's escalation chain connect to it?

---

*Prepared by the Project: Vizcaya Team in direct response to the PDRRMO's
feedback at the June 10, 2026 Technical Review Committee meeting.*

*PA Endorsement Reference: No. G-373, released June 11, 2026.*

*Aaron Anthony A. Gano II · Sean Godric Reyes · Darius Acosta*
*Nueva Vizcaya State University — Bayombong Campus*
*aaron.gano18@gmail.com · 0956-302-3114*
*github.com/Project-Vizcaya/One-Vizcaya*
