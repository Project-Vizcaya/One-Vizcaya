import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { assertSameOrigin } from "@/lib/api";
import type { HubError } from "@/lib/store";

export async function POST(req: Request) {
  try { assertSameOrigin(req); } catch (e) {
    return NextResponse.json({ error: (e as HubError).message }, { status: (e as HubError).status ?? 403 });
  }
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
