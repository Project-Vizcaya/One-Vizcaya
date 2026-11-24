import { currentSession, handle } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(async () => {
    const s = await currentSession();
    if (!s) throw new HubError(401, "Sign in first.");
    return getStore().incidentDetail(s, id);
  });
}
