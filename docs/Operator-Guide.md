# One Vizcaya — Operator Guide

For the PDRRMO, MDRRMO and LGU staff who run the **admin console**. For
building and deploying the apps, see
[`Computer-Shop-Runbook.md`](Computer-Shop-Runbook.md).

> **One Vizcaya is an additional channel.** It does not replace 911, the
> PDRRMO hotline, radio or barangay officials. For a life-threatening warning,
> use those channels as well, and do not wait for an app alert to be approved.

---

## 1. Who can do what

| Role | Scope |
|---|---|
| Barangay admin | Reports from their own barangay |
| Municipal admin | Their own town's reports, alerts and announcements |
| Provincial admin | Everything province-wide |
| Super admin | Approves role requests; same alert rules as everyone else |

Roles are **requested and approved**, never self-assigned. Ask a super admin.

**Keep at least two admins reachable per town.** Urgent alerts need a second
admin's approval (see §3). A town with one admin has to rely on a provincial
admin to approve its urgent alerts.

---

## 2. Handling a report

Open **Reports**, then click a report.

1. **Update the status** as work progresses: *Acknowledged → Under Review →
   Ongoing → Solved*. The resident is notified at each step. A report can be
   marked **Solved only from Ongoing**, and you must write what was done (at
   least 10 characters). Solved cannot be applied in bulk.
2. **Route** it to another tier (barangay / municipal / provincial / Region II)
   if it is beyond your office. Escalating to the province needs the
   municipal admin's approval.
3. **Refer to Office.** Record which office the report was handed to, for
   example "MDRRMO Bambang" or "BFP Solano", with a contact and a note.
   - **This does not notify the office.** Call or message them as usual. The
     referral is a record of the hand-off.
   - You can refer it to a different office later. The audit log keeps every
     referral.
4. **Assign a responder** from the directory if one person is handling it.
5. **Close without action** only for false, duplicate, incomplete or
   unverifiable reports. A reason is required, and the resident sees the
   category. A closed report can be re-opened.

**Duplicates.** A report's detail lists **likely duplicates**: other open
reports of the same category in the same town, filed within 48 hours, in the
same barangay or within about 500 m. Nothing is merged automatically. If one
really is the same incident, click **Close it as a duplicate of this report**.
It is closed without action as a duplicate, linked to this report, and its
reporter is told. It can be re-opened. The detail also lists reports already
linked as duplicates.

**Filing for a resident without a phone.** On **Reports**, click **File for a
resident**. Enter their name and how to reach them, and ask their permission
first. The report is filed under your account, so status updates come to you
to pass on. Barangay and municipal admins can file only in their own area. In
the mobile app, use *Report a Problem → I'm filing this for someone else*.

**Deleting** a report is rare, and only for data that must not be kept. It asks
for a reason, and the audit log records who deleted it and why. Prefer *Close
without action*.

Every one of these actions is recorded in **Audit Log** with the admin and the
time.

### Response times and SLA targets

The console stamps when each report was first acknowledged, first referred and
resolved. **Analytics → Response timeline** shows the averages. Reports filed
before this feature existed have no timings.

**Analytics → SLA targets** sets how many hours a report may stay open by
priority. They default to Critical 2 h · High 24 h · Medium 72 h · Low 168 h.
They are labelled **provisional** until a provincial admin clicks **Confirm as
approved targets**. The PDRRMO should agree the numbers first.

When a report passes its target, the responsible admins get a push:

- one push per report when a town has up to 3 newly overdue reports in a
  15-minute check;
- one **summary** push for the town ("12 reports overdue in Bambang") when it
  has more.

Critical and high-priority reports also alert provincial admins.

---

## 3. Sending alerts

Go to **Broadcasts**.

| Alert | What happens |
|---|---|
| Routine, one town | Sent immediately |
| **Urgent** (sound, full-screen alert) | Needs a **second admin's** approval |
| **Province-wide** | Needs a **second provincial admin's** approval |
| Automated weather alert | Drafted by the system; needs one in-scope admin's approval |

