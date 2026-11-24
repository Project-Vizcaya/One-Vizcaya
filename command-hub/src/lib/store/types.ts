import type {
  Assignment, AuditEntry, CallLog, Fix, Incident, IncidentSourceRow, IncidentStatus, LocationPoint, Session, Unit,
  UnitState, UnitStatus,
} from "../types";

/** What a signed-in user may see right now, already scoped to their role. */
export interface Snapshot {
  now: string;
  session: Session;
  units: Unit[];
  states: UnitState[];
  incidents: Incident[];
  assignments: Assignment[];
  calls: CallLog[];
  /** Responder only: their current assignment and its incident. */
  myAssignment: { assignment: Assignment; incident: Incident } | null;
}

export interface AppReportPayload {
  incident_id: string;
  incident_code?: string | null;
  external_ref: string;
  category?: string | null;
  priority?: string | null;
  description?: string | null;
  location_text?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  lat?: number | null;
  lng?: number | null;
  reported_at?: string | null;
}

export interface CallInput {
  caller_name?: string | null;
  caller_number?: string | null;
  call_received_at?: string | null;
  location_text?: string | null;
  municipality?: string | null;
  barangay?: string | null;
  lat?: number | null;
  lng?: number | null;
  nature?: string | null;
  notes?: string | null;
  form_extra?: Record<string, string>;
  /** Attach to this existing incident instead of creating one. */
  attach_to?: string | null;
}

/** A status/ETA update for a citizen who reported through One Vizcaya. */
export interface CitizenUpdate {
  incident_id: string;
  external_ref: string;
  stage: "received" | "validated" | "dispatched" | "en_route" | "on_scene" | "resolved";
  eta_seconds?: number;
  agency?: string;
  /** When the change happened (ISO); One Vizcaya ignores anything older. */
  at: string;
}

/** Who is posting positions: a signed-in responder, a GPS tracker (Traccar),
 *  or the replay simulator (demos only). */
export type LocationActor = Session | { device: "hardware" } | { device: "simulator" };

export class HubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Everything the pages and API routes need. The prototype runs on
 * MemoryStore (mock data). The Supabase implementation belongs to the
 * database co-dev: it must enforce the same rules (off-duty rejection,
 * newer-fix-wins, role scoping as RLS, audit rows) — the tests in
 * store.test.ts describe them.
 */
export interface HubStore {
  snapshot(s: Session): Promise<Snapshot>;
  startDuty(s: Session): Promise<UnitState>;
  endDuty(s: Session): Promise<UnitState>;
  setStatus(s: Session, unitId: string, status: UnitStatus): Promise<UnitState>;
  /** Phone fixes (responder session) or hardware fixes (device token). */
  reportLocation(actor: LocationActor, unitId: string, fixes: Fix[]):
    Promise<{ accepted: number; rejected: number; reason?: string }>;
  unitByDevice(deviceId: string): Promise<Unit | null>;
  ingestAppReport(p: AppReportPayload): Promise<{ incident: Incident; created: boolean }>;
  assign(s: Session, incidentId: string, unitId: string): Promise<Assignment>;
  release(s: Session, assignmentId: number): Promise<Assignment>;
  setIncidentStatus(s: Session, incidentId: string, status: IncidentStatus): Promise<Incident>;
  merge(s: Session, duplicateId: string, survivorId: string): Promise<Incident>;
  createCall(s: Session, input: CallInput): Promise<{ call: CallLog; incident: Incident }>;
  incidentDetail(s: Session, incidentId: string):
    Promise<{ incident: Incident; sources: IncidentSourceRow[]; calls: CallLog[]; assignments: Assignment[]; duplicates: Incident[] }>;
  history(s: Session, unitId: string, fromIso: string, toIso: string): Promise<LocationPoint[]>;
  audit(s: Session, limit?: number): Promise<AuditEntry[]>;
  purgeHistory(now?: Date): Promise<number>;
  subscribe(fn: (event: { type: string; at: string }) => void): () => void;
}
