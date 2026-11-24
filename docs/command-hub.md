# Command Hub, responder site and incident IDs

Built from `ONE-VIZCAYA-COMMAND-HUB-TRACKING-HANDOFF.md` (24 Nov 2026) and the
talk with the PDRRMO officer that day. **Prototype: mock data, demo sign-in.**
PDRRMO's formal letter (expected early 2027) is the real spec; re-check this
against it.

## What was built

| Part | Where | State |
|---|---|---|
| Incident ID on every One Vizcaya report | `apps/functions/reports/incidentId.js`, trigger `onReportCreated` | Live once functions are deployed |
| "Emergency? Call first." on Report a Problem | `apps/mobile/lib/presentation/widgets/call_first_strip.dart` | In the app |
| Bridge One Vizcaya ↔ Command Hub | `apps/functions/hub/bridge.js`, `onReportCreated`, `incidentStatusUpdate` | **Off** (`config/hub`) |
| Resident sees PDRRMO stage + rounded ETA | `apps/mobile/lib/features/reports/presentation/widgets/hub_progress_view.dart` | Shows once the bridge sends updates |
| Command Hub (operators) + responder site | `command-hub/` (Next.js) | Prototype, in-memory mock data |

## Incident IDs

Every report gets, from the server, when it is created:

```
NV-BAM-20261124-3F9A2C
│  │   │        └─ first 6 characters of the shared UUID
│  │   └─ date filed (Manila)
│  └─ town code
└─ Nueva Vizcaya
```

| Town | Code | Town | Code | Town | Code |
|---|---|---|---|---|---|
| Alfonso Castañeda | ALC | Bayombong | BYB | Kayapa | KAY |
| Ambaguio | AMB | Diadi | DIA | Quezon | QZN |
| Aritao | ARI | Dupax del Norte | DDN | Santa Fe | STF |
| Bagabag | BAG | Dupax del Sur | DDS | Solano | SOL |
| Bambang | BAM | Kasibu | KAS | Villaverde | VIL |
| Province-wide / unknown | PRV | | | | |

- Same format everywhere: app reports, hotline calls and barangay reports in the
  Hub. The Hub's copy is `command-hub/src/lib/incidentId.ts`; both are tested
  with the same example.
- Bayombong is **BYB** because BAG is Bagabag and BAY could be misread.
- The **UUID** (`incidentUuid`) is the key shared with the Hub. It is derived
  from the report's path, so a retried event always gives the same value.
- Set only by Cloud Functions. The rules stop any app or admin from setting or
  changing `incidentId`, `incidentUuid` or `hub` (both report rule blocks).
- Shown in: the console's Live Reports (searchable) and report detail, the
  admin app's report detail, and the resident's report card (copyable).
- Reports filed before this change have no ID. They are not back-filled.

## Call first, post later

