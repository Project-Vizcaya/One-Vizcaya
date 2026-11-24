"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, WifiOff } from "lucide-react";
import { MapClient } from "@/components/MapClient";
import { useSnapshot } from "@/components/useSnapshot";
import { IncidentPill, STATUS, StatusPill } from "@/components/ui";
import { ageText, freshness } from "@/lib/geo";
import { OPEN_INCIDENT_STATUSES, UNIT_STATUSES, type UnitStatus } from "@/lib/types";

const FRESH_TEXT = { live: "", fading: "Weak signal", lost: "Signal lost", none: "No position yet" } as const;
const ON_DUTY = UNIT_STATUSES.filter((s) => s !== "off_duty");

export default function LiveMapPage() {
  const { snap, error, connected, now } = useSnapshot();
  const router = useRouter();
  const [status, setStatus] = useState<UnitStatus | "all" | "on_duty">("on_duty");
  const [agency, setAgency] = useState("all");
  const [town, setTown] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<[number, number] | null>(null);

  const states = useMemo(() => new Map((snap?.states ?? []).map((s) => [s.unit_id, s])), [snap]);
  const units = snap?.units ?? [];
  const agencies = [...new Set(units.map((u) => u.agency))].sort();
  const towns = [...new Set(units.map((u) => u.municipality))].sort();
  const shown = units.filter((u) => {
    const st = states.get(u.id);
    if (!st) return false;
    if (status === "on_duty" ? st.status === "off_duty" : status !== "all" && st.status !== status) return false;
    return (agency === "all" || u.agency === agency) && (town === "all" || u.municipality === town);
  });
  const open = (snap?.incidents ?? []).filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status));
  const unassigned = open.filter((i) => !(snap?.assignments ?? []).some((a) => a.incident_id === i.id));

  return (
    <div className="p-3 sm:p-5 space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Live map</h1>
          <p className="hint flex items-center gap-1.5 mt-0.5" role="status">
            {connected
              ? <><Radio aria-hidden className="h-3.5 w-3.5 text-primary" /> Live</>
              : <><WifiOff aria-hidden className="h-3.5 w-3.5" /> Reconnecting · refreshing every 15 s</>}
          </p>
        </div>
        <dl className="flex flex-wrap gap-2">
          <Stat label="Open incidents" value={open.length} />
          <Stat label="Waiting for a unit" value={unassigned.length} tone={unassigned.length ? "alert" : undefined} />
          <Stat label="Units on duty" value={units.filter((u) => states.get(u.id)?.status !== "off_duty").length} />
        </dl>
      </header>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-2 min-w-0">
          <div className="card overflow-hidden" style={{ height: "clamp(380px, 68vh, 780px)" }}>
            {snap && (
              <MapClient units={shown} states={snap.states} incidents={open} nowMs={now} focus={focus} selectedUnitId={selected}
                onSelectUnit={setSelected} onSelectIncident={(id) => router.push(`/hub/incidents?id=${id}`)} />
            )}
          </div>
          <Legend />
        </div>

        <section className="card min-w-0 flex flex-col" aria-label="Units">
          <div className="p-3 border-b grid grid-cols-3 gap-2">
            <label className="space-y-1"><span className="label">Status</span>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="on_duty">On duty</option><option value="all">All units</option>
                {UNIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select></label>
            <label className="space-y-1"><span className="label">Agency</span>
              <select className="input" value={agency} onChange={(e) => setAgency(e.target.value)}>
                <option value="all">All</option>{agencies.map((a) => <option key={a}>{a}</option>)}
              </select></label>
            <label className="space-y-1"><span className="label">Town</span>
              <select className="input" value={town} onChange={(e) => setTown(e.target.value)}>
                <option value="all">All</option>{towns.map((a) => <option key={a}>{a}</option>)}
              </select></label>
          </div>
          <ul className="divide-y overflow-y-auto max-h-[64vh]">
            {shown.length === 0 && <li className="px-4 py-10 text-center hint">No units match these filters.</li>}
            {shown.map((u) => {
              const st = states.get(u.id)!;
              const f = freshness(st.status, st.fix_time, now);
              const inc = st.current_incident_id ? snap?.incidents.find((i) => i.id === st.current_incident_id) : null;
              return (
                <li key={u.id}>
                  <button
                    className={`w-full text-left px-3 py-2.5 transition-colors duration-150 hover:bg-accent ${selected === u.id ? "bg-accent" : ""}`}
                    aria-pressed={selected === u.id}
                    onClick={() => { setSelected(u.id); if (st.lat !== null && st.lng !== null) setFocus([st.lat, st.lng]); }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-code font-bold text-sm">{u.call_sign}</span>
                      <StatusPill status={st.status} />
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {u.agency} · {u.unit_type}{u.tracker_source === "hardware" ? " · GPS tracker" : ""}
                    </p>
                    {st.status !== "off_duty" && (
                      <p className={`text-[13px] mt-0.5 ${f === "lost" || f === "none" ? "text-destructive font-bold" : f === "fading" ? "font-bold" : "text-muted-foreground"}`}>
                        {FRESH_TEXT[f] ? `${FRESH_TEXT[f]} · ` : ""}last fix {ageText(st.fix_time, now)}
                      </p>
                    )}
                    {inc && (
                      <p className="text-[13px] mt-1 flex items-center gap-1.5">
                        <span className="text-muted-foreground">Assigned</span>
                        <Link className="font-code font-bold text-primary underline-offset-2 hover:underline" href={`/hub/incidents?id=${inc.id}`}>{inc.code}</Link>
                        <IncidentPill status={inc.status} />
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "alert" }) {
  return (
    <div className={`rounded-lg border px-3 py-1.5 min-w-[112px] ${tone === "alert" ? "border-[#C026D3] bg-[#C026D3]/10" : "bg-card"}`}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className={`text-xl font-bold tabular-nums ${tone === "alert" ? "text-[#A21CAF] dark:text-[#E879F9]" : ""}`}>{value}</dd>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground" aria-label="Map legend">
      {ON_DUTY.map((s) => <StatusPill key={s} status={s} />)}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-[#C026D3]" /> Incident
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full border-2 border-dashed border-[#64748B]" /> Signal lost (no fix for 5 min)
      </span>
    </div>
  );
}
