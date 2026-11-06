# Staging load test

Measures what the emulator suite (`tests/emulator/load`) cannot measure:
- real Firestore write latency;
- real Cloud Function trigger latency in the deployed region;
- the public `health` endpoint.

**It refuses to run against the production project `one-vizcaya-app`.** Run it
against a separate staging project that has the same rules, indexes and
functions deployed.

## Safety
- Writes only synthetic users `loadtest_<run>_<n>` and one report each,
  tagged `loadTest: <run>`, in the municipality "Load Test". Deletes them all
  afterwards unless you pass `--keep`.
- Never writes broadcasts or announcements, so no phone receives a push.
- Uses the Admin SDK, which bypasses security rules. Rules evaluation time is
  not measured here; the emulator suite checks the rules themselves.
- Each cleanup deletion is logged as "unattributed" in the staging audit log.
  That is expected.

## Run
```
cd tests/staging-load && npm install
GOOGLE_APPLICATION_CREDENTIALS=/path/to/staging-service-account.json \
  node run.js --project <staging-project-id> --reports 300 --concurrency 25
```

| Option | Default | Meaning |
|---|---|---|
| `--reports` | 300 | Synthetic reports created |
| `--concurrency` | 25 | Writes in flight at once |
| `--region` | us-central1 | Functions region, for the health URL |
| `--health` | 30 | Number of `GET /health` calls (0 to skip) |
| `--skip-triggers` | off | Skip the trigger-latency checks |
| `--keep` | off | Keep the synthetic data |

## Output
For each step, p50 / p95 / max in milliseconds:
- **Report create:** Firestore write latency.
- **Create trigger:** time until `trackSubReportRate` has run.
- **Update trigger:** time until `stampReportMilestones` stamps `acknowledgedAt`.
- **GET /health:** response time, plus a count of status codes.

## Status
The script has been checked against the local emulator, where 200 reports wrote
at p50 56 ms and p95 120 ms. **It has not been run against a real project**:
that needs a staging project and its credentials, which this repository does not
hold.
