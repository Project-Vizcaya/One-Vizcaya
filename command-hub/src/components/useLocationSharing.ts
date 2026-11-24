"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { shouldSend } from "@/lib/geo";
import type { Fix, UnitStatus } from "@/lib/types";

const MAX_QUEUE = 2000;

function loadQueue(key: string): Fix[] {
  try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function saveQueue(key: string, q: Fix[]) {
  try { localStorage.setItem(key, JSON.stringify(q)); } catch { /* storage full or blocked: keep in memory */ }
}

export interface SharingState {
  active: boolean;
  lastFix: { lat: number; lng: number; accuracy: number | null; at: number } | null;
  lastSentAt: number | null;
  queued: number;
  error: string | null;
  wakeLock: boolean;
}

/**
 * Shares the unit's position while on duty (handoff §4.1): adaptive interval
 * by status, an offline queue that keeps each fix's own time and is sent in
 * order when the connection returns, and a screen wake lock (a web page can't
 * report from the background; the planned Flutter app can).
 */
export function useLocationSharing(unitId: string | null, status: UnitStatus | null) {
  const [state, setState] = useState<SharingState>({ active: false, lastFix: null, lastSentAt: null, queued: 0, error: null, wakeLock: false });
  const statusRef = useRef(status);
  statusRef.current = status;
  const lastQueued = useRef<{ lat: number; lng: number; atMs: number } | null>(null);
  const flushing = useRef(false);
  const key = unitId ? `hub-fix-queue-${unitId}` : null;

  const flush = useCallback(async () => {
    if (!key || flushing.current) return;
    const q = loadQueue(key);
    if (q.length === 0) return;
    flushing.current = true;
    try {
      const batch = q.slice(0, 200);
      const res = await fetch("/api/report-location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fixes: batch }) });
      if (res.ok) {
        const rest = loadQueue(key).slice(batch.length);
        saveQueue(key, rest);
        setState((s) => ({ ...s, lastSentAt: Date.now(), queued: rest.length, error: null }));
        if (rest.length) setTimeout(flush, 100);
      } else if (res.status === 401 || res.status === 403) {
        setState((s) => ({ ...s, error: "Signed out. Sign in again to keep sharing." }));
      } else {
        setState((s) => ({ ...s, queued: q.length, error: `Not sent (${res.status}); will retry.` }));
      }
    } catch {
      setState((s) => ({ ...s, queued: loadQueue(key).length, error: "Offline: positions are saved and will be sent when the signal returns." }));
    } finally {
      flushing.current = false;
    }
  }, [key]);

  const onDuty = !!status && status !== "off_duty";

  useEffect(() => {
    if (!key || !onDuty) { setState((s) => ({ ...s, active: false })); return; }
    if (!("geolocation" in navigator)) { setState((s) => ({ ...s, error: "This browser can't share location." })); return; }
    setState((s) => ({ ...s, active: true, queued: loadQueue(key).length }));
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, atMs: p.timestamp || Date.now() };
        setState((s) => ({ ...s, lastFix: { lat: next.lat, lng: next.lng, accuracy: p.coords.accuracy ?? null, at: next.atMs }, error: null }));
        const st = statusRef.current;
        if (!st || !shouldSend(st, lastQueued.current, next)) return;
        lastQueued.current = next;
        const fix: Fix = {
          lat: next.lat, lng: next.lng, accuracy_m: p.coords.accuracy ?? null, heading: p.coords.heading ?? null,
          speed_mps: p.coords.speed ?? null, fix_time: new Date(next.atMs).toISOString(),
        };
        const q = [...loadQueue(key), fix].slice(-MAX_QUEUE);
        saveQueue(key, q);
        setState((s) => ({ ...s, queued: q.length }));
        void flush();
      },
      (err) => setState((s) => ({ ...s, error: err.code === err.PERMISSION_DENIED
        ? "Location permission is off. Allow location for this site to share your position."
        : "Can't get a GPS fix right now." })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    const retry = setInterval(flush, 15_000);
    window.addEventListener("online", flush);

    // Keep the screen on while on duty, so the browser keeps reporting.
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const getLock = () => nav.wakeLock?.request("screen").then((l) => { lock = l; setState((s) => ({ ...s, wakeLock: true })); })
      .catch(() => setState((s) => ({ ...s, wakeLock: false })));
    void getLock();
    const onVisible = () => { if (document.visibilityState === "visible") { void getLock(); void flush(); } };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(retry);
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
      lastQueued.current = null;
    };
  }, [key, onDuty, flush]);

  return state;
}