**Sending one that needs approval.** Compose it and click **Request Approval**.
Nothing goes out yet. The other in-scope admins get an "Approval needed" push.

**Approving.** The alert appears under **Alerts awaiting approval**.
- Read it, and check PAGASA advisories for weather alerts.
- Click **Approve…** then **Confirm and send**.
- You cannot approve an alert you proposed. You can **Withdraw** it instead.

**Expiry.** A draft expires after 6 hours, because conditions change. After
that it can only be dismissed.

**After sending.** Under **Recently sent**, each alert shows how many phones
Firebase **accepted** it for and how many failed. "Accepted" does not prove
that a phone displayed it. A phone that is off gets it when it reconnects, if
that happens soon enough.

Residents can **re-read** the 20 most recent alerts for their town and the
province in the app's notifications inbox.

---

## 4. Weather

The **Weather** page shows PAGASA's published forecast for Nueva Vizcaya,
labelled as PAGASA's. It is a **provincial** forecast, not a reading from a
station in each town. Third-party forecast data (OpenWeather, Windy) is labelled
as third-party and is used only to **draft** alerts for an admin to review.

If PAGASA data cannot be loaded, the page says so. It does not show old data as
current.

---

## 5. Is the system working?

The system has a public status check:

```
https://us-central1-one-vizcaya-app.cloudfunctions.net/health
```

It answers **200** when the database is reachable and every scheduled job (weather
watch, overdue escalation, retention clean-up and so on) has run on time. It
answers **503** when something is wrong, and the response names the part.

| State | Meaning |
|---|---|
| `ok` | Running normally |
| `stale` | The job has missed at least one run |
| `failing` | The job's last run raised an error |
| `unknown` | The job has not run yet since deployment (normal for daily jobs on day one) |
| `down` | The database cannot be reached |

**Set up an alert (once, by the technical administrator).** Without this,
nobody is told when the service stops.

1. In Google Cloud Console for project `one-vizcaya-app`, open
   **Monitoring → Uptime checks → Create uptime check**.
2. Protocol **HTTPS**, resource type **URL**, hostname
   `us-central1-one-vizcaya-app.cloudfunctions.net`, path `/health`.
3. Check every **5 minutes**. Response validation: status code **200**.
4. Create an **alert policy** that emails and/or texts the PDRRMO duty officer
   and the technical administrator.

**When it alerts:**

- Tell your operators to rely on **radio, the hotline and barangay channels**
  until it is fixed.
- The technical administrator reads the function logs in Firebase Console →
  Functions → Logs. The `health` response says which job or check failed.
- Residents' phones keep reports they could not send and send them
  automatically when the service is back. Nothing needs to be re-entered.

---

## 6. Deploying this release (technical administrator)

On top of the usual steps in the runbook (§6):

1. `firebase deploy --only firestore:rules,firestore:indexes` — the rules
   changed, and two `broadcasts` indexes were added for the resident inbox.
   Wait until the indexes finish building (Firebase Console → Firestore →
   Indexes).
2. `firebase deploy --only functions` — new functions: `health`,
   `proposeAdminAlert`, `auditReportReferral`.
3. Deploy the website (runbook §5), and ship a new mobile build for the resident
   inbox and in-app alert fixes.
4. Set up the uptime check in §5.
5. Ask the PDRRMO to confirm the SLA targets (§2).
6. Make sure every town has at least two admins (§1).

**Before deploying, run the tests:**

```
cd apps/functions && npm test            # unit tests
cd tests/emulator && npm test            # rules + function integration (Java 11+)
cd tests/emulator && npm run test:load   # load/failover, emulator only
cd apps/mobile && flutter test
```

---

## 7. Known limits

- Recording a referral does not notify the office.
- Load testing has been done on the local emulator only
  ([`tests/emulator/load/README.md`](../tests/emulator/load/README.md)). A staging
  load test is ready but has not been run: create a staging Firebase project,
  deploy to it, and follow [`tests/staging-load/README.md`](../tests/staging-load/README.md).
- The Tagalog and Ilocano safety wording still awaits a native speaker's review
  ([`translation-review.md`](translation-review.md)).
