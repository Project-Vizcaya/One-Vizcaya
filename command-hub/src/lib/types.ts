// Shapes follow the Command Hub data model in the handoff (§3), field for
// field, so the in-memory prototype store can be swapped for the database
// co-dev's Supabase tables without changing the pages. The responder,
// equipment, certification and barangay tables are the co-dev's and are NOT
// modelled here; units only point at them by id.

export type UnitStatus = "off_duty" | "available" | "dispatched" | "en_route" | "on_scene" | "returning";
export const UNIT_STATUSES: UnitStatus[] = ["off_duty", "available", "dispatched", "en_route", "on_scene", "returning"];

export type IncidentSource = "app_report" | "hotline_call" | "barangay_report" | "walk_in";

export type IncidentStatus =
  | "received" | "validated" | "referred" | "in_progress" | "resolved" | "closed" | "invalid" | "duplicate";
export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = ["received", "validated", "referred", "in_progress"];

export interface Unit {
  id: string;
  call_sign: string;
  unit_type: string;
  agency: string;
  municipality: string;
  home_barangay_id: string | null;
  tracker_source: "phone" | "hardware";
  hardware_device_id: string | null;
}

export interface UnitState {
  unit_id: string;
  status: UnitStatus;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  heading: number | null;
  speed_mps: number | null;
  fix_time: string | null;
  received_at: string | null;
  source: "phone" | "hardware" | null;
  current_incident_id: string | null;
}

export interface LocationPoint {
  id: number;
  unit_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  speed_mps: number | null;
  heading: number | null;
  fix_time: string;
  received_at: string;
  source: "phone" | "hardware";
  incident_id: string | null;
}

export interface Incident {
  id: string;
  /** NV-<TOWN>-<YYYYMMDD>-<hex>, the same format as One Vizcaya reports. */
  code: string;
  status: IncidentStatus;
  category: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  location_text: string | null;
  barangay: string | null;
  municipality: string | null;
  first_source: IncidentSource;
  created_at: string;
  merged_into: string | null;
  /** One Vizcaya report path, for app reports (status updates go back to it). */
  external_ref: string | null;
}

export interface IncidentSourceRow {
  id: number;
  incident_id: string;
  source: IncidentSource;
  external_ref: string | null;
  received_at: string;
}

export interface Assignment {
  id: number;
  incident_id: string;
  unit_id: string;
  assigned_by: string;
  assigned_at: string;
  released_at: string | null;
  eta_seconds: number | null;
  eta_updated_at: string | null;
  /** Unit position when the ETA was last computed (for the 500 m rule). */
  eta_from_lat: number | null;
  eta_from_lng: number | null;
}

export interface CallLog {
  id: string;
  incident_id: string | null;
  operator_id: string;
  operator_agency: string | null;
  caller_name: string | null;
  caller_number: string | null;
  call_received_at: string;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  nature: string | null;
  notes: string | null;
  form_extra: Record<string, string>;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown>;
  at: string;
}

/** Who is signed in. Mirrors the RLS roles in the handoff (§3). */
export type Session =
  | { role: "pdrrmo"; userId: string; name: string }
  | { role: "mdrrmo"; userId: string; name: string; municipality: string }
  | { role: "responder"; userId: string; name: string; unitId: string };

export interface Fix {
  lat: number;
  lng: number;
  accuracy_m?: number | null;
  heading?: number | null;
  speed_mps?: number | null;
  fix_time: string;
}
