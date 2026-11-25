# Weather in One Vizcaya

## Sources

| Source | What it gives | How it is fetched |
|---|---|---|
| **DOST-PAGASA mobile API** (`api.mobile.panahon.gov.ph/api/v1`) | Barangay-level current conditions, heat index and rainfall with PAGASA's own categories, 24-hour and 5-day forecasts, alerts, nearby station readings | Cloud Functions only (below) |
| **DOST-PAGASA public regional page** (NLPRSD) | Provincial forecast, outlook, warnings, synopsis | `pagasaRegionalWatch`, hourly |
| **OpenWeather** ("international") | Days 6+, chance of rain, wind, UV, sunrise/sunset, humidity, air quality | `getWeather` Cloud Function |

The two sources are **never averaged or blended**. Every value keeps its source,
and everything from OpenWeather is labelled third-party.

### Permission and disclosure
PAGASA allowed use of its data by email, on condition that the app discloses
that **it is not an official PAGASA app and only uses PAGASA's data**. That
sentence is shown wherever PAGASA data appears (`kPagasaDisclosure`). The app
does not use PAGASA's "PANaHON" name or logo.

> **Keep the permission email on file** and show it to the PDRRMO if asked. If
> PAGASA withdraws permission, switch the source off (below).

### What the code will never do
- Call anything except the public GET endpoints listed in
  `apps/functions/pagasa-mobile/client.js`. The `/auth/*` endpoints are refused.
- Imitate PAGASA's app: no device ids, no App Check tokens, none of PAGASA's
  Firebase configuration. The only headers sent are `Accept` and `If-None-Match`.

## How it works

Phones **never call PAGASA**. All calls are made by Cloud Functions at fixed
intervals, so the whole province costs PAGASA a small, fixed number of requests:

| What | Function | Interval | Stored in |
|---|---|---|---|
| Alerts | `pagasaMobileWatch` | 5 min | `weather_pagasa/alerts` |
| Nearby station readings | `pagasaMobileWatch` | 10 min | `weather_pagasa/stations` |
| One forecast per municipality (15) | `pagasaMobileWatch` | 15 min | `weather_pagasa/muni_<name>` |
| Barangay-level forecast for a user's location | `getPagasaForecast` (callable) | 15 min per ~1 km cell, on demand | `weather_pagasa_points/<cell>` |

- **Barangay level:** the app sends the user's GPS position; the server rounds
  it to a ~1 km cell, so everyone in a barangay shares one fetch. Without GPS,
  or if that fails, the app shows the **town-centre** forecast and says so.
- **ETags:** every request sends `If-None-Match`; a 304 reuses the stored copy.
- **Failures:** the last good data stays, marked "not refreshed". A forecast
  older than 45 minutes is marked stale on the phone.
- **Offline:** Firestore's offline cache serves the stored town forecast and
  alerts.

## Switches (Firestore document `config/weather`)

Provincial admins can edit it (Firebase Console → Firestore → `config` → `weather`).

| Field | Values | Default | Meaning |
|---|---|---|---|
| `pagasaMobileEnabled` | `true` / `false` | **`false`** | The kill switch. Off = zero PAGASA calls; apps show the international source and nothing about PAGASA forecasts. |
| `mode` | `pagasaPrimary`, `pagasaOnly`, `sideBySide`, `internationalOnly` | `pagasaPrimary` | See below. |
| `alertRules` | `{locations: [...], messageContains: [...]}` | Nueva Vizcaya, Cagayan Valley, Region II, Northern Luzon; "Nueva Vizcaya", "#NLPRSD" | Which alerts count as Nueva Vizcaya's. |
| `pagasaBaseUrl` | an `https://` URL | PAGASA's API | Only if the address changes. |

**To switch PAGASA on:** create `config/weather` with `pagasaMobileEnabled: true`.
Within 5 minutes `weather_pagasa/_status` shows `mode: pagasaPrimary` and the
town documents appear.

**Automatic fallback:** if PAGASA answers 401 or 403 (access closed), the server
stops calling for 6 hours, sets `weather_pagasa/_status.mode` to
`internationalOnly`, and the apps fall back by themselves.

### Modes
| Mode | Behaviour |
|---|---|
| `pagasaPrimary` | PAGASA for everything it provides; OpenWeather fills what PAGASA lacks. |
| `pagasaOnly` | No OpenWeather calls at all. |
| `sideBySide` | Both temperatures shown ("PAGASA 29°C · Intl 30°C"), with a "sources differ" hint when they are more than 3 °C apart or disagree about rain. |
| `internationalOnly` | Used automatically when PAGASA is off, blocked, or has no data. |

**Alerts are PAGASA-only.** If they cannot be loaded the app says "Official
alerts unavailable" with the time of the last update. It never substitutes
another source's warning. Alerts also appear on the Emergency Contacts screen.

## Where the code is
- Server: `apps/functions/pagasa-mobile/` (`client`, `parse`, `alerts`,
  `stations`, `service`), wired in `apps/functions/index.js`.
- App: `apps/mobile/lib/features/weather/` (`domain`, `data`, `presentation`),
  used by `presentation/screens/weather_detail_screen.dart`.
- Tests: `apps/functions/pagasa-mobile/pagasa-mobile.test.js`,
  `tests/emulator/pagasa-mobile.test.js`, `apps/mobile/test/weather/`.

## Not verified yet: do these before switching on in production
1. **The sample responses are synthetic.** `apps/functions/pagasa-mobile/fixtures/`
   was written by hand from the documented shapes; the build environment could
   not reach PAGASA. Replace the three files with real saved responses and run
   `npm test` in `apps/functions`. A failing test means the parser needs
   adjusting.
2. **Station coordinates** in `stations.js` are approximate (`TODO verify`).
   They only affect the "X km away" figure and which station is "nearest".
3. **Try it on staging or with one tester first:** switch on, wait 5 minutes,
   and check `weather_pagasa/_status`, a `muni_*` document and the weather
   screen.

## Differences from the original brief
- Phones do not call PAGASA or keep an ETag disk cache; the server does both
  (the brief's optional "caching proxy", adopted from the start).
- The kill switch is a Firestore document, since the project has no Remote
  Config.
- Not built: the per-user mode override in Settings, the 24-hour station
  sparkline, the city outlook, in-app rain-map/video (they open externally),
  and push notifications for new PAGASA alerts.
