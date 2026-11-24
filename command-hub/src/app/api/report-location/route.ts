import { currentSession, deviceTokenOk, handle, jsonBody } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import { flags } from "@/lib/flags";
import type { Fix } from "@/lib/types";

// Phone fixes from the responder site (signed-in responder), or from
// scripts/replay.mjs with the device token. Rules (off-duty rejection,
// newer-fix-wins, history) are in the store.
export async function POST(req: Request) {
  return handle(async () => {
    if (!flags.responderTracking) throw new HubError(503, "Responder tracking is switched off.");
    const body = await jsonBody(req);
    const fixes = Array.isArray(body.fixes) ? (body.fixes as Fix[]).slice(0, 500) : null;
    if (!fixes) throw new HubError(400, "fixes must be a list.");
    const s = await currentSession();
    if (s?.role === "responder") return getStore().reportLocation(s, s.unitId, fixes, "phone");
    if (deviceTokenOk(req) && typeof body.unitId === "string") {
      return getStore().reportLocation({ device: true }, body.unitId, fixes, "phone");
    }
    throw new HubError(401, "Sign in as a responder, or send the device token and unitId.");
  });
}
