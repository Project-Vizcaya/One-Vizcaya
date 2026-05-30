import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Download, Search, ChevronDown, Filter, AlertCircle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportDetail } from "./ReportDetail";
import { updateReportStatus } from "@/hooks/useReports";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { cn, isOverdue } from "@/lib/utils";
import { SLA_HOURS } from "@/lib/firebase";
import type { Report, ReportStatus } from "@/types";

const STATUS_FILTERS = ["all", "reported", "acknowledged", "under_review", "ongoing", "solved"] as const;

function statusVariant(s: string) {
  return s as "reported" | "acknowledged" | "under_review" | "ongoing" | "solved";
}

function priorityVariant(p: string) {
  return p as "critical" | "high" | "medium" | "low";
}

interface ReportsTableProps {
  reports: Report[];
  loading: boolean;
  initialFilter?: string;
}

export function ReportsTable({ reports, loading, initialFilter = "all" }: ReportsTableProps) {
  const { user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [showCritical, setShowCritical] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [showAssignedMe, setShowAssignedMe] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ReportStatus | "">("");
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    let list = reports;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (showCritical) list = list.filter((r) => r.priority === "critical");
    if (showOverdue) list = list.filter((r) => isOverdue(r.reportedAt, r.status, SLA_HOURS[r.category] ?? 72));
    if (showAssignedMe) list = list.filter((r) => r.assignedResponder === user?.name);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.category.toLowerCase().includes(q) ||
          r.municipality.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q)
      );
    }
    if (dateFrom) list = list.filter((r) => r.reportedAt >= new Date(dateFrom));
    if (dateTo) list = list.filter((r) => r.reportedAt <= new Date(dateTo + "T23:59:59"));
    return list;
  }, [reports, statusFilter, showCritical, showOverdue, showAssignedMe, search, dateFrom, dateTo, user]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someChecked = filtered.some((r) => selected.has(r.id));

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }, [allChecked, filtered]);

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const exportCSV = () => {
    const rows = [
      ["Category", "Municipality", "Status", "Priority", "Location", "Reported At", "Assigned To", "Description"],
      ...filtered.map((r) => [
        r.category,
        r.municipality,
        r.status,
        r.priority,
        r.location,
        format(r.reportedAt, "yyyy-MM-dd HH:mm"),
        r.assignedResponder ?? "",
        r.description.replace(/,/g, " ").replace(/\n/g, " "),
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyBulkStatus = async () => {
    if (!bulkStatus) return;
    const toUpdate = filtered.filter((r) => selected.has(r.id));
    try {
      await Promise.all(toUpdate.map((r) => updateReportStatus(r.userId, r.id, bulkStatus)));
      toast({ title: `Updated ${toUpdate.length} reports`, variant: "success" as never });
      setSelected(new Set());
      setBulkConfirm(false);
      setBulkStatus("");
    } catch {
      toast({ title: "Failed to update some reports", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-foreground hover:bg-accent"
              )}
            >
              {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
          <button
            onClick={() => setShowCritical(!showCritical)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border flex items-center gap-1",
              showCritical ? "bg-red-600 text-white border-red-600" : "bg-background border-border text-foreground hover:bg-accent"
            )}
          >
            <AlertCircle className="h-3 w-3" /> Critical
          </button>
          <button
            onClick={() => setShowOverdue(!showOverdue)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border flex items-center gap-1",
              showOverdue ? "bg-amber-600 text-white border-amber-600" : "bg-background border-border text-foreground hover:bg-accent"
            )}
          >
            <Clock className="h-3 w-3" /> Overdue
          </button>
          <button
            onClick={() => setShowAssignedMe(!showAssignedMe)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border flex items-center gap-1",
              showAssignedMe ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border text-foreground hover:bg-accent"
            )}
          >
            <User className="h-3 w-3" /> Assigned to me
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex gap-1.5 items-center text-xs text-muted-foreground">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
            <span>to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-muted-foreground hover:text-foreground text-xs underline">
                clear
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs shrink-0">
            <Download className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-primary/5 rounded-lg border border-primary/20 flex-wrap">
          <span className="text-sm font-medium">{selected.size} selected</span>
          {!bulkConfirm ? (
            <>
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ReportStatus)}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue placeholder="Mark as…" />
                </SelectTrigger>
                <SelectContent>
                  {(["reported", "acknowledged", "under_review", "ongoing", "solved"] as ReportStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" disabled={!bulkStatus} onClick={() => setBulkConfirm(true)}>Apply</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSelected(new Set()); setBulkConfirm(false); }}>Cancel</Button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Mark {selected.size} reports as "{bulkStatus}"?</span>
              <Button size="sm" className="h-7 text-xs" onClick={applyBulkStatus}>Confirm</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBulkConfirm(false)}>Back</Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-3 py-2.5 text-left">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={toggleAll}
                    className="data-[state=indeterminate]:bg-primary/50"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Municipality</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Reported</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-3" colSpan={7}><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-muted-foreground">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No reports match your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const overdue = isOverdue(r.reportedAt, r.status, SLA_HOURS[r.category] ?? 72);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t hover:bg-accent/50 cursor-pointer transition-colors",
                        selected.has(r.id) && "bg-primary/5",
                        overdue && "bg-amber-50/50"
                      )}
                      onClick={() => setSelectedReport(r)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={() => toggleRow(r.id)}
                          aria-label="Select row"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium truncate max-w-[140px]">{r.category}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[140px] sm:hidden">{r.municipality}</div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className="text-muted-foreground">{r.municipality}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={statusVariant(r.status)} className="text-xs whitespace-nowrap capitalize">
                          {r.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={priorityVariant(r.priority)} className="text-xs capitalize">
                          {r.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">
                        {format(r.reportedAt, "MMM d, h:mm a")}
                        {overdue && <span className="ml-1 text-amber-600 font-medium">⏰</span>}
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell text-muted-foreground text-xs truncate max-w-[120px]">
                        {r.assignedResponder ?? <span className="text-muted-foreground/50">Unassigned</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Showing {filtered.length} of {reports.length} reports
      </p>

      <ReportDetail report={selectedReport} open={!!selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
