import { redirect } from "next/navigation";
import { currentSession } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const s = await currentSession();
  if (!s || s.role !== "pdrrmo") redirect("/hub");
  const rows = await getStore().audit(s);
  return (
    <div className="p-3 sm:p-4 space-y-3">
      <h1 className="text-lg font-bold">Audit log</h1>
      <p className="text-xs text-muted-foreground">Latest 200 actions, including every view of a citizen&apos;s location.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Time</th><th className="p-2">Who</th><th className="p-2">Action</th><th className="p-2">What</th><th className="p-2">Details</th></tr></thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-2 whitespace-nowrap">{new Date(r.at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
                <td className="p-2">{r.actor_id}</td>
                <td className="p-2 font-mono text-xs">{r.action}</td>
                <td className="p-2 text-xs">{r.entity} {r.entity_id.slice(0, 8)}</td>
                <td className="p-2 text-xs font-mono">{JSON.stringify(r.details)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
