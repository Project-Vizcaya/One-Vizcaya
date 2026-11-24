import { describe, expect, it } from "vitest";
import { ageText, compatibleCategory, distanceM, etaDue, etaRange, etaSeconds, freshness, possibleDuplicates, shouldSend } from "./geo";
import { incidentCode, INCIDENT_CODE_RE, TOWN_CODES, townCode } from "./incidentId";
import { sign, verify } from "./signature";
import type { Incident } from "./types";

const BAYOMBONG = { lat: 16.4833, lng: 121.15 };
const SOLANO = { lat: 16.5167, lng: 121.1833 };

describe("distance and ETA stub", () => {
  it("Bayombong to Solano is about 5 km", () => {
    const d = distanceM(BAYOMBONG, SOLANO);
    expect(d).toBeGreaterThan(4500);
    expect(d).toBeLessThan(5500);
  });
  it("ETA uses road factor and 35 km/h", () => {
    const s = etaSeconds(BAYOMBONG, SOLANO);
    expect(s).toBeGreaterThan(600);
    expect(s).toBeLessThan(900);
  });
  it("ETA recalculated after 90 s or 500 m, not on every fix", () => {
    const last = { atMs: 0, ...BAYOMBONG };
    expect(etaDue(null, last)).toBe(true);
    expect(etaDue(last, { atMs: 30_000, lat: BAYOMBONG.lat + 0.001, lng: BAYOMBONG.lng })).toBe(false);
    expect(etaDue(last, { atMs: 91_000, ...BAYOMBONG })).toBe(true);
    expect(etaDue(last, { atMs: 10_000, lat: BAYOMBONG.lat + 0.006, lng: BAYOMBONG.lng })).toBe(true);
  });
  it("citizen range is rounded like One Vizcaya", () => {
    expect(etaRange(120)).toEqual([0, 5]);
    expect(etaRange(720)).toEqual([10, 15]);
    expect(etaRange(75 * 60)).toEqual([75, 90]);
  });
});

describe("adaptive reporting", () => {
  it("off duty never sends", () => {
    expect(shouldSend("off_duty", null, { ...BAYOMBONG, atMs: 0 })).toBe(false);
  });
  it("en route: not before 5 s even when moving; after 5 s if moved 20 m; always by 10 s", () => {
    const last = { ...BAYOMBONG, atMs: 0 };
    const far = { lat: BAYOMBONG.lat + 0.001, lng: BAYOMBONG.lng };
    expect(shouldSend("en_route", last, { ...far, atMs: 1000 })).toBe(false);
    expect(shouldSend("en_route", last, { ...far, atMs: 5000 })).toBe(true);
    expect(shouldSend("en_route", last, { ...BAYOMBONG, atMs: 7000 })).toBe(false);
    expect(shouldSend("en_route", last, { ...BAYOMBONG, atMs: 10_000 })).toBe(true);
  });
  it("available: 2 to 5 minutes apart", () => {
    const last = { ...BAYOMBONG, atMs: 0 };
    const moved = { lat: BAYOMBONG.lat + 0.002, lng: BAYOMBONG.lng };
    expect(shouldSend("available", last, { ...moved, atMs: 60_000 })).toBe(false);
    expect(shouldSend("available", last, { ...moved, atMs: 120_000 })).toBe(true);
    expect(shouldSend("available", last, { ...BAYOMBONG, atMs: 200_000 })).toBe(false);
    expect(shouldSend("available", last, { ...BAYOMBONG, atMs: 300_000 })).toBe(true);
  });
});

describe("staleness", () => {
  const now = Date.parse("2026-11-24T10:00:00Z");
  const ago = (s: number) => new Date(now - s * 1000).toISOString();
  it("en route: live < 30 s, faded to 5 min, then lost", () => {
    expect(freshness("en_route", ago(10), now)).toBe("live");
    expect(freshness("en_route", ago(120), now)).toBe("fading");
    expect(freshness("en_route", ago(301), now)).toBe("lost");
  });
  it("available: live up to 6 min", () => {
    expect(freshness("available", ago(300), now)).toBe("live");
    expect(freshness("available", ago(400), now)).toBe("lost");
    expect(freshness("available", null, now)).toBe("none");
  });
  it("age text", () => {
    expect(ageText(ago(42), now)).toBe("42 s ago");
    expect(ageText(ago(180), now)).toBe("3 min ago");
  });
});

describe("incident codes match One Vizcaya", () => {
  it("same town codes and format", () => {
    expect(Object.keys(TOWN_CODES)).toHaveLength(15);
    expect(townCode("Bambang")).toBe("BAM");
    expect(townCode("Alfonso Castaneda")).toBe("ALC");
    expect(townCode(null)).toBe("PRV");
    // Same input as apps/functions/reports/incidentId.test.js
    const code = incidentCode("Bambang", new Date("2026-11-23T17:30:00Z"), "3f9a2c11-0000-5000-8000-000000000000");
    expect(code).toBe("NV-BAM-20261124-3F9A2C");
    expect(code).toMatch(INCIDENT_CODE_RE);
  });
});

describe("signature (same scheme as One Vizcaya)", () => {
  it("verifies and rejects tampering", () => {
    const t = 1_800_000_000;
    const h = sign("s", "{}", t);
    expect(verify("s", "{}", h, t)).toBe(true);
    expect(verify("s", "{ }", h, t)).toBe(false);
    expect(verify("s", "{}", h, t + 400)).toBe(false);
    expect(verify(undefined, "{}", h, t)).toBe(false);
  });
});

describe("possible duplicates: 300 m, 30 min, compatible category", () => {
  const base = (id: string, extra: Partial<Incident>): Incident => ({
    id, code: id, status: "received", category: "Flooding", description: null, lat: 16.3876, lng: 121.0731,
    location_text: null, barangay: null, municipality: "Bambang", first_source: "app_report",
    created_at: "2026-11-24T10:00:00.000Z", merged_into: null, external_ref: null, ...extra,
  });
  it("finds a nearby, recent, same-kind incident; never itself", () => {
    const t = base("t", { first_source: "hotline_call", category: null });
    const near = base("near", {});
    const far = base("far", { lat: 16.40 });
    const old = base("old", { created_at: "2026-11-24T09:00:00.000Z" });
    const fire = base("fire", { category: "Structure Fire" });
    const closed = base("closed", { status: "resolved" });
    expect(possibleDuplicates(t, [t, near, far, old, fire, closed]).map((i) => i.id)).toEqual(["near", "fire"]);
    expect(possibleDuplicates(base("t2", { category: "Flash flood" }), [near, fire]).map((i) => i.id)).toEqual(["near"]);
  });
  it("category families", () => {
    expect(compatibleCategory("Flooding", "Flash flood")).toBe(true);
    expect(compatibleCategory("Flooding", "Landslide")).toBe(false);
    expect(compatibleCategory(null, "Landslide")).toBe(true);
    // One Vizcaya's own category names against hotline natures.
    expect(compatibleCategory("Flooding / Severe Drainage Issue", "Flooding")).toBe(true);
    expect(compatibleCategory("Vehicular Accident / Road Crash", "Vehicular Accident")).toBe(true);
    expect(compatibleCategory("Landslide / Soil Erosion", "Road Blocked")).toBe(true);
    expect(compatibleCategory("Landslide / Soil Erosion", "Structure Fire")).toBe(false);
    expect(compatibleCategory("Disaster & Risk Management", "Structure Fire")).toBe(true);
    expect(compatibleCategory("Others (Not Listed)", "Landslide")).toBe(true);
    expect(compatibleCategory("Health & Public Safety", "Medical Emergency")).toBe(true);
  });
});
