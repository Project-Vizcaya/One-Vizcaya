import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Map, FileText, BarChart3, Users, Megaphone,
  Radio, Menu, LogOut, ChevronDown, Shield, Building2, ClipboardList,
  AlertCircle, X,
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
import type { AuthUser } from "@/types";
import { MUNICIPALITIES } from "@/data/municipalities";
import type { AdminRole } from "@/lib/firebase";

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { path: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { path: "/dashboard/reports", label: "Live Reports", icon: FileText, badge: true },
      { path: "/dashboard/map", label: "Incident Map", icon: Map },
      { path: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Directory",
    items: [
      { path: "/dashboard/responders", label: "Responders", icon: Shield },
      { path: "/dashboard/users", label: "Admin Users", icon: Users },
    ],
  },
  {
    label: "Communications",
    items: [
      { path: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
      { path: "/dashboard/broadcasts", label: "Broadcast Alert", icon: Radio },
    ],
  },
  {
    label: "Administration",
    items: [
      { path: "/dashboard/audit", label: "Audit Log", icon: ClipboardList },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrator",
  admin: "Provincial Administrator",
  provincial_admin: "Provincial Administrator",
  municipal_admin: "Municipal Administrator",
  citizen: "Citizen",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
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

  const isActive = (path: string, exact?: boolean) =>
    exact ? currentPath === path : currentPath.startsWith(path);

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(215,20%,97%)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-border shrink-0 overflow-y-auto">
        <SidebarContent
          user={user}
          viewAs={viewAs}
          viewMunicipality={viewMunicipality}
          canViewProvince={canViewProvince}
          criticalOpen={criticalOpen}
          isActive={isActive}
          setViewAs={setViewAs}
          signOut={signOut}
          onNavClick={() => {}}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[min(17rem,85vw)]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <SidebarContent
            user={user}
            viewAs={viewAs}
            viewMunicipality={viewMunicipality}
            canViewProvince={canViewProvince}
            criticalOpen={criticalOpen}
            isActive={isActive}
            setViewAs={setViewAs}
            signOut={signOut}
            onNavClick={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-2 px-3 py-2.5 bg-[hsl(var(--gov-green-800))] text-white shrink-0 safe-pt">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-9 w-9 shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src="/img/seals/nueva-vizcaya.png"
              alt="Nueva Vizcaya"
              className="h-7 w-7 rounded-full object-cover ring-1 ring-white/30 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">One Vizcaya</p>
              <p className="text-[10px] text-white/70 leading-tight truncate">Admin Portal</p>
            </div>
          </div>
          {criticalOpen > 0 && (
            <div className="flex items-center gap-1 shrink-0 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              <AlertCircle className="h-3 w-3" />
              {criticalOpen}
            </div>
          )}
        </header>

        {/* Session expired overlay */}
        {sessionExpired && (
          <div className="fixed inset-0 z-[200] bg-black/75 flex items-center justify-center p-4 safe-pt">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[min(26rem,92vw)] text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <AlertCircle className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Session Expired</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your session expired due to inactivity. Please sign in again to continue.
                </p>
              </div>
              <Button className="w-full" onClick={signOut}>Sign In Again</Button>
            </div>
          </div>
        )}

        {/* View scope banner */}
        {viewAs === "municipal" && viewMunicipality && (
          <div className="bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 text-center shrink-0 tracking-wide">
            📍 VIEWING: MUNICIPALITY OF {viewMunicipality.toUpperCase()}
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
  user: AuthUser | null;
  viewAs: string;
  viewMunicipality: string | null;
  canViewProvince: boolean;
  criticalOpen: number;
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
    <div className="flex flex-col h-full min-h-0">
      {/* Sidebar header */}
      <div className="bg-[hsl(var(--gov-green-900))] text-white px-4 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/img/seals/nueva-vizcaya.png"
            alt="Nueva Vizcaya Seal"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight">One Vizcaya</p>
            <p className="text-[11px] text-white/60 leading-tight mt-0.5">Provincial Government</p>
            <p className="text-[10px] text-white/50 leading-tight">Nueva Vizcaya</p>
          </div>
        </div>
      </div>

      {/* View switcher */}
      {canViewProvince && (
        <div className="px-3 py-2.5 bg-muted/40 border-b shrink-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Scope</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs h-7 font-medium"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {viewAs === "provincial" ? "Province-wide" : viewMunicipality}
                  </span>
                </span>
                <ChevronDown className="h-3 w-3 opacity-50 shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Select Scope</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setViewAs("provincial")} className="text-xs font-medium">
                <Building2 className="h-3.5 w-3.5 mr-2" />Province-wide
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Municipalities</DropdownMenuLabel>
              {MUNICIPALITIES.map((m) => (
                <DropdownMenuItem key={m.name} onClick={() => setViewAs("municipal", m.name)} className="text-xs">
                  {m.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path, item.exact);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onNavClick}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors",
                        active
                          ? "bg-[hsl(var(--gov-green-800))] text-white"
                          : "text-foreground/70 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && criticalOpen > 0 && (
                        <span className={cn(
                          "ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0",
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
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div className="border-t p-3 shrink-0 bg-muted/20">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="h-8 w-8 rounded-full bg-[hsl(var(--gov-green-800))] flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate leading-tight">{user?.name ?? "Administrator"}</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive gap-2 text-xs h-7"
          onClick={signOut}
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
