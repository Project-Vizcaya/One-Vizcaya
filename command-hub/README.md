# PDRRMO Command Hub (prototype)

The operators' Command Hub and the responders' site for Nueva Vizcaya, built
from `ONE-VIZCAYA-COMMAND-HUB-TRACKING-HANDOFF.md` (Phase 1, software only).
**Mock data only. Demo sign-in. Not for real emergencies.**

Full design notes: [`docs/4-app-and-website/command-hub.md`](../docs/4-app-and-website/command-hub.md).

| Who | Opens | Does |
|---|---|---|
| PDRRMO / EOC operator | `/hub` | Live map of all units, incidents, dispatch, hotline call log, replay, audit log |
| MDRRMO operator | `/hub` | The same, limited to their town |
| Responder crew | `/responder` (on a phone) | Start/End duty, status buttons, location sharing, assignment with the citizen's pin, Navigate |

## Run it

```bash
cd command-hub
npm install
cp .env.example .env.local     # then change the secrets
npm run dev                    # http://localhost:3100
```

Pick a demo account on the sign-in page. Open a responder account in a
second browser (or a phone) to see both sides at once.

Production-style: `npm run build && npm start` (needs `HUB_SESSION_SECRET`).

### Testing on phones
- **Location needs HTTPS.** Phones refuse location to a plain `http://` page
  (localhost is the only exception). Use `npx next dev -p 3100 --experimental-https`
  (accept the certificate warning on the phone), a tunnel, or deploy behind HTTPS.
- **Run ONE server process.** The prototype keeps everything in memory, so it
  must run as a single `next start` (a PC or small VM). Serverless hosting
  (e.g. Vercel) would split the data between instances. Data is lost on restart.
- Keep the responder page open while on duty: a web page can't report from the
  background. The screen is kept on automatically where the browser allows.

### Demo without driving
```bash
HUB_SIMULATOR_TOKEN=<from .env.local> npm run replay -- --unit u-nv-amb-01 --speed 10
# --offline 60   holds 60 s of fixes, then sends them in one batch (offline test)
```
The unit must be on duty (the five seeded units already are). Track:
`scripts/tracks/bayombong-to-solano.csv` (lat,lng,seconds).

### Hotline call log
`/hub/calls`. Type the practice number in **Caller's number**; save with
Ctrl+Enter. A call near an open incident (300 m / 30 min, or the same town
when there's no pin) is offered for attaching. The extra fields are in
`src/config/callForm.ts`; edit that list to match PDRRMO's paper form.

## Tests
```bash
npm test          # store rules: off-duty rejection, newer fix wins, role scoping, merge, ETA, IDs
npm run typecheck
```

## What is NOT here (by design)
- **The database.** Responders, equipment, certifications and barangays belong
  to the co-dev's PDRRMO Portal schema. `src/lib/store/types.ts` (`HubStore`)
  is the interface; `MemoryStore` is the stand-in. A Supabase implementation
  must keep the same rules (they are the tests in `store.test.ts`), as RLS.
- Real sign-in (Supabase Auth), telephony, call recording, in-app navigation,
  and background tracking (the native Flutter responder app).
