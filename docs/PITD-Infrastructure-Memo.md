# One Vizcaya — Infrastructure & Security Memo
### Prepared for PITD, Provincial Government of Nueva Vizcaya
### Re: "Enterprise-grade hosting/database (move off free tier)"

---

## 1. Executive summary

PITD's concern is valid and we share it: a government system must not run on a
free, unsupported tier. Our recommendation is **Path A — upgrade the existing
Firebase project to the paid Blaze plan and apply an enterprise-hardening
checklist.** This is the **lowest-risk, lowest-disruption** way to reach
enterprise-grade security **without migrating any data or rewriting the apps.**

**Key clarification for the committee:** "Firebase" is not a hobby/free product.
The **free *Spark* tier** is only the entry plan. The paid **Blaze** plan runs on
**Google Cloud Platform (GCP)** — the same infrastructure used by national
governments and Fortune-500 enterprises, certified under **ISO 27001 / 27017 /
27018, SOC 1/2/3, PCI-DSS**, with GCP IAM, encryption at rest and in transit,
and data-residency options. "Moving off the free tier" can therefore mean
**enabling the paid, hardened tier** — it does not require switching vendors.

We will still present the full alternatives (managed Postgres on GCP/AWS/Azure,
or a hybrid system-of-record) so the committee can choose, but those are
materially higher cost and effort and remove Firebase's managed realtime/offline
capabilities that the app relies on.

---

## 2. Path A — Firebase Blaze + enterprise hardening (recommended)

### 2.1 What changes
- **Plan:** Spark (free) → **Blaze (pay-as-you-go)**. Same project, same data,
  no migration. Blaze unlocks server-side scheduling, outbound networking,
  longer backups/retention, and higher quotas.
- **Effort:** Configuration and security-rules work only. **No data move, no app
  rewrite.** Estimated 1–2 weeks of hardening work.
- **Maintainability:** High — the team already operates this stack.

### 2.2 Hardening checklist (what "enterprise-grade" concretely means here)

| # | Control | Status today | Action |
|---|---|---|---|
| 1 | **App Check enforcement** (Play Integrity / DeviceCheck) on Firestore, Storage, Functions | Configured, **not enforced** | Turn on **Enforcement** so only the genuine, untampered app can call the backend |
| 2 | **Security Rules at the data layer** (RBAC: Barangay→Municipal→Provincial→Region II) | Partially enforced | Complete rules so every authority boundary is enforced in the database, not just the UI |
| 3 | **Audit logging** (who did what, when) | `audit_logs` collection exists | Write an immutable audit entry on every privileged action (approve, escalate, delete, role change) |
| 4 | **Automated backups** | None | Enable **Firestore Point-in-Time Recovery (PITR)** + a **scheduled daily export to a locked Cloud Storage bucket** |
| 5 | **Least-privilege IAM** | Default | Restrict GCP console/project access to named admins with 2FA; separate prod from dev |
| 6 | **Admin 2FA** | Phone OTP | Add TOTP/authenticator second factor for all admin accounts (Identity Platform) |
| 7 | **Monitoring & alerting** | Basic | Enable Cloud Monitoring alerts (error spikes, quota, anomalous reads/writes) + Crashlytics |
| 8 | **Data residency / DPA** | Default region | Confirm region, sign Google's **Data Processing Terms**, document the data flow for the NPC registration |
| 9 | **Secrets management** | Gitignored config | Move server secrets to **Secret Manager**; rotate the Maps/API keys and domain-restrict them |
| 10 | **Budget guardrails** | None | Set a **Cloud Billing budget + alerts** and per-day quota caps so cost can never run away |

### 2.3 Cost (Blaze pay-as-you-go, conservative estimates)

Infrastructure cost is driven by *activity*, not population (reads/writes/storage).
Figures below are from our detailed `COST.md` analysis.

| Scale | Active reporters/mo | Est. infra cost / month |
| :--- | :--- | :--- |
| **1 Municipality (pilot)** | ~900 | **≈ ₱0** (within free quotas even on Blaze) |
| **3 Municipalities** | ~2,300 | **≈ ₱50 – ₱150** |
| **Province-wide (normal)** | ~5,300 | **≈ ₱500** |
| **Province-wide (heavy + disaster buffer)** | ~15,900 | **≈ ₱3,000 – ₱4,500** |

**Optional add-ons:**
- **Backups (PITR + daily export):** a few ₱100s/month at province scale.
- **Google Cloud Support:** Standard ~US$29/mo (≈ ₱1,700); Enhanced for faster
  SLAs if the committee requires guaranteed response times.

**Bottom line:** even province-wide with backups and Standard support, total
infrastructure stays **well under ₱10,000/month** — a fraction of a single IT
staff line, for an enterprise-grade, audited, backed-up system.

---

## 3. Alternatives (for completeness — higher cost/effort)

| Path | What it is | Security | Cost (pilot → province) | Migration effort | Maintainability |
|---|---|---|---|---|---|
| **A. Blaze + hardening (recommended)** | Same stack, paid + hardened | Enterprise (GCP, certified) | **₱0 → <₱5k/mo** (+ optional support) | **Low** (config/rules, no data move) | **High** |
| B. Migrate to managed enterprise DB/hosting | e.g. GCP **Cloud SQL + Cloud Run**, AWS **RDS/Aurora + Cognito**, Azure **SQL + AD B2C** | Enterprise, but RBAC/realtime/offline must be rebuilt in a new backend | **₱3k–₱20k+/mo** + significant dev cost | **High** (rewrite data layer, realtime, offline — *months*) | Medium (more DevOps) |
| C. Hybrid | Keep Firebase for the app + **export to an enterprise system-of-record** (BigQuery / Cloud SQL) for archival, analytics, recordkeeping | Operational data hardened on Blaze; durable government copy elsewhere | Blaze + ~₱1k–5k/mo | **Medium** (add export pipeline) | Medium |

**Recommendation:** adopt **Path A now** (it directly satisfies "enterprise-grade,
not free tier" with minimal risk before re-presenting), and evaluate **Path C** as
the medium-term **government system-of-record** play — which also supports the
data-archival/retention requirement (account deletion → archived records).
Reserve **Path B** for *only if* the committee mandates a specific platform; it is
the most expensive and disruptive and removes Firebase's managed advantages.

---

## 4. How Path A closes the specific gaps PITD raised
- *"Not on a free tier"* → Blaze is the **paid, enterprise GCP tier**.
- *"Enterprise security for code/website/database"* → App Check enforcement,
  hardened security rules, IAM least-privilege, secrets management, admin 2FA.
- *"Integrity & accountability"* → immutable **audit logging** on every
  privileged action, enforced at the database layer.
- *"Resilience"* → **PITR + scheduled backups** and budget guardrails.

---

## 5. Proposed next steps
1. Committee approves **Path A** in principle.
2. Upgrade the project to **Blaze**; set billing budget + alerts.
3. Execute the §2.2 hardening checklist (1–2 weeks).
4. Complete **NPC registration** and designate the LGU **Data Protection
   Officer**, using the documented data flow.
5. Re-present with the hardening evidence (App Check enforced, rules coverage,
   audit log samples, backup schedule).

*Prepared by the Project: Vizcaya Team. Cost figures are conservative planning
estimates to be re-validated against live Google Cloud pricing before any
procurement decision.*
