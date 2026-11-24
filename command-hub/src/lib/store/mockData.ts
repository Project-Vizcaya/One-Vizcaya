// MOCK DATA ONLY (handoff §10): no real responder names, certificates or
// citizen data. Call signs and incidents are invented for demos.

import type { Incident, Unit } from "../types";

export const TOWN_CENTRES: Record<string, [number, number]> = {
  Bambang: [16.3833, 121.0667],
  Bayombong: [16.4833, 121.15],
  Solano: [16.5167, 121.1833],
  Aritao: [16.3, 121.0333],
  Bagabag: [16.5833, 121.2333],
  Villaverde: [16.65, 121.2667],
  Diadi: [16.6, 121.3],
  Quezon: [16.2333, 121.0167],
  "Santa Fe": [16.1667, 120.9833],
  Ambaguio: [16.2167, 121.1167],
  Kasibu: [16.3167, 121.2667],
  "Dupax del Norte": [16.5, 121.1],
  "Dupax del Sur": [16.4667, 121.0833],
  "Alfonso Castañeda": [16.1833, 121.2167],
  Kayapa: [16.35, 120.9167],
};

const u = (id: string, call_sign: string, unit_type: string, agency: string, municipality: string): Unit => ({
  id, call_sign, unit_type, agency, municipality, home_barangay_id: null, tracker_source: "phone", hardware_device_id: null,
});

export const MOCK_UNITS: Unit[] = [
  u("u-nv-amb-01", "NV-AMB-01", "ambulance", "PDRRMO", "Bayombong"),
  u("u-nv-res-01", "NV-RES-01", "rescue", "PDRRMO", "Bayombong"),
  u("u-bam-amb-01", "BAM-AMB-01", "ambulance", "MDRRMO-Bambang", "Bambang"),
  u("u-bam-res-01", "BAM-RES-01", "rescue", "MDRRMO-Bambang", "Bambang"),
  u("u-sol-amb-01", "SOL-AMB-01", "ambulance", "MDRRMO-Solano", "Solano"),
  u("u-byb-fire-01", "BYB-FIRE-01", "fire", "BFP", "Bayombong"),
  u("u-sol-pnp-01", "SOL-PNP-01", "police", "PNP", "Solano"),
  u("u-ari-res-01", "ARI-RES-01", "rescue", "MDRRMO-Aritao", "Aritao"),
  u("u-stf-amb-01", "STF-AMB-01", "ambulance", "MDRRMO-Santa Fe", "Santa Fe"),
  { ...u("u-nv-trk-01", "NV-TRK-01", "rescue", "PDRRMO", "Bayombong"), tracker_source: "hardware", hardware_device_id: "MOCK-IMEI-000000000000001" },
];

/** Units on duty at start-up, with a position near their town (offset in metres). */
export const MOCK_ON_DUTY: { unitId: string; status: "available" | "on_scene"; dLat: number; dLng: number }[] = [
  { unitId: "u-nv-amb-01", status: "available", dLat: 0.002, dLng: -0.003 },
  { unitId: "u-bam-amb-01", status: "available", dLat: -0.001, dLng: 0.002 },
  { unitId: "u-sol-amb-01", status: "available", dLat: 0.001, dLng: 0.001 },
  { unitId: "u-byb-fire-01", status: "available", dLat: -0.002, dLng: 0.001 },
  { unitId: "u-ari-res-01", status: "on_scene", dLat: 0.004, dLng: 0.002 },
];

export const MOCK_INCIDENTS: Omit<Incident, "id" | "code" | "created_at">[] = [
  {
    status: "received", category: "Flooding", description: "MOCK: Water over the road near the creek, rising.",
    lat: 16.3876, lng: 121.0731, location_text: "MOCK: Purok 2 near the creek", barangay: "Salinas",
    municipality: "Bambang", first_source: "app_report", merged_into: null, external_ref: null,
  },
  {
    status: "validated", category: "Vehicular Accident", description: "MOCK: Motorcycle and tricycle collision, one injured.",
    lat: 16.5141, lng: 121.1792, location_text: "MOCK: National highway near the public market", barangay: "Quirino",
    municipality: "Solano", first_source: "hotline_call", merged_into: null, external_ref: null,
  },
  {
    status: "in_progress", category: "Landslide", description: "MOCK: Soil and rocks on one lane.",
    lat: 16.3042, lng: 121.0361, location_text: "MOCK: Dalton Pass road, km marker (mock)", barangay: "Balete",
    municipality: "Aritao", first_source: "barangay_report", merged_into: null, external_ref: null,
  },
];
