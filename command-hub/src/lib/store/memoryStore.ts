import crypto from "node:crypto";
import {
  type Assignment, type AuditEntry, type CallLog, type Fix, type Incident, type IncidentSourceRow, type IncidentStatus,
  type LocationPoint, type Session, type Unit, type UnitState, type UnitStatus, OPEN_INCIDENT_STATUSES, UNIT_STATUSES,
} from "../types";
import { distanceM, etaDue, etaSeconds, possibleDuplicates } from "../geo";
import { incidentCode, INCIDENT_CODE_RE } from "../incidentId";
import { HubError, type AppReportPayload, type CallInput, type CitizenUpdate, type HubStore, type Snapshot } from "./types";
import { MOCK_INCIDENTS, MOCK_ON_DUTY, MOCK_UNITS, TOWN_CENTRES } from "./mockData";

/** Source row that also remembers which incident it first belonged to. */
type SourceRow = IncidentSourceRow & { origin_incident_id: string };

export interface MemoryStoreOptions {
  now?: () => Date;
  seed?: boolean;
  /** Called for every status/ETA change a One Vizcaya reporter should hear about. */
  onCitizenUpdate?: (u: CitizenUpdate) => void;
}

const HISTORY_KEEP_MS = 30 * 86400e3;
const MAX_FIX_AGE_MS = 12 * 3600e3;
const MAX_FIX_FUTURE_MS = 2 * 60e3;
const CITIZEN_VIEW_AUDIT_MS = 5 * 60e3;

const ACTIVE: UnitStatus[] = ["dispatched", "en_route", "on_scene"];

/**
 * In-memory Command Hub store for the prototype. Data is lost on restart.
 * Role scoping here stands in for the RLS policies the Supabase version
 * must have (handoff §3).
 */
export class MemoryStore implements HubStore {
  private units = new Map<string, Unit>();
  private states = new Map<string, UnitState>();
  private points: LocationPoint[] = [];
  private incidents = new Map<string, Incident>();
  private sources: SourceRow[] = [];
  private assignments: Assignment[] = [];
  private calls: CallLog[] = [];
  private auditRows: AuditEntry[] = [];
  private listeners = new Set<(e: { type: string; at: string }) => void>();
  private seq = { history: 1, source: 1, assignment: 1, audit: 1 };
  private citizenViews = new Map<string, number>();
  private now: () => Date;
  private onCitizenUpdate: (u: CitizenUpdate) => void;

  constructor(opts: MemoryStoreOptions = {}) {
    this.now = opts.now ?? (() => new Date());
    this.onCitizenUpdate = opts.onCitizenUpdate ?? (() => {});
    for (const unit of MOCK_UNITS) {
      this.units.set(unit.id, unit);
      this.states.set(unit.id, {
        unit_id: unit.id, status: "off_duty", lat: null, lng: null, accuracy_m: null, heading: null, speed_mps: null,
        fix_time: null, received_at: null, source: null, current_incident_id: null,
      });
    }
    if (opts.seed !== false) this.seed();
  }

  private iso() { return this.now().toISOString(); }

