import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Bot, Check, X, Loader2, AlertTriangle } from "lucide-react";
import { auth, db, functions } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/useToast";

// Alerts awaiting a human decision (PDRRMO §2): automated weather drafts, and
// urgent or province-wide alerts proposed by an admin (P2), which need a
// SECOND admin. Nothing reaches the public until an in-scope admin approves
// it here. Approval runs server-side in decideAlertDraft, which re-checks
// role, town, expiry and that the approver is not the proposer, creates the
// broadcast and audits it.

interface Draft {
  id: string;
  title: string;
  body: string;
  municipality: string; // "" = province-wide
  urgent: boolean;
  requestedBy: string | null;     // set for admin-proposed alerts
  requestedByName: string | null;
  source: string | null;
  evidence: Record<string, unknown> | null;
  createdAt: Date | null;
  expiresAt: Date | null;
}

const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

function usePendingDrafts() {
  const viewAs = useAuthStore((s) => s.viewAs);
  const viewMunicipality = useAuthStore((s) => s.viewMunicipality);
  // Scoped to a town -> only that town's drafts. This also matches what the
  // rules allow a municipal admin to query.
  const town = viewAs === "municipal" ? viewMunicipality : null;
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = collection(db, "alert_drafts");
    const q = town
      ? query(base, where("status", "==", "pending"), where("municipality", "==", town))
      : query(base, where("status", "==", "pending"));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          title: String(x.title ?? ""),
          body: String(x.body ?? ""),
          municipality: String(x.municipality ?? ""),
          urgent: x.urgent === true,
          requestedBy: typeof x.requestedBy === "string" ? x.requestedBy : null,
          requestedByName: typeof x.requestedByName === "string" ? x.requestedByName : null,
          source: typeof x.source === "string" ? x.source : null,
          evidence: x.evidence && typeof x.evidence === "object" ? (x.evidence as Record<string, unknown>) : null,
          createdAt: toDate(x.createdAt),
          expiresAt: toDate(x.expiresAt),
        };
      });
      rows.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      setDrafts(rows);
      setLoading(false);
    }, () => setLoading(false));
  }, [town]);

  return { drafts, loading };
}

const decideAlertDraft = httpsCallable<
  { draftId: string; decision: "approve" | "reject"; note?: string },
  { status: string; broadcastId: string | null }
>(functions, "decideAlertDraft");

export function PendingAlertsCard() {
  const { drafts, loading } = usePendingDrafts();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const now = Date.now();
  const me = auth.currentUser?.uid ?? null;

  const decide = async (d: Draft, decision: "approve" | "reject") => {
    setBusy(d.id);
    try {
      await decideAlertDraft({ draftId: d.id, decision, note: note.trim() || undefined });
      toast({
        title: decision === "approve" ? "Alert approved and sent" : "Alert rejected",
        description: decision === "approve" ? `Delivered to users in ${d.municipality || "the whole province"}.` : "Nothing was sent to the public.",
      });
      setConfirming(null); setRejecting(null); setNote("");
    } catch (e) {
      toast({ title: "Could not complete", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Bot className="h-4 w-4" /> Alerts awaiting approval
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Automated weather drafts, and urgent or province-wide alerts from admins, which need a second admin. None is sent to the public until approved.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>}
        {!loading && drafts.length === 0 && <p className="text-xs text-muted-foreground">No alerts awaiting approval.</p>}
        {drafts.map((d) => {
          const expired = !!d.expiresAt && d.expiresAt.getTime() < now;
          const provider = d.evidence && typeof d.evidence.provider === "string" ? d.evidence.provider : null;
          const mine = !!me && d.requestedBy === me;
          const where = d.municipality || "Province-wide";
          return (
            <div key={d.id} className={`rounded-lg border p-3 space-y-2 ${d.urgent ? "border-red-300" : ""} ${expired ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                {d.urgent && <Badge variant="destructive" className="text-[10px]">URGENT</Badge>}
                <Badge variant="outline" className="text-[10px]">{where}</Badge>
                {d.source && <Badge variant="secondary" className="text-[10px]">{d.source}</Badge>}
                {expired && <Badge variant="outline" className="text-[10px]">Expired — can no longer be sent</Badge>}
              </div>
              <p className="text-sm font-semibold">{d.title}</p>
              <p className="text-xs">{d.body}</p>
              <p className="text-[11px] text-muted-foreground">
                {d.requestedBy ? `Proposed by ${mine ? "you" : d.requestedByName || `admin ${d.requestedBy.slice(0, 8)}`}. ` : ""}
                {provider ? `Based on ${provider} forecast data (third-party, not PAGASA). ` : ""}
                {d.createdAt ? `Drafted ${d.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}` : ""}
                {d.expiresAt && !expired ? ` · expires ${d.expiresAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}` : ""}
              </p>

              {confirming === d.id ? (
                <div className="rounded-md bg-muted/50 p-2 space-y-2">
                  <p className="text-xs flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                    This sends a push notification to every user in {d.municipality || "the province"}
                    {d.urgent ? " as an URGENT alert (sound and pop-up)" : ""}. Check PAGASA advisories before approving.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs" disabled={busy === d.id} onClick={() => decide(d, "approve")}>
                      {busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}Confirm and send
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirming(null)}>Cancel</Button>
                  </div>
                </div>
              ) : rejecting === d.id ? (
                <div className="space-y-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why it is not being sent (optional, recorded in the audit log)" className="text-xs min-h-[60px]" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={busy === d.id} onClick={() => decide(d, "reject")}>
                      {busy === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setRejecting(null); setNote(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {mine && !expired && (
                    <span className="text-xs text-muted-foreground self-center">Waiting for another admin to approve.</span>
                  )}
                  {!expired && !mine && (
                    <Button size="sm" className="h-7 text-xs" onClick={() => { setConfirming(d.id); setRejecting(null); }}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve…
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setRejecting(d.id); setConfirming(null); }}>
                    <X className="h-3.5 w-3.5 mr-1" /> {expired ? "Dismiss" : mine ? "Withdraw" : "Reject"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
