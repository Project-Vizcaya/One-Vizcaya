import { jsonBody, withSession } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import { flags } from "@/lib/flags";
import type { CallInput } from "@/lib/store/types";

export const POST = withSession(async (s, req) => {
  if (!flags.hotlineIntake) throw new HubError(503, "Hotline intake is switched off.");
  return getStore().createCall(s, (await jsonBody(req)) as CallInput);
});
