import { useMemo } from "react";
import { ClipboardList, AlertCircle, Wrench, CheckCircle2, UserX, Clock } from "lucide-react";
import { cn, isOverdue } from "@/lib/utils";
import { SLA_HOURS } from "@/lib/firebase";
import type { Report } from "@/types";

const ICON_COLORS: Record<string, { icon: string; strip: string; bg: string }> = {
  total:     { icon: "text-emerald-700", strip: "bg-emerald-600", bg: "bg-emerald-50" },
  critical:  { icon: "text-red-700",     strip: "bg-red-500",     bg: "bg-red-50" },
  ongoing:   { icon: "text-orange-700",  strip: "bg-orange-500",  bg: "bg-orange-50" },
  resolved:  { icon: "text-teal-700",    strip: "bg-teal-500",    bg: "bg-teal-50" },
  unassigned:{ icon: "text-violet-700",  strip: "bg-violet-500",  bg: "bg-violet-50" },
  overdue:   { icon: "text-amber-700",   strip: "bg-amber-500",   bg: "bg-amber-50" },
};

interface StatCardProps {
  id: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  sub: string;
  onClick?: () => void;
}

function StatCard({ id, label, value, icon, sub, onClick }: StatCardProps) {
  const c = ICON_COLORS[id];
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-white text-left shadow-sm w-full transition-all",
        onClick && "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer",
        !onClick && "cursor-default"
      )}
      aria-label={`${label}: ${value}`}
    >
      {/* colour accent strip */}
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", c.strip)} />
      <div className="p-3 sm:p-4 pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-bold tabular-nums leading-tight">{value}</p>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground/80 mt-1 leading-tight">{label}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">{sub}</p>
          </div>
          <div className={cn("p-2 rounded-md shrink-0", c.bg)}>
            <span className={c.icon}>{icon}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

interface StatsGridProps {
  reports: Report[];
  onFilterChange?: (filter: string) => void;
}

export function StatsGrid({ reports, onFilterChange }: StatsGridProps) {
  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status !== "solved");
    return {
      total: reports.length,
      criticalOpen: open.filter((r) => r.priority === "critical").length,
      ongoing: reports.filter((r) => r.status === "ongoing").length,
      resolved: reports.filter((r) => r.status === "solved").length,
      unassigned: open.filter((r) => !r.assignedResponder).length,
      overdue: open.filter((r) => isOverdue(r.reportedAt, r.status, SLA_HOURS[r.category] ?? 72)).length,
    };
  }, [reports]);

  const cards = [
    { id: "total",      label: "Total Reports",   value: stats.total,       icon: <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />, sub: "All reports",           filter: "all" },
    { id: "critical",   label: "Critical Open",   value: stats.criticalOpen,icon: <AlertCircle   className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />, sub: "Immediate action",      filter: "critical" },
    { id: "ongoing",    label: "Ongoing",         value: stats.ongoing,     icon: <Wrench        className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />, sub: "Being addressed",       filter: "ongoing" },
    { id: "resolved",   label: "Resolved",        value: stats.resolved,    icon: <CheckCircle2  className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />, sub: "Completed reports",     filter: "solved" },
    { id: "unassigned", label: "Unassigned",      value: stats.unassigned,  icon: <UserX         className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />, sub: "No responder assigned", filter: "unassigned" },
    { id: "overdue",    label: "Overdue",         value: stats.overdue,     icon: <Clock         className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />, sub: "Past SLA deadline",     filter: "overdue" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6" role="region" aria-label="Report statistics">
      {cards.map((card) => (
        <StatCard
          key={card.id}
          id={card.id}
          label={card.label}
          value={card.value}
          icon={card.icon}
          sub={card.sub}
          onClick={onFilterChange ? () => onFilterChange(card.filter) : undefined}
        />
      ))}
    </div>
  );
}
