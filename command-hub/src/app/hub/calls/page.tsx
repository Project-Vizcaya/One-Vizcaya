"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, MapPin, PhoneCall } from "lucide-react";
import { MapClient } from "@/components/MapClient";
import { post, useSnapshot } from "@/components/useSnapshot";
import { fmtTime } from "@/components/ui";
import { CALL_FORM_EXTRA, CALL_NATURES } from "@/config/callForm";
import { compatibleCategory, DUP_WINDOW_MS, possibleDuplicates } from "@/lib/geo";
import { TOWNS } from "@/lib/incidentId";
import { OPEN_INCIDENT_STATUSES, type Incident } from "@/lib/types";

// Manila wall time for <input type="datetime-local"> (UTC+8, no daylight saving).
const toLocal = (ms: number) => new Date(ms + 8 * 3600e3).toISOString().slice(0, 16);
const toIso = (local: string) => new Date(`${local}:00+08:00`).toISOString();

const EMPTY = { caller_number: "", caller_name: "", nature: "", municipality: "", barangay: "", location_text: "", notes: "" };

export default function CallsPage() {
  const { snap, now } = useSnapshot();
  const [f, setF] = useState(EMPTY);
  // When the call came in: set at the first keystroke of a new call (the
  // operator starts typing when they answer), editable, or "now" at save.
  const [receivedAt, setReceivedAt] = useState<string>("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [attachTo, setAttachTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; id?: string } | null>(null);
  const first = useRef<HTMLInputElement>(null);
  const session = snap?.session;
  const lockedTown = session?.role === "mdrrmo" ? session.municipality : null;
  const town = lockedTown ?? f.municipality;

  useEffect(() => { first.current?.focus(); }, []);
  const started = () => { if (!receivedAt) setReceivedAt(toLocal(Date.now())); };
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    started();
    setF((x) => ({ ...x, [k]: e.target.value }));
  };

  // Same incident already reported (app or another call)? Suggest it while typing.
  const suggestions = useMemo(() => {
    const open = (snap?.incidents ?? []).filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status) && !i.merged_into);
    const at = receivedAt ? Date.parse(toIso(receivedAt)) : now;
    const draft: Incident = {
      id: "draft", code: "", status: "received", category: f.nature || null, description: null,
      lat: pin?.lat ?? null, lng: pin?.lng ?? null, location_text: null, barangay: null, municipality: town || null,
      first_source: "hotline_call", created_at: new Date(at).toISOString(), merged_into: null, external_ref: null,
    };
    if (pin) return possibleDuplicates(draft, open);
    if (!town) return [];
    return open.filter((i) => i.municipality === town && compatibleCategory(draft.category, i.category) &&
      Math.abs(Date.parse(i.created_at) - at) <= DUP_WINDOW_MS);
  }, [snap, f.nature, town, pin, receivedAt, now]);

  // Never attach to an incident the operator can no longer see in the list.
  useEffect(() => {
    if (attachTo && !suggestions.some((i) => i.id === attachTo)) setAttachTo(null);
  }, [attachTo, suggestions]);

  const reset = () => {
    setF(EMPTY); setExtra({}); setPin(null); setAttachTo(null); setReceivedAt("");
    first.current?.focus();
  };

  const save = async () => {
    if (busy) return;
    if (!f.caller_number.trim() && !f.caller_name.trim()) { setMsg({ kind: "err", text: "Enter the caller's number or name." }); first.current?.focus(); return; }
    if (!attachTo && !town) { setMsg({ kind: "err", text: "Pick the town." }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await post<{ incident: Incident }>("/api/calls", {
        ...f, municipality: town, call_received_at: receivedAt ? toIso(receivedAt) : null,
        lat: pin?.lat ?? null, lng: pin?.lng ?? null, form_extra: extra, attach_to: attachTo,
      });
      setMsg({ kind: "ok", text: attachTo ? `Call added to ${r.incident.code}.` : `Logged as ${r.incident.code}.`, id: r.incident.id });
      reset();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally { setBusy(false); }
  };

  return (
    <div className="p-3 sm:p-5 space-y-4">
      <header>
        <h1 className="page-title">Hotline call log</h1>
        <p className="hint mt-0.5">
          Type while you talk. <kbd className="font-code rounded border bg-card px-1">Ctrl</kbd> + <kbd className="font-code rounded border bg-card px-1">Enter</kbd> saves.
          Calls are not recorded; only what you type is kept.
        </p>
      </header>
      {msg && (
        <p role={msg.kind === "err" ? "alert" : "status"}
          className={`rounded-md border px-3 py-2 text-sm font-semibold flex items-center gap-2 ${msg.kind === "err" ? "border-destructive/40 text-destructive" : "border-primary/30 bg-gov-50 text-primary"}`}>
          {msg.kind === "ok" && <CheckCircle2 aria-hidden className="h-4 w-4" />}
          {msg.text} {msg.id && <Link className="underline underline-offset-2" href={`/hub/incidents?id=${msg.id}`}>Open incident</Link>}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <form className="card divide-y" onSubmit={(e) => { e.preventDefault(); void save(); }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (e.ctrlKey || e.metaKey) { e.preventDefault(); void save(); return; }
            // Plain Enter in a one-line field must not save a half-typed call.
            if ((e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
          }}>
          <fieldset className="p-4 grid gap-3 sm:grid-cols-2">
            <legend className="section-title flex items-center gap-1.5 pb-2"><PhoneCall aria-hidden className="h-4 w-4 text-primary" /> Caller</legend>
            <label className="space-y-1"><span className="label">Number</span>
              <input ref={first} className="input font-code" inputMode="tel" autoComplete="off" value={f.caller_number} onChange={set("caller_number")} placeholder="09xx xxx xxxx" /></label>
            <label className="space-y-1"><span className="label">Name</span>
              <input className="input" autoComplete="off" value={f.caller_name} onChange={set("caller_name")} /></label>
            <label className="space-y-1 sm:col-span-2 sm:max-w-xs"><span className="label">Call received (Manila time)</span>
              <input className="input" type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
              <span className="hint block">{receivedAt ? "Set when you started typing. Change it if the call came earlier." : "Fills in when you start typing."}</span></label>
          </fieldset>

          <fieldset className="p-4 grid gap-3 sm:grid-cols-2">
            <legend className="section-title flex items-center gap-1.5 pb-2"><MapPin aria-hidden className="h-4 w-4 text-primary" /> What and where</legend>
            <label className="space-y-1"><span className="label">Nature of the emergency</span>
              <input className="input" list="natures" value={f.nature} onChange={set("nature")} />
              <datalist id="natures">{CALL_NATURES.map((n) => <option key={n} value={n} />)}</datalist></label>
            <label className="space-y-1"><span className="label">Town</span>
              {lockedTown ? <input className="input bg-muted" value={lockedTown} readOnly aria-readonly /> : (
                <select className="input" value={f.municipality} onChange={set("municipality")}>
                  <option value="">Pick a town…</option>{TOWNS.map((t) => <option key={t}>{t}</option>)}
                </select>)}</label>
            <label className="space-y-1"><span className="label">Barangay</span>
              <input className="input" value={f.barangay} onChange={set("barangay")} /></label>
            <label className="space-y-1"><span className="label">Location, as the caller says it</span>
              <input className="input" value={f.location_text} onChange={set("location_text")} placeholder="Purok, street, landmark" /></label>
            <label className="space-y-1 sm:col-span-2"><span className="label">Notes</span>
              <textarea className="input min-h-[88px]" value={f.notes} onChange={set("notes")} /></label>
          </fieldset>

          <fieldset className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <legend className="section-title pb-2">More details</legend>
            {CALL_FORM_EXTRA.map((x) => (
              <label key={x.key} className="space-y-1"><span className="label">{x.label}</span>
                {x.type === "select" ? (
                  <select className="input" value={extra[x.key] ?? ""} onChange={(e) => { started(); setExtra((v) => ({ ...v, [x.key]: e.target.value })); }}>
                    <option value="">—</option>{x.options!.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input" inputMode={x.type === "number" ? "numeric" : undefined} value={extra[x.key] ?? ""}
                    onChange={(e) => { started(); setExtra((v) => ({ ...v, [x.key]: e.target.value })); }} />
                )}</label>
            ))}
          </fieldset>

          {suggestions.length > 0 && (
            <fieldset className="p-4">
              <div className="notice-warning space-y-2">
                <legend className="font-bold flex items-center gap-1.5"><AlertTriangle aria-hidden className="h-4 w-4" />
                  Already reported? {pin ? "Open incidents within 300 m and 30 min:" : "Open incidents in this town, last 30 min:"}</legend>
                {suggestions.map((i) => (
                  <label key={i.id} className="flex items-center gap-2 text-sm text-foreground rounded-md bg-card/70 border border-[hsl(var(--warning-border))] px-2 py-1.5 cursor-pointer">
                    <input type="radio" name="attach" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={attachTo === i.id} onChange={() => setAttachTo(i.id)} />
                    <span className="font-code font-bold">{i.code}</span>
                    <span className="text-muted-foreground truncate">{i.category ?? "—"} · {i.location_text ?? i.municipality} · {fmtTime(i.created_at)}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm text-foreground px-2 py-1 cursor-pointer">
                  <input type="radio" name="attach" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={attachTo === null} onChange={() => setAttachTo(null)} />
                  No, this is a new incident
                </label>
              </div>
            </fieldset>
          )}

          <div className="p-4 flex flex-wrap gap-2 items-center">
            <button className="btn-primary min-w-[160px]" type="submit" disabled={busy}>{busy ? "Saving…" : attachTo ? "Add call to incident" : "Save call"}</button>
            <button className="btn" type="button" onClick={reset}>Clear</button>
            <span className="hint ml-auto">Fields can be changed to match PDRRMO&apos;s call form.</span>
          </div>
        </form>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div style={{ height: 300 }}>
              {snap && <MapClient nowMs={now} incidents={snap.incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status))}
                trackHead={pin ? { ...pin, label: "Caller" } : null} onMapClick={(lat, lng) => { started(); setPin({ lat, lng }); }} />}
            </div>
            <p className="hint px-3 py-2 border-t flex items-center justify-between gap-2">
              <span>Optional: click the map where the caller is.</span>
              {pin && <button className="font-semibold text-primary hover:underline" onClick={() => setPin(null)}>Remove pin</button>}
            </p>
          </div>
          <section className="card" aria-label="Recent calls">
            <h2 className="section-title px-4 pt-3">Recent calls</h2>
            <ul className="divide-y text-sm mt-2">
              {(snap?.calls ?? []).slice(0, 10).map((c) => {
                const inc = snap?.incidents.find((i) => i.id === c.incident_id);
                return (
                  <li key={c.id} className="px-4 py-2 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="font-bold tabular-nums">{fmtTime(c.call_received_at)}</span>
                    <span className="font-code">{c.caller_number ?? c.caller_name ?? "—"}</span>
                    <span className="text-muted-foreground">{c.nature ?? "—"}</span>
                    {inc && <Link className="font-code font-bold text-primary hover:underline ml-auto" href={`/hub/incidents?id=${inc.id}`}>{inc.code}</Link>}
                  </li>
                );
              })}
              {(snap?.calls ?? []).length === 0 && <li className="px-4 py-6 hint text-center">No calls logged yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
