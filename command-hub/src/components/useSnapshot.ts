"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Snapshot } from "@/lib/store/types";

/**
 * The signed-in user's role-scoped snapshot, kept current: re-read when the
 * server says something changed (server-sent events) and every 15 s as a
 * fallback. `now` ticks every 2 s so "last seen" and staleness stay honest.
 */
export function useSnapshot() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/snapshot", { cache: "no-store" });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not load.");
      setSnap(j); setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const reload = useCallback(() => {
    if (pending.current) return;
    pending.current = setTimeout(() => { pending.current = null; void load(); }, 400);
  }, [load]);

  useEffect(() => {
    void load();
    // One live connection per VISIBLE tab: hidden tabs close theirs (browsers
    // allow only ~6 connections per site over HTTP/1.1) and rely on polling.
    let es: EventSource | null = null;
    const open = () => {
      if (es) return;
      es = new EventSource("/api/events");
      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);
      es.onmessage = () => reload();
    };
    const close = () => { es?.close(); es = null; setConnected(false); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") { open(); void load(); } else close();
    };
    if (document.visibilityState === "visible") open();
    document.addEventListener("visibilitychange", onVisibility);
    const poll = setInterval(load, 15_000);
    const tick = setInterval(() => setNow(Date.now()), 2_000);
    return () => { close(); document.removeEventListener("visibilitychange", onVisibility); clearInterval(poll); clearInterval(tick); };
  }, [load, reload]);

  return { snap, error, connected, now, reload: load };
}

export async function post<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `Request failed (${res.status}).`);
  return j as T;
}
