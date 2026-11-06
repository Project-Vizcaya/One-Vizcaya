import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// SLA targets, mirroring apps/functions/reports/sla.js so the console and the
// escalation job agree. Targets are Province policy, stored at config/sla and
// editable by provincial admins. Until a provincial admin confirms them, the
// defaults apply and are labelled provisional everywhere they are used.
//
// Keyed by priority (the old per-category table matched no real category, so
// everything fell back to 72 h). Unknown priorities count as "low", as in the
// mobile app.

export const DEFAULT_SLA_HOURS = { critical: 2, high: 24, medium: 72, low: 168 } as const;
export type SlaPriority = keyof typeof DEFAULT_SLA_HOURS;
export const SLA_PRIORITIES = Object.keys(DEFAULT_SLA_HOURS) as SlaPriority[];

export interface Sla {
  hoursByPriority: Record<SlaPriority, number>;
  provisional: boolean;
}

export function resolveSla(config: Record<string, unknown> | undefined | null): Sla {
  const hours = { ...DEFAULT_SLA_HOURS } as Record<SlaPriority, number>;
  const stored = (config?.hoursByPriority ?? {}) as Record<string, unknown>;
  for (const p of SLA_PRIORITIES) {
    const v = stored[p];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) hours[p] = v;
  }
  return { hoursByPriority: hours, provisional: !(config && config.provisional === false) };
}

export function slaHoursFor(sla: Sla, priority: string): number {
  return sla.hoursByPriority[(SLA_PRIORITIES as string[]).includes(priority) ? (priority as SlaPriority) : "low"];
}

/** Live SLA config; falls back to provisional defaults until it loads. */
export function useSla(): Sla {
  const [sla, setSla] = useState<Sla>(() => resolveSla(null));
  useEffect(
    () => onSnapshot(doc(db, "config", "sla"), (s) => setSla(resolveSla(s.data())), () => setSla(resolveSla(null))),
    [],
  );
  return sla;
}
