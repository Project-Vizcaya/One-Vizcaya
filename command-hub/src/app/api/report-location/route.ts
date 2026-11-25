import { assertSameOrigin, currentSession, handle, jsonBody, simulatorTokenOk } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import { flags } from "@/lib/flags";
import type { Fix } from "@/lib/types";

// Phone fixes from the responder site (signed-in responder), or from
// scripts/replay.mjs with the simulator token. Rules (duty, newer-fix-wins,
// history, duplicates) are in the store.
export async function POST(req: Request) {
  return handle(async () => {
    if (!flags.responderTracking) throw new HubError(503, "Responder tracking is switched off.");
    const sim = simulatorTokenOk(req);
    if (!sim) assertSameOrigin(req);
    const body = await jsonBody(req);
    const fixes = Array.isArray(body.fixes) ? (body.fixes as Fix[]).slice(0, 500) : null;
    if (!fixes) throw new HubError(400, "fixes must be a list.");
    if (sim && typeof body.unitId === "string") return getStore().reportLocation({ device: "simulator" }, body.unitId, fixes);
    const s = await currentSession();
    if (s?.role !== "responder") throw new HubError(401, "Sign in as a responder.");
    // Fixes saved for one unit must never be filed under another (sign-out, new sign-in).
    if (typeof body.unitId === "string" && body.unitId !== s.unitId) throw new HubError(409, "These positions belong to another unit.");
    return getStore().reportLocation(s, s.unitId, fixes);
  });
}
