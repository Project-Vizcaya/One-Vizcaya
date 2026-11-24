"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { shouldSend } from "@/lib/geo";
import type { Fix, UnitStatus } from "@/lib/types";

const MAX_QUEUE = 2000;

function loadQueue(key: string): Fix[] {
  try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function saveQueue(key: string, q: Fix[]) {
  try { localStorage.setItem(key, JSON.stringify(q)); } catch { /* storage full or blocked */ }
}

/** One tab at a time touches the saved queue (Web Locks; falls back to running directly). */
function withQueueLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: { request: (n: string, f: () => Promise<T>) => Promise<T> } }).locks;
  return locks ? locks.request(key, fn) : fn();
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
  const alive = useRef(true);
  const key = unitId ? `hub-fix-queue-${unitId}` : null;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  /** Sends saved fixes, oldest first, 200 at a time. Resolves when the queue is empty or sending failed. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (!key || !unitId) return true;
    return withQueueLock(key, async () => {
      for (;;) {
        if (!alive.current) return false;
        const q = loadQueue(key);
        if (q.length === 0) { setState((s) => ({ ...s, queued: 0 })); return true; }
        const batch = q.slice(0, 200);
        let res: Response;
        try {
          res = await fetch("/api/report-location", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ unitId, fixes: batch }),
          });
        } catch {
          setState((s) => ({ ...s, queued: q.length, error: "No signal. Positions are saved and will be sent when the signal returns." }));
          return false;
        }
        if (res.ok) {
          saveQueue(key, loadQueue(key).slice(batch.length));
          if (alive.current) setState((s) => ({ ...s, lastSentAt: Date.now(), error: null }));
          continue;
        }
        if (res.status === 401) {
          setState((s) => ({ ...s, error: "Signed out. Sign in again to keep sharing." }));
          return false;
        }
        setState((s) => ({ ...s, queued: q.length, error: `Not sent (${res.status}). Will retry.` }));
        return false;
      }
    });
  }, [key, unitId]);

  const onDuty = !!status && status !== "off_duty";

  useEffect(() => {
    if (!key || !onDuty) { setState((s) => ({ ...s, active: false })); return; }
    if (!("geolocation" in navigator)) { setState((s) => ({ ...s, error: "This browser can't share location." })); return; }
    setState((s) => ({ ...s, active: true, queued: loadQueue(key).length }));
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, atMs: p.timestamp || Date.now() };
        setState((s) => ({ ...s, lastFix: { lat: next.lat, lng: next.lng, accuracy: p.coords.accuracy ?? null, at: next.atMs } }));
        const st = statusRef.current;
        if (!st || !shouldSend(st, lastQueued.current, next)) return;
        lastQueued.current = next;
        const fix: Fix = {
          lat: next.lat, lng: next.lng, accuracy_m: p.coords.accuracy ?? null, heading: p.coords.heading ?? null,
          speed_mps: p.coords.speed ?? null, fix_time: new Date(next.atMs).toISOString(),
        };
        void withQueueLock(key, async () => {
          const q = [...loadQueue(key), fix].slice(-MAX_QUEUE);
          saveQueue(key, q);
          setState((s) => ({ ...s, queued: q.length }));
        }).then(() => flush());
      },
      (err) => setState((s) => ({ ...s, error: err.code === err.PERMISSION_DENIED
        ? "Location is blocked for this site. Allow it in the browser's site settings."
        : "Can't get a GPS fix right now." })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    const retry = setInterval(() => { void flush(); }, 15_000);
    const online = () => { void flush(); };
    window.addEventListener("online", online);

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
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
      lastQueued.current = null;
    };
  }, [key, onDuty, flush]);

  return { ...state, flush };
}
