import { sign, SIGNATURE_HEADER } from "./signature";
import type { CitizenUpdate } from "./store/types";
import { flags } from "./flags";

/**
 * Sends a stage / ETA update to One Vizcaya's incidentStatusUpdate function,
 * which updates the citizen's report and sends one push per stage. Nothing is
 * sent unless FIREBASE_STATUS_URL and HUB_BRIDGE_SECRET are set and the
 * citizen_eta_updates flag is on. Failures are logged, never thrown: a
 * dispatcher's action must not fail because Firebase is unreachable.
 */
export function sendCitizenUpdate(u: CitizenUpdate, fetchImpl: typeof fetch = fetch): Promise<void> {
  const url = process.env.FIREBASE_STATUS_URL;
  const secret = process.env.HUB_BRIDGE_SECRET;
  if (!flags.citizenEtaUpdates || !url || !secret) return Promise.resolve();
  const body = JSON.stringify(u);
  return fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", [SIGNATURE_HEADER]: sign(secret, body) },
    body,
    signal: AbortSignal.timeout(8000),
  }).then((res) => {
    if (!res.ok) console.error(`Citizen update for ${u.incident_id} failed: ${res.status}`);
  }).catch((e: Error) => console.error(`Citizen update for ${u.incident_id} failed: ${e.message}`));
}
