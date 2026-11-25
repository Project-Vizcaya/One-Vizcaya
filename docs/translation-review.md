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

### A3. `navReport` (bottom navigation tab label — keep it to one short word)

Added on the experimental UI branch. Shown under the camera icon in the
home screen's bottom bar; it opens Report a Problem.

| Language | Current text | OK | Correction |
|---|---|:-:|---|
| English (source) | Report | — | — |
| Tagalog | Mag-ulat | ☐ | |
| Ilocano | Ireport | ☐ | |

### A4. `sosNotACall` (SOS screen — shown while an emergency beacon is active)

Safety-critical: read under stress. It must keep both points of the English:
(1) the alert shares location but **is not a phone call**, (2) **also call**
the PDRRMO hotline or 911 if able.

| Language | Current text | OK | Correction |
|---|---|:-:|---|
| English (source) | This alert shares your location but is not a phone call. If you can, also call the PDRRMO hotline or 911. | — | — |
| Tagalog | Ibinabahagi ng alertong ito ang iyong lokasyon pero hindi ito tawag sa telepono. Kung kaya mo, tumawag din sa PDRRMO hotline o sa 911. | ☐ | |
| Ilocano | Ibingay daytoy nga alerto ti lokasionmo ngem saan nga awag iti telepono. No kabaelam, umawag met iti PDRRMO hotline wenno iti 911. | ☐ | |

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

### A7. Recent earthquakes (Emergency Contacts screen)

| Key | English (source) | Tagalog | Ilocano | OK | Correction |
|---|---|---|---|:-:|---|
| `recentQuakes` | Recent earthquakes near Nueva Vizcaya | Mga kamakailang lindol malapit sa Nueva Vizcaya | Dagiti kabarbaro a gingined iti asideg ti Nueva Vizcaya | ☐ | |
| `kmFromProvince` | km from the province | km mula sa probinsya | km manipud iti probinsia | ☐ | |
| `quakeSourceNote` | PHIVOLCS is the official source for Philippine earthquakes. USGS readings are international and shown only when PHIVOLCS has no report. | Ang PHIVOLCS ang opisyal na pinagmumulan ng impormasyon sa lindol sa Pilipinas. Ang USGS ay pandaigdigan at ipinapakita lamang kung walang ulat ang PHIVOLCS. | Ti PHIVOLCS ti opisial a pagtaudan ti impormasion maipapan iti gingined ditoy Filipinas. Ti USGS ket internasional ken maipakita laeng no awan ti report ti PHIVOLCS. | ☐ | |

### A8. Official hazard links, ZIP code, DPWH flood control (Emergency Contacts, town info sheet)

| Key | English (source) | Tagalog | Ilocano | OK | Correction |
|---|---|---|---|:-:|---|
| `officialHazardServices` | Official hazard services | Mga opisyal na serbisyo sa panganib | Dagiti opisial a serbisio maipapan iti peggad | ☐ | |
| `floodControlTitle` | Flood-control projects (DPWH) | Mga proyektong flood control (DPWH) | Dagiti proyekto a flood control (DPWH) | ☐ | |
| `floodControlNote` | From DPWH records as published in August 2025, through BetterGov.ph. Amounts are contract costs. Ask your DPWH district office or barangay for updates. | Mula sa mga rekord ng DPWH na inilathala noong Agosto 2025, sa pamamagitan ng BetterGov.ph. Ang mga halaga ay halaga ng kontrata. Magtanong sa inyong DPWH district office o barangay para sa mga update. | Manipud kadagiti rekord ti DPWH a naipablaak idi Agosto 2025, babaen ti BetterGov.ph. Dagiti bilang ket gatad ti kontrata. Damagenyo iti DPWH district office wenno barangay para kadagiti update. | ☐ | |
| `floodControlNone` | No DPWH flood-control projects recorded for this town in 2021–2024. | Walang naitalang proyektong flood control ng DPWH sa bayang ito noong 2021–2024. | Awan ti nairekord a proyekto a flood control ti DPWH iti daytoy nga ili idi 2021–2024. | ☐ | |
| `contractor` / `started` / `completed` | Contractor / Started / Completed | Kontratista / Sinimulan / Natapos | Kontratista / Nangrugi / Nalpas | ☐ | |

