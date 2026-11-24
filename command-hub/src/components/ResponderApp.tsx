"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut, MapPin, Navigation, Power, Radio, Satellite } from "lucide-react";
import { MapClient } from "./MapClient";
import { post, useSnapshot } from "./useSnapshot";
import { useLocationSharing } from "./useLocationSharing";
import { fmtTime, STATUS, StatusPill } from "./ui";
import { ageText, googleMapsUrl, wazeUrl } from "@/lib/geo";
import type { UnitStatus } from "@/lib/types";

const BUTTONS: { status: UnitStatus; needsAssignment?: boolean }[] = [
  { status: "available" },
  { status: "en_route", needsAssignment: true },
  { status: "on_scene", needsAssignment: true },
  { status: "returning" },
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
  const endDuty = () => act(async () => {
    // Send saved positions first: once off duty, the Hub refuses them.
    if (!(await sharing.flush())) throw new Error("Positions saved on this phone could not be sent yet. Get a signal, then end duty.");
    await post("/api/duty", { action: "end" });
  });
  const logout = async () => { await post("/api/auth/logout", {}).catch(() => {}); router.push("/login"); router.refresh(); };

  if (!snap || !unit || !st) {
    return <p role="status" className="p-6 text-center hint">Loading your unit…</p>;
  }
  const onDuty = st.status !== "off_duty";
  const inc = mine?.incident ?? null;

  return (
    <div className="min-h-[calc(100vh-24px)] bg-background">
      <header className="bg-gov-900 text-white">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Image src="/seal.png" alt="" width={36} height={36} className="h-9 w-9" priority />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-white/75">One Vizcaya Responder</p>
            <h1 className="font-code text-xl font-bold leading-tight">{unit.call_sign}</h1>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-1.5 text-[13px] text-white/80 hover:text-white min-h-[44px] px-2">
            <LogOut aria-hidden className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-muted-foreground">{unit.agency} · {unit.unit_type}{name.includes("(demo)") ? " · demo account" : ""}</p>
          <StatusPill status={st.status} size="md" />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm font-semibold text-destructive flex gap-2">
            <AlertTriangle aria-hidden className="h-4 w-4 mt-0.5 shrink-0" />{error}
          </p>
        )}

        {/* Duty: no location is shared while off duty. */}
        {!onDuty ? (
          <section className="card p-4 space-y-3 text-center">
            <p className="font-bold">You are off duty</p>
            <p className="hint">Your location is shared with the Command Hub only while you are on duty.</p>
            <button className="btn-primary w-full min-h-[64px] text-lg" disabled={busy} onClick={() => act(() => post("/api/duty", { action: "start" }))}>
              <Power aria-hidden className="h-5 w-5" /> Start duty
            </button>
          </section>
        ) : hardware ? (
          <section className="card p-3 flex gap-3 items-start" role="status">
            <Satellite aria-hidden className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-sm">Position comes from the vehicle&apos;s GPS tracker</p>
              <p className="hint">Last tracker fix {ageText(st.fix_time, now)}. This phone does not share its location.</p>
            </div>
          </section>
        ) : (
          <section className="card p-3 flex gap-3 items-start" role="status" aria-live="polite">
            <span aria-hidden className="relative mt-1.5 flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#15803D] opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#15803D]" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm flex items-center gap-1.5"><Radio aria-hidden className="h-4 w-4 text-primary" /> Sharing your location while on duty</p>
              <p className="hint">
                {sharing.lastFix ? `GPS ±${Math.round(sharing.lastFix.accuracy ?? 0)} m` : "Waiting for GPS…"}
                {" · "}{sharing.lastSentAt ? `sent ${ageText(new Date(sharing.lastSentAt).toISOString(), now)}` : "nothing sent yet"}
                {sharing.queued > 0 ? ` · ${sharing.queued} saved, waiting for signal` : ""}
              </p>
              {sharing.error && <p className="text-[13px] font-semibold text-destructive mt-1">{sharing.error}</p>}
              <p className="hint mt-1">Keep this page open{sharing.wakeLock ? "; the screen stays on" : ""}. A browser can&apos;t report from the background.</p>
            </div>
          </section>
        )}

        {/* Dispatched: confirm to start moving. */}
        {st.status === "dispatched" && inc && (
          <button className="w-full min-h-[72px] rounded-lg text-lg font-bold shadow-sm transition-transform active:scale-[0.99]"
            style={{ background: STATUS.dispatched.bg, color: STATUS.dispatched.fg }}
            disabled={busy} onClick={() => setStatus("en_route")}>
            Confirm dispatch · go en route
          </button>
        )}

        {onDuty && (
          <section aria-label="Status" className="grid grid-cols-2 gap-3">
            {BUTTONS.map((b) => {
              const meta = STATUS[b.status];
              const Icon = meta.icon;
              const current = st.status === b.status;
              const notAllowed = (b.needsAssignment ? !inc : false) || (b.status === "available" && !!inc);
              return (
                <button key={b.status} disabled={busy || notAllowed} aria-pressed={current}
                  onClick={() => { if (!current) void setStatus(b.status); }}
                  className="relative min-h-[76px] rounded-lg font-bold flex flex-col items-center justify-center gap-1 transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-30"
                  style={{ background: meta.bg, color: meta.fg, outline: current ? "4px solid hsl(var(--foreground))" : undefined, outlineOffset: 3 }}>
                  <Icon aria-hidden className="h-6 w-6" strokeWidth={2.5} />
                  <span>{current ? `✓ ${meta.label}` : meta.label}</span>
                </button>
              );
            })}
          </section>
        )}

        {inc ? (
          <section className="card overflow-hidden" aria-labelledby="assignment-title">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 id="assignment-title" className="section-title">Your assignment</h2>
                <span className="font-code text-[13px] font-bold">{inc.code}</span>
              </div>
              <p className="text-lg font-bold">{inc.category ?? "Incident"}</p>
              <p className="text-sm flex items-start gap-1.5">
                <MapPin aria-hidden className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                {[inc.location_text, inc.barangay && `Brgy. ${inc.barangay}`, inc.municipality].filter(Boolean).join(" · ") || "No location text"}
              </p>
              {inc.description && <p className="text-sm whitespace-pre-wrap leading-relaxed">{inc.description}</p>}
              {mine?.assignment.eta_seconds != null && st.status !== "on_scene" && (
                <p className="text-sm font-bold">About {Math.max(1, Math.round(mine.assignment.eta_seconds / 60))} min drive</p>
              )}
            </div>
            {inc.lat !== null && inc.lng !== null ? (
              <>
                <div className="border-y" style={{ height: 260 }}>
                  <MapClient nowMs={now} incidents={[inc]} units={[unit]} states={[st]} center={[inc.lat, inc.lng]} zoom={14} />
                </div>
                <div className="p-4 space-y-3">
                  <p className="hint">
                    Citizen&apos;s location as of {fmtTime(inc.created_at)} ({ageText(inc.created_at, now)}). Shared with your unit only, until you are released.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <a className="btn-primary min-h-[56px] text-base" href={googleMapsUrl(inc.lat, inc.lng)} target="_blank" rel="noopener noreferrer">
                      <Navigation aria-hidden className="h-5 w-5" /> Google Maps
                    </a>
                    <a className="btn min-h-[56px] text-base" href={wazeUrl(inc.lat, inc.lng)} target="_blank" rel="noopener noreferrer">
                      <Navigation aria-hidden className="h-5 w-5" /> Waze
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <p className="mx-4 mb-4 notice-warning text-sm">No map position for this incident. Use the description and call the Command Hub.</p>
            )}
            <p className="hint px-4 pb-4">The citizen sees only that a responder is on the way and a rough arrival time, never your position.</p>
          </section>
        ) : onDuty ? (
          <section className="card px-4 py-8 text-center">
            <p className="font-bold">No assignment</p>
            <p className="hint">When the Command Hub dispatches your unit, the incident appears here.</p>
          </section>
        ) : null}

        {onDuty && (
          <button className="btn w-full min-h-[52px]" disabled={busy || !!inc} onClick={endDuty}>
            <Power aria-hidden className="h-4 w-4" />
            {inc ? "End duty (ask the dispatcher to release you first)" : "End duty · stop sharing location"}
          </button>
        )}
      </main>
    </div>
  );
}