  private seed() {
    const at = this.iso();
    for (const d of MOCK_ON_DUTY) {
      const unit = this.units.get(d.unitId)!;
      const [lat, lng] = TOWN_CENTRES[unit.municipality];
      Object.assign(this.states.get(d.unitId)!, {
        status: d.status, lat: lat + d.dLat, lng: lng + d.dLng, accuracy_m: 15, fix_time: at, received_at: at, source: "phone",
      });
    }
    MOCK_INCIDENTS.forEach((m, i) => {
      const id = crypto.randomUUID();
      const created = new Date(this.now().getTime() - (i + 1) * 7 * 60e3);
      this.incidents.set(id, { ...m, id, code: incidentCode(m.municipality, created, id), created_at: created.toISOString() });
      this.sources.push({ id: this.seq.source++, incident_id: id, origin_incident_id: id, source: m.first_source, external_ref: null, received_at: created.toISOString() });
    });
    // The landslide already has the Aritao rescue team on scene.
    const slide = [...this.incidents.values()].find((x) => x.category === "Landslide")!;
    this.assignments.push({
      id: this.seq.assignment++, incident_id: slide.id, unit_id: "u-ari-res-01", assigned_by: "seed",
      assigned_at: at, released_at: null, eta_seconds: null, eta_updated_at: null, eta_from_lat: null, eta_from_lng: null,
    });
    this.states.get("u-ari-res-01")!.current_incident_id = slide.id;
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private emit(type: string) {
    const e = { type, at: this.iso() };
    for (const fn of this.listeners) {
      try { fn(e); } catch { /* a closed stream must not break the store */ }
    }
  }

  private log(actor: string, action: string, entity: string, entity_id: string, details: Record<string, unknown> = {}) {
    this.auditRows.push({ id: this.seq.audit++, actor_id: actor, action, entity, entity_id, details, at: this.iso() });
  }

  private unit(id: string) {
    const u = this.units.get(id);
    if (!u) throw new HubError(404, "No such unit.");
    return u;
  }

  private incident(id: string) {
    const i = this.incidents.get(id);
    if (!i) throw new HubError(404, "No such incident.");
    return i;
  }

  private canSeeUnit(s: Session, u: Unit) {
    if (s.role === "pdrrmo") return true;
    if (s.role === "mdrrmo") return u.municipality === s.municipality;
    return s.unitId === u.id;
  }

  private canSeeIncident(s: Session, i: Incident) {
    if (s.role === "pdrrmo") return true;
    if (s.role === "mdrrmo") return i.municipality === s.municipality;
    return this.activeAssignmentOf(s.unitId)?.incident_id === i.id;
  }

  private requireOperator(s: Session) {
    if (s.role === "responder") throw new HubError(403, "Only Command Hub operators can do this.");
  }

  private activeAssignmentOf(unitId: string) {
    return this.assignments.find((a) => a.unit_id === unitId && !a.released_at) ?? null;
  }

  private notifyCitizens(incidentId: string, stage: CitizenUpdate["stage"], extra: { eta_seconds?: number; agency?: string } = {}) {
    for (const src of this.sources) {
      if (src.incident_id !== incidentId || src.source !== "app_report" || !src.external_ref) continue;
      this.onCitizenUpdate({ incident_id: src.origin_incident_id, external_ref: src.external_ref, stage, ...extra });
    }
  }

  // ── reads ────────────────────────────────────────────────────────────────

  async snapshot(s: Session): Promise<Snapshot> {
    const units = [...this.units.values()].filter((u) => this.canSeeUnit(s, u));
    const ids = new Set(units.map((u) => u.id));
    const recent = this.now().getTime() - 24 * 3600e3;
    const incidents = [...this.incidents.values()]
      .filter((i) => this.canSeeIncident(s, i))
      .filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status) || Date.parse(i.created_at) > recent)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const incIds = new Set(incidents.map((i) => i.id));
    let myAssignment: Snapshot["myAssignment"] = null;
    if (s.role === "responder") {
      const a = this.activeAssignmentOf(s.unitId);
      if (a) {
        myAssignment = { assignment: a, incident: this.incident(a.incident_id) };
        this.auditCitizenView(s, a.incident_id);
      }
    }
    return {
      now: this.iso(),
      session: s,
      units,
      states: [...this.states.values()].filter((st) => ids.has(st.unit_id)),
      incidents,
      assignments: this.assignments.filter((a) => !a.released_at && (incIds.has(a.incident_id) || ids.has(a.unit_id))),
      calls: s.role === "responder" ? [] : this.calls
        .filter((c) => s.role === "pdrrmo" || c.operator_id === s.userId || (c.incident_id && incIds.has(c.incident_id)))
        .slice(-50).reverse(),
      myAssignment,
    };
  }

  /** Every view of a citizen's location is audited (handoff §7.5), at most once per 5 min per viewer. */
  private auditCitizenView(s: Session, incidentId: string) {
    const key = `${s.userId}:${incidentId}`;
    const last = this.citizenViews.get(key) ?? 0;
    if (this.now().getTime() - last < CITIZEN_VIEW_AUDIT_MS) return;
    this.citizenViews.set(key, this.now().getTime());
    this.log(s.userId, "view_citizen_location", "incident", incidentId);
  }

  async incidentDetail(s: Session, incidentId: string) {
    const incident = this.incident(incidentId);
    if (!this.canSeeIncident(s, incident)) throw new HubError(404, "No such incident.");
    this.auditCitizenView(s, incidentId);
    return {
      incident,
      sources: this.sources.filter((x) => x.incident_id === incidentId).map(({ origin_incident_id: _o, ...r }) => r),
      calls: this.calls.filter((c) => c.incident_id === incidentId),
      assignments: this.assignments.filter((a) => a.incident_id === incidentId),
      duplicates: possibleDuplicates(incident, [...this.incidents.values()].filter((i) => this.canSeeIncident(s, i))),
    };
  }

  async history(s: Session, unitId: string, fromIso: string, toIso: string) {
    this.requireOperator(s);
    if (!this.canSeeUnit(s, this.unit(unitId))) throw new HubError(404, "No such unit.");
    const from = Date.parse(fromIso), to = Date.parse(toIso);
    return this.points
      .filter((p) => p.unit_id === unitId && Date.parse(p.fix_time) >= from && Date.parse(p.fix_time) <= to)
      .sort((a, b) => Date.parse(a.fix_time) - Date.parse(b.fix_time));
  }

  async audit(s: Session, limit = 200) {
    if (s.role !== "pdrrmo") throw new HubError(403, "Only PDRRMO can read the audit log.");
    return this.auditRows.slice(-limit).reverse();
  }

  async unitByDevice(deviceId: string) {
    return [...this.units.values()].find((u) => u.tracker_source === "hardware" && u.hardware_device_id === deviceId) ?? null;
  }

  // ── responders ───────────────────────────────────────────────────────────

  private ownUnit(s: Session) {
    if (s.role !== "responder") throw new HubError(403, "Only a responder can do this.");
    return this.unit(s.unitId);
  }

  async startDuty(s: Session) {
    const u = this.ownUnit(s);
    const st = this.states.get(u.id)!;
    if (st.status === "off_duty") {
      st.status = "available";
      this.log(s.userId, "start_duty", "unit", u.id);
      this.emit("unit");
    }
    return st;
  }

  async endDuty(s: Session) {
    const u = this.ownUnit(s);
    if (this.activeAssignmentOf(u.id)) throw new HubError(409, "You are still assigned to an incident. Ask the dispatcher to release your unit first.");
    const st = this.states.get(u.id)!;
    st.status = "off_duty";
    this.log(s.userId, "end_duty", "unit", u.id);
    this.emit("unit");
    return st;
  }

  async setStatus(s: Session, unitId: string, status: UnitStatus) {
    if (!UNIT_STATUSES.includes(status)) throw new HubError(400, "Unknown status.");
    const u = this.unit(unitId);
    if (!this.canSeeUnit(s, u)) throw new HubError(404, "No such unit.");
    const st = this.states.get(unitId)!;
    const assignment = this.activeAssignmentOf(unitId);
    if (status === "off_duty") throw new HubError(400, "Use End Duty.");
    if (st.status === "off_duty") throw new HubError(409, "Start duty first.");
    if (status === "dispatched") throw new HubError(400, "Dispatch happens by assigning the unit to an incident.");
    if ((status === "en_route" || status === "on_scene") && !assignment) throw new HubError(409, "Not assigned to an incident.");
    if (status === "available" && assignment) throw new HubError(409, "Still assigned to an incident. Ask the dispatcher to release the unit.");
    st.status = status;
    this.log(s.userId, "set_status", "unit", unitId, { status });
    if (assignment && (status === "en_route" || status === "on_scene")) {
      const inc = this.incident(assignment.incident_id);
      if (status === "en_route") this.updateEta(assignment, st, true);
      this.notifyCitizens(inc.id, status, {
        ...(status === "en_route" && assignment.eta_seconds !== null ? { eta_seconds: assignment.eta_seconds } : {}),
        agency: u.agency,
      });
    }
    this.emit("unit");
    return st;
  }

  async reportLocation(actor: Session | { device: true }, unitId: string, fixes: Fix[], source: "phone" | "hardware") {
    const u = this.unit(unitId);
    if (!("device" in actor) && (actor.role !== "responder" || actor.unitId !== unitId)) {
      throw new HubError(403, "A responder can report only their own unit's location.");
    }
    const st = this.states.get(unitId)!;
    // Enforced here, not only in the app: nothing is recorded off duty.
    if (st.status === "off_duty") return { accepted: 0, rejected: fixes.length, reason: "off_duty" };
    const nowMs = this.now().getTime();
    const assignment = this.activeAssignmentOf(unitId);
    let accepted = 0, rejected = 0;
    const sorted = [...fixes].sort((a, b) => Date.parse(a.fix_time) - Date.parse(b.fix_time));
    for (const f of sorted) {
      const t = Date.parse(f.fix_time);
      const valid = Number.isFinite(f.lat) && Number.isFinite(f.lng) && Math.abs(f.lat) <= 90 && Math.abs(f.lng) <= 180 &&
        Number.isFinite(t) && t <= nowMs + MAX_FIX_FUTURE_MS && t >= nowMs - MAX_FIX_AGE_MS;
      if (!valid) { rejected++; continue; }
      const fixIso = new Date(t).toISOString();
      // History: always appended, for replay and after-action review.
      this.points.push({
        id: this.seq.history++, unit_id: unitId, lat: f.lat, lng: f.lng, accuracy_m: f.accuracy_m ?? null,
        speed_mps: f.speed_mps ?? null, heading: f.heading ?? null, fix_time: fixIso, received_at: this.iso(), source,
        incident_id: assignment?.incident_id ?? null,
      });
      // Live state: only a NEWER fix wins (a late offline batch never moves the dot back).
      if (!st.fix_time || t > Date.parse(st.fix_time)) {
        Object.assign(st, {
          lat: f.lat, lng: f.lng, accuracy_m: f.accuracy_m ?? null, heading: f.heading ?? null, speed_mps: f.speed_mps ?? null,
          fix_time: fixIso, received_at: this.iso(), source,
        });
      }
      accepted++;
    }
    if (accepted && assignment && (st.status === "en_route" || st.status === "dispatched")) {
      const before = assignment.eta_seconds;
      if (this.updateEta(assignment, st, false) && st.status === "en_route" && before !== assignment.eta_seconds) {
        this.notifyCitizens(assignment.incident_id, "en_route", { eta_seconds: assignment.eta_seconds!, agency: u.agency });
      }
    }
    if (accepted) this.emit("location");
    return { accepted, rejected };
  }

  /** Recompute the ETA when due (90 s or 500 m). Returns true if it changed. */
  private updateEta(a: Assignment, st: UnitState, force: boolean) {
    const inc = this.incident(a.incident_id);
    if (st.lat === null || st.lng === null || inc.lat === null || inc.lng === null) return false;
    const now = { atMs: this.now().getTime(), lat: st.lat, lng: st.lng };
    const last = a.eta_updated_at && a.eta_from_lat !== null && a.eta_from_lng !== null
      ? { atMs: Date.parse(a.eta_updated_at), lat: a.eta_from_lat, lng: a.eta_from_lng } : null;
    if (!force && !etaDue(last, now)) return false;
    a.eta_seconds = etaSeconds(now, { lat: inc.lat, lng: inc.lng });
    a.eta_updated_at = this.iso();
    a.eta_from_lat = st.lat;
    a.eta_from_lng = st.lng;
    return true;
  }

  // ── incidents ────────────────────────────────────────────────────────────

  async ingestAppReport(p: AppReportPayload) {
    if (typeof p.incident_id !== "string" || !/^[0-9a-f-]{36}$/.test(p.incident_id)) throw new HubError(400, "incident_id must be a UUID.");
    if (typeof p.external_ref !== "string" || !p.external_ref) throw new HubError(400, "external_ref is required.");
    const existing = this.incidents.get(p.incident_id);
    if (existing) return { incident: existing, created: false }; // retries are safe
    const at = p.reported_at && Number.isFinite(Date.parse(p.reported_at)) ? new Date(p.reported_at) : this.now();
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const incident: Incident = {
      id: p.incident_id,
      code: p.incident_code && INCIDENT_CODE_RE.test(p.incident_code) ? p.incident_code : incidentCode(p.municipality, at, p.incident_id),
      status: "received",
      category: p.category ?? null,
      description: p.description ?? null,
      lat: num(p.lat), lng: num(p.lng),
      location_text: p.location_text ?? null,
      barangay: p.barangay ?? null,
      municipality: p.municipality ?? null,
      first_source: "app_report",
      created_at: this.iso(),
      merged_into: null,
      external_ref: p.external_ref,
    };
    this.incidents.set(incident.id, incident);
    this.sources.push({ id: this.seq.source++, incident_id: incident.id, origin_incident_id: incident.id, source: "app_report", external_ref: p.external_ref, received_at: this.iso() });
    this.log("one-vizcaya", "ingest_app_report", "incident", incident.id, { code: incident.code });
    this.notifyCitizens(incident.id, "received");
    this.emit("incident");
    return { incident, created: true };
  }

  async setIncidentStatus(s: Session, incidentId: string, status: IncidentStatus) {
    this.requireOperator(s);
    const inc = this.incident(incidentId);
    if (!this.canSeeIncident(s, inc)) throw new HubError(404, "No such incident.");
    if (status === "duplicate") throw new HubError(400, "Use Merge to mark a duplicate.");
    const closing = status === "resolved" || status === "closed" || status === "invalid";
    if (closing && this.assignments.some((a) => a.incident_id === incidentId && !a.released_at)) {
      throw new HubError(409, "Release the assigned units first.");
    }
    inc.status = status;
    this.log(s.userId, "set_incident_status", "incident", incidentId, { status });
    if (status === "validated") this.notifyCitizens(incidentId, "validated");
    if (status === "resolved") this.notifyCitizens(incidentId, "resolved");
    this.emit("incident");
    return inc;
  }

  async assign(s: Session, incidentId: string, unitId: string) {
    this.requireOperator(s);
    const inc = this.incident(incidentId);
    const u = this.unit(unitId);
    if (!this.canSeeIncident(s, inc) || !this.canSeeUnit(s, u)) throw new HubError(404, "Not found.");
    if (!OPEN_INCIDENT_STATUSES.includes(inc.status)) throw new HubError(409, "This incident is not open.");
    const st = this.states.get(unitId)!;
    if (st.status === "off_duty") throw new HubError(409, `${u.call_sign} is off duty.`);
    if (this.activeAssignmentOf(unitId)) throw new HubError(409, `${u.call_sign} is already assigned. Release it first.`);
    const a: Assignment = {
      id: this.seq.assignment++, incident_id: incidentId, unit_id: unitId, assigned_by: s.userId, assigned_at: this.iso(),
      released_at: null, eta_seconds: null, eta_updated_at: null, eta_from_lat: null, eta_from_lng: null,
    };
    this.assignments.push(a);
    st.status = "dispatched";
    st.current_incident_id = incidentId;
    if (inc.status === "received" || inc.status === "validated") inc.status = "in_progress";
    this.updateEta(a, st, true);
    this.log(s.userId, "assign_unit", "incident", incidentId, { unit_id: unitId, call_sign: u.call_sign });
    this.notifyCitizens(incidentId, "dispatched", { agency: u.agency });
    this.emit("assignment");
    return a;
  }

  async release(s: Session, assignmentId: number) {
    this.requireOperator(s);
    const a = this.assignments.find((x) => x.id === assignmentId);
    if (!a || a.released_at) throw new HubError(404, "No such active assignment.");
    const u = this.unit(a.unit_id);
    if (!this.canSeeUnit(s, u) && !this.canSeeIncident(s, this.incident(a.incident_id))) throw new HubError(404, "No such active assignment.");
    a.released_at = this.iso();
    const st = this.states.get(a.unit_id)!;
    st.current_incident_id = null;
    if (ACTIVE.includes(st.status)) st.status = st.status === "dispatched" ? "available" : "returning";
    this.log(s.userId, "release_unit", "incident", a.incident_id, { unit_id: a.unit_id, call_sign: u.call_sign });
    this.emit("assignment");
    return a;
  }

  async merge(s: Session, duplicateId: string, survivorId: string) {
    this.requireOperator(s);
    if (duplicateId === survivorId) throw new HubError(400, "Pick two different incidents.");
    const dup = this.incident(duplicateId), keep = this.incident(survivorId);
    if (!this.canSeeIncident(s, dup) || !this.canSeeIncident(s, keep)) throw new HubError(404, "No such incident.");
    if (dup.merged_into || keep.merged_into) throw new HubError(409, "One of these is already merged.");
    if (this.assignments.some((a) => a.incident_id === duplicateId && !a.released_at)) {
      throw new HubError(409, "Release the units assigned to the duplicate first.");
    }
    dup.merged_into = survivorId;
    dup.status = "duplicate";
    for (const src of this.sources) if (src.incident_id === duplicateId) src.incident_id = survivorId;
    for (const c of this.calls) if (c.incident_id === duplicateId) c.incident_id = survivorId;
    if (keep.lat === null && dup.lat !== null) { keep.lat = dup.lat; keep.lng = dup.lng; }
    this.log(s.userId, "merge_incident", "incident", survivorId, { merged: duplicateId, merged_code: dup.code });
    this.emit("incident");
    return keep;
  }

  // ── hotline intake ───────────────────────────────────────────────────────

  async createCall(s: Session, input: CallInput) {
    this.requireOperator(s);
    const clean = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const receivedAt = input.call_received_at && Number.isFinite(Date.parse(input.call_received_at))
      ? new Date(input.call_received_at).toISOString() : this.iso();
    const municipality = s.role === "mdrrmo" ? s.municipality : clean(input.municipality, 60);
    const lat = num(input.lat), lng = num(input.lng);
    if ((lat === null) !== (lng === null)) throw new HubError(400, "Give both latitude and longitude, or neither.");

    let incident: Incident;
    if (input.attach_to) {
      incident = this.incident(input.attach_to);
      if (!this.canSeeIncident(s, incident)) throw new HubError(404, "No such incident.");
      if (incident.merged_into) incident = this.incident(incident.merged_into);
    } else {
      const id = crypto.randomUUID();
      incident = {
        id, code: incidentCode(municipality, new Date(receivedAt), id), status: "received",
        category: clean(input.nature, 80), description: clean(input.notes, 2000), lat, lng,
        location_text: clean(input.location_text, 300), barangay: clean(input.barangay, 80), municipality,
        first_source: "hotline_call", created_at: receivedAt, merged_into: null, external_ref: null,
      };
      this.incidents.set(id, incident);
    }
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.form_extra ?? {})) {
      if (/^[a-z_]{1,40}$/.test(k) && typeof v === "string" && v.trim()) extra[k] = v.trim().slice(0, 500);
    }
    const call: CallLog = {
      id: crypto.randomUUID(), incident_id: incident.id, operator_id: s.userId,
      operator_agency: s.role === "mdrrmo" ? `MDRRMO-${s.municipality}` : "PDRRMO",
      caller_name: clean(input.caller_name, 120), caller_number: clean(input.caller_number, 30), call_received_at: receivedAt,
      location_text: clean(input.location_text, 300), lat, lng, nature: clean(input.nature, 80), notes: clean(input.notes, 2000),
      form_extra: extra, created_at: this.iso(),
    };
    this.calls.push(call);
    this.sources.push({ id: this.seq.source++, incident_id: incident.id, origin_incident_id: incident.id, source: "hotline_call", external_ref: call.id, received_at: this.iso() });
    this.log(s.userId, "log_call", "call_log", call.id, { incident_id: incident.id, attached: !!input.attach_to });
    this.emit("call");
    return { call, incident };
  }

  // ── housekeeping ─────────────────────────────────────────────────────────

  /** Location history not linked to an incident is kept 30 days (handoff §4.3). */
  async purgeHistory(now = this.now()) {
    const cutoff = now.getTime() - HISTORY_KEEP_MS;
    const before = this.points.length;
    this.points = this.points.filter((p) => p.incident_id !== null || Date.parse(p.fix_time) >= cutoff);
    return before - this.points.length;
  }

  subscribe(fn: (e: { type: string; at: string }) => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  /** Test helper: distance from a unit to an incident, in metres. */
  distanceToIncident(unitId: string, incidentId: string) {
    const st = this.states.get(unitId)!, inc = this.incident(incidentId);
    if (st.lat === null || st.lng === null || inc.lat === null || inc.lng === null) return null;
    return distanceM({ lat: st.lat, lng: st.lng }, { lat: inc.lat, lng: inc.lng });
  }
}
