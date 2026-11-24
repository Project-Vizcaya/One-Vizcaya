"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ClipboardList, History, LogOut, Map, PhoneCall, ScrollText } from "lucide-react";

export function HubNav({ name, scope, showAudit, showCalls }: { name: string; scope: string; showAudit: boolean; showCalls: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const items = [
    { href: "/hub", label: "Live map", icon: Map },
    { href: "/hub/incidents", label: "Incidents", icon: ClipboardList },
    ...(showCalls ? [{ href: "/hub/calls", label: "Hotline call log", icon: PhoneCall }] : []),
    { href: "/hub/replay", label: "Replay", icon: History },
    ...(showAudit ? [{ href: "/hub/audit", label: "Audit log", icon: ScrollText }] : []),
  ];
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
  return (
    <aside className="bg-gov-900 text-white lg:w-60 lg:min-h-[calc(100vh-24px)] shrink-0">
      <div className="px-4 py-3 border-b border-white/10">
        <p className="flex items-center gap-2 font-bold"><Activity aria-hidden className="h-4 w-4" /> PDRRMO Command Hub</p>
        <p className="text-xs text-white/70 mt-0.5">{scope}</p>
      </div>
      <nav aria-label="Command Hub" className="flex lg:flex-col overflow-x-auto p-2 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/hub" ? path === "/hub" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap ${active ? "bg-white/15 font-semibold" : "hover:bg-white/10"}`}>
              <Icon aria-hidden className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden lg:block px-4 py-3 border-t border-white/10 text-xs text-white/80">
        <p className="truncate">{name}</p>
        <button onClick={logout} className="mt-2 inline-flex items-center gap-1 hover:underline"><LogOut aria-hidden className="h-3.5 w-3.5" /> Sign out</button>
      </div>
      <div className="lg:hidden px-3 pb-2">
        <button onClick={logout} className="text-xs text-white/80 inline-flex items-center gap-1"><LogOut aria-hidden className="h-3.5 w-3.5" /> Sign out</button>
      </div>
    </aside>
  );
}
