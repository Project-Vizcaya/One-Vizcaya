import { useMemo, useState } from "react";
import { Save, Loader2, Users, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { saveUserRole } from "@/hooks/useUsers";
import { nominateForRole } from "@/hooks/useRoleRequests";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { MUNICIPALITIES } from "@/data/municipalities";
import { barangaysOf } from "@/data/barangays";
import type { AdminUser } from "@/types";
import type { AdminRole } from "@/lib/firebase";

// Assignable roles. The legacy "admin" role is retired (N13) — it is no longer
// offered here; existing "admin" accounts are migrated to provincial_admin.
const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "provincial_admin", label: "Provincial Admin" },
  { value: "municipal_admin", label: "Municipal Admin" },
  { value: "barangay_admin", label: "Barangay Admin" },
  { value: "citizen", label: "Citizen" },
] as const;

// Sort order for the user list — admins on top, then citizens (N12). Legacy
// "admin" ranks with provincial so un-migrated accounts still sort sensibly.
const ROLE_RANK: Record<string, number> = {
  super_admin: 0,
  provincial_admin: 1,
  admin: 1,
  municipal_admin: 2,
  barangay_admin: 3,
  citizen: 4,
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  provincial_admin: "Provincial Admin",
  admin: "Admin (legacy)",
  municipal_admin: "Municipal Admin",
  barangay_admin: "Barangay Admin",
  citizen: "Citizen",
};

// Roles that are scoped to a single municipality (must pick a town).
const MUNI_SCOPED = new Set(["municipal_admin", "barangay_admin"]);

interface UsersCardProps {
  users: AdminUser[];
  loading: boolean;
}

export function UsersCard({ users, loading }: UsersCardProps) {
  const { user: me } = useAuthStore();
  // Only a super admin assigns roles directly; everyone else nominates (#8).
  const isSuper = me?.role === "super_admin";
  const isProvincial = me?.role === "provincial_admin" || me?.role === "admin" || isSuper;

  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  const [pendingMunis, setPendingMunis] = useState<Record<string, string>>({});
  const [pendingBrgys, setPendingBrgys] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  // Municipality filter (province-wide admins only). Municipal/barangay admins
  // are hard-scoped to their own town below.
  const [muniFilter, setMuniFilter] = useState<string>("all");

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    // A municipal/barangay admin only ever sees their own town (N12: hide other
    // towns' users). Province-wide admins see everyone, filterable by town.
    const forcedMuni = !isProvincial ? (me?.municipality ?? "") : null;
    return users
      .filter((u) => {
        if (forcedMuni !== null) return (u.municipality ?? "") === forcedMuni;
        if (muniFilter !== "all") return (u.municipality ?? "") === muniFilter;
        return true;
      })
      .filter((u) => {
        if (!term) return true;
        return (
          (u.name ?? "").toLowerCase().includes(term) ||
          (u.phoneNumber ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const ra = ROLE_RANK[a.role] ?? 99;
        const rb = ROLE_RANK[b.role] ?? 99;
        if (ra !== rb) return ra - rb;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
  }, [users, search, muniFilter, isProvincial, me?.municipality]);

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
    if (MUNI_SCOPED.has(role) && !muni) {
      toast({ title: "Pick a municipality for this role", variant: "destructive" });
      return;
    }
    setSaving((p) => ({ ...p, [user.id]: true }));
    try {
      if (isSuper) {
        await saveUserRole(
          user.id,
          role,
          MUNI_SCOPED.has(role) ? muni : undefined,
          role === "barangay_admin" ? brgy : undefined,
        );
        toast({ title: "Role updated", variant: "success" as never });
      } else {
        // Nominate → a super admin approves; the role is applied server-side.
        await nominateForRole({
          targetUid: user.id,
          targetName: user.name || user.phoneNumber || user.id,
          targetPhone: user.phoneNumber,
          requestedRole: role,
          municipality: MUNI_SCOPED.has(role) ? muni : undefined,
          barangay: role === "barangay_admin" ? brgy : undefined,
          nominatedBy: me?.uid ?? "",
          nominatedByName: me?.name ?? "",
        });
        toast({ title: "Nomination submitted for super-admin approval", variant: "success" as never });
      }
      setPendingRoles((p) => { const n = { ...p }; delete n[user.id]; return n; });
      setPendingMunis((p) => { const n = { ...p }; delete n[user.id]; return n; });
      setPendingBrgys((p) => { const n = { ...p }; delete n[user.id]; return n; });
    } catch {
      toast({ title: isSuper ? "Failed to save" : "Failed to submit nomination", variant: "destructive" });
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

  const pendingRole = (user: AdminUser) => pendingRoles[user.id] ?? user.role;
  const pendingMuni = (user: AdminUser) => pendingMunis[user.id] ?? user.municipality ?? "";
  const isDirty = (user: AdminUser) =>
    (pendingRoles[user.id] && pendingRoles[user.id] !== user.role) ||
    (pendingMunis[user.id] && pendingMunis[user.id] !== (user.municipality ?? "")) ||
    (pendingBrgys[user.id] && pendingBrgys[user.id] !== (user.barangay ?? ""));

  return (
    <div className="space-y-3">
      {/* Filter bar (N12) */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        {isProvincial && (
          <Select value={muniFilter} onValueChange={setMuniFilter}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All municipalities</SelectItem>
              {MUNICIPALITIES.map((m) => (
                <SelectItem key={m.name} value={m.name} className="text-xs">{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!isSuper && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          You can nominate users for a role — a super admin approves each change.
        </p>
      )}

      {visibleUsers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No users found</p>
        </div>
      ) : (
        visibleUsers.map((user) => (
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
                  <p className="text-xs text-muted-foreground truncate">
                    {user.phoneNumber}
                    {user.municipality ? ` · ${user.municipality}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 hidden md:inline-flex">
                  {ROLE_LABEL[user.role] ?? user.role}
                </Badge>
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
                    {saving[user.id]
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : isSuper ? <Save className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                    <span className="ml-1 hidden sm:inline">{isSuper ? "Save" : "Nominate"}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
      <p className="text-xs text-muted-foreground text-right">{visibleUsers.length} of {users.length} users</p>
    </div>
  );
}
