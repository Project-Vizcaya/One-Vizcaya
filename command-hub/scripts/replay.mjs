#!/usr/bin/env node
// GPS replay simulator (handoff §9): posts a recorded track to the Hub as a
// fake unit, at real time or faster. For demos and tests without driving.
//
//   HUB_DEVICE_TOKEN=... node scripts/replay.mjs --unit u-nv-amb-01 \
//     [--track scripts/tracks/bayombong-to-solano.csv] [--speed 5] [--hub http://localhost:3100]
//     [--offline 60]   # hold fixes for 60 s of track time, then send them in one batch
//
// The track is CSV with lat,lng,seconds (seconds from the start). The unit
// must be on duty (sign in as it on /responder and press Start duty, or
// assign it); the Hub rejects positions from off-duty units.

import { readFileSync } from "node:fs";

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const hub = arg("hub", "http://localhost:3100").replace(/\/$/, "");
const unit = arg("unit");
const speed = Number(arg("speed", "1"));
const offline = Number(arg("offline", "0"));
const trackPath = arg("track", new URL("./tracks/bayombong-to-solano.csv", import.meta.url).pathname);
const token = process.env.HUB_DEVICE_TOKEN;
if (!unit || !token) {
  console.error("Usage: HUB_DEVICE_TOKEN=... node scripts/replay.mjs --unit <unit id> [--speed 5] [--offline 60]");
  process.exit(1);
}

const rows = readFileSync(trackPath, "utf8").trim().split(/\r?\n/).slice(1).map((l) => {
  const [lat, lng, s] = l.split(",").map(Number);
  return { lat, lng, s };
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const send = async (fixes) => {
  const res = await fetch(`${hub}/api/report-location`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ unitId: unit, fixes }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${j.error ?? ""}`);
  return j;
};

async function main() {
  const start = Date.now();
  let held = [];
  for (const r of rows) {
    const due = start + (r.s * 1000) / speed;
    await sleep(Math.max(0, due - Date.now()));
    const fix = { lat: r.lat, lng: r.lng, accuracy_m: 8, speed_mps: 9, fix_time: new Date().toISOString() };
    if (offline > 0 && r.s >= 10 && r.s < 10 + offline) { held.push(fix); process.stdout.write("x"); continue; }
    if (held.length) { const out = await send(held); console.log(`\nflushed ${held.length} saved fixes:`, out); held = []; }
    const out = await send([fix]);
    process.stdout.write(out.accepted ? "." : `!(${out.reason ?? "rejected"})`);
  }
  if (held.length) console.log("\nflushed", held.length, await send(held));
  console.log(`\ndone: ${rows.length} fixes for ${unit}`);
}

main().catch((e) => { console.error(`\nStopped: ${e.message}`); process.exit(1); });
