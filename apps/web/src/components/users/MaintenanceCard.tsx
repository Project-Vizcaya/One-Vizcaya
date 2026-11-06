import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Wrench, Loader2, RefreshCw, UserCog, ShieldCheck } from "lucide-react";
import { functions, auth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";

// Super-admin one-off maintenance actions. These call server callables that
// otherwise have no UI trigger — e.g. re-seeding the responder directory after
// its numbers change, or migrating the retired legacy `admin` role.
export function MaintenanceCard() {
  const { user } = useAuthStore();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (
    key: string,
    name: string,
    okFactory: (data: unknown) => string,
  ) => {
    setBusy(key);
    try {
      const fn = httpsCallable(functions, name);
      const { data } = await fn({});
      toast({ title: okFactory(data), variant: "success" as never });
    } catch (e) {
      toast({
        title: "Action failed",
        description: (e as { message?: string })?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  // Re-applies the signed-in super admin's OWN role through setAdminRole so the
  // Auth custom claim is written to match their Firestore profile. Accounts whose
  // role was set by a direct Firestore write have no `role` claim, which locks
  // them out of claim-gated checks (and makes the mobile app route their role
  // changes through the nomination flow). Running this, then refreshing the token,
  // repairs that. Safe to re-run.
  const repairMyClaim = async () => {
    if (!user?.uid || !user.role) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }
    setBusy("repair");
    try {
      const fn = httpsCallable(functions, "setAdminRole");
      await fn({
        uid: user.uid,
        role: user.role,
        municipality: user.municipality ?? null,
        barangay: user.barangay ?? null,
      });
      // Force a token refresh so the new claim is live without re-login.
      await auth.currentUser?.getIdToken(true);
      toast({
        title: `Admin access repaired — role claim set to ${user.role}`,
        variant: "success" as never,
      });
    } catch (e) {
      toast({
        title: "Action failed",
        description: (e as { message?: string })?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5" /> One-off maintenance — super admin only.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          className="justify-start gap-2"
          disabled={busy !== null}
          onClick={() =>
            run("seed", "seedResponders", (d) => {
              const total = (d as { total?: number })?.total;
              return `Responder directory synced${total ? ` (${total} entries)` : ""}`;
            })
          }
        >
          {busy === "seed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync Responder Directory
        </Button>

        <Button
          variant="outline"
          className="justify-start gap-2"
          disabled={busy !== null}
          onClick={() =>
            run("migrate", "migrateLegacyAdmins", (d) => {
              const n = (d as { migrated?: number })?.migrated ?? 0;
              return n > 0 ? `Migrated ${n} legacy admin(s) → provincial` : "No legacy admins to migrate";
            })
          }
        >
          {busy === "migrate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
          Migrate Legacy Admins
        </Button>

        <Button
          variant="outline"
          className="justify-start gap-2"
          disabled={busy !== null}
          onClick={repairMyClaim}
        >
          {busy === "repair" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Repair My Admin Access
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>Sync Responder Directory</strong> re-writes the responders collection with the
        latest official numbers (run this after any responder-number update).
        Placeholder/unverified numbers are marked and shown as "being verified".{" "}
        <strong>Repair My Admin Access</strong> writes your role into your login token so
        claim-based checks (and mobile direct role changes) recognize you as a super admin.
      </p>
    </div>
  );
}
