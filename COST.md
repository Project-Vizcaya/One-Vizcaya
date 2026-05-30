# 💰 Cost & Sustainability Plan

This document estimates the real operating cost of running **One Vizcaya** on Firebase at three deployment scales: a single municipality (pilot), three municipalities (cluster rollout), and the full province. Figures use **Firebase Blaze (pay-as-you-go) standard pricing as of 2026** and are intentionally **conservative** — real costs are likely to be lower because of caching, offline persistence, and the Firebase free tier that applies to every project.

> **Bottom line up front:** The pilot runs at effectively **₱0/month**. Even a province-wide rollout is estimated at well under **₱5,000/month** — far cheaper than a single dedicated staff line or a traditional government IT contract.

---

## 1. Reference Pricing (Firebase Blaze, 2026)

| Resource | Free tier (per project, daily/monthly) | Cost beyond free tier |
| --- | --- | --- |
| Firestore document reads | 50,000 / day | $0.06 per 100,000 (standard region) |
| Firestore document writes | 20,000 / day | $0.18 per 100,000 |
| Firestore document deletes | 20,000 / day | $0.02 per 100,000 |
| Firestore storage | 1 GiB | $0.18 per GB / month |
| Cloud Storage (photos) | 5 GB stored | $0.026 per GB stored |
| Cloud Storage download | 1 GB / day | $0.12 per GB downloaded |
| Cloud Functions | 2,000,000 invocations / month | $0.40 per million |
| Cloud Messaging (push notifications) | Unlimited | **Free** |
| Analytics / Crashlytics | Unlimited | **Free** |

**Exchange rate used:** US $1 ≈ ₱58 (round to ₱60 for safe budgeting).

