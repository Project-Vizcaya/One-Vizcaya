import { useState } from "react";
import { Check, X, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingRoleRequests, decideRoleRequest } from "@/hooks/useRoleRequests";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { timeAgo } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  provincial_admin: "Provincial Admin",
  municipal_admin: "Municipal Admin",
  barangay_admin: "Barangay Admin",
  citizen: "Citizen",
};

// Super-admin approval queue for the #8 nominate → approve workflow. Only a
// super admin can actually decide (rules enforce it); other admins never see
// this card.
export function RoleRequestsCard() {
  const { user: me } = useAuthStore();
  const { requests, loading } = usePendingRoleRequests();
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await decideRoleRequest(id, decision, me?.uid ?? "");
      toast({ title: decision === "approved" ? "Nomination approved" : "Nomination rejected", variant: "success" as never });
    } catch {
      toast({ title: "Failed to record decision", variant: "destructive" });
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  if (loading) return <Skeleton className="h-20 w-full" />;
  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <UserCheck className="h-7 w-7 mx-auto mb-1.5 opacity-40" />
        <p className="text-sm">No pending nominations</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="border rounded-lg p-3 bg-white flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{r.targetName}</p>
              <Badge variant="outline" className="text-xs">{ROLE_LABEL[r.requestedRole] ?? r.requestedRole}</Badge>
              {r.municipality && <Badge variant="outline" className="text-xs">{r.municipality}</Badge>}
              {r.barangay && <Badge variant="outline" className="text-xs">Brgy. {r.barangay}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {r.targetPhone ? `${r.targetPhone} · ` : ""}nominated by {r.nominatedByName || "an admin"} · {timeAgo(r.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy[r.id]} onClick={() => decide(r.id, "rejected")}>
              {busy[r.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              <span className="ml-1">Reject</span>
            </Button>
            <Button size="sm" className="h-7 text-xs" disabled={busy[r.id]} onClick={() => decide(r.id, "approved")}>
              {busy[r.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              <span className="ml-1">Approve</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
