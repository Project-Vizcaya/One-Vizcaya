import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "./session";
import { HubError } from "./store";
import type { Session } from "./types";

export async function currentSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/**
 * Cookie-authenticated writes must come from the Hub's own pages: JSON only
 * (an HTML form on another site can't send application/json) and, when the
 * browser says where the request came from, the same origin. Stops another
 * website from signing a responder in as someone else or acting for them.
 */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    throw new HubError(415, "Send JSON.");
  }
  const origin = req.headers.get("origin");
  if (origin) {
    let host: string | null = null;
    try { host = new URL(origin).host; } catch { /* malformed */ }
    if (host !== req.headers.get("host")) throw new HubError(403, "Cross-site request refused.");
  }
}

/** Wraps an API handler: signed-in session required, HubError → JSON status. */
export function withSession<T>(fn: (s: Session, req: Request) => Promise<T>) {
  return async (req: Request) => {
    const s = await currentSession();
    if (!s) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    return handle(async () => { assertSameOrigin(req); return fn(s, req); });
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

function tokenOk(req: Request, expected: string | undefined): boolean {
  if (!expected || expected.length < 16) return false; // unset or too short: off
  const got = req.headers.get("authorization") ?? "";
  const a = Buffer.from(got), b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** GPS trackers (Traccar position forwarding). */
export const deviceTokenOk = (req: Request) => tokenOk(req, process.env.HUB_DEVICE_TOKEN);

/** scripts/replay.mjs: may move ANY unit, so leave HUB_SIMULATOR_TOKEN empty outside demos. */
export const simulatorTokenOk = (req: Request) => tokenOk(req, process.env.HUB_SIMULATOR_TOKEN);
