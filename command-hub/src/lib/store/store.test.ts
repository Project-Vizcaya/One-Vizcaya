import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "./memoryStore";
import type { CitizenUpdate } from "./types";
import type { Session } from "../types";

// These are the rules any HubStore must keep, including the co-dev's
// Supabase version (as RLS policies and functions).

let clock = Date.parse("2026-11-24T02:00:00Z");
const now = () => new Date(clock);
const tick = (ms: number) => { clock += ms; };
let updates: CitizenUpdate[];
let store: MemoryStore;

const EOC: Session = { role: "pdrrmo", userId: "eoc", name: "EOC" };
const BAM_OP: Session = { role: "mdrrmo", userId: "bam-op", name: "Bambang", municipality: "Bambang" };
const SOL_OP: Session = { role: "mdrrmo", userId: "sol-op", name: "Solano", municipality: "Solano" };
const BAM_AMB: Session = { role: "responder", userId: "bam-amb", name: "BAM-AMB-01", unitId: "u-bam-amb-01" };
const BAM_RES: Session = { role: "responder", userId: "bam-res", name: "BAM-RES-01", unitId: "u-bam-res-01" };
const iso = (offsetMs = 0) => new Date(clock + offsetMs).toISOString();
const UUID = "3f9a2c11-0000-5000-8000-000000000001";

beforeEach(() => {
  clock = Date.parse("2026-11-24T02:00:00Z");
  updates = [];
  store = new MemoryStore({ now, onCitizenUpdate: (u) => updates.push(u) });
});

async function appReport() {
  return (await store.ingestAppReport({
    incident_id: UUID, incident_code: "NV-BAM-20261124-3F9A2C", external_ref: "users/c1/reports/r1",
    category: "Flooding", municipality: "Bambang", lat: 16.39, lng: 121.08, description: "MOCK",
  })).incident;
}

describe("duty and location", () => {
  it("rejects fixes while off duty (server-side)", async () => {
    const r = await store.reportLocation(BAM_RES, "u-bam-res-01", [{ lat: 16.38, lng: 121.06, fix_time: iso() }], "phone");
    expect(r).toEqual({ accepted: 0, rejected: 1, reason: "off_duty" });
    const now = await store.history(EOC, "u-bam-res-01", iso(-60e3), iso(60e3));
    expect(now).toHaveLength(0);
  });

  it("a responder can report only their own unit", async () => {
    await expect(store.reportLocation(BAM_AMB, "u-bam-res-01", [], "phone")).rejects.toThrow(/own unit/);
  });

  it("offline batch: history complete and in order; live dot keeps the newest fix", async () => {
    await store.startDuty(BAM_RES);
    await store.reportLocation(BAM_RES, "u-bam-res-01", [{ lat: 16.40, lng: 121.10, fix_time: iso() }], "phone");
    // A late batch from 5 minutes ago, out of order.
    await store.reportLocation(BAM_RES, "u-bam-res-01", [
      { lat: 16.38, lng: 121.07, fix_time: iso(-120e3) },
      { lat: 16.37, lng: 121.06, fix_time: iso(-300e3) },
      { lat: 16.39, lng: 121.08, fix_time: iso(-60e3) },
    ], "phone");
    const snap = await store.snapshot(EOC);
    const st = snap.states.find((s) => s.unit_id === "u-bam-res-01")!;
    expect([st.lat, st.lng]).toEqual([16.40, 121.10]);
    const h = await store.history(EOC, "u-bam-res-01", iso(-600e3), iso(1));
    expect(h.map((p) => p.lat)).toEqual([16.37, 16.38, 16.39, 16.40]);
  });

  it("rejects impossible fixes", async () => {
    await store.startDuty(BAM_RES);
    const r = await store.reportLocation(BAM_RES, "u-bam-res-01", [
      { lat: 95, lng: 121, fix_time: iso() },
      { lat: 16.4, lng: 121.1, fix_time: iso(10 * 60e3) },
      { lat: 16.4, lng: 121.1, fix_time: "yesterday" },
    ], "phone");
    expect(r.accepted).toBe(0);
    expect(r.rejected).toBe(3);
  });

  it("can't end duty while assigned", async () => {
    const inc = await appReport();
    await store.assign(BAM_OP, inc.id, "u-bam-amb-01");
    await expect(store.endDuty(BAM_AMB)).rejects.toThrow(/release/);
  });

  it("history not linked to an incident is purged after 30 days; linked history is kept", async () => {
    const inc = await appReport();
    await store.reportLocation(BAM_AMB, "u-bam-amb-01", [{ lat: 16.38, lng: 121.06, fix_time: iso() }], "phone");
    await store.assign(BAM_OP, inc.id, "u-bam-amb-01");
    await store.reportLocation(BAM_AMB, "u-bam-amb-01", [{ lat: 16.385, lng: 121.065, fix_time: iso(1000) }], "phone");
    const removed = await store.purgeHistory(new Date(clock + 31 * 86400e3));
    expect(removed).toBe(1);
  });
});

