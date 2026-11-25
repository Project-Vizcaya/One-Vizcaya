// Incident codes, the same format One Vizcaya gives its reports
// (apps/functions/reports/incidentId.js — keep the two in step):
//   NV-<TOWN>-<YYYYMMDD>-<first 6 hex of the UUID>, e.g. NV-BAM-20261124-3F9A2C

export const TOWN_CODES: Record<string, string> = {
  "Alfonso Castañeda": "ALC",
  Ambaguio: "AMB",
  Aritao: "ARI",
  Bagabag: "BAG",
  Bambang: "BAM",
  Bayombong: "BYB",
  Diadi: "DIA",
  "Dupax del Norte": "DDN",
  "Dupax del Sur": "DDS",
  Kasibu: "KAS",
  Kayapa: "KAY",
  Quezon: "QZN",
  "Santa Fe": "STF",
  Solano: "SOL",
  Villaverde: "VIL",
};
export const TOWNS = Object.keys(TOWN_CODES);
export const PROVINCE_CODE = "PRV";

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const BY_PLAIN = new Map(Object.entries(TOWN_CODES).map(([t, c]) => [plain(t), c]));

export const townCode = (municipality: string | null | undefined) => BY_PLAIN.get(plain(municipality ?? "")) ?? PROVINCE_CODE;

export function manilaDate(d: Date): string {
  return new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 10).replace(/-/g, "");
}

export function incidentCode(municipality: string | null | undefined, date: Date, uuid: string): string {
  return `NV-${townCode(municipality)}-${manilaDate(date)}-${uuid.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export const INCIDENT_CODE_RE = /^NV-[A-Z]{3}-\d{8}-[0-9A-F]{6}$/;
