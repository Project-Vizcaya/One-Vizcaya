import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "./session";
import { HubError } from "./store";
import type { Session } from "./types";

export async function currentSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Wraps an API handler: signed-in session required, HubError → JSON status. */
export function withSession<T>(fn: (s: Session, req: Request) => Promise<T>) {
  return async (req: Request) => {
    const s = await currentSession();
    if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    return handle(() => fn(s, req));
  };
}

export async function handle<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn());
  } catch (e) {
    if (e instanceof HubError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    if (b && typeof b === "object" && !Array.isArray(b)) return b as Record<string, unknown>;
  } catch { /* fall through */ }
  throw new HubError(400, "Body must be a JSON object.");
}

export function deviceTokenOk(req: Request): boolean {
  const t = process.env.HUB_DEVICE_TOKEN;
  return !!t && req.headers.get("authorization") === `Bearer ${t}`;
}
