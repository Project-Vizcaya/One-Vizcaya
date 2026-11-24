import { jsonBody, withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import { flags } from "@/lib/flags";

export const POST = withSession(async (s, req) => {
  if (!flags.responderTracking) throw new HubError(503, "Responder tracking is switched off.");
  const { action } = await jsonBody(req);
  if (action === "start") return getStore().startDuty(s);
  if (action === "end") return getStore().endDuty(s);
  throw new HubError(400, "action must be start or end.");
});
