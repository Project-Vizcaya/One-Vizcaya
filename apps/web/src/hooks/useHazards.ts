import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PagasaMobileAlert, QuakeSignal } from "@/lib/hazards";

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const s = (v: unknown) => (typeof v === "string" && v ? v : null);
const ms = (v: unknown) => (typeof v === "number" ? new Date(v) : v instanceof Timestamp ? v.toDate() : null);

/** Earthquakes near the province (hazard_signals, written by hazardWatch). */
export function useQuakeSignals() {
  const [quakes, setQuakes] = useState<QuakeSignal[]>([]);
  useEffect(() => onSnapshot(query(collection(db, "hazard_signals"), orderBy("timeMs", "desc")), (snap) => {
    setQuakes(snap.docs.flatMap((d) => {
      const x = d.data();
      const mag = n(x.magnitude), lat = n(x.lat), lon = n(x.lon), t = n(x.timeMs);
      const source = x.source === "phivolcs" || x.source === "usgs" ? x.source : null;
      if (mag === null || lat === null || lon === null || t === null || !source) return [];
      const level = ["critical", "warning", "watch", "info"].includes(x.level) ? x.level : "info";
      return [{ id: d.id, source, magnitude: mag, depthKm: n(x.depthKm), lat, lon, place: s(x.place), timeMs: t,
        url: s(x.url), distanceKm: n(x.distanceKm) ?? 0, level, supersededBy: s(x.supersededBy) }];
    }));
  }, () => setQuakes([])), []);
  return quakes;
}

export interface FeedStatus { enabled: boolean; lastOkAt: Date | null; lastError: string | null; count: number | null }

/** USGS / PHIVOLCS feed state (admins only). */
export function useHazardFeedStatus() {
  const [status, setStatus] = useState<Record<string, FeedStatus>>({});
  useEffect(() => onSnapshot(collection(db, "hazard_feed_status"), (snap) => {
    const out: Record<string, FeedStatus> = {};
    snap.docs.forEach((d) => {
      const x = d.data();
      out[d.id] = { enabled: x.enabled === true, lastOkAt: ms(x.lastOkAtMs), lastError: s(x.lastError), count: n(x.count) };
    });
    setStatus(out);
  }, () => setStatus({})), []);
  return status;
}

/** Active PAGASA alerts from the PAGASA mobile source, when it is switched on. */
export function usePagasaMobileAlerts() {
  const [alerts, setAlerts] = useState<PagasaMobileAlert[]>([]);
  const [on, setOn] = useState(false);
  useEffect(() => onSnapshot(doc(db, "weather_pagasa", "_status"),
    (snap) => setOn(!!snap.data() && snap.data()!.mode !== "internationalOnly"), () => setOn(false)), []);
  useEffect(() => {
    if (!on) { setAlerts([]); return; }
    return onSnapshot(doc(db, "weather_pagasa", "alerts"), (snap) => {
      const list = Array.isArray(snap.data()?.active) ? snap.data()!.active : [];
      setAlerts(list.flatMap((a: Record<string, unknown>) => {
        const title = s(a.title);
        return title ? [{ id: s(a.id) ?? title, title, message: s(a.message) ?? "",
          issuedAt: ms(a.issuedAtMs), validUntil: ms(a.validUntilMs), priority: n(a.priority) ?? 0 }] : [];
      }));
    }, () => setAlerts([]));
  }, [on]);
  return alerts;
}
