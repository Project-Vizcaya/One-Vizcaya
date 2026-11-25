import crypto from "node:crypto";
import type { Session } from "./types";
import { MOCK_UNITS } from "./store/mockData";

// PROTOTYPE SIGN-IN. Demo accounts, no passwords: replace with Supabase Auth
// (the co-dev's user tables) before any real use. The cookie is signed so a
// browser can't simply edit its role.

export const SESSION_COOKIE = "hub_session";

export const DEMO_ACCOUNTS: Session[] = [
  { role: "pdrrmo", userId: "demo-pdrrmo-eoc", name: "PDRRMO EOC operator (demo)" },
  { role: "mdrrmo", userId: "demo-mdrrmo-bambang", name: "MDRRMO Bambang operator (demo)", municipality: "Bambang" },
  { role: "mdrrmo", userId: "demo-mdrrmo-solano", name: "MDRRMO Solano operator (demo)", municipality: "Solano" },
  ...MOCK_UNITS.map((u): Session => ({
    role: "responder", userId: `demo-${u.call_sign.toLowerCase()}`, name: `${u.call_sign} crew (demo)`, unitId: u.id,
  })),
];

function secret(): string {
  const s = process.env.HUB_SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("HUB_SESSION_SECRET must be set in production.");
  return "dev-only-session-secret";
}

export function encodeSession(userId: string): string {
  const mac = crypto.createHmac("sha256", secret()).update(userId).digest("base64url");
  return `${userId}.${mac}`;
}

export function decodeSession(cookie: string | undefined | null): Session | null {
  if (!cookie) return null;
  const i = cookie.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = cookie.slice(0, i), mac = cookie.slice(i + 1);
  let expected: string;
  try { expected = crypto.createHmac("sha256", secret()).update(userId).digest("base64url"); } catch { return null; }
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return DEMO_ACCOUNTS.find((a) => a.userId === userId) ?? null;
}
