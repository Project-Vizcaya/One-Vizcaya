import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersCard } from "@/components/users/UsersCard";
import { RoleRequestsCard } from "@/components/users/RoleRequestsCard";
import { MaintenanceCard } from "@/components/users/MaintenanceCard";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/dashboard/users")({
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAuthStore();
  const { users, loading } = useUsers();

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">User Management</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Province of Nueva Vizcaya · Manage admin roles and access
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-PH", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>

      {user?.role === "super_admin" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Role Nominations</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleRequestsCard />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <UsersCard users={users} loading={loading} />
        </CardContent>
      </Card>

      {user?.role === "super_admin" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">System Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <MaintenanceCard />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
