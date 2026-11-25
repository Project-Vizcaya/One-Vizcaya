# Hotline verification — placeholder numbers (P3, PDRRMO §7 §11)

**Status: awaiting LGU confirmation.** The numbers below are **placeholders**.
The apps mark them unverified and **will not dial them**, so a resident in an
emergency is never sent to a wrong number. Each needs the real number,
confirmed with the office itself.

**How to fill this in:** call or visit the office, confirm the number they
answer on, and write it in **Verified number**, with who confirmed it and the date.
Leave the row blank if the office has no public line.

Once a row is filled in, the developers update it in two places:
- `apps/functions/index.js` (`seedResponders`, the console's responder directory);
- `apps/mobile/lib/presentation/screens/emergency_contacts_screen.dart` (the app).

Both use the same convention: a number ending in ` #` is a placeholder.

## A. Emergency numbers

| Municipality | Office | In the app? | Current placeholder | Verified number | Confirmed by / date |
|---|---|:-:|---|---|---|
| All | DPWH Nueva Vizcaya DEO | console only | ~~09175000100~~ | | |
| Alfonso Castañeda | BFP Alfonso Castañeda | yes | ~~09171112222~~ | | |
| Ambaguio | BFP Ambaguio | yes | ~~09171113333~~ | | |
| Aritao | BFP Aritao | yes | ~~09171114444~~ | | |
| Bagabag | BFP Bagabag | yes | ~~09171115555~~ | | |
| Bayombong | BFP Bayombong | console only | ~~09187654321~~ | | |
| Diadi | BFP Diadi | yes | ~~09171116666~~ | | |
| Diadi | Diadi Emergency Hospital | console only | ~~09228680843~~ | | |
| Dupax del Norte | BFP Dupax del Norte | yes | ~~09171117777~~ | | |
| Dupax del Sur | BFP Dupax del Sur | yes | ~~09171118888~~ | | |
| Kasibu | BFP Kasibu | yes | ~~09171119999~~ | | |
| Kayapa | BFP Kayapa | yes | ~~09172221111~~ | | |
| Quezon | BFP Quezon | yes | ~~09172223333~~ | | |
| Santa Fe | BFP Santa Fe | yes | ~~09172224444~~ | | |
| Villaverde | BFP Villaverde | yes | ~~09172225555~~ | | |

> "Diadi Emergency Hospital" currently reuses the provincial hospital's number.
> "DPWH Nueva Vizcaya DEO" is marked unconfirmed in the console's data.

## B. Government offices (Citizen Guide → Locate)

These show the official **website** only. The local branch **address, hours and
phone** for Nueva Vizcaya are blank on purpose until confirmed.

| Office | Local address | Hours | Phone | Confirmed by / date |
|---|---|---|---|---|
| NBI — National Bureau of Investigation | | | | |
| LTO — Land Transportation Office | | | | |
| PSA — Philippine Statistics Authority (birth/marriage records) | | | | |
| DFA — Passport / Consular Services | | | | |
| COMELEC — Voter Registration | | | | |
| SSS — Social Security System | | | | |
| Pag-IBIG Fund (HDMF) | | | | |
| PhilHealth | | | | |
| DSWD — Social Welfare & Development (4Ps, assistance) | | | | |
| BIR — Bureau of Internal Revenue | | | | |
| DOH — Department of Health | | | | |
| Provincial Health Office — Nueva Vizcaya | | | | |
| Provincial Capitol — Nueva Vizcaya | | | | |
| Your Municipal Hall | | | | |

*Return the completed sheet to the development team. Tracked in issue #134.*
