import { deviceTokenOk, handle, jsonBody } from "@/lib/api";
import { getStore, HubError } from "@/lib/store";
import { flags } from "@/lib/flags";

// Hardware trackers (handoff §8): Traccar's position forwarding (JSON) posts
// here with the device token. The unit is found by its device uniqueId
// (IMEI); the same rules as phone fixes apply.
export async function POST(req: Request) {
  return handle(async () => {
    if (!flags.responderTracking) throw new HubError(503, "Responder tracking is switched off.");
    if (!deviceTokenOk(req)) throw new HubError(401, "Bad device token.");
    const body = await jsonBody(req);
    const position = body.position as Record<string, unknown> | undefined;
    const device = body.device as Record<string, unknown> | undefined;
    if (!position || !device || typeof device.uniqueId !== "string") throw new HubError(400, "Expected Traccar's position and device.");
    const unit = await getStore().unitByDevice(device.uniqueId);
    if (!unit) throw new HubError(404, "No unit has this tracker.");
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const knots = n(position.speed);
    return getStore().reportLocation({ device: "hardware" }, unit.id, [{
      lat: Number(position.latitude), lng: Number(position.longitude),
      accuracy_m: n(position.accuracy), heading: n(position.course),
      speed_mps: knots === null ? null : knots * 0.514444,
      fix_time: String(position.fixTime ?? position.deviceTime ?? ""),
    }]);
  });
}
