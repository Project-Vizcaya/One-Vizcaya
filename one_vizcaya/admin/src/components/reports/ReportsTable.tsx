import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Download, Search, Filter, AlertCircle, Clock, User, ChevronRight } from "lucide-react";
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

const STATUS_FILTERS = [
  { value: "all",          label: "All" },
  { value: "reported",     label: "Reported" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "under_review", label: "Under Review" },
  { value: "ongoing",      label: "Ongoing" },
  { value: "solved",       label: "Solved" },
] as const;

const STATUS_VARIANT: Record<string, "reported" | "acknowledged" | "under_review" | "ongoing" | "solved"> = {
  reported: "reported", acknowledged: "acknowledged", under_review: "under_review", ongoing: "ongoing", solved: "solved",
};

const PRIORITY_VARIANT: Record<string, "critical" | "high" | "medium" | "low"> = {
  critical: "critical", high: "high", medium: "medium", low: "low",
};

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

  // Stable user name ref for filter — avoids recomputing on every user object change
  const userName = user?.name;

  const filtered = useMemo(() => {
    let list = reports;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (showCritical) list = list.filter((r) => r.priority === "critical");
    if (showOverdue) list = list.filter((r) => isOverdue(r.reportedAt, r.status, SLA_HOURS[r.category] ?? 72));
    // Compare by responder name (stored field), not UID
    if (showAssignedMe && userName) list = list.filter((r) => r.assignedResponder === userName);
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
    if (dateTo)   list = list.filter((r) => r.reportedAt <= new Date(`${dateTo}T23:59:59`));
    return list;
  }, [reports, statusFilter, showCritical, showOverdue, showAssignedMe, search, dateFrom, dateTo, userName]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggleAll = useCallback(() => {
    setSelected(allChecked ? new Set() : new Set(filtered.map((r) => r.id)));
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
      ["ID", "Category", "Municipality", "Status", "Priority", "Location", "Reported At", "Assigned To", "Description"],
      ...filtered.map((r) => [
        r.id.slice(-8),
        r.category,
        r.municipality,
        r.status,
        r.priority,
        r.location,
        format(r.reportedAt, "yyyy-MM-dd HH:mm"),
        r.assignedResponder ?? "",
        `"${r.description.replace(/"/g, '""').replace(/\n/g, " ")}"`,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
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
      toast({ title: `Updated ${toUpdate.length} report${toUpdate.length !== 1 ? "s" : ""}`, variant: "success" as never });
      setSelected(new Set());
      setBulkConfirm(false);
      setBulkStatus("");
    } catch {
      toast({ title: "Failed to update some reports", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            aria-pressed={statusFilter === s.value}
            className={cn(
              "px-3 py-1 rounded-sm text-xs font-semibold transition-colors border uppercase tracking-wide",
              statusFilter === s.value
                ? "bg-[hsl(var(--gov-green-800))] text-white border-transparent"
                : "bg-background border-border text-foreground/70 hover:bg-accent"
            )}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={() => setShowCritical(!showCritical)}
          aria-pressed={showCritical}
          className={cn(
            "px-3 py-1 rounded-sm text-xs font-semibold transition-colors border flex items-center gap-1 uppercase tracking-wide",
            showCritical ? "bg-red-600 text-white border-transparent" : "bg-background border-border text-foreground/70 hover:bg-accent"
          )}
        >
          <AlertCircle className="h-3 w-3" aria-hidden /> Critical
        </button>
        <button
          onClick={() => setShowOverdue(!showOverdue)}
          aria-pressed={showOverdue}
          className={cn(
            "px-3 py-1 rounded-sm text-xs font-semibold transition-colors border flex items-center gap-1 uppercase tracking-wide",
            showOverdue ? "bg-amber-600 text-white border-transparent" : "bg-background border-border text-foreground/70 hover:bg-accent"
          )}
        >
          <Clock className="h-3 w-3" aria-hidden /> Overdue
        </button>
        <button
          onClick={() => setShowAssignedMe(!showAssignedMe)}
          aria-pressed={showAssignedMe}
          className={cn(
            "px-3 py-1 rounded-sm text-xs font-semibold transition-colors border flex items-center gap-1 uppercase tracking-wide",
            showAssignedMe ? "bg-blue-700 text-white border-transparent" : "bg-background border-border text-foreground/70 hover:bg-accent"
          )}
        >
          <User className="h-3 w-3" aria-hidden /> Mine
        </button>
      </div>

      {/* Search + date range row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search category, location, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            aria-label="Search reports"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs w-32"
            aria-label="From date"
          />
          <span className="shrink-0">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs w-32"
            aria-label="To date"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="h-8 text-xs shrink-0"
          aria-label="Export to CSV"
        >
          <Download className="h-3.5 w-3.5 mr-1" aria-hidden />
          Export CSV
        </Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 p-2.5 bg-[hsl(var(--gov-green-50))] rounded border border-[hsl(var(--gov-green-800))]/20"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <span className="text-xs font-semibold text-[hsl(var(--gov-green-800))]">
            {selected.size} selected
          </span>
          {!bulkConfirm ? (
            <>
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ReportStatus)}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue placeholder="Mark as…" />
                </SelectTrigger>
                <SelectContent>
                  {(["reported","acknowledged","under_review","ongoing","solved"] as ReportStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-7 text-xs" disabled={!bulkStatus} onClick={() => setBulkConfirm(true)}>Apply</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setSelected(new Set()); }}>Cancel</Button>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                Mark {selected.size} reports as "{bulkStatus.replace("_", " ")}"?
              </span>
              <Button size="sm" className="h-7 text-xs" onClick={applyBulkStatus}>Confirm</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setBulkConfirm(false)}>Back</Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]" role="grid" aria-label="Reports list">
            <thead>
              <tr className="bg-muted/60 border-b">
                <th className="w-9 px-2.5 py-2.5 text-left">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={toggleAll}
                    aria-label="Select all reports"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category / Location</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Municipality</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Priority</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Reported</th>
                <th className="w-8 px-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2.5 py-3"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-3 py-3" colSpan={4}><Skeleton className="h-4 w-full" /></td>
                    <td className="px-3 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-14 text-center text-muted-foreground">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" aria-hidden />
                    <p className="text-sm">No reports match the selected filters</p>
                    <button
                      className="text-xs text-primary underline mt-1"
                      onClick={() => { setStatusFilter("all"); setShowCritical(false); setShowOverdue(false); setSearch(""); }}
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const overdue = isOverdue(r.reportedAt, r.status, SLA_HOURS[r.category] ?? 72);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t hover:bg-accent/40 cursor-pointer transition-colors",
                        selected.has(r.id) && "bg-[hsl(var(--gov-green-50))]",
                        overdue && !selected.has(r.id) && "bg-amber-50/60"
                      )}
                      onClick={() => setSelectedReport(r)}
                      role="row"
                    >
                      <td className="px-2.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={() => toggleRow(r.id)}
                          aria-label={`Select report ${r.id.slice(-6)}`}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-sm truncate max-w-[140px] sm:max-w-[180px]">{r.category}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[140px] sm:max-w-[180px]">
                          {r.location || r.municipality}
                          {overdue && <span className="ml-1 text-amber-600 font-semibold" aria-label="Overdue">⏰</span>}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{r.municipality}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={STATUS_VARIANT[r.status]} className="text-[10px] uppercase tracking-wide whitespace-nowrap">
                          {r.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={PRIORITY_VARIANT[r.priority]} className="text-[10px] uppercase tracking-wide">
                          {r.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {format(r.reportedAt, "MMM d · h:mm a")}
                      </td>
                      <td className="px-2 py-2.5">
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-right" aria-live="polite">
        {filtered.length} of {reports.length} reports
      </p>

      <ReportDetail report={selectedReport} open={!!selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  );
}
