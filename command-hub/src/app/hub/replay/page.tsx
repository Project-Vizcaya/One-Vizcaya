"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapClient } from "@/components/MapClient";
import { useSnapshot } from "@/components/useSnapshot";
import { fmtTime } from "@/components/ui";
import type { LocationPoint } from "@/lib/types";

const toLocal = (ms: number) => new Date(ms + 8 * 3600e3).toISOString().slice(0, 16);
const fromLocal = (s: string) => new Date(`${s}:00+08:00`).toISOString();

// After-action review (handoff §4.2 P2): play back a unit's recorded track.
export default function ReplayPage() {
  const { snap, now } = useSnapshot();
  const [unitId, setUnitId] = useState("");
  const [from, setFrom] = useState(() => toLocal(Date.now() - 2 * 3600e3));
  const [to, setTo] = useState(() => toLocal(Date.now() + 5 * 60e3));
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setError(null); setPlaying(false); setI(0);
    const q = new URLSearchParams({ unit: unitId, from: fromLocal(from), to: fromLocal(to) });
    const res = await fetch(`/api/history?${q}`);
    const j = await res.json();
    if (!res.ok) { setError(j.error); setPoints([]); return; }
    setPoints(j);
    if (j.length === 0) setError("No recorded positions for this unit in that time.");
  };

  // Play at `speed`× real time, using the real gaps between fixes.
  useEffect(() => {
    if (!playing || i >= points.length - 1) { if (i >= points.length - 1) setPlaying(false); return; }
    const gap = Date.parse(points[i + 1].fix_time) - Date.parse(points[i].fix_time);
    timer.current = setTimeout(() => setI((x) => x + 1), Math.min(2000, Math.max(30, gap / speed)));
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, i, points, speed]);

  const track = useMemo(() => points.slice(0, i + 1).map((p) => [p.lat, p.lng] as [number, number]), [points, i]);
  const head = points[i];
  const unit = snap?.units.find((u) => u.id === unitId);

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <h1 className="text-lg font-bold">Replay</h1>
      <div className="card p-3 flex flex-wrap items-end gap-2">
        <label className="space-y-1"><span className="label">Unit</span>
          <select className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Pick…</option>{snap?.units.map((u) => <option key={u.id} value={u.id}>{u.call_sign}</option>)}
          </select></label>
        <label className="space-y-1"><span className="label">From (Manila)</span><input className="input" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="space-y-1"><span className="label">To</span><input className="input" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <button className="btn-primary" disabled={!unitId} onClick={load}>Load track</button>
        {points.length > 0 && (
          <>
            <button className="btn" onClick={() => { if (i >= points.length - 1) setI(0); setPlaying((p) => !p); }}>{playing ? "Pause" : "Play"}</button>
            <label className="space-y-1"><span className="label">Speed</span>
              <select className="input" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {[1, 5, 10, 30, 60].map((s) => <option key={s} value={s}>{s}×</option>)}
              </select></label>
            <input aria-label="Position in track" type="range" min={0} max={points.length - 1} value={i} onChange={(e) => { setPlaying(false); setI(Number(e.target.value)); }} className="w-48" />
            <span className="text-sm">{i + 1}/{points.length} · {head && fmtTime(head.fix_time)}{head?.incident_id ? " · on assignment" : ""}</span>
          </>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="card overflow-hidden" style={{ height: "clamp(360px, 65vh, 720px)" }}>
        <MapClient nowMs={now} track={track} trackHead={head ? { lat: head.lat, lng: head.lng, label: `${unit?.call_sign ?? ""} ${fmtTime(head.fix_time)}` } : null}
          focus={head && i === 0 ? [head.lat, head.lng] : null} />
      </div>
      <p className="text-xs text-muted-foreground">Positions not linked to an incident are deleted after 30 days; positions recorded during an assignment are kept with the incident.</p>
    </div>
  );
}
