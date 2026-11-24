import { withSession } from "@/lib/api";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const GET = withSession((s) => getStore().audit(s));
