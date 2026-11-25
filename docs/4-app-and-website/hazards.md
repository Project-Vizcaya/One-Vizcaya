# Hazard Watch

One page in the admin console (**Operations → Hazard Watch**) that shows
everything needing the PDRRMO's attention on one map and one list.

## What it shows, in order

The province's own information always comes first:

| Tier | Source | Items |
|---|---|---|
| 1 | **One Vizcaya** | Open SOS alerts; open reports in hazard categories (every category whose usual priority is critical, plus bridge damage) |
| 2 | **PAGASA** (official) | Tropical cyclone information, heavy rainfall warning, thunderstorm advisories that mention Nueva Vizcaya, and PAGASA alerts when the PAGASA mobile source is switched on |
| 3 | **PHIVOLCS** (official) | Earthquakes within 400 km in the last 7 days (**off until permission**) |
| 4 | **USGS** (international) | Earthquakes within 400 km in the last 7 days |

Within each tier: critical, warning, watch, info, then newest first. Every
item names its source; nothing is merged across sources. When PHIVOLCS and
USGS report the same earthquake, only the PHIVOLCS report is shown.

Admins see their own area's reports and SOS (as elsewhere in the console);
weather and earthquakes are province-wide.

**Earthquake levels are One Vizcaya's triage aid**, from magnitude and distance
to the province. They are not an official intensity. The rules
(`apps/functions/hazards/quakes.js`):

| Level | Rule |
|---|---|
| Critical | M6+ within 200 km, or M5+ within 50 km |
| Warning | M5+ within 300 km, or M4+ within 100 km |
| Watch | M3.5+ within 150 km |
| Info | anything else in range |

Below the map: an optional **DPWH flood-control structures** layer and links
to the **official hazard services** (PHIVOLCS, PAGASA flood information,
PhilSensors, HazardHunterPH, UP NOAH, DSWD DROMIC). See
[flood-control.md](flood-control.md).

## What residents see (mobile app)

The **Emergency Contacts** screen shows up to five **recent earthquakes near
Nueva Vizcaya**: only the last 48 hours, only "watch" level and above (about
M3.5+ within 150 km), PHIVOLCS's report whenever it has one, each labelled with
its source. Minor quakes are left out so residents are not alarmed by every
tremor. Residents do not see the reports, SOS or triage list.

## Earthquake feeds

`hazardWatch` (Cloud Function, every 10 minutes) writes to `hazard_signals`.
Feed state (last update, errors) is in `hazard_feed_status` and shown at the
bottom of the page.

| Field in `config/hazards` | Default | Meaning |
|---|---|---|
| `usgsEnabled` | `true` | USGS's public earthquake API. Free, no key, no permission needed. |
| `phivolcsEnabled` | **`false`** | PHIVOLCS's public earthquake-information page. Switch on only after PHIVOLCS gives written permission. |
| `phivolcsUrl` | `https://earthquake.phivolcs.dost.gov.ph/` | Only if the address changes. |

A feed that fails keeps its last earthquakes and shows "not updating". A feed
switched off has its earthquakes removed within 10 minutes.

## Not verified yet
- **The sample feeds are synthetic.** This environment could not reach USGS or
  PHIVOLCS. The USGS format is public and stable. The PHIVOLCS parser was
  written from the page as known: before switching PHIVOLCS on, save a real
  copy of its page into `apps/functions/hazards/fixtures/phivolcs.txt` and run
  `npm test` in `apps/functions`.
- PHIVOLCS's site has had certificate problems in the past; if so, the feed
  shows "not updating" with the error.
