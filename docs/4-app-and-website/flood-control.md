# DPWH flood control, official hazard links and ZIP codes

A first version, built from **national** open data. When the PLGU gives the
go-ahead, replace it with the province's own records (see "Later" below).

## Where the data comes from

[BetterGov.ph](https://bettergov.ph) (a volunteer civic-tech movement) keeps a
copy of DPWH's public records. Their repository was **CC0 (public domain)** up
to 19 November 2026; after that, their content is CC BY-NC-ND 4.0, which does
not allow adapted copies. We take data **only from the last CC0 version**
(commit before `1d2e8f3`) and credit BetterGov.ph and DPWH wherever it is shown.

| Data | Original source | Used for |
|---|---|---|
| Flood-control projects in Nueva Vizcaya: 85 projects, 2021–2024, ₱5.71B in contract costs | DPWH Flood Control Information System (snapshot August 2025) | Hazard Watch layer; resident list (switched off) |
| ZIP codes of the 15 towns | PHLPost, via BetterGov.ph's LGU directory | Town info sheet in the app |
| Official hazard services (links only) | The agencies themselves | Hazard Watch and the app's Emergency Contacts screen |

Not used: BetterGov's mayor and vice-mayor names (out of date) and their
service descriptions (not CC0; we link to the agencies and write our own labels).

Nine DPWH records leave the town blank. Each description ends
"…, Bambang, Nueva Vizcaya" (7) or "…, Solano, Nueva Vizcaya" (2), so the
import takes the town from there (`townFromDescription: true`).

To refresh the data, follow the steps at the top of
`scripts/import-dpwh-flood-control.mjs`. It writes
`apps/web/src/data/floodControl.ts` and `apps/mobile/assets/data/flood_control.json`.

## What each user sees

**Hazard Watch (console, all admins).** The "Show DPWH flood-control
structures" box adds the structures to the map, so the PDRRMO can see whether
a flood report is near one. Clicking one shows its description, town, type of
work, programme year, completion date and DPWH district office. Contractor and
cost are **not** shown here. Municipal admins see their own town's structures.

**Resident app, town info sheet: "Flood-control projects (DPWH)".** This lists
the town's projects with contract cost, contractor, and start and completion
dates, plus the town total. **It is hidden by default.** It appears only when
`public_settings/transparency.floodControlPublic` is `true`.

## Turning the resident list on (after the Governor's office approves)

In the console, open **Hazard Watch**. Below the map, a provincial admin sees
"Resident app list … hidden" with a **Show to residents** button. Residents'
apps pick up the change within seconds; **Hide from residents** reverses it.

Firestore rule (already in `firestore.rules`):

```
match /public_settings/{docId} {
  allow read:  if isAuth();
  allow write: if isProvincialAdmin();
}
```

## Not verified yet
- This environment could not open PHIVOLCS, PhilSensors, HazardHunterPH,
  UP NOAH or DROMIC (only PAGASA answered). BetterGov.ph lists all of them as
  checked on 19 November 2026. Tap each link once on a phone before release.
- The data is a snapshot from August 2025 and does not include 2025 projects.

## Later, with the PLGU's own data
- Projects from the Provincial Engineering Office, with status and photos.
- Provincial budget by office (approved, allotted, spent, % used), from the
  Budget Office and Treasurer, like the DepEd budget portal.
- Let residents report a damaged or unfinished structure from its entry.
