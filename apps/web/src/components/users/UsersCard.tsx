import { useState } from "react";
import { Save, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { saveUserRole } from "@/hooks/useUsers";
import { toast } from "@/hooks/useToast";
import { MUNICIPALITIES } from "@/data/municipalities";
import { barangaysOf } from "@/data/barangays";
import type { AdminUser } from "@/types";
import type { AdminRole } from "@/lib/firebase";

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "provincial_admin", label: "Provincial Admin" },
  { value: "municipal_admin", label: "Municipal Admin" },
  { value: "barangay_admin", label: "Barangay Admin" },
  { value: "admin", label: "Admin" },
  { value: "citizen", label: "Citizen" },
] as const;

// Roles that are scoped to a single municipality (must pick a town).
const MUNI_SCOPED = new Set(["municipal_admin", "barangay_admin"]);

interface UsersCardProps {
  users: AdminUser[];
  loading: boolean;
}

export function UsersCard({ users, loading }: UsersCardProps) {
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  const [pendingMunis, setPendingMunis] = useState<Record<string, string>>({});
  const [pendingBrgys, setPendingBrgys] = useState<Record<string, string>>({});

  const handleSave = async (user: AdminUser) => {
    const role = (pendingRoles[user.id] ?? user.role) as AdminRole | "citizen";
    const muni = pendingMunis[user.id] ?? user.municipality ?? "";
    const brgy = pendingBrgys[user.id] ?? user.barangay ?? "";
    // A Barangay admin must be pinned to BOTH a municipality and a barangay,
    // otherwise the security rules scope them to nothing (fails closed).
    if (role === "barangay_admin" && (!muni || !brgy)) {
      toast({ title: "Pick a municipality and barangay for a Barangay admin", variant: "destructive" });
      return;
    }
    setSaving((p) => ({ ...p, [user.id]: true }));
    try {
      await saveUserRole(
        user.id,
        role,
        MUNI_SCOPED.has(role) ? muni : undefined,
        role === "barangay_admin" ? brgy : undefined,
      );
      toast({ title: "Role updated", variant: "success" as never });
      setPendingRoles((p) => { const n = { ...p }; delete n[user.id]; return n; });
      setPendingMunis((p) => { const n = { ...p }; delete n[user.id]; return n; });
      setPendingBrgys((p) => { const n = { ...p }; delete n[user.id]; return n; });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setSaving((p) => ({ ...p, [user.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No users found</p>
      </div>
    );
  }

  const pendingRole = (user: AdminUser) => pendingRoles[user.id] ?? user.role;
  const pendingMuni = (user: AdminUser) => pendingMunis[user.id] ?? user.municipality ?? "";
  const isDirty = (user: AdminUser) =>
    (pendingRoles[user.id] && pendingRoles[user.id] !== user.role) ||
    (pendingMunis[user.id] && pendingMunis[user.id] !== (user.municipality ?? "")) ||
    (pendingBrgys[user.id] && pendingBrgys[user.id] !== (user.barangay ?? ""));

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div key={user.id} className="border rounded-lg p-3 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(user.name || user.phoneNumber || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.phoneNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={pendingRoles[user.id] ?? user.role}
                onValueChange={(v) => setPendingRoles((p) => ({ ...p, [user.id]: v }))}
              >
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {MUNI_SCOPED.has(pendingRole(user)) && (
                <Select
                  value={pendingMunis[user.id] ?? user.municipality ?? ""}
                  onValueChange={(v) =>
                    setPendingMunis((p) => {
                      // Changing town invalidates any previously chosen barangay.
                      setPendingBrgys((b) => { const n = { ...b }; delete n[user.id]; return n; });
                      return { ...p, [user.id]: v };
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-40">
                    <SelectValue placeholder="Municipality…" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUNICIPALITIES.map((m) => (
                      <SelectItem key={m.name} value={m.name} className="text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {pendingRole(user) === "barangay_admin" && (
                <Select
                  value={pendingBrgys[user.id] ?? user.barangay ?? ""}
                  onValueChange={(v) => setPendingBrgys((p) => ({ ...p, [user.id]: v }))}
                  disabled={!pendingMuni(user)}
                >
                  <SelectTrigger className="h-7 text-xs w-40">
                    <SelectValue placeholder={pendingMuni(user) ? "Barangay…" : "Pick town first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {barangaysOf(pendingMuni(user)).map((b) => (
                      <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isDirty(user) && (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleSave(user)}
                  disabled={saving[user.id]}
                >
                  {saving[user.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  <span className="ml-1 hidden sm:inline">Save</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground text-right">{users.length} users</p>
    </div>
  );
}
