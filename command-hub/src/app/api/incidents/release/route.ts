import { jsonBody, withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";

export const POST = withSession(async (s, req) => {
  const { assignmentId } = await jsonBody(req);
  if (typeof assignmentId !== "number") throw new HubError(400, "assignmentId is required.");
  return getStore().release(s, assignmentId);
});
