import { redirect } from "next/navigation";
import { currentSession } from "@/lib/api";
import { flags } from "@/lib/flags";
import { HubNav } from "@/components/HubNav";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const s = await currentSession();
  if (!s) redirect("/login");
  if (s.role === "responder") redirect("/responder");
  return (
    <div className="min-h-[calc(100vh-24px)] lg:flex">
      <HubNav
        name={s.name}
        scope={s.role === "mdrrmo" ? `MDRRMO ${s.municipality}` : "Province of Nueva Vizcaya"}
        showAudit={s.role === "pdrrmo"}
        showCalls={flags.hotlineIntake}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
