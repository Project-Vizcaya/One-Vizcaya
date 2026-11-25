import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataRequests, updateDataRequest, type DataRequest, type DataRequestStatus } from "@/hooks/useDataRequests";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { timeAgo } from "@/lib/utils";
import { ShieldCheck, Loader2, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/dashboard/privacy-requests")({
  component: PrivacyRequestsPage,
});

const STATUS: Record<DataRequestStatus, { label: string; cls: string }> = {
  pending: { label: "New", cls: "bg-amber-100 text-amber-900" },
  in_review: { label: "In review", cls: "bg-blue-100 text-blue-900" },
  completed: { label: "Completed", cls: "bg-green-100 text-green-900" },
  declined: { label: "Declined", cls: "bg-slate-200 text-slate-800" },
};
const isOpen = (r: DataRequest) => r.status === "pending" || r.status === "in_review";

function PrivacyRequestsPage() {
  const { requests, loading, error } = useDataRequests();
  const [showAll, setShowAll] = useState(false);
  const open = requests.filter(isOpen);
  const shown = showAll ? requests : open;

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Privacy Requests</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Data Privacy Act (RA 10173) requests residents send from the app · for the Data Protection Officer
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-md bg-muted p-1 text-xs font-semibold" role="group" aria-label="Filter requests">
          <button type="button" aria-pressed={!showAll} onClick={() => setShowAll(false)}
            className={`rounded px-3 py-1.5 ${!showAll ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            Open ({open.length})
          </button>
          <button type="button" aria-pressed={showAll} onClick={() => setShowAll(true)}
            className={`rounded px-3 py-1.5 ${showAll ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
            All ({requests.length})
          </button>
        </div>
      </div>

      {error ? (
        <Card><CardContent className="p-6 text-sm text-destructive">Could not load requests: {error}</CardContent></Card>
      ) : loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : shown.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold">{showAll ? "No privacy requests yet" : "No open privacy requests"}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Requests appear here as soon as a resident sends one from Settings → Location &amp; Privacy → Data Privacy Request.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => <RequestCard key={r.path} r={r} />)}
        </ul>
      )}
    </div>
  );
}

function RequestCard({ r }: { r: DataRequest }) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<DataRequestStatus>(r.status);
  const [note, setNote] = useState(r.responseNote ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = status !== r.status || note.trim() !== (r.responseNote ?? "");
  const s = STATUS[r.status] ?? STATUS.pending;

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDataRequest(r.path, status, note, { uid: user.uid, name: user.name });
      toast({ title: "Request updated", variant: "success" as never });
    } catch (e) {
      toast({ title: "Could not update the request", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <li>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label}</span>
            <h2 className="text-sm font-bold">{r.typeLabel}</h2>
            <span className="text-xs text-muted-foreground">· {timeAgo(r.requestedAt)}</span>
          </div>
          <div className="text-sm">
            <p className="font-semibold">{r.userName ?? "Resident (profile not found)"}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {r.userPhone && <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${r.userPhone}`}><Phone className="h-3 w-3" aria-hidden="true" />{r.userPhone}</a>}
              {r.userEmail && <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${r.userEmail}`}><Mail className="h-3 w-3" aria-hidden="true" />{r.userEmail}</a>}
            </p>
          </div>
          {r.details && <p className="whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-sm">{r.details}</p>}

          <div className="grid gap-2 sm:grid-cols-[11rem_1fr_auto] sm:items-start">
            <Select value={status} onValueChange={(v) => setStatus(v as DataRequestStatus)}>
              <SelectTrigger className="text-xs" aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS) as DataRequestStatus[]).map((k) => <SelectItem key={k} value={k}>{STATUS[k].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="text-sm"
              aria-label="Reply or note" placeholder="What was done, or why it was declined (kept with the request)" />
            <Button size="sm" onClick={save} disabled={!dirty || saving} className="h-9">
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}Save
            </Button>
          </div>
          {r.handledByName && (
            <p className="text-xs text-muted-foreground">Last updated by {r.handledByName} · {timeAgo(r.handledAt)}</p>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
