# Translation review — safety copy (P1, PDRRMO §11)

**Status: awaiting a native speaker.** These strings were written by the
development team, not by native Tagalog or Ilocano speakers. Because they tell
residents what to do in an emergency, they must be checked before any pilot.

**How to review:** for each row, read the English source and the current
translation. If it is correct and natural, tick **OK**. If not, write the
corrected text in **Correction**. Plain, everyday wording is better than formal
wording — the reader may be frightened or in a hurry.

Please confirm in particular that each translation keeps all three points of the
English: (1) One Vizcaya does **not replace** 911 / the PDRRMO hotline / radio /
barangay officials, (2) in a real emergency **still call them**, (3) a report
**does not guarantee an immediate response**.

Reviewer name: ____________________  Date: __________

---

## A. Already translated — needs checking

Shown on the **Report a Problem** screen, inside the submission card, above the
Submit button. Source: `apps/mobile/lib/core/l10n/app_strings.dart`.

### A1. `notReplacementTitle` (heading of the notice)

| Language | Current text | OK | Correction |
|---|---|:-:|---|
| English (source) | This is an additional channel | — | — |
| Tagalog | Karagdagang paraan lamang ito | ☐ | |
| Ilocano | Kanayonan a pamay-an laeng daytoy | ☐ | |

### A2. `notReplacementBody` (body of the notice)

| Language | Current text | OK | Correction |
|---|---|:-:|---|
| English (source) | One Vizcaya does not replace 911, the PDRRMO hotline, radio, or your barangay officials. In a real emergency, still call them — a report here does not guarantee an immediate response. | — | — |
| Tagalog | Hindi kapalit ang One Vizcaya ng 911, ng PDRRMO hotline, ng radyo, o ng mga opisyal ng barangay. Sa tunay na emergency, tumawag pa rin sa kanila — hindi garantisado ang agarang tugon sa ulat dito. | ☐ | |
| Ilocano | Saan a kasukat ti One Vizcaya ti 911, ti PDRRMO hotline, ti radio wenno dagiti opisyal ti barangay. Iti pudno nga emergency, awagan latta ida — saan a garantisado ti dagus a sungbat ti report ditoy. | ☐ | |

> The Ilocano was the least certain of all. Please check it closely.

### A5. `broadcastAlert` / `broadcastAlertUrgent` (inbox — label above a re-opened alert)

Shown when a resident taps an alert in their notifications inbox. Keep it short.

| Language | Current text | OK | Correction |
|---|---|:-:|---|
| English (source) | Alert · Urgent alert | — | — |
| Tagalog | Alerto · Apurahang alerto | ☐ | |
| Ilocano | Alerto · Apuraen nga alerto | ☐ | |

> Both "urgent" translations were written by the developers and are uncertain.

### A6. Proxy reporting (Report screen — filing for someone else)

Shown when a resident or official files a report for a person without a phone.

| Key | English (source) | Tagalog | Ilocano | OK | Correction |
|---|---|---|---|:-:|---|
| `proxyToggle` | I'm filing this for someone else | Iniuulat ko ito para sa ibang tao | Ireportko daytoy para iti sabali a tao | ☐ | |
| `proxyHint` | For a resident without a phone. Ask their permission first. Updates on this report will come to you. | Para sa residenteng walang telepono. Humingi muna ng pahintulot sa kanila. Sa iyo darating ang mga update sa ulat na ito. | Para iti residente nga awan ti teleponona. Dumawat pay ti pammalubos kadakuada. Kenka umay dagiti update daytoy a report. | ☐ | |
| `proxyName` | Their full name | Buong pangalan nila | Naan-anay a naganda | ☐ | |
| `proxyContact` | How to reach them (optional) | Paano sila makakausap (opsyonal) | Kasano a makontak ida (saan a nasken) | ☐ | |
| `proxyRelationship` | Your relationship to them (optional) | Kaugnayan mo sa kanila (opsyonal) | Relasionmo kadakuada (saan a nasken) | ☐ | |
| `proxyNotAllowed` | Only officials and residents with certified residency can file for someone else. | Ang mga opisyal at residenteng may sertipikadong paninirahan lamang ang maaaring mag-ulat para sa iba. | Dagiti opisyal ken residente nga addaan sertipikado a panagnaed laeng ti mabalin nga agreport para iti sabali. | ☐ | |

---

## B. English only — needs translating

These citizen-facing messages were added in the PDRRMO work and currently
appear **in English regardless of the app's language setting**. Please provide
Tagalog and Ilocano. (Once supplied, the developers will move them into
`app_strings.dart`.)

| # | Where it appears | English (source) | Tagalog | Ilocano |
|---|---|---|---|---|
| B1 | My Reports — a report the LGU closed without action (heading) | Closed without action: *[reason category]* | | |
| B2 | My Reports — same (body) | The LGU reviewed this report and closed it without action. If you believe this is a mistake, contact your LGU or file a new report with more detail. | | |
| B3 | Reason categories shown in B1 | False report · Duplicate · Incomplete · Could not be verified | | |
| B4 | Report screen — the connection dropped while sending (title) | Saved — will send automatically | | |
| B5 | Same (body) | The connection dropped before your report could be sent. It is saved on this phone and will be sent automatically when you are back online. In an emergency, call 911 or the PDRRMO hotline. | | |
| B6 | Report screen — saved while offline (short message) | Report saved. It will be sent automatically when you're back online. | | |
| B7 | Notification when a saved report is delivered | Your saved report was sent. · *N* saved reports were sent. | | |
| B8 | Home screen banner | *N* report(s) saved — will be sent automatically when online | | |
| B9 | Push notification when a report is closed without action | *[Category]* was closed without action (*[reason category]*). If you believe this is a mistake, contact your LGU. | | |

The PAGASA weather section is also English-only. Its wording mirrors PAGASA's
own English publications, so translating it is lower priority, but the
coverage line should be translated:

| # | Where it appears | English (source) | Tagalog | Ilocano |
|---|---|---|---|---|
| B10 | Weather screen, PAGASA section | Provincial forecast covering Nueva Vizcaya. It is not a reading from a weather station in *[town]*. | | |
| B11 | Weather screen, when PAGASA data cannot be loaded | Official PAGASA data is temporarily unavailable. | | |

---

*Return the completed sheet to the development team. Tracked in issue #134.*
