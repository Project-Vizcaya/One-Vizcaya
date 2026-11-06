import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeReportWithDisposition } from "@/hooks/useReports";
import { toast } from "@/hooks/useToast";
import { likelyDuplicates, linkedDuplicates, RADIUS_M, WINDOW_H } from "@/lib/duplicates";
import type { Report } from "@/types";

// Duplicate-report linking (P3): suggestions only. Closing a suggestion goes
// through the normal "close without action" path (disposition "duplicate",
// duplicateOf = this report), so it is attributed, audited, its reporter is
// told, and it can be re-opened.

const short = (id: string) => `#${id.slice(-6).toUpperCase()}`;

export function DuplicatesSection({ report, allReports }: { report: Report; allReports: Report[] }) {
  const candidates = useMemo(() => likelyDuplicates(report, allReports), [report, allReports]);
  const linked = useMemo(() => linkedDuplicates(report, allReports), [report, allReports]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (candidates.length === 0 && linked.length === 0) return null;

  const closeAsDuplicate = async (dup: Report) => {
    setBusy(dup.id);
    try {
      await closeReportWithDisposition(dup.userId, dup.id, "duplicate",
        `Same incident as report ${short(report.id)} (same category and place, filed within ${WINDOW_H} h).`, report.id);
      toast({ title: `${short(dup.id)} closed as a duplicate`, description: `Linked to ${short(report.id)}. Its reporter has been told.` });
      setConfirming(null);
    } catch (e) {
      toast({ title: "Could not close it", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
        <Copy aria-hidden="true" className="h-3.5 w-3.5" /> Duplicates
      </p>
      {linked.length > 0 && (
        <p className="text-xs mb-2">
          {linked.length} report{linked.length > 1 ? "s were" : " was"} closed as a duplicate of this one:{" "}
          {linked.map((r) => short(r.id)).join(", ")}.
        </p>
      )}
      {candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Possibly the same incident: same category, filed within {WINDOW_H} h, same barangay or within {RADIUS_M} m.
            Check before linking.
          </p>
          {candidates.map((r) => (
            <div key={r.id} className="rounded-md border p-2.5 space-y-1">
              <p className="text-xs font-semibold">
                {short(r.id)} · {format(r.reportedAt, "MMM d, h:mm a")} · {r.barangay || r.location || r.municipality}
              </p>
              <p className="text-xs line-clamp-2 break-words">{r.description}</p>
              {confirming === r.id ? (
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-xs">Close {short(r.id)} as a duplicate of {short(report.id)}?</span>
                  <Button size="sm" className="h-7 text-xs" disabled={busy === r.id} onClick={() => closeAsDuplicate(r)}>
                    {busy === r.id && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin mr-1" />}Confirm
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={busy === r.id} onClick={() => setConfirming(null)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirming(r.id)}>
                  Close it as a duplicate of this report…
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
