"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, MapPin, Phone, Smartphone, Users } from "lucide-react";
import { MapClient } from "@/components/MapClient";
import { post, useSnapshot } from "@/components/useSnapshot";
import { fmtTime, IncidentPill, StatusPill } from "@/components/ui";
import { ageText, distanceM, etaRange, etaSeconds, freshness } from "@/lib/geo";
import { OPEN_INCIDENT_STATUSES, type Assignment, type CallLog, type Incident, type IncidentSourceRow, type IncidentStatus } from "@/lib/types";

type Detail = { incident: Incident; sources: IncidentSourceRow[]; calls: CallLog[]; assignments: Assignment[]; duplicates: Incident[] };

const SOURCE = {
  app_report: { label: "One Vizcaya app", icon: Smartphone },
  hotline_call: { label: "Hotline call", icon: Phone },
  barangay_report: { label: "Barangay report", icon: Building2 },
  walk_in: { label: "Walk-in", icon: Users },
} as const;

const PROGRESS: { status: IncidentStatus; label: string }[] = [
  { status: "validated", label: "Validate" },
  { status: "referred", label: "Mark referred" },
  { status: "resolved", label: "Resolved" },
];
const CLOSING: { status: IncidentStatus; label: string }[] = [
  { status: "closed", label: "Close" },
  { status: "invalid", label: "Invalid" },
];

