import { jsonBody, withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import type { IncidentStatus } from "@/lib/types";

const ALLOWED: IncidentStatus[] = ["received", "validated", "referred", "in_progress", "resolved", "closed", "invalid"];

export const POST = withSession(async (s, req) => {
  const { incidentId, status } = await jsonBody(req);
  if (typeof incidentId !== "string" || !ALLOWED.includes(status as IncidentStatus)) throw new HubError(400, "incidentId and a valid status are required.");
  return getStore().setIncidentStatus(s, incidentId, status as IncidentStatus);
});
