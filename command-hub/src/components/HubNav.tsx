"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, History, LogOut, Map, PhoneCall, ScrollText } from "lucide-react";
import { post } from "./useSnapshot";

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
    await post("/api/auth/logout", {}).catch(() => {});
    router.push("/login");
    router.refresh();
  };
  return (
    <aside className="bg-gov-900 text-white lg:w-64 lg:min-h-[calc(100vh-24px)] shrink-0 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <Image src="/seal.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0" priority />
        <div className="min-w-0">
          <p className="font-bold leading-tight">PDRRMO Command Hub</p>
          <p className="text-[13px] text-white/75 truncate">{scope}</p>
        </div>
      </div>
      <nav aria-label="Command Hub" className="flex lg:flex-col overflow-x-auto p-2 gap-0.5 lg:flex-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/hub" ? path === "/hub" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm whitespace-nowrap transition-colors duration-150 ${
                active ? "bg-white/10 font-bold text-white" : "text-white/80 hover:bg-white/5 hover:text-white"}`}>
              {active && <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-gold hidden lg:block" />}
              <Icon aria-hidden className={`h-4 w-4 ${active ? "text-gold" : ""}`} /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-white/10 text-[13px] flex items-center justify-between gap-2 lg:block">
        <p className="truncate text-white/85">{name}</p>
        <button onClick={logout} className="lg:mt-1.5 inline-flex items-center gap-1.5 text-white/75 hover:text-white min-h-[32px]">
          <LogOut aria-hidden className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
