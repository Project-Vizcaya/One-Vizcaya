"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, MapPin, Navigation, Radio } from "lucide-react";
import { MapClient } from "./MapClient";
import { post, useSnapshot } from "./useSnapshot";
import { useLocationSharing } from "./useLocationSharing";
import { fmtTime, StatusPill, STATUS_COLOR } from "./ui";
import { ageText, googleMapsUrl, wazeUrl } from "@/lib/geo";
import type { UnitStatus } from "@/lib/types";

const BUTTONS: { status: UnitStatus; label: string; needsAssignment?: boolean }[] = [
  { status: "available", label: "Available" },
  { status: "en_route", label: "En route", needsAssignment: true },
  { status: "on_scene", label: "On scene", needsAssignment: true },
  { status: "returning", label: "Returning" },
];

export function ResponderApp({ name }: { name: string }) {
  const { snap, now, reload } = useSnapshot();
  const router = useRouter();
  const unit = snap?.units[0] ?? null;
  const st = snap?.states[0] ?? null;
  const mine = snap?.myAssignment ?? null;
  // A vehicle with a GPS tracker reports its own position; the phone doesn't.
  const hardware = unit?.tracker_source === "hardware";
  const sharing = useLocationSharing(hardware ? null : unit?.id ?? null, st?.status ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await fn(); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const setStatus = (status: UnitStatus) => act(() => post("/api/units/status", { unitId: unit!.id, status }));
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };

  if (!snap || !unit || !st) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  const onDuty = st.status !== "off_duty";
  const inc = mine?.incident ?? null;

  return (
    <main className="max-w-xl mx-auto p-3 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">One Vizcaya Responder</p>
          <h1 className="text-xl font-bold">{unit.call_sign}</h1>
          <p className="text-xs text-muted-foreground">{unit.agency} · {unit.unit_type} · {name}</p>
        </div>
        <div className="text-right space-y-1">
          <StatusPill status={st.status} />
          <div><button onClick={logout} className="text-xs underline inline-flex items-center gap-1"><LogOut aria-hidden className="h-3 w-3" /> Sign out</button></div>
        </div>
      </header>

      {error && <p role="alert" className="rounded-md bg-red-50 dark:bg-red-950/40 p-2 text-sm text-destructive">{error}</p>}

      {/* Duty: no location is shared while off duty. */}
      {!onDuty ? (
        <button className="btn-primary w-full min-h-[64px] text-lg" disabled={busy} onClick={() => act(() => post("/api/duty", { action: "start" }))}>
          Start duty
        </button>
      ) : hardware ? (
        <div className="card p-3 space-y-1" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Radio aria-hidden className="h-4 w-4" /> Position comes from the vehicle&apos;s GPS tracker</p>
          <p className="text-xs text-muted-foreground">Last tracker fix {ageText(st.fix_time, now)}. This phone does not share its location.</p>
        </div>
      ) : (
        <div className="card p-3 space-y-1" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Radio aria-hidden className="h-4 w-4 animate-pulse" /> Sharing your location while on duty
          </p>
          <p className="text-xs text-muted-foreground">
            {sharing.lastFix ? `GPS ±${Math.round(sharing.lastFix.accuracy ?? 0)} m · ` : "Waiting for GPS… · "}
            {sharing.lastSentAt ? `sent ${ageText(new Date(sharing.lastSentAt).toISOString(), now)}` : "nothing sent yet"}
            {sharing.queued > 0 ? ` · ${sharing.queued} saved, waiting for signal` : ""}
          </p>
          {sharing.error && <p className="text-xs text-destructive">{sharing.error}</p>}
          <p className="text-[11px] text-muted-foreground">
            Keep this page open{sharing.wakeLock ? " (screen kept on)" : ""}. A browser can&apos;t report from the background.
          </p>
        </div>
      )}

      {/* Dispatched: confirm to start moving. */}
      {st.status === "dispatched" && inc && (
        <button className="w-full min-h-[64px] rounded-lg text-lg font-bold text-white" style={{ background: STATUS_COLOR.en_route }}
          disabled={busy} onClick={() => setStatus("en_route")}>
          Confirm dispatch · go en route
        </button>
      )}

      {onDuty && (
        <div className="grid grid-cols-2 gap-2" aria-label="Status">
          {BUTTONS.map((b) => {
            const current = st.status === b.status;
            const notAllowed = (b.needsAssignment ? !inc : false) || (b.status === "available" && !!inc);
            return (
              <button key={b.status} disabled={busy || notAllowed} aria-pressed={current}
                onClick={() => { if (!current) void setStatus(b.status); }}
                className="min-h-[64px] rounded-lg text-base font-bold text-white disabled:opacity-35"
                style={{ background: STATUS_COLOR[b.status], outline: current ? "4px solid hsl(var(--foreground))" : undefined, outlineOffset: 2 }}>
                {current ? `✓ ${b.label}` : b.label}
              </button>
            );
          })}
        </div>
      )}

      {inc ? (
        <section className="card p-3 space-y-2" aria-label="Your assignment">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">Assignment</h2>
            <span className="font-mono text-xs">{inc.code}</span>
          </div>
          <p className="font-semibold">{inc.category ?? "Incident"}</p>
          <p className="text-sm">{[inc.location_text, inc.barangay && `Brgy. ${inc.barangay}`, inc.municipality].filter(Boolean).join(" · ")}</p>
          {inc.description && <p className="text-sm whitespace-pre-wrap">{inc.description}</p>}
          {mine?.assignment.eta_seconds != null && st.status !== "on_scene" && (
            <p className="text-sm">Estimated drive: about {Math.max(1, Math.round(mine.assignment.eta_seconds / 60))} min</p>
          )}
          {inc.lat !== null && inc.lng !== null ? (
            <>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin aria-hidden className="h-3.5 w-3.5" />
                Citizen location as of {fmtTime(inc.created_at)} ({ageText(inc.created_at, now)}). Shared with your unit only until you are released.
              </p>
              <div className="rounded-md overflow-hidden border" style={{ height: 260 }}>
                <MapClient nowMs={now} incidents={[inc]} units={[unit]} states={[st]} center={[inc.lat, inc.lng]} zoom={14} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a className="btn-primary min-h-[52px]" href={googleMapsUrl(inc.lat, inc.lng)} target="_blank" rel="noopener noreferrer">
                  <Navigation aria-hidden className="h-4 w-4" /> Google Maps
                </a>
                <a className="btn min-h-[52px]" href={wazeUrl(inc.lat, inc.lng)} target="_blank" rel="noopener noreferrer">
                  <Navigation aria-hidden className="h-4 w-4" /> Waze
                </a>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-400">No map position for this incident. Use the location description and call the Command Hub.</p>
          )}
          <p className="text-[11px] text-muted-foreground">The citizen sees only that a responder is on the way and a rough arrival time, never your position.</p>
        </section>
      ) : onDuty ? (
        <p className="card p-4 text-sm text-muted-foreground">No assignment. The Command Hub will dispatch you here.</p>
      ) : null}

      {onDuty && (
        <button className="btn w-full min-h-[48px]" disabled={busy || !!inc} onClick={() => act(() => post("/api/duty", { action: "end" }))}>
          {inc ? "End duty (release your assignment first)" : "End duty · stop sharing location"}
        </button>
      )}
    </main>
  );
}
