import crypto from "node:crypto";

// Same scheme as One Vizcaya's bridge (apps/functions/hub/bridge.js):
//   x-ov-signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">
export const SIGNATURE_HEADER = "x-ov-signature";
const MAX_SKEW_S = 300;

export function sign(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

export function verify(secret: string | undefined, body: string, header: string | null, nowS = Math.floor(Date.now() / 1000)): boolean {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || Math.abs(nowS - t) > MAX_SKEW_S || !/^[0-9a-f]{64}$/.test(parts.v1 ?? "")) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(parts.v1, "hex"));
}