describe("dispatch and the citizen", () => {
  it("app report: idempotent ingest, 'received' sent back", async () => {
    const a = await appReport();
    const again = await store.ingestAppReport({ incident_id: UUID, external_ref: "users/c1/reports/r1" });
    expect(again.created).toBe(false);
    expect(again.incident.id).toBe(a.id);
    expect(a.code).toBe("NV-BAM-20261124-3F9A2C");
    expect(updates).toEqual([{ incident_id: UUID, external_ref: "users/c1/reports/r1", stage: "received" }]);
  });

  it("assign → en route (with ETA) → on scene; citizen gets stages and agency, never a position", async () => {
    const inc = await appReport();
    await store.assign(EOC, inc.id, "u-bam-amb-01");
    let snap = await store.snapshot(BAM_AMB);
    expect(snap.myAssignment?.incident.id).toBe(inc.id);
    expect(snap.states[0].status).toBe("dispatched");
    await store.setStatus(BAM_AMB, "u-bam-amb-01", "en_route");
    await store.setStatus(BAM_AMB, "u-bam-amb-01", "on_scene");
    expect(updates.map((u) => u.stage)).toEqual(["received", "dispatched", "en_route", "on_scene"]);
    const enRoute = updates.find((u) => u.stage === "en_route")!;
    expect(enRoute.eta_seconds).toBeGreaterThan(0);
    expect(enRoute.agency).toBe("MDRRMO-Bambang");
    for (const u of updates) expect(Object.keys(u).sort()).not.toContain("lat");
    snap = await store.snapshot(EOC);
    expect(snap.incidents.find((i) => i.id === inc.id)?.status).toBe("in_progress");
  });

  it("ETA is recalculated by the 90 s / 500 m rule, not every fix", async () => {
    const inc = await appReport();
    await store.assign(EOC, inc.id, "u-bam-amb-01");
    await store.setStatus(BAM_AMB, "u-bam-amb-01", "en_route");
    const n = updates.length;
    tick(10_000);
    await store.reportLocation(BAM_AMB, "u-bam-amb-01", [{ lat: 16.3826, lng: 121.0688, fix_time: iso() }], "phone");
    expect(updates.length).toBe(n);
    tick(2_000);
    await store.reportLocation(BAM_AMB, "u-bam-amb-01", [{ lat: 16.388, lng: 121.076, fix_time: iso() }], "phone");
    expect(updates.length).toBe(n + 1);
  });

  it("a unit can't be double-booked, and off-duty units can't be assigned", async () => {
    const inc = await appReport();
    await store.assign(EOC, inc.id, "u-bam-amb-01");
    await expect(store.assign(EOC, inc.id, "u-bam-amb-01")).rejects.toThrow(/already assigned/);
    await expect(store.assign(EOC, inc.id, "u-bam-res-01")).rejects.toThrow(/off duty/);
  });

  it("release: unit returns, the responder loses the incident and the citizen's location", async () => {
    const inc = await appReport();
    const a = await store.assign(EOC, inc.id, "u-bam-amb-01");
    await store.setStatus(BAM_AMB, "u-bam-amb-01", "on_scene");
    await store.release(EOC, a.id);
    const snap = await store.snapshot(BAM_AMB);
    expect(snap.myAssignment).toBeNull();
    expect(snap.incidents).toHaveLength(0);
    expect(snap.states[0].status).toBe("returning");
  });

  it("resolved only after release, and the citizen hears it", async () => {
    const inc = await appReport();
    const a = await store.assign(EOC, inc.id, "u-bam-amb-01");
    await expect(store.setIncidentStatus(EOC, inc.id, "resolved")).rejects.toThrow(/Release/);
    await store.release(EOC, a.id);
    await store.setIncidentStatus(EOC, inc.id, "resolved");
    expect(updates.at(-1)?.stage).toBe("resolved");
  });
});

