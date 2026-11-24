import { redirect } from "next/navigation";
import { currentSession } from "@/lib/api";
import { flags } from "@/lib/flags";
import { ResponderApp } from "@/components/ResponderApp";

export const metadata = { title: "One Vizcaya Responder" };

export default async function ResponderPage() {
  const s = await currentSession();
  if (!s) redirect("/login");
  if (s.role !== "responder") redirect("/hub");
  if (!flags.responderTracking) return <p className="p-6">Responder tracking is switched off.</p>;
  return <ResponderApp name={s.name} />;
}
