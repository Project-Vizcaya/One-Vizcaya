"use strict";

// Firebase ↔ PDRRMO Command Hub bridge (docs/command-hub.md). Both switches
// live in Firestore config/hub and are OFF by default:
//   forwardReports      new citizen reports are sent to the Hub
//   citizenEtaUpdates   the Hub may send status and arrival-time updates back
// Both directions are signed with the shared secret HUB_BRIDGE_SECRET (Secret
// Manager): header  x-ov-signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "t.body">
//
// Citizens are told the stage and a ROUNDED arrival time ("about 10 to 15
// minutes") and the responding agency. Never the responder's position or
// identity (handoff §7.4).

const crypto = require("node:crypto");

const SIGNATURE_HEADER = "x-ov-signature";
const MAX_SKEW_S = 300;

function sign(secret, body, t = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

/** True only for a fresh, correctly signed body. */
function verify(secret, body, header, nowS = Math.floor(Date.now() / 1000)) {
  if (!secret || typeof header !== "string") return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=")));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || Math.abs(nowS - t) > MAX_SKEW_S || !/^[0-9a-f]{64}$/.test(parts.v1 || "")) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(parts.v1, "hex"));
}

/** What the Hub receives for a new report. No name or phone number. */
function ingestPayload(path, data, ids) {
  const at = data.reportedAt && typeof data.reportedAt.toDate === "function" ? data.reportedAt.toDate() : null;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    incident_id: ids.incidentUuid,
    incident_code: ids.incidentId,
    external_ref: path,
    category: data.category || null,
    priority: data.priority || null,
    description: typeof data.description === "string" ? data.description.slice(0, 2000) : null,
    location_text: data.location || null,
    barangay: data.barangay || null,
    municipality: data.municipality || null,
    lat: num(data.latitude),
    lng: num(data.longitude),
    reported_at: at ? at.toISOString() : null,
  };
}

async function forwardReport({ hubUrl, secret, payload, fetchImpl = fetch }) {
  const body = JSON.stringify(payload);
  const res = await fetchImpl(`${hubUrl.replace(/\/$/, "")}/api/ingest-app-report`, {
    method: "POST",
    headers: { "content-type": "application/json", [SIGNATURE_HEADER]: sign(secret, body) },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Hub answered ${res.status}`);
}

// The citizen's timeline, in order.
const STAGES = ["received", "validated", "dispatched", "en_route", "on_scene", "resolved"];

/** Rounded arrival time in minutes: [lo, hi]. Never a countdown. */
function etaRange(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null;
  const m = seconds / 60;
  if (m < 5) return [0, 5];
  const step = m <= 60 ? 5 : 15;
  const lo = Math.floor(m / step) * step;
  return [lo, lo + step];
}

const STAGE_TEXT = {
  received: ["Received by PDRRMO", "Your report has reached the PDRRMO Command Center."],
  validated: ["Report validated", "The PDRRMO has validated your report."],
  dispatched: ["Responder dispatched", "A response team has been assigned to your report."],
  en_route: ["Responder on the way", "A response team is on the way."],
  on_scene: ["Responder on scene", "The response team has arrived."],
  resolved: ["Response completed", "The PDRRMO has marked the response as completed."],
};

/**
 * Checks an update from the Hub. Returns { ok, error, update } where update is
 * { path, stage, eta, agency }.
 */
function parseStatusUpdate(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be JSON." };
  const { incident_id: id, external_ref: path, stage, eta_seconds: eta, agency } = body;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return { ok: false, error: "incident_id must be a UUID." };
  if (typeof path !== "string" || !/^users\/[^/]+\/reports\/[^/]+$/.test(path)) return { ok: false, error: "external_ref must be a report path." };
  if (!STAGES.includes(stage)) return { ok: false, error: `stage must be one of ${STAGES.join(", ")}.` };
  if (agency !== undefined && agency !== null && (typeof agency !== "string" || agency.length > 60)) {
    return { ok: false, error: "agency must be a short name." };
  }
  return {
    ok: true,
    update: {
      id, path, stage,
      eta: stage === "en_route" ? etaRange(eta) : null,
      agency: typeof agency === "string" && agency.trim() ? agency.trim() : null,
    },
  };
}

/**
 * Applies an update to the report and, when the stage changed, puts one entry
 * in the reporter's inbox (onNewNotification sends the push). Returns a short
 * result string.
 */
async function applyStatusUpdate(db, u, { serverTimestamp }) {
  const ref = db.doc(u.path);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "not_found";
    const data = snap.data();
    if (data.incidentUuid !== u.id) return "mismatch";
    const prev = data.hub || {};
    const stageChanged = prev.stage !== u.stage;
    tx.update(ref, {
      hub: {
        stage: u.stage,
        etaMin: u.eta ? u.eta[0] : null,
        etaMax: u.eta ? u.eta[1] : null,
        agency: u.agency,
        updatedAt: serverTimestamp(),
      },
    });
    if (stageChanged && data.isAnonymous !== true) {
      const [title, text] = STAGE_TEXT[u.stage];
      const eta = u.eta ? ` About ${u.eta[0] === 0 ? "less than 5" : `${u.eta[0]} to ${u.eta[1]}`} minutes.` : "";
      const segs = u.path.split("/");
      tx.set(db.doc(`users/${segs[1]}/notifications/hub_${segs[3]}_${u.stage}`), {
        type: "status_update",
        title,
        body: `${data.incidentId ? `${data.incidentId}: ` : ""}${text}${eta}`,
        status: u.stage === "resolved" ? "success" : "ongoing",
        reportId: segs[3],
        timestamp: serverTimestamp(),
        read: false,
      });
    }
    return stageChanged ? "stage_changed" : "updated";
  });
}

module.exports = {
  SIGNATURE_HEADER, STAGES, sign, verify, ingestPayload, forwardReport, etaRange, parseStatusUpdate, applyStatusUpdate,
};
