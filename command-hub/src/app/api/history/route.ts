import { withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";

export const dynamic = "force-dynamic";

export const GET = withSession(async (s, req) => {
  const q = new URL(req.url).searchParams;
  const unit = q.get("unit"), from = q.get("from"), to = q.get("to");
  if (!unit || !from || !to) throw new HubError(400, "unit, from and to are required.");
  return getStore().history(s, unit, from, to);
});
