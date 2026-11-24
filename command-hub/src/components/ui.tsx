import { BellRing, Check, MapPin, Moon, Navigation, Undo2, type LucideIcon } from "lucide-react";
import type { IncidentStatus, UnitStatus } from "@/lib/types";

// Status colours: a warmth scale that follows urgency (docs/design-system.md).
// Each status also has a glyph and a label, so colour is never the only cue.
export const STATUS: Record<UnitStatus, { label: string; bg: string; fg: string; icon: LucideIcon; svg: string }> = {
  off_duty: { label: "Off duty", bg: "#64748B", fg: "#FFFFFF", icon: Moon, svg: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>' },
  available: { label: "Available", bg: "#15803D", fg: "#FFFFFF", icon: Check, svg: '<path d="M20 6 9 17l-5-5"/>' },
  dispatched: { label: "Dispatched", bg: "#FACC15", fg: "#422006", icon: BellRing, svg: '<path d="M10.27 21a2 2 0 0 0 3.46 0"/><path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33"/>' },
  en_route: { label: "En route", bg: "#C2410C", fg: "#FFFFFF", icon: Navigation, svg: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>' },
  on_scene: { label: "On scene", bg: "#B91C1C", fg: "#FFFFFF", icon: MapPin, svg: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>' },
  returning: { label: "Returning", bg: "#0369A1", fg: "#FFFFFF", icon: Undo2, svg: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>' },
};

export const STATUS_LABEL = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label])) as Record<UnitStatus, string>;
export const STATUS_COLOR = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.bg])) as Record<UnitStatus, string>;

export function StatusPill({ status, size = "sm" }: { status: UnitStatus; size?: "sm" | "md" }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap ${size === "md" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-xs"}`}
      style={{ background: s.bg, color: s.fg }}
    >
      <Icon aria-hidden className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={2.75} />
      {s.label}
    </span>
  );
}

// Incidents: magenta, the complement of the brand green, in steps of urgency.
export const INCIDENT: Record<IncidentStatus, { label: string; bg: string }> = {
  received: { label: "Received", bg: "#C026D3" },
  validated: { label: "Validated", bg: "#A21CAF" },
  referred: { label: "Referred", bg: "#A21CAF" },
  in_progress: { label: "In progress", bg: "#701A75" },
  resolved: { label: "Resolved", bg: "#64748B" },
  closed: { label: "Closed", bg: "#64748B" },
  invalid: { label: "Invalid", bg: "#64748B" },
  duplicate: { label: "Duplicate", bg: "#64748B" },
};
export const INCIDENT_COLOR = Object.fromEntries(Object.entries(INCIDENT).map(([k, v]) => [k, v.bg])) as Record<IncidentStatus, string>;

export function IncidentPill({ status }: { status: IncidentStatus }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold text-white whitespace-nowrap" style={{ background: INCIDENT[status].bg }}>
      {INCIDENT[status].label}
    </span>
  );
}

export const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" }) : "—";
