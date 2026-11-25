import { jsonBody, withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";

export const POST = withSession(async (s, req) => {
  const { incidentId, unitId } = await jsonBody(req);
  if (typeof incidentId !== "string" || typeof unitId !== "string") throw new HubError(400, "incidentId and unitId are required.");
  return getStore().assign(s, incidentId, unitId);
});
