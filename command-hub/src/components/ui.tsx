import type { UnitStatus } from "@/lib/types";

export const STATUS_LABEL: Record<UnitStatus, string> = {
  off_duty: "Off duty", available: "Available", dispatched: "Dispatched", en_route: "En route", on_scene: "On scene", returning: "Returning",
};
export const STATUS_COLOR: Record<UnitStatus, string> = {
  off_duty: "#6b7280", available: "#16a34a", dispatched: "#d97706", en_route: "#ea580c", on_scene: "#dc2626", returning: "#2563eb",
};

export function StatusPill({ status }: { status: UnitStatus }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: STATUS_COLOR[status] }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export const INCIDENT_COLOR: Record<string, string> = {
  received: "#7c3aed", validated: "#9333ea", referred: "#a855f7", in_progress: "#db2777",
  resolved: "#16a34a", closed: "#6b7280", invalid: "#6b7280", duplicate: "#6b7280",
};

export const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" }) : "—";
