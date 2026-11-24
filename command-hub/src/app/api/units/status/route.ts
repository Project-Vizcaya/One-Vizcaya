import { jsonBody, withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import type { UnitStatus } from "@/lib/types";

export const POST = withSession(async (s, req) => {
  const { unitId, status } = await jsonBody(req);
  if (typeof unitId !== "string" || typeof status !== "string") throw new HubError(400, "unitId and status are required.");
  return getStore().setStatus(s, unitId, status as UnitStatus);
});
