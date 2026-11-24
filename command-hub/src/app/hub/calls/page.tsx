"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapClient } from "@/components/MapClient";
import { post, useSnapshot } from "@/components/useSnapshot";
import { fmtTime } from "@/components/ui";
import { CALL_FORM_EXTRA, CALL_NATURES } from "@/config/callForm";
import { compatibleCategory, DUP_WINDOW_MS, possibleDuplicates } from "@/lib/geo";
import { TOWNS } from "@/lib/incidentId";
import { OPEN_INCIDENT_STATUSES, type Incident } from "@/lib/types";

const localNow = () => {
  const d = new Date(Date.now() + 8 * 3600e3);
  return d.toISOString().slice(0, 16); // Manila wall time for <input type="datetime-local">
};
const toIso = (local: string) => new Date(`${local}:00+08:00`).toISOString();

const EMPTY = { caller_number: "", caller_name: "", nature: "", municipality: "", barangay: "", location_text: "", notes: "" };

export default function CallsPage() {
  const { snap, now } = useSnapshot();
  const [f, setF] = useState(EMPTY);
  const [receivedAt, setReceivedAt] = useState(localNow);
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
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  // Same incident already reported (app or another call)? Suggest it while typing.
  const suggestions = useMemo(() => {
    const open = (snap?.incidents ?? []).filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status) && !i.merged_into);
    const draft: Incident = {
      id: "draft", code: "", status: "received", category: f.nature || null, description: null,
      lat: pin?.lat ?? null, lng: pin?.lng ?? null, location_text: null, barangay: null, municipality: town || null,
      first_source: "hotline_call", created_at: new Date(receivedAt ? toIso(receivedAt) : Date.now()).toISOString(),
      merged_into: null, external_ref: null,
    };
    if (pin) return possibleDuplicates(draft, open);
    if (!town) return [];
    const t = Date.parse(draft.created_at);
    return open.filter((i) => i.municipality === town && compatibleCategory(draft.category, i.category) &&
      Math.abs(Date.parse(i.created_at) - t) <= DUP_WINDOW_MS);
  }, [snap, f.nature, town, pin, receivedAt]);

  const save = async () => {
    if (busy) return;
    if (!f.caller_number.trim() && !f.caller_name.trim()) { setMsg({ kind: "err", text: "Enter the caller's number or name." }); return; }
    if (!attachTo && !town) { setMsg({ kind: "err", text: "Pick the town." }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await post<{ incident: Incident }>("/api/calls", {
        ...f, municipality: town, call_received_at: receivedAt ? toIso(receivedAt) : null,
        lat: pin?.lat ?? null, lng: pin?.lng ?? null, form_extra: extra, attach_to: attachTo,
      });
      setMsg({ kind: "ok", text: attachTo ? `Call added to ${r.incident.code}.` : `Logged as ${r.incident.code}.`, id: r.incident.id });
      setF(EMPTY); setExtra({}); setPin(null); setAttachTo(null); setReceivedAt(localNow());
      first.current?.focus();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally { setBusy(false); }
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div>
        <h1 className="text-lg font-bold">Hotline call log</h1>
        <p className="text-xs text-muted-foreground">
          Log each call while you talk. <kbd className="rounded border px-1">Ctrl</kbd>+<kbd className="rounded border px-1">Enter</kbd> saves.
          No call audio is recorded. Fields can be changed to match PDRRMO&apos;s form.
        </p>
      </div>
      {msg && (
        <p role={msg.kind === "err" ? "alert" : "status"} className={`text-sm ${msg.kind === "err" ? "text-destructive" : "text-primary"}`}>
          {msg.text} {msg.id && <Link className="underline" href={`/hub/incidents?id=${msg.id}`}>Open incident</Link>}
        </p>
      )}

      <div className="grid gap-3 xl:grid-cols-[1fr_420px]">
        <form className="card p-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void save(); } }}>
          <label className="space-y-1"><span className="label">Caller's number</span>
            <input ref={first} className="input" inputMode="tel" autoComplete="off" value={f.caller_number} onChange={set("caller_number")} placeholder="09xx xxx xxxx" /></label>
          <label className="space-y-1"><span className="label">Caller's name</span>
            <input className="input" autoComplete="off" value={f.caller_name} onChange={set("caller_name")} /></label>
          <label className="space-y-1"><span className="label">Call received (Manila time)</span>
            <input className="input" type="datetime-local" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} /></label>
          <label className="space-y-1"><span className="label">Nature of the emergency</span>
            <input className="input" list="natures" value={f.nature} onChange={set("nature")} />
            <datalist id="natures">{CALL_NATURES.map((n) => <option key={n} value={n} />)}</datalist></label>
          <label className="space-y-1"><span className="label">Town</span>
            {lockedTown ? <input className="input" value={lockedTown} readOnly /> : (
              <select className="input" value={f.municipality} onChange={set("municipality")}>
                <option value="">Pick…</option>{TOWNS.map((t) => <option key={t}>{t}</option>)}
              </select>)}</label>
          <label className="space-y-1"><span className="label">Barangay</span>
            <input className="input" value={f.barangay} onChange={set("barangay")} /></label>
          <label className="space-y-1 sm:col-span-2"><span className="label">Location, as the caller says it</span>
            <input className="input" value={f.location_text} onChange={set("location_text")} placeholder="Purok, street, landmark…" /></label>
          {CALL_FORM_EXTRA.map((x) => (
            <label key={x.key} className="space-y-1"><span className="label">{x.label}</span>
              {x.type === "select" ? (
                <select className="input" value={extra[x.key] ?? ""} onChange={(e) => setExtra((v) => ({ ...v, [x.key]: e.target.value }))}>
                  <option value="">—</option>{x.options!.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input className="input" inputMode={x.type === "number" ? "numeric" : undefined} value={extra[x.key] ?? ""}
                  onChange={(e) => setExtra((v) => ({ ...v, [x.key]: e.target.value }))} />
              )}</label>
          ))}
          <label className="space-y-1 sm:col-span-2"><span className="label">Notes</span>
            <textarea className="input min-h-[80px]" value={f.notes} onChange={set("notes")} /></label>

          {suggestions.length > 0 && (
            <div className="sm:col-span-2 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 space-y-1" role="region" aria-label="Possible same incident">
              <p className="text-sm font-semibold">Already reported? {pin ? "Within 300 m and 30 min:" : `Same town, last 30 min:`}</p>
              {suggestions.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="attach" checked={attachTo === i.id} onChange={() => setAttachTo(i.id)} />
                  <span className="font-mono">{i.code}</span> {i.category ?? "—"} · {i.location_text ?? i.municipality} · {fmtTime(i.created_at)}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="attach" checked={attachTo === null} onChange={() => setAttachTo(null)} /> No, it&apos;s a new incident
              </label>
            </div>
          )}

          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : attachTo ? "Add call to incident" : "Save call"}</button>
            <button className="btn" type="button" onClick={() => { setF(EMPTY); setExtra({}); setPin(null); setAttachTo(null); first.current?.focus(); }}>Clear</button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="card overflow-hidden" style={{ height: 300 }}>
            {snap && <MapClient nowMs={now} incidents={snap.incidents.filter((i) => OPEN_INCIDENT_STATUSES.includes(i.status))}
              trackHead={pin ? { ...pin, label: "Caller's location" } : null} onMapClick={(lat, lng) => setPin({ lat, lng })} />}
          </div>
          <p className="text-xs text-muted-foreground">
            Optional: click the map where the caller is. {pin && <button className="underline" onClick={() => setPin(null)}>Remove pin</button>}
          </p>
          <div className="card p-3">
            <h2 className="text-sm font-bold mb-1">Recent calls</h2>
            <ul className="text-sm divide-y">
              {(snap?.calls ?? []).slice(0, 10).map((c) => {
                const inc = snap?.incidents.find((i) => i.id === c.incident_id);
                return (
                  <li key={c.id} className="py-1.5">
                    {fmtTime(c.call_received_at)} · {c.caller_number ?? c.caller_name ?? "—"} · {c.nature ?? "—"}
                    {inc && <> · <Link className="font-mono underline" href={`/hub/incidents?id=${inc.id}`}>{inc.code}</Link></>}
                  </li>
                );
              })}
              {(snap?.calls ?? []).length === 0 && <li className="py-2 text-muted-foreground">None yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
