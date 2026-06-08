# Privacy Policy — One Vizcaya

**Effective Date:** May 27, 2026
**App Version:** 1.1.10

---

## 1. Introduction

One Vizcaya ("the App") is a civic reporting platform developed for the citizens and Local Government Units (LGUs) of Nueva Vizcaya, Philippines. This Privacy Policy explains how we collect, use, store, and protect your personal data in accordance with the **Data Privacy Act of 2012 (Republic Act No. 10173)** and its Implementing Rules and Regulations.

By using One Vizcaya and completing the setup screen, you explicitly consent to this policy.

---

## 2. Data Controller

**Provincial Government of Nueva Vizcaya**
Capitol Compound, Bayombong, Nueva Vizcaya, Philippines
Contact: *[official LGU email — fill in before production launch]*

---

## 3. Data We Collect

| Data Type | Purpose | Basis |
|---|---|---|
| Full Name | Personalise your account and route reports | Consent |
| Mobile Number (via Firebase Auth) | Authentication | Legitimate interest |
| Municipality & Barangay | Route reports to the correct LGU | Consent |
| Problem Reports (text, photos, GPS) | Civic reporting | Consent |
| Device FCM Token | Push notifications | Consent |
| Privacy Consent Timestamp | Legal compliance | Legal obligation |
| Usage analytics (anonymised) | App improvement | Legitimate interest |

We do **not** collect national ID numbers, financial information, or biometric data.

---

## 4. Anonymous Reporting

You may submit reports anonymously. Anonymous reports exclude your name, phone number, and user ID from the report document. You will not receive status update notifications for anonymous reports.

---

## 5. How We Use Your Data

- Routing civic reports to the appropriate Municipal or Provincial LGU
- Sending status update notifications when your report changes status
- Displaying emergency contact information relevant to your municipality
- Delivering weather information and announcements for your area
- Aggregate, anonymised analytics for LGU planning

---

## 6. Data Sharing

Your data is shared only with:
- **Firebase (Google Cloud)** — authentication and database hosting (under Google's Data Processing Addendum)
- **OpenWeatherMap** — weather data retrieval (no personal data is shared)
- **Authorised LGU staff** — municipal and provincial administrators who review reports within your municipality

We do **not** sell your data to third parties.

---

## 7. Data Retention

| Data | Retention Period |
|---|---|
| Active reports | Until resolved or archived (12 months after submission) |
| Archived reports | Deleted or anonymised after 24 months |
| User profiles | Until account deletion request |
| Notification logs | 90 days |

Reports older than **12 months** are automatically archived by the system and no longer appear in active views. Reports older than **24 months** are automatically and permanently deleted — including their photo evidence — by a scheduled retention job.

---

## 8. Your Rights (RA 10173)

Under the Data Privacy Act of 2012, you have the right to:

1. **Access** — request a copy of your personal data we hold
2. **Correction** — update inaccurate or incomplete data
3. **Erasure / Blocking** — request deletion of your data where processing is no longer necessary
4. **Object** — object to processing based on legitimate interest
5. **Data Portability** — receive your data in a structured format
6. **Complaint** — lodge a complaint with the National Privacy Commission (NPC)

You can exercise these rights directly in the app: **Settings → Location & Privacy → Data Privacy Request** lets you file an access, correction, erasure, objection, portability, or complaint request, which is logged for the Data Protection Officer to act on. You may also download a structured copy of your data at any time via **Settings → Location & Privacy → Download My Data** (JSON or PDF). Alternatively, contact the LGU Data Protection Officer at the address above.

---

## 9. Security

- All data is transmitted over HTTPS/TLS
- Firebase Security Rules restrict read/write access to authenticated users and authorised admins
- Firebase App Check is enabled to block unauthorised API calls
- Passwords are not stored (the App uses phone-number OTP via Firebase Auth)
- Sensitive fields (FCM tokens, phone numbers) are not exposed in client-side queries outside the user's own document
- **Photos are stripped of EXIF metadata** (hidden GPS, camera serial, original timestamp) before upload, so no incidental personal data is stored in images
- **Account deletion is complete:** deleting your account also removes your uploaded photos from storage — no orphaned media is left behind

---

## 10. Children

One Vizcaya is not directed to children under 18. We do not knowingly collect data from minors. If you believe a minor has provided data, contact us for immediate deletion.

---

## 11. Changes to This Policy

We may update this policy when the app is updated. The current version will always be available within the app and in this file. Continued use of the app after changes constitutes acceptance of the updated policy.

---

## 12. Contact

For privacy concerns or data subject requests:

**Data Protection Officer**
Provincial Government of Nueva Vizcaya
Capitol Compound, Bayombong, 3700 Nueva Vizcaya
*[dpo@nueva-vizcaya.gov.ph — update before production launch]*

**National Privacy Commission (NPC)**
5th Floor Delegation Building, PICC Complex, Pasay City
privacy.gov.ph | 1-866-NPC-9993
