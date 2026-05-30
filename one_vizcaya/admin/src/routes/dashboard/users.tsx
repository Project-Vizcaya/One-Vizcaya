import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersCard } from "@/components/users/UsersCard";
import { useUsers } from "@/hooks/useUsers";

export const Route = createFileRoute("/dashboard/users")({
  component: UsersPage,
});

function UsersPage() {
  const { users, loading } = useUsers();

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage admin roles and access</p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <UsersCard users={users} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