### A9. Call first, PDRRMO response (Report a Problem, report card)

| Key | English (source) | Tagalog | Ilocano | OK | Correction |
|---|---|---|---|:-:|---|
| `callFirstTitle` | Emergency? Call first. | Emergency? Tumawag muna. | Emergency? Umuna ti agtawag. | ☐ | |
| `callFirstBody` | If a life or property is in danger right now, call. You can report here afterwards. | Kung may buhay o ari-ariang nasa panganib ngayon, tumawag. Maaari kang mag-ulat dito pagkatapos. | No adda biag wenno sanikua a peligro ita, agtawag. Mabalinmo ti agreport ditoy kalpasanna. | ☐ | |
| `callPdrrmo / call911` | Call PDRRMO / Call 911 | Tawagan ang PDRRMO / Tumawag sa 911 | Tawagan ti PDRRMO / Tawagan ti 911 | ☐ | |
| `hubTitle` | PDRRMO response | Tugon ng PDRRMO | Sungbat ti PDRRMO | ☐ | |
| `hubStage_*` | Received / Validated / Responder assigned / On the way / On scene / Completed | Natanggap / Napatunayan / May nakatalagang responder / Papunta na / Nasa lugar na / Tapos na | Naawat / Napaneknekan / Adda naitudingan a responder / Agturturong / Adda iti lugar / Nalpasen | ☐ | |
| `hubEta / hubEtaSoon` | About {lo} to {hi} minutes / Less than 5 minutes | Mga {lo} hanggang {hi} minuto / Wala pang 5 minuto | Agarup {lo} agingga {hi} a minuto / Kurang a 5 a minuto | ☐ | |
| `hubAgency` | Responding agency | Tumutugong ahensya | Ahensia a sumungbat | ☐ | |
| `hubPrivacyNote` | For the responders' safety, their exact location is not shown. | Para sa kaligtasan ng mga responder, hindi ipinapakita ang eksaktong lokasyon nila. | Para iti talged dagiti responder, saan a maipakita ti eksakto a lokasionda. | ☐ | |

### A10. Announcement card labels (home screen)

| Key | English (source) | Tagalog | Ilocano | OK | Correction |
|---|---|---|---|:-:|---|
| `annNew` | NEW | BAGO | BARO | ☐ | |
| `annOfficial` | OFFICIAL ANNOUNCEMENT | OPISYAL NA ANUNSYO | OPISIAL NGA ANUNSYO | ☐ | |
| `annProvincial` | PROVINCIAL ANNOUNCEMENT | ANUNSYO NG LALAWIGAN | ANUNSYO TI PROBINSIA | ☐ | |

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

## C. Post Maker caption phrases (web console)

Fixed phrases the console adds to social media captions. Source:
`apps/web/src/lib/postCaption.ts`.

| Key | English (source) | Tagalog | Ilocano | OK | Correction |
|---|---|---|---|:-:|---|
| C1 `details` | For details, contact | Para sa detalye, makipag-ugnayan sa | Para kadagiti detalye, kontaken ti | ☐ | |
| C2 `hotline` | In an emergency, call | Sa emergency, tumawag sa | No adda emergency, tawagan ti | ☐ | |
| C3 `share` | Please share with your family and neighbours. | Pakibahagi sa inyong pamilya at mga kapitbahay. | Pangngaasiyo ta ibingayyo iti pamiliayo ken kaarrubayo. | ☐ | |
| C4 `source` | Source | Pinagmulan | Naggapuan | ☐ | |

---

*Return the completed sheet to the development team. Tracked in issue #134.*