Report a Problem now opens with **"Emergency? Call first."**: **Call PDRRMO**,
**Call 911** and **SOS** (the same SOS flow as the home screen: confirm, share
live location, call). The form comes after. Residents still have no public
incident feed (PR #137), and report photos are visible only to the reporter
and admins.

## Bridge

```
One Vizcaya (Firebase)                         Command Hub
new report ── onReportCreated ── signed POST ─► /api/ingest-app-report   (idempotent on incident_id)
report.hub ◄─ incidentStatusUpdate ◄─ signed POST ── stage / ETA changes
```

- **Switches** (Firestore `config/hub`, both off by default):
  `forwardReports: true`, `hubUrl: "https://…"`, `citizenEtaUpdates: true`.
- **Secret:** `HUB_BRIDGE_SECRET` in Secret Manager (same value in the Hub's
  `.env.local`):
  ```bash
  printf '%s' 'a-long-random-string' | gcloud secrets create HUB_BRIDGE_SECRET --data-file=- --project one-vizcaya-app
  gcloud secrets add-iam-policy-binding HUB_BRIDGE_SECRET --project one-vizcaya-app \
    --member="serviceAccount:$(gcloud projects describe one-vizcaya-app --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```
- **Signature:** `x-ov-signature: t=<unix seconds>,v1=<HMAC-SHA256 of "t.body">`,
  5-minute window. Unsigned or stale calls are refused both ways.
- **Sent to the Hub:** category, priority, description, location text, barangay,
  town, coordinates, time, incident ID and UUID, report path. **Not** the
  reporter's name or phone number. Whether dispatchers should get the phone
  number is a PDRRMO / Data Protection Officer decision.
- **Sent back to the resident:** stage (Received, Validated, Responder assigned,
  On the way, On scene, Completed), a **rounded** arrival time ("about 10 to 15
  minutes", only while on the way) and the agency's name. **Never** the
  responder's position or identity. One inbox entry and push per stage, not per
  ETA change.
- Tested end to end: the Hub accepted One Vizcaya's signed report, refused a
  wrong secret, accepted a retry without duplicating, and sent Received,
  Dispatched and On the way (ETA, agency) back, verified by One Vizcaya's own code.

## Command Hub prototype (`command-hub/`)

See `command-hub/README.md` to run it. In short:

**Operators (`/hub`)**
- **Live map:** units coloured by status with call signs. A unit with no fix
  for 30 s while moving is faded; after 5 min it shows "signal lost, last seen
  HH:MM". Filters by status, agency and town; click to centre.
- **Incidents:** queue; detail with sources (app, hotline, barangay); possible
  duplicates (300 m, 30 min, same kind) with **Merge** both ways (never
  automatic); assign the nearest free units (distance and ETA shown); release;
  validate, refer, resolve, close. Opening an incident's location is audited.
- **Hotline call log:** keyboard-first; the practice number goes in "Caller's
  number"; Ctrl+Enter saves; offers to attach to an incident already reported;
  optional map pin; extra fields configurable in `src/config/callForm.ts`.
  No telephony, no recording.
- **Replay:** a unit's recorded track for after-action review.
- **Audit log** (PDRRMO only).
- MDRRMO operators see only their town's units, incidents and calls.

**Responders (`/responder`, on a phone)**
- Start / End duty (no location while off duty; refused on the server too).
- Big status buttons: Available, En route, On scene, Returning; "Confirm
  dispatch" when the Hub dispatches the unit.
- Location sharing with the handoff's intervals (every ~7 s en route, minutes
  apart when available), an offline queue that keeps each fix's own time and
  sends in order, and the screen kept on.
- **Two-way location:** the assignment shows the citizen's pin ("as of HH:MM"),
  with **Google Maps** and **Waze** buttons. The citizen's location is visible
  to the assigned unit only, until it is released. The citizen sees the stage
  and a rough ETA, never the responder's position.
- Vehicles with a GPS tracker: the crew signs in for duty and status; the
  position comes from the tracker (`/api/ingest-traccar-position`).

**ETA** is a stub: straight-line distance × 1.4 at 35 km/h, recalculated every
90 s or after 500 m. Replace with OpenRouteService or a self-hosted OSRM.

**Feature flags** (`.env.local`): `FEATURE_RESPONDER_TRACKING`,
`FEATURE_HOTLINE_INTAKE`, `FEATURE_CITIZEN_ETA_UPDATES` (`0` = off).

## Handoff checklist (January demo)

| Item | State |
|---|---|
| Responder: sign in, Start Duty, status buttons, adaptive location, offline queue | ✅ web prototype (background tracking needs the Flutter app) |
| Hub map with live units and correct staleness | ✅ |
| Dispatcher assigns; responder gets the incident and Navigate | ✅ |
| One Vizcaya report appears in the Hub (bridge) | ✅ tested locally; off in production |
| Citizen sees status timeline (ETA may be stubbed) | ✅ in the app; ETA is the stub |
| Hotline intake scaffolded with configurable fields | ✅ |
| GPS replay simulator | ✅ `npm run replay` |
| All demo data is mock | ✅ |

## Not done, or someone else's
- **Database (co-dev):** the Supabase tables, RLS and a `HubStore`
  implementation. The rules it must keep are the tests in
  `command-hub/src/lib/store/store.test.ts`. Table and field names follow the
  handoff §3 exactly.
- **Native Flutter responder app** with a background location service, the
  Play Console background-location declaration and battery-optimisation
  prompts. The web prototype shows the flow; it can't report with the screen off.
- **Real sign-in** (Supabase Auth). The demo sign-in must not go live.
- **Load test** (50 units, 100 incidents/hour) and RLS tests per role JWT: on
  the Supabase version.
- **Data Privacy Statement:** must cover responders' location (RA 10173). Flagged
  for Aaron; not edited from code.
- **Hotline (blocked):** PDRRMO's answers on the provider, shifts, current
  logging, the blank call form, dispatch decisions and recording policy.
