import { Timestamp } from "firebase/firestore";
import type { Delivery } from "@/types";

// Push delivery counts written by onNewBroadcast / onNewAnnouncement (P2).
// "Delivered" means Firebase Cloud Messaging accepted the message for that
// phone. It does not prove the phone displayed it: a phone that is off or
// offline gets it later, or not at all if FCM's retention window passes.

export function toDelivery(v: unknown): Delivery | undefined {
  if (!v || typeof v !== "object") return undefined;
  const d = v as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === "number" ? x : 0);
  return {
    attempted: n(d.attempted),
    delivered: n(d.delivered),
    failed: n(d.failed),
    invalidTokensRemoved: n(d.invalidTokensRemoved),
    completedAt: d.completedAt instanceof Timestamp ? d.completedAt.toDate() : undefined,
  };
}

export function deliveryLabel(d: Delivery | undefined, sentAt: Date): string {
  // Alerts sent before delivery tracking existed never get a record.
  if (!d) return Date.now() - sentAt.getTime() < 10 * 60e3 ? "Sending…" : "No delivery record";
  if (d.attempted === 0) return "No registered phones in scope";
  const parts = [`Accepted for ${d.delivered} of ${d.attempted} phones`];
  if (d.failed > 0) parts.push(`${d.failed} failed`);
  if (d.invalidTokensRemoved > 0) parts.push(`${d.invalidTokensRemoved} stale registrations removed`);
  return parts.join(" · ");
}
