import { useMemo } from "react";
import { ClipboardList, AlertCircle, Wrench, CheckCircle2, UserX, Clock } from "lucide-react";
import { cn, isOverdue } from "@/lib/utils";
import { SLA_HOURS } from "@/lib/firebase";
import type { Report } from "@/types";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  onClick?: () => void;
}

function StatCard({ label, value, icon, color, sub, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] w-full",
        onClick && "cursor-pointer"
      )}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-xl", color)} />
      <div className="flex items-start justify-between mt-1">
        <div>
          <p className="text-3xl font-bold mt-1">{value}</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={cn("p-2.5 rounded-lg", color.replace("bg-", "bg-").replace("-600", "-50").replace("-700", "-50").replace("-800", "-50"))}>
          {icon}
        </div>
      </div>
    </button>
  );
}

interface StatsGridProps {
  reports: Report[];
  currentUserId?: string;
  onFilterChange?: (filter: string) => void;
}

export function StatsGrid({ reports, currentUserId, onFilterChange }: StatsGridProps) {
  const stats = useMemo(() => {
    const now = new Date();
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
    {
      label: "Total Reports",
      value: stats.total,
      icon: <ClipboardList className="h-5 w-5 text-green-700" />,
      color: "bg-green-600",
      sub: "Province-wide",
      filter: "all",
    },
    {
      label: "Critical Open",
      value: stats.criticalOpen,
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      color: "bg-red-500",
      sub: "Needs immediate action",
      filter: "critical",
    },
    {
      label: "Ongoing",
      value: stats.ongoing,
      icon: <Wrench className="h-5 w-5 text-orange-600" />,
      color: "bg-orange-500",
      sub: "In progress",
      filter: "ongoing",
    },
    {
      label: "Resolved",
      value: stats.resolved,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      color: "bg-emerald-500",
      sub: "Solved reports",
      filter: "solved",
    },
    {
      label: "Unassigned",
      value: stats.unassigned,
      icon: <UserX className="h-5 w-5 text-purple-600" />,
      color: "bg-purple-500",
      sub: "No responder assigned",
      filter: "unassigned",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      color: "bg-amber-500",
      sub: "Past SLA deadline",
      filter: "overdue",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          color={card.color}
          sub={card.sub}
          onClick={onFilterChange ? () => onFilterChange(card.filter) : undefined}
        />
      ))}
    </div>
  );
}