These numbers are public and verifiable at the [official Firestore pricing page](https://firebase.google.com/pricing). They will be re-checked before any contract is signed.

---

## 2. How Cost Is Actually Driven

A government reader should understand one key point: **Firebase cost is driven by activity, not population.** A municipality of 100,000 people where 500 file a report per month costs the same as if those 500 lived anywhere. We pay for *reads, writes, and stored photos* — not for registered residents.

Our cost-control design choices, already in the roadmap:

- **Offline persistence + local drafting** → fewer redundant reads.
- **Image compression before upload** (`flutter_image_compress`) → smaller storage and download bills.
- **User-scoped sub-collections** (`users/{uid}/reports`) → efficient, targeted queries instead of full-collection scans.
- **Pagination on the admin dashboard** → officers load 20 reports at a time, not thousands.
- **12-month auto-archive of resolved reports** → storage stays flat over time.

---

## 3. Usage Assumptions

To estimate honestly, we model a **realistic active reporting population**, not total residents. Government experience shows only a small fraction of citizens file a report in any given month.

| Assumption | Value |
| --- | --- |
| Reports filed per active user per month | ~2 |
| Photos per report | ~2 (compressed to ~300 KB each) |
| Reads generated per report (citizen views + admin triage + status checks) | ~50 |
| Writes per report (submit + status updates) | ~5 |
| % of population that files a report in a month | ~1% (conservative; real civic-app rates are often lower) |

---

## 4. Scenario A — One Municipality (Pilot: Bambang)

**Population basis:** Bambang ≈ 90,000 residents.
**Active reporters/month (1%):** ≈ 900 users → ≈ 1,800 reports/month.

| Resource | Monthly volume | Free tier covers? | Estimated charge |
| --- | --- | --- | --- |
| Reads | 1,800 × 50 = 90,000/mo (~3,000/day) | ✅ Yes (50k/day free) | ₱0 |
| Writes | 1,800 × 5 = 9,000/mo (~300/day) | ✅ Yes (20k/day free) | ₱0 |
| Photo storage | 1,800 × 2 × 0.3 MB ≈ 1.1 GB | ⚠️ Slightly over 5 GB only after months of accumulation | ~₱0–₱5 |
| Photo downloads | ~1.5 GB/mo | ✅ Mostly free | ~₱0–₱10 |
| Cloud Functions (disaster alerts) | <10,000/mo | ✅ Yes (2M free) | ₱0 |
| Push notifications | Unlimited | ✅ Free | ₱0 |

### 🟢 Pilot total: **≈ ₱0 / month** (effectively free under Blaze)

The pilot fits comfortably inside the Firebase free quotas. The only reason to enable Blaze at all is to allow Cloud Functions and to remove daily caps as a safety margin. **This is the number to lead with in the meeting: a 3-month pilot in one municipality costs the LGU essentially nothing.**

---

## 5. Scenario B — Three Municipalities (Cluster Rollout)

**Example cluster:** Bambang + Solano + Bayombong ≈ 230,000 residents.
**Active reporters/month (1%):** ≈ 2,300 users → ≈ 4,600 reports/month.

| Resource | Monthly volume | Charge basis | Estimated charge |
| --- | --- | --- | --- |
| Reads | 4,600 × 50 = 230,000/mo (~7,700/day) | Within 50k/day free | ₱0 |
| Writes | 4,600 × 5 = 23,000/mo (~770/day) | Within 20k/day free | ₱0 |
| Photo storage | accumulating ~3 GB/mo, ~15–25 GB after 6 mo | ~20 GB billable × $0.026 | ~₱30 |
| Photo downloads | ~4 GB/mo | ~3 GB billable × $0.12 | ~₱20 |
| Cloud Functions | ~25,000/mo | Within 2M free | ₱0 |
| Push notifications | Unlimited | Free | ₱0 |

### 🟡 Three-municipality total: **≈ ₱50–₱150 / month**

Still trivially cheap. The growth is almost entirely in **stored photos**, which is the one line that accumulates over time — and which the 12-month archive policy keeps in check.

---

## 6. Scenario C — Province-Wide (All of Nueva Vizcaya)

**Population basis:** ≈ 530,106 residents (15 municipalities).
**Active reporters/month (1%):** ≈ 5,300 users → ≈ 10,600 reports/month.
**Stress-test (3% active):** ≈ 15,900 users → ≈ 31,800 reports/month.

| Resource | Volume @ 1% | Volume @ 3% (stress) | Estimated charge (stress) |
| --- | --- | --- | --- |
| Reads | 530,000/mo (~17.7k/day) | 1.6M/mo (~53k/day) | ~₱30 (slightly over daily free) |
| Writes | 53,000/mo (~1.8k/day) | 159,000/mo (~5.3k/day) | ₱0 (under 20k/day) |
| Photo storage | grows ~6 GB/mo | grows ~19 GB/mo; ~100+ GB/yr | ~100 GB × $0.026 ≈ ₱155/mo |
| Photo downloads | ~10 GB/mo | ~30 GB/mo | ~29 GB × $0.12 ≈ ₱200/mo |
| Cloud Functions | ~55,000/mo | ~160,000/mo | ₱0 (under 2M free) |
| Push notifications | Unlimited | Unlimited | Free |
| **Headroom / safety buffer** | — | — | +₱1,000–₱2,000 |

### 🔴 Province-wide total: **≈ ₱500 / month (normal) to ₱3,000–₱4,500 / month (heavy usage + buffer)**

Even at triple the expected adoption and with a generous safety buffer for spikes during a typhoon or disaster event, the full provincial system is estimated **under ₱5,000/month**. For comparison, that is a fraction of one staff member's monthly salary, and it serves all 15 municipalities at once.

---

## 7. Summary Table

| Scale | Active reporters/mo | Reports/mo | Estimated monthly cost |
| --- | --- | --- | --- |
| **1 Municipality (Pilot)** | ~900 | ~1,800 | **≈ ₱0** |
| **3 Municipalities** | ~2,300 | ~4,600 | **≈ ₱50–₱150** |
| **Province-wide (normal)** | ~5,300 | ~10,600 | **≈ ₱500** |
| **Province-wide (stress + buffer)** | ~15,900 | ~31,800 | **≈ ₱3,000–₱4,500** |

---

## 8. What Could Push Costs Higher (Honest Risks)

We disclose these so there are no surprises:

1. **Disaster spikes.** During a major typhoon or landslide event, reads and uploads can surge for a few days. The buffer above accounts for this; it is temporary, not a permanent cost.
2. **Phone-based SMS authentication.** If SMS OTP login is enabled, each SMS costs ~$0.01–$0.06. We recommend **email/Google sign-in for citizens** to avoid this entirely, reserving SMS only for the future accessibility fallback.
3. **Poorly optimized future code.** Adding "live" real-time listeners carelessly can cause read amplification. Our BLoC architecture and pagination guard against this; any future developer should follow the same patterns.
4. **Not archiving old data.** If the 12-month archive policy is dropped, storage grows without bound. It must be kept.

---

## 9. Who Pays and Who Owns It (Sustainability & Handover)

This system is **not dependent on its original developer**.

- **Source code ownership:** The full repository and documentation are turned over to the LGU. The LGU owns the code outright.
- **Billing account:** Created under the LGU / Provincial IT Office's own Google Cloud billing, so the province controls and sees every peso of spend directly.
- **Maintenance:** During the pilot, **two LGU IT staff will be trained** to deploy, monitor, and maintain the system, so it outlives any single person's involvement.
- **Technology choice:** Flutter and Firebase were chosen precisely because they are mainstream, well-documented, and maintainable by any competent developer the LGU hires in the future — no vendor lock-in to a custom platform.
- **Cost monitoring:** Firebase **budget alerts** will be configured to email the IT Office if spending approaches a set monthly cap, so there can never be a runaway bill.

---

*Figures are estimates for planning purposes and will be re-validated against live Firebase pricing before any procurement decision. Prepared by Aaron Anthony A. Gano II, BS Computer Science (Robotics), Nueva Vizcaya State University.*
