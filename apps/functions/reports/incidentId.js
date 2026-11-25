"use strict";

// Incident IDs (docs/4-app-and-website/command-hub.md). Every report gets two, set server-side
// when it is created:
//
//   incidentUuid  the shared key with the PDRRMO Command Hub. A UUID derived
//                 from the report's Firestore path, so retries and re-runs
//                 always give the same value.
//   incidentId    what people read and say: NV-<TOWN>-<YYYYMMDD>-<6 hex>,
//                 e.g. NV-BAM-20261124-3F9A2C. The town code shows where it
//                 happened; the date is the Manila date it was filed; the last
//                 part is the start of the UUID.
//
// The Command Hub uses the same format for incidents it creates (hotline
// calls): command-hub/src/lib/incidentId.ts. Keep the two in step.

const crypto = require("node:crypto");

const TOWN_CODES = {
  "Alfonso Castañeda": "ALC",
  "Ambaguio": "AMB",
  "Aritao": "ARI",
  "Bagabag": "BAG",
  "Bambang": "BAM",
  "Bayombong": "BYB",
  "Diadi": "DIA",
  "Dupax del Norte": "DDN",
  "Dupax del Sur": "DDS",
  "Kasibu": "KAS",
  "Kayapa": "KAY",
  "Quezon": "QZN",
  "Santa Fe": "STF",
  "Solano": "SOL",
  "Villaverde": "VIL",
};
// Province-wide or town not known.
const PROVINCE_CODE = "PRV";

const plain = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const BY_PLAIN = new Map(Object.entries(TOWN_CODES).map(([t, c]) => [plain(t), c]));

function townCode(municipality) {
  return BY_PLAIN.get(plain(municipality)) || PROVINCE_CODE;
}

/** UUID (version 5 layout) from a SHA-1 of the report path. */
function incidentUuidFor(path) {
  const h = crypto.createHash("sha1").update(`one-vizcaya:${path}`).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/** YYYYMMDD in Asia/Manila (UTC+8, no daylight saving). */
function manilaDate(date) {
  return new Date(date.getTime() + 8 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "");
}

function incidentCode({ municipality, date, uuid }) {
  return `NV-${townCode(municipality)}-${manilaDate(date)}-${uuid.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

const CODE_RE = /^NV-[A-Z]{3}-\d{8}-[0-9A-F]{6}$/;

/** Both IDs for a report document. */
function idsForReport(path, data) {
  const uuid = incidentUuidFor(path);
  const at = data && data.reportedAt && typeof data.reportedAt.toDate === "function"
    ? data.reportedAt.toDate() : new Date();
  return { incidentUuid: uuid, incidentId: incidentCode({ municipality: data && data.municipality, date: at, uuid }) };
}

module.exports = { TOWN_CODES, PROVINCE_CODE, CODE_RE, townCode, incidentUuidFor, incidentCode, manilaDate, idsForReport };
