"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapClient } from "@/components/MapClient";
import { useSnapshot } from "@/components/useSnapshot";
import { STATUS_COLOR, STATUS_LABEL, StatusPill } from "@/components/ui";
import { ageText, freshness } from "@/lib/geo";
import { OPEN_INCIDENT_STATUSES, UNIT_STATUSES, type UnitStatus } from "@/lib/types";

const FRESH_TEXT = { live: "", fading: "weak signal", lost: "signal lost", none: "no position yet" } as const;

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
  const counts = UNIT_STATUSES.filter((s) => s !== "off_duty").map((s) => [s, units.filter((u) => states.get(u.id)?.status === s).length] as const);

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">Live map</h1>
          <p className="text-xs text-muted-foreground">
            {connected ? "Live updates on" : "Reconnecting… (refreshing every 15 s)"} · {open.length} open incidents
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Units by status">
          {counts.map(([s, n]) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />{STATUS_LABEL[s]} {n}
            </span>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden" style={{ height: "clamp(360px, 70vh, 760px)" }}>
          {snap && (
            <MapClient units={shown} states={snap.states} incidents={open} nowMs={now} focus={focus} selectedUnitId={selected}
              onSelectUnit={setSelected} onSelectIncident={(id) => router.push(`/hub/incidents?id=${id}`)} />
          )}
        </div>

        <div className="card p-3 space-y-3 min-w-0">
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1"><span className="label">Status</span>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="on_duty">On duty</option><option value="all">All</option>
                {UNIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
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
          <ul className="divide-y max-h-[60vh] overflow-y-auto" aria-label="Units">
            {shown.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No units match.</li>}
            {shown.map((u) => {
              const st = states.get(u.id)!;
              const f = freshness(st.status, st.fix_time, now);
              const inc = st.current_incident_id ? snap?.incidents.find((i) => i.id === st.current_incident_id) : null;
              return (
                <li key={u.id}>
                  <button className={`w-full text-left py-2 px-1 rounded-md hover:bg-accent ${selected === u.id ? "bg-accent" : ""}`}
                    onClick={() => { setSelected(u.id); if (st.lat !== null && st.lng !== null) setFocus([st.lat, st.lng]); }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{u.call_sign}</span>
                      <StatusPill status={st.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {u.agency} · {u.unit_type}{u.tracker_source === "hardware" ? " · GPS tracker" : ""}
                    </p>
                    {st.status !== "off_duty" && (
                      <p className={`text-xs ${f === "lost" ? "text-destructive font-semibold" : f === "fading" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {FRESH_TEXT[f] ? `${FRESH_TEXT[f]} · ` : ""}last fix {ageText(st.fix_time, now)}
                      </p>
                    )}
                    {inc && <p className="text-xs">→ <Link className="text-primary underline" href={`/hub/incidents?id=${inc.id}`}>{inc.code}</Link></p>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Faded marker: no fix for 30 s while moving. Grey ring: signal lost (over 5 min). A stale dot is never shown as live.
          </p>
        </div>
      </div>
    </div>
  );
}
