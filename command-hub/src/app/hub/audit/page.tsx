import { redirect } from "next/navigation";
import { currentSession } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const s = await currentSession();
  if (!s || s.role !== "pdrrmo") redirect("/hub");
  const rows = await getStore().audit(s);
  return (
    <div className="p-3 sm:p-5 space-y-4">
      <header>
        <h1 className="page-title">Audit log</h1>
        <p className="hint mt-0.5">Latest 200 actions, including every view of a citizen&apos;s location.</p>
      </header>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[13px] text-muted-foreground bg-muted"><tr><th scope="col" className="px-3 py-2 font-semibold">Time</th><th scope="col" className="px-3 py-2 font-semibold">Who</th><th scope="col" className="px-3 py-2 font-semibold">Action</th><th scope="col" className="px-3 py-2 font-semibold">What</th><th scope="col" className="px-3 py-2 font-semibold">Details</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">{new Date(r.at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
                <td className="px-3 py-2">{r.actor_id}</td>
                <td className="px-3 py-2 font-code text-[13px] font-bold">{r.action}</td>
                <td className="px-3 py-2 text-[13px]">{r.entity} {r.entity_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-[13px] font-code text-muted-foreground break-all">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