describe("role scoping (stands in for RLS)", () => {
  it("MDRRMO sees only its own town; responder sees only its own unit", async () => {
    await appReport();
    const bam = await store.snapshot(BAM_OP);
    expect(bam.units.every((u) => u.municipality === "Bambang")).toBe(true);
    expect(bam.incidents.every((i) => i.municipality === "Bambang")).toBe(true);
    const sol = await store.snapshot(SOL_OP);
    expect(sol.incidents.some((i) => i.id === UUID)).toBe(false);
    const resp = await store.snapshot(BAM_RES);
    expect(resp.units.map((u) => u.id)).toEqual(["u-bam-res-01"]);
    expect(resp.incidents).toHaveLength(0);
    expect(resp.calls).toHaveLength(0);
  });

  it("a responder can't read another unit's assignment or any other incident", async () => {
    const inc = await appReport();
    await store.assign(EOC, inc.id, "u-bam-amb-01");
    await store.startDuty(BAM_RES);
    const other = await store.snapshot(BAM_RES);
    expect(other.myAssignment).toBeNull();
    expect(other.incidents).toHaveLength(0);
    await expect(store.incidentDetail(BAM_RES, inc.id)).rejects.toThrow(/No such incident/);
    await expect(store.assign(BAM_RES, inc.id, "u-bam-res-01")).rejects.toThrow(/operators/);
    await expect(store.history(BAM_RES, "u-bam-amb-01", iso(-1), iso(1))).rejects.toThrow();
  });

  it("MDRRMO can't dispatch another town's unit or touch another town's incident", async () => {
    const inc = await appReport();
    await expect(store.assign(SOL_OP, inc.id, "u-sol-amb-01")).rejects.toThrow(/Not found/);
    await expect(store.assign(BAM_OP, inc.id, "u-sol-amb-01")).rejects.toThrow(/Not found/);
  });

  it("views of a citizen's location are audited", async () => {
    const inc = await appReport();
    await store.assign(EOC, inc.id, "u-bam-amb-01");
    await store.snapshot(BAM_AMB);
    await store.snapshot(BAM_AMB); // within 5 min: one row
    await store.incidentDetail(BAM_OP, inc.id);
    const views = (await store.audit(EOC)).filter((a) => a.action === "view_citizen_location");
    expect(views.map((v) => v.actor_id).sort()).toEqual(["bam-amb", "bam-op"]);
    await expect(store.audit(BAM_OP)).rejects.toThrow();
  });
});

describe("hotline intake and merging", () => {
  it("a call creates an incident with the town code; another call can attach to it", async () => {
    const { call, incident } = await store.createCall(BAM_OP, {
      caller_name: "MOCK caller", caller_number: "09170000000", nature: "Flooding", location_text: "MOCK purok 2",
      lat: 16.3901, lng: 121.0801, form_extra: { landmark: "MOCK chapel", "bad key!": "x" },
    });
    expect(incident.first_source).toBe("hotline_call");
    expect(incident.code).toMatch(/^NV-BAM-\d{8}-[0-9A-F]{6}$/);
    expect(incident.municipality).toBe("Bambang"); // forced for an MDRRMO operator
    expect(call.form_extra).toEqual({ landmark: "MOCK chapel" });
    const second = await store.createCall(BAM_OP, { caller_number: "09171111111", attach_to: incident.id });
    expect(second.incident.id).toBe(incident.id);
    const d = await store.incidentDetail(EOC, incident.id);
    expect(d.calls).toHaveLength(2);
    expect(d.sources).toHaveLength(2);
  });

  it("a call near an app report is suggested as a duplicate, merged only by a person, and the citizen keeps getting updates", async () => {
    const app = await appReport();
    const { incident: call } = await store.createCall(EOC, { nature: "Flood", municipality: "Bambang", lat: 16.3905, lng: 121.0805 });
    const d = await store.incidentDetail(EOC, call.id);
    expect(d.duplicates.map((i) => i.id)).toEqual([app.id]);
    // Nothing merged automatically.
    expect((await store.incidentDetail(EOC, app.id)).incident.merged_into).toBeNull();
    // Keep the call's incident; the app report becomes its duplicate.
    await store.merge(EOC, app.id, call.id);
    const merged = await store.incidentDetail(EOC, app.id);
    expect(merged.incident.status).toBe("duplicate");
    expect(merged.incident.merged_into).toBe(call.id);
    updates = [];
    await store.assign(EOC, call.id, "u-bam-amb-01");
    // The citizen's report (original UUID and path) still hears about the response.
    expect(updates).toEqual([{ incident_id: UUID, external_ref: "users/c1/reports/r1", stage: "dispatched", agency: "MDRRMO-Bambang" }]);
  });
});

describe("hardware trackers", () => {
  it("looks up a unit by device id", async () => {
    const u = await store.unitByDevice("MOCK-IMEI-000000000000001");
    expect(u?.call_sign).toBe("NV-TRK-01");
    expect(await store.unitByDevice("nope")).toBeNull();
  });
});
