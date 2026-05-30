import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Map, FileText, BarChart3, Users, Megaphone,
  Radio, Menu, LogOut, ChevronDown, Bell, Shield, Building2,
  ClipboardList, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useReports } from "@/hooks/useReports";
import { cn } from "@/lib/utils";
import { MUNICIPALITIES } from "@/data/municipalities";
import type { AdminRole } from "@/lib/firebase";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { path: "/dashboard/reports", label: "Live Reports", icon: FileText },
  { path: "/dashboard/map", label: "Map", icon: Map },
  { path: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/dashboard/responders", label: "Responders", icon: Shield },
  { path: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
  { path: "/dashboard/broadcasts", label: "Broadcasts", icon: Radio },
  { path: "/dashboard/users", label: "Users", icon: Users },
  { path: "/dashboard/audit", label: "Audit Log", icon: ClipboardList },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Provincial Admin",
  provincial_admin: "Provincial Admin",
  municipal_admin: "Municipal Admin",
  citizen: "Citizen",
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, viewAs, viewMunicipality, setViewAs } = useAuthStore();
  const { signOut, sessionExpired } = useAuth();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const canViewProvince = (["admin", "provincial_admin", "super_admin"] as AdminRole[]).includes(
    user?.role as AdminRole
  );
  const municipality = viewAs === "municipal" ? viewMunicipality : null;
  const { reports } = useReports(municipality);
  const criticalOpen = reports.filter((r) => r.priority === "critical" && r.status !== "solved").length;
  const unread = reports.filter((r) => r.status === "reported").length;

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-white shrink-0">
        <SidebarContent
          user={user}
          viewAs={viewAs}
          viewMunicipality={viewMunicipality}
          canViewProvince={canViewProvince}
          currentPath={currentPath}
          criticalOpen={criticalOpen}
          unread={unread}
          isActive={isActive}
          setViewAs={setViewAs}
          signOut={signOut}
          onNavClick={() => {}}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            user={user}
            viewAs={viewAs}
            viewMunicipality={viewMunicipality}
            canViewProvince={canViewProvince}
            currentPath={currentPath}
            criticalOpen={criticalOpen}
            unread={unread}
            isActive={isActive}
            setViewAs={setViewAs}
            signOut={signOut}
            onNavClick={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top bar (mobile only) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/img/seals/nv-seal.png" alt="NV" className="h-7 w-7 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <span className="font-semibold text-sm truncate">One Vizcaya</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            {criticalOpen > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">{criticalOpen}</Badge>
            )}
          </div>
        </header>

        {/* Session expired overlay */}
        {sessionExpired && (
          <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center space-y-4">
              <div className="text-4xl">⏰</div>
              <h2 className="text-xl font-bold">Session Expired</h2>
              <p className="text-muted-foreground text-sm">Your session has expired due to inactivity. Please sign in again.</p>
              <Button className="w-full" onClick={signOut}>Sign In Again</Button>
            </div>
          </div>
        )}

        {/* View scope banner */}
        {viewAs === "municipal" && viewMunicipality && (
          <div className="bg-blue-600 text-white text-xs font-medium px-4 py-1.5 text-center shrink-0">
            Viewing: {viewMunicipality} Municipality
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  user: ReturnType<typeof useAuthStore>["user"];
  viewAs: string;
  viewMunicipality: string | null;
  canViewProvince: boolean;
  currentPath: string;
  criticalOpen: number;
  unread: number;
  isActive: (path: string, exact?: boolean) => boolean;
  setViewAs: (view: "provincial" | "municipal", municipality?: string) => void;
  signOut: () => void;
  onNavClick: () => void;
}

function SidebarContent({
  user, viewAs, viewMunicipality, canViewProvince, criticalOpen,
  isActive, setViewAs, signOut, onNavClick,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b shrink-0">
        <img
          src="/img/seals/nv-seal.png"
          alt="Nueva Vizcaya"
          className="h-9 w-9 rounded-full object-cover ring-2 ring-green-100"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight truncate">One Vizcaya</p>
          <p className="text-xs text-muted-foreground truncate">Admin Portal</p>
        </div>
        {criticalOpen > 0 && (
          <Badge variant="destructive" className="ml-auto shrink-0 text-xs">{criticalOpen}</Badge>
        )}
      </div>

      {/* View switcher (for provincial admins) */}
      {canViewProvince && (
        <div className="px-3 py-2 border-b shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">Viewing as</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8">
                <span className="flex items-center gap-1.5">
                  {viewAs === "provincial" ? <Building2 className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
                  {viewAs === "provincial" ? "Province-wide" : viewMunicipality}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs">Select View</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setViewAs("provincial")} className="text-xs">
                <Building2 className="h-3.5 w-3.5 mr-2" />
                Province-wide
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs">Municipalities</DropdownMenuLabel>
              {MUNICIPALITIES.map((m) => (
                <DropdownMenuItem key={m.name} onClick={() => setViewAs("municipal", m.name)} className="text-xs">
                  {m.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path, item.exact);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.path === "/dashboard/reports" && criticalOpen > 0 && (
                    <span className={cn(
                      "ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold",
                      active ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
                    )}>
                      {criticalOpen}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t p-3 shrink-0">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name ?? "Admin"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive gap-2 text-xs h-8"
          onClick={signOut}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
