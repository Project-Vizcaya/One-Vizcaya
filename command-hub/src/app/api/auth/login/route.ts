import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEMO_ACCOUNTS, encodeSession, SESSION_COOKIE } from "@/lib/session";

// PROTOTYPE: picks a demo account. Replace with Supabase Auth.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const account = DEMO_ACCOUNTS.find((a) => a.userId === body?.userId);
  if (!account) return NextResponse.json({ error: "Unknown demo account." }, { status: 400 });
  (await cookies()).set(SESSION_COOKIE, encodeSession(account.userId), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600,
  });
  return NextResponse.json({ ok: true, home: account.role === "responder" ? "/responder" : "/hub" });
}
