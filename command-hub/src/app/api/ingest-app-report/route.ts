import { handle } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import { SIGNATURE_HEADER, verify } from "@/lib/signature";
import type { AppReportPayload } from "@/lib/store/types";

// One Vizcaya → Hub: a new citizen report (apps/functions/hub/bridge.js).
// Signed with HUB_BRIDGE_SECRET; unsigned or stale calls are refused.
// Idempotent on incident_id, so One Vizcaya may retry safely.
export async function POST(req: Request) {
  const raw = await req.text();
  return handle(async () => {
    if (!verify(process.env.HUB_BRIDGE_SECRET, raw, req.headers.get(SIGNATURE_HEADER))) throw new HubError(401, "Bad signature.");
    let body: AppReportPayload;
    try { body = JSON.parse(raw); } catch { throw new HubError(400, "Body must be JSON."); }
    const { incident, created } = await getStore().ingestAppReport(body);
    return { ok: true, created, incident_id: incident.id, code: incident.code };
  });
}
