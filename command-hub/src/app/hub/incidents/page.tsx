"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { MapClient } from "@/components/MapClient";
import { post, useSnapshot } from "@/components/useSnapshot";
import { fmtTime, INCIDENT_COLOR, StatusPill } from "@/components/ui";
import { distanceM, etaRange, etaSeconds } from "@/lib/geo";
import { OPEN_INCIDENT_STATUSES, type Assignment, type CallLog, type Incident, type IncidentSourceRow, type IncidentStatus } from "@/lib/types";

type Detail = { incident: Incident; sources: IncidentSourceRow[]; calls: CallLog[]; assignments: Assignment[]; duplicates: Incident[] };

const SOURCE_LABEL = { app_report: "One Vizcaya app", hotline_call: "Hotline call", barangay_report: "Barangay report", walk_in: "Walk-in" } as const;
const STATUS_ACTIONS: { status: IncidentStatus; label: string }[] = [
  { status: "validated", label: "Validate" },
  { status: "referred", label: "Referred" },
  { status: "resolved", label: "Resolved" },
  { status: "closed", label: "Close" },
  { status: "invalid", label: "Invalid" },
];

function IncidentsInner() {
  const { snap, now, reload } = useSnapshot();
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("id");
  const [showAll, setShowAll] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const incidents = (snap?.incidents ?? []).filter((i) => showAll || OPEN_INCIDENT_STATUSES.includes(i.status));

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/incidents/${id}`, { cache: "no-store" });
    const j = await res.json();
    if (res.ok) setDetail(j); else { setDetail(null); setMsg({ kind: "err", text: j.error }); }
  }, []);

  // Re-read the detail whenever the snapshot changes (assignments, merges…).
  useEffect(() => { if (selectedId) void loadDetail(selectedId); else setDetail(null); }, [selectedId, snap, loadDetail]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: "ok", text: ok }); await reload(); if (selectedId) await loadDetail(selectedId); }
    catch (e) { setMsg({ kind: "err", text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const inc = detail?.incident;
  const states = useMemo(() => new Map((snap?.states ?? []).map((s) => [s.unit_id, s])), [snap]);
  const candidates = useMemo(() => {
    if (!snap || !inc) return [];
    return snap.units
      .map((u) => ({ u, st: states.get(u.id)! }))
      .filter(({ st }) => st && st.status !== "off_duty" && !st.current_incident_id)
      .map((x) => ({
        ...x,
        dist: inc.lat !== null && inc.lng !== null && x.st.lat !== null && x.st.lng !== null
          ? distanceM({ lat: x.st.lat, lng: x.st.lng }, { lat: inc.lat, lng: inc.lng }) : null,
      }))
      .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
  }, [snap, inc, states]);
  const active = (detail?.assignments ?? []).filter((a) => !a.released_at);
  const unitName = (id: string) => snap?.units.find((u) => u.id === id)?.call_sign ?? id;

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-bold">Incidents</h1>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Include closed (last 24 h)
        </label>
      </div>
      {msg && <p role={msg.kind === "err" ? "alert" : "status"} className={`text-sm ${msg.kind === "err" ? "text-destructive" : "text-primary"}`}>{msg.text}</p>}

      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        <ul className="card divide-y max-h-[75vh] overflow-y-auto" aria-label="Incident queue">
          {incidents.length === 0 && <li className="p-6 text-sm text-center text-muted-foreground">No incidents.</li>}
          {incidents.map((i) => (
            <li key={i.id}>
              <button onClick={() => router.push(`/hub/incidents?id=${i.id}`)}
                className={`w-full text-left p-3 hover:bg-accent ${selectedId === i.id ? "bg-accent" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold">{i.code}</span>
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: INCIDENT_COLOR[i.status] }}>
                    {i.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm font-semibold">{i.category ?? "Uncategorised"}</p>
                <p className="text-xs text-muted-foreground truncate">{[i.location_text, i.barangay && `Brgy. ${i.barangay}`, i.municipality].filter(Boolean).join(" · ")}</p>
                <p className="text-xs text-muted-foreground">{SOURCE_LABEL[i.first_source]} · {fmtTime(i.created_at)}</p>
              </button>
            </li>
          ))}
        </ul>

        {!inc ? (
          <div className="card p-6 text-sm text-muted-foreground">Pick an incident.</div>
        ) : (
          <div className="space-y-3 min-w-0">
            <div className="card p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono font-bold">{inc.code}</h2>
                <span className="rounded px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: INCIDENT_COLOR[inc.status] }}>{inc.status.replace("_", " ")}</span>
                {inc.merged_into && <span className="text-xs">merged into {snap?.incidents.find((x) => x.id === inc.merged_into)?.code ?? "another incident"}</span>}
              </div>
              <p className="font-semibold">{inc.category ?? "Uncategorised"}</p>
              {inc.description && <p className="text-sm whitespace-pre-wrap">{inc.description}</p>}
              <p className="text-sm">{[inc.location_text, inc.barangay && `Brgy. ${inc.barangay}`, inc.municipality].filter(Boolean).join(" · ") || "No location text"}</p>
              <p className="text-xs text-muted-foreground">
                Heard from: {detail!.sources.map((s) => SOURCE_LABEL[s.source]).join(", ")} · first {fmtTime(inc.created_at)}
              </p>
              <p className="text-[11px] text-muted-foreground">Opening an incident's location is recorded in the audit log.</p>
              {!inc.merged_into && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {STATUS_ACTIONS.map((a) => (
                    <button key={a.status} className="btn" disabled={busy || inc.status === a.status}
                      onClick={() => act(() => post("/api/incidents/status", { incidentId: inc.id, status: a.status }), `Marked ${a.label.toLowerCase()}.`)}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {detail!.duplicates.length > 0 && !inc.merged_into && (
              <div className="card p-3 border-amber-400 bg-amber-50 dark:bg-amber-950/30 space-y-2" role="region" aria-label="Possible duplicates">
                <p className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle aria-hidden className="h-4 w-4" /> Possible duplicate (within 300 m and 30 min)</p>
                {detail!.duplicates.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <button className="font-mono underline" onClick={() => router.push(`/hub/incidents?id=${d.id}`)}>{d.code}</button>
                    <span className="text-muted-foreground">{d.category ?? "—"} · {SOURCE_LABEL[d.first_source]} · {fmtTime(d.created_at)}</span>
                    <button className="btn" disabled={busy} onClick={() => act(() => post("/api/incidents/merge", { duplicateId: inc.id, survivorId: d.id }), `Merged into ${d.code}.`)}>
                      Merge this into {d.code}
                    </button>
                    <button className="btn" disabled={busy} onClick={() => act(() => post("/api/incidents/merge", { duplicateId: d.id, survivorId: inc.id }), `${d.code} merged into this one.`)}>
                      Merge {d.code} into this
                    </button>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">Never merged automatically. Reporters of both keep getting updates.</p>
              </div>
            )}

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="card p-3 space-y-2">
                <h3 className="text-sm font-bold">Assigned units</h3>
                {active.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
                {active.map((a) => {
                  const st = states.get(a.unit_id);
                  return (
                    <div key={a.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{unitName(a.unit_id)}</span>
                      {st && <StatusPill status={st.status} />}
                      {a.eta_seconds !== null && st?.status !== "on_scene" && (
                        <span className="text-xs">ETA ~{Math.round(a.eta_seconds / 60)} min <span className="text-muted-foreground">(citizen sees {etaRange(a.eta_seconds).join("–")} min)</span></span>
                      )}
                      <button className="btn ml-auto" disabled={busy} onClick={() => act(() => post("/api/incidents/release", { assignmentId: a.id }), "Unit released.")}>Release</button>
                    </div>
                  );
                })}
                {OPEN_INCIDENT_STATUSES.includes(inc.status) && (
                  <>
                    <h3 className="text-sm font-bold pt-2">Assign a unit</h3>
                    {candidates.length === 0 && <p className="text-sm text-muted-foreground">No free units on duty.</p>}
                    <ul className="divide-y">
                      {candidates.slice(0, 8).map(({ u, st, dist }) => (
                        <li key={u.id} className="flex items-center gap-2 py-1.5">
                          <span className="text-sm font-semibold w-28">{u.call_sign}</span>
                          <StatusPill status={st.status} />
                          <span className="text-xs text-muted-foreground">
                            {dist !== null ? `${(dist / 1000).toFixed(1)} km · ~${Math.round(etaSeconds({ lat: st.lat!, lng: st.lng! }, { lat: inc.lat!, lng: inc.lng! }) / 60)} min` : "no position"}
                          </span>
                          <button className="btn-primary ml-auto" disabled={busy}
                            onClick={() => act(() => post("/api/incidents/assign", { incidentId: inc.id, unitId: u.id }), `${u.call_sign} dispatched.`)}>Assign</button>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-muted-foreground">ETA is a straight-line estimate until a routing service is chosen.</p>
                  </>
                )}
              </div>

              <div className="card overflow-hidden" style={{ height: 320 }}>
                {inc.lat !== null && inc.lng !== null ? (
                  <MapClient incidents={[inc]} units={snap?.units.filter((u) => active.some((a) => a.unit_id === u.id))} states={snap?.states}
                    nowMs={now} center={[inc.lat, inc.lng]} zoom={14} />
                ) : <div className="p-4 text-sm text-muted-foreground">No map position. Location: {inc.location_text ?? "unknown"}.</div>}
              </div>
            </div>

            {detail!.calls.length > 0 && (
              <div className="card p-3">
                <h3 className="text-sm font-bold mb-1">Calls about this incident</h3>
                <ul className="text-sm space-y-1">
                  {detail!.calls.map((c) => (
                    <li key={c.id}>{fmtTime(c.call_received_at)} · {c.caller_name ?? "Unnamed caller"} {c.caller_number ? `(${c.caller_number})` : ""} · {c.operator_agency} · {c.notes ?? c.nature ?? ""}</li>
                  ))}
                </ul>
              </div>
            )}
            {inc.external_ref && (
              <p className="text-xs text-muted-foreground flex items-center gap-1"><ExternalLink aria-hidden className="h-3 w-3" /> One Vizcaya report: the reporter sees this incident's stage and a rounded ETA in the app.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  return <Suspense><IncidentsInner /></Suspense>;
}
