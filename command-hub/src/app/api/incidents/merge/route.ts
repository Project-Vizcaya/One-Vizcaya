import { jsonBody, withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";

// Never automatic: a dispatcher presses Merge (handoff §5).
export const POST = withSession(async (s, req) => {
  const { duplicateId, survivorId } = await jsonBody(req);
  if (typeof duplicateId !== "string" || typeof survivorId !== "string") throw new HubError(400, "duplicateId and survivorId are required.");
  return getStore().merge(s, duplicateId, survivorId);
});
