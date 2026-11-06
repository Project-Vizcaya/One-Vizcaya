# Load and failover tests (emulator only)

```
cd tests/emulator && npm run test:load
```

Sizes can be changed with `LOAD_USERS`, `LOAD_REPORTS` and `LOAD_OVERDUE`.

**These figures come from the local Firestore emulator, not production.** The
emulator runs as one process, has no network round-trips and does not enforce
Firestore's production limits. FCM is stubbed, so push throughput is not
measured. The tests show that our code stays **correct** at provincial volumes
and under injected failures. They are not a capacity or latency guarantee.

## What is covered

| Scenario | Checks |
|---|---|
| Broadcast to 5,000 phones | Sent in batches of 500 (10 calls); every phone counted in `delivery` |
| 300 citizens submit at once | All pass `firestore.rules` |
| 2,000 overdue reports | All escalated and audited in **one** run, once only; a second run adds nothing |
| FCM completely down | Broadcast records 0 delivered / all failed; **no push token is deleted** |
| FCM fails one batch | The other batches still go out; only that batch counts as failed |
| Firestore erroring | `health` answers 503 `down` |
| Firestore hanging | `health` gives up after about 5 s with 503 instead of hanging |
| A scheduled job throws | Its heartbeat records the error; `health` reports it `failing` with 503 |

## Results (emulator, 4 November 2026)

| Scenario | Time |
|---|---|
| Broadcast fan-out, 5,000 users | ~0.6 s |
| 300 concurrent report creates through the rules | ~5 s |
| Escalation of 2,000 overdue reports | ~1 s |

## Change made because of these tests

The first run showed that overdue escalation handled only **200 reports per
15-minute run**, so a 2,000-report backlog would have taken about 2.5 hours. It
also sent one push per report, which would bury admins during a disaster.
Escalation now groups each run's overdue reports by town:

- up to 3 in a town get one push each, linked to the report;
- more than 3 get one summary push for that town.

Every report is still stamped and audited. The per-run limit is now 5,000.

## Not covered

- Production capacity, cold starts, region failover, FCM delivery rates.
- Mobile offline behaviour. That is covered separately by the Flutter tests
  for the offline queue and the report submitter (`apps/mobile/test`).