const where = (i: Incident) => [i.location_text, i.barangay && `Brgy. ${i.barangay}`, i.municipality].filter(Boolean).join(" · ");

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
  const assignedIds = new Set((snap?.assignments ?? []).map((a) => a.incident_id));

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/incidents/${id}`, { cache: "no-store" });
    const j = await res.json();
    if (res.ok) setDetail(j); else { setDetail(null); setMsg({ kind: "err", text: j.error }); }
  }, []);

  // Re-read the detail whenever the snapshot changes (assignments, merges…).
  useEffect(() => { if (selectedId) void loadDetail(selectedId); else setDetail(null); }, [selectedId, snap, loadDetail]);
  useEffect(() => { setMsg(null); }, [selectedId]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: "ok", text: ok }); await reload(); if (selectedId) await loadDetail(selectedId); }
    catch (e) { setMsg({ kind: "err", text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  const inc = detail?.incident;
  const states = useMemo(() => new Map((snap?.states ?? []).map((s) => [s.unit_id, s])), [snap]);
  // Free units on duty, nearest first; a unit whose position is old says so and goes last.
  const candidates = useMemo(() => {
    if (!snap || !inc) return [];
    return snap.units
      .map((u) => ({ u, st: states.get(u.id)! }))
      .filter(({ st }) => st && st.status !== "off_duty" && !st.current_incident_id)
      .map((x) => {
        const f = freshness(x.st.status, x.st.fix_time, now);
        const hasPos = inc.lat !== null && inc.lng !== null && x.st.lat !== null && x.st.lng !== null;
        return {
          ...x, stale: f === "lost" || f === "none",
          dist: hasPos ? distanceM({ lat: x.st.lat!, lng: x.st.lng! }, { lat: inc.lat!, lng: inc.lng! }) : null,
          eta: hasPos ? etaSeconds({ lat: x.st.lat!, lng: x.st.lng! }, { lat: inc.lat!, lng: inc.lng! }) : null,
        };
      })
      .sort((a, b) => Number(a.stale) - Number(b.stale) || (a.dist ?? Infinity) - (b.dist ?? Infinity));
  }, [snap, inc, states, now]);
  const active = (detail?.assignments ?? []).filter((a) => !a.released_at);
  const unitName = (id: string) => snap?.units.find((u) => u.id === id)?.call_sign ?? id;
  const isOpen = inc ? OPEN_INCIDENT_STATUSES.includes(inc.status) && !inc.merged_into : false;

  return (
    <div className="p-3 sm:p-5 space-y-4">
      <header className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <h1 className="page-title">Incidents</h1>
          <p className="hint mt-0.5">{incidents.length} {showAll ? "in the last 24 hours" : "open"} · newest first</p>
        </div>
        <div role="group" aria-label="Show" className="inline-flex rounded-md border bg-card p-0.5">
          {[false, true].map((all) => (
            <button key={String(all)} onClick={() => setShowAll(all)} aria-pressed={showAll === all}
              className={`px-3 min-h-[34px] rounded text-sm font-semibold transition-colors duration-150 ${showAll === all ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              {all ? "Last 24 h" : "Open"}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <ul className="card divide-y max-h-[78vh] overflow-y-auto self-start" aria-label="Incident queue">
          {incidents.length === 0 && (
            <li className="px-4 py-12 text-center">
              <CheckCircle2 aria-hidden className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 font-bold text-sm">No open incidents</p>
              <p className="hint">New app reports and logged calls appear here.</p>
            </li>
          )}
          {incidents.map((i) => {
            const Src = SOURCE[i.first_source].icon;
            const waiting = OPEN_INCIDENT_STATUSES.includes(i.status) && !assignedIds.has(i.id);
            return (
              <li key={i.id}>
                <button onClick={() => router.push(`/hub/incidents?id=${i.id}`)} aria-current={selectedId === i.id ? "true" : undefined}
                  className={`relative w-full text-left px-3 py-3 transition-colors duration-150 hover:bg-accent ${selectedId === i.id ? "bg-accent" : ""}`}>
                  {selectedId === i.id && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-primary" />}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-code text-[13px] font-bold">{i.code}</span>
                    <IncidentPill status={i.status} />
                  </div>
                  <p className="font-bold mt-1">{i.category ?? "Uncategorised"}</p>
                  <p className="text-[13px] text-muted-foreground truncate">{where(i) || "No location given"}</p>
                  <p className="text-[13px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                    <Src aria-hidden className="h-3.5 w-3.5" /> {SOURCE[i.first_source].label} · {fmtTime(i.created_at)}
                    {waiting && <span className="font-bold text-[#A21CAF] dark:text-[#E879F9]">· needs a unit</span>}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>

        {!inc ? (
          <div className="card px-6 py-16 text-center self-start">
            <ClipboardList aria-hidden className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 font-bold">Pick an incident from the queue</p>
            <p className="hint">Its details, possible duplicates and nearest free units appear here.</p>
          </div>
        ) : (
          <div className="space-y-4 min-w-0">
            {msg && (
              <p role={msg.kind === "err" ? "alert" : "status"}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${msg.kind === "err" ? "border-destructive/40 text-destructive" : "border-primary/30 bg-gov-50 text-primary"}`}>
                {msg.text}
              </p>
            )}

            <section className="card p-4 space-y-3" aria-labelledby="inc-title">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="inc-title" className="font-code text-lg font-bold">{inc.code}</h2>
                <IncidentPill status={inc.status} />
                {inc.merged_into && (
                  <span className="text-[13px]">merged into{" "}
                    <button className="font-code font-bold text-primary hover:underline" onClick={() => router.push(`/hub/incidents?id=${inc.merged_into}`)}>
                      {snap?.incidents.find((x) => x.id === inc.merged_into)?.code ?? "another incident"}
                    </button>
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-bold">{inc.category ?? "Uncategorised"}</p>
                {inc.description && <p className="mt-1 whitespace-pre-wrap leading-relaxed">{inc.description}</p>}
              </div>
              <p className="flex items-start gap-1.5 text-sm"><MapPin aria-hidden className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />{where(inc) || "No location text"}</p>
              <p className="hint">
                Heard from {detail!.sources.map((s) => SOURCE[s.source].label).join(", ")} · first at {fmtTime(inc.created_at)} ({ageText(inc.created_at, now)}) ·
                opening an incident&apos;s location is recorded in the audit log
              </p>
              {!inc.merged_into && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                  <span className="label pt-3 w-full sm:w-auto">Status</span>
                  {PROGRESS.map((a) => (
                    <button key={a.status} className="btn mt-2" disabled={busy || inc.status === a.status}
                      onClick={() => act(() => post("/api/incidents/status", { incidentId: inc.id, status: a.status }), `${inc.code}: ${a.label.toLowerCase()}.`)}>
                      {a.label}
                    </button>
                  ))}
                  <span aria-hidden className="mx-1 mt-2 h-6 w-px bg-border hidden sm:block" />
                  {CLOSING.map((a) => (
                    <button key={a.status} className="btn mt-2 text-muted-foreground" disabled={busy || inc.status === a.status}
                      onClick={() => act(() => post("/api/incidents/status", { incidentId: inc.id, status: a.status }), `${inc.code}: ${a.label.toLowerCase()}.`)}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {detail!.duplicates.length > 0 && !inc.merged_into && (
              <section className="notice-warning space-y-2" aria-label="Possible duplicates">
                <p className="font-bold flex items-center gap-1.5"><AlertTriangle aria-hidden className="h-4 w-4" /> Possibly the same incident (within 300 m and 30 min)</p>
                {detail!.duplicates.map((d) => (
                  <div key={d.id} className="rounded-md bg-card/70 border border-[hsl(var(--warning-border))] p-2 flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <button className="font-code font-bold text-primary hover:underline" onClick={() => router.push(`/hub/incidents?id=${d.id}`)}>{d.code}</button>
                    <span className="text-muted-foreground">{d.category ?? "—"} · {SOURCE[d.first_source].label} · {fmtTime(d.created_at)}</span>
                    <span className="flex gap-2 ml-auto flex-wrap">
                      <button className="btn btn-sm" disabled={busy} onClick={() => act(() => post("/api/incidents/merge", { duplicateId: inc.id, survivorId: d.id }), `Merged into ${d.code}.`)}>
                        Merge this into {d.code}
                      </button>
                      <button className="btn btn-sm" disabled={busy} onClick={() => act(() => post("/api/incidents/merge", { duplicateId: d.id, survivorId: inc.id }), `${d.code} merged into this one.`)}>
                        Merge {d.code} into this
                      </button>
                    </span>
                  </div>
                ))}
                <p className="text-[13px]">Never merged automatically. Reporters of both keep getting updates.</p>
              </section>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="card p-4 space-y-4" aria-label="Units">
                <div>
                  <h3 className="section-title">Assigned units</h3>
                  {active.length === 0 && <p className="hint mt-1">None yet.</p>}
                  <ul className="mt-2 space-y-2">
                    {active.map((a) => {
                      const st = states.get(a.unit_id);
                      return (
                        <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                          <span className="font-code font-bold text-sm">{unitName(a.unit_id)}</span>
                          {st && <StatusPill status={st.status} />}
                          {a.eta_seconds !== null && st?.status !== "on_scene" && (
                            <span className="text-[13px]">~{Math.max(1, Math.round(a.eta_seconds / 60))} min away
                              <span className="text-muted-foreground"> · the reporter sees {etaRange(a.eta_seconds)[0] === 0 ? "under 5" : etaRange(a.eta_seconds).join("–")} min</span>
                            </span>
                          )}
                          <button className="btn btn-sm ml-auto" disabled={busy} onClick={() => act(() => post("/api/incidents/release", { assignmentId: a.id }), `${unitName(a.unit_id)} released.`)}>Release</button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {isOpen && (
                  <div>
                    <h3 className="section-title">Nearest free units</h3>
                    {candidates.length === 0 && <p className="hint mt-1">No free units on duty right now.</p>}
                    <ul className="mt-2 divide-y">
                      {candidates.slice(0, 8).map(({ u, st, dist, eta, stale }) => (
                        <li key={u.id} className="flex items-center gap-2 py-2">
                          <span className="font-code font-bold text-sm w-28 shrink-0">{u.call_sign}</span>
                          <span className="min-w-0 flex-1 text-[13px]">
                            <StatusPill status={st.status} />
                            <span className={`block mt-0.5 ${stale ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                              {stale ? `Position ${ageText(st.fix_time, now)}, may be wrong`
                                : dist !== null ? `${(dist / 1000).toFixed(1)} km · ~${Math.max(1, Math.round(eta! / 60))} min` : "No position"}
                            </span>
                          </span>
                          <button className="btn-primary btn-sm" disabled={busy}
                            onClick={() => act(() => post("/api/incidents/assign", { incidentId: inc.id, unitId: u.id }), `${u.call_sign} dispatched to ${inc.code}.`)}>
                            Assign
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="hint mt-2">Drive times are straight-line estimates until a routing service is chosen.</p>
                  </div>
                )}
              </section>

              <div className="card overflow-hidden min-h-[320px]">
                {inc.lat !== null && inc.lng !== null ? (
                  <MapClient key={inc.id} incidents={[inc]} selectedIncidentId={inc.id}
                    units={snap?.units.filter((u) => active.some((a) => a.unit_id === u.id))} states={snap?.states}
                    nowMs={now} center={[inc.lat, inc.lng]} zoom={14} />
                ) : (
                  <div className="h-full grid place-items-center p-6 text-center">
                    <div><MapPin aria-hidden className="mx-auto h-6 w-6 text-muted-foreground" />
                      <p className="mt-2 font-bold text-sm">No map position</p>
                      <p className="hint">Location as given: {inc.location_text ?? "unknown"}</p></div>
                  </div>
                )}
              </div>
            </div>

            {detail!.calls.length > 0 && (
              <section className="card p-4" aria-label="Calls">
                <h3 className="section-title mb-2">Calls about this incident</h3>
                <ul className="divide-y text-sm">
                  {detail!.calls.map((c) => (
                    <li key={c.id} className="py-2 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="font-bold tabular-nums">{fmtTime(c.call_received_at)}</span>
                      <span>{c.caller_name ?? "Unnamed caller"}{c.caller_number ? <span className="font-code"> · {c.caller_number}</span> : null}</span>
                      <span className="text-muted-foreground">{c.operator_agency}</span>
                      {(c.notes ?? c.nature) && <span className="w-full text-muted-foreground">{c.notes ?? c.nature}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {inc.external_ref && (
              <p className="hint flex items-center gap-1.5"><Smartphone aria-hidden className="h-3.5 w-3.5" /> The reporter sees this incident&apos;s stage and a rounded arrival time in the One Vizcaya app.</p>
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
