"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { TOWN_CODES, CODE_RE, townCode, incidentUuidFor, incidentCode, idsForReport } = require("./incidentId");

test("every town has its own three-letter code", () => {
  const codes = Object.values(TOWN_CODES);
  assert.equal(codes.length, 15);
  assert.equal(new Set(codes).size, 15);
  for (const c of codes) assert.match(c, /^[A-Z]{3}$/);
  assert.ok(!codes.includes("PRV"));
});

test("town names match with or without accents and case", () => {
  assert.equal(townCode("Bambang"), "BAM");
  assert.equal(townCode("Bayombong"), "BYB");
  assert.equal(townCode("Alfonso Castaneda"), "ALC");
  assert.equal(townCode("  dupax del sur "), "DDS");
  assert.equal(townCode(""), "PRV");
  assert.equal(townCode("Manila"), "PRV");
});

test("UUID is stable per report path and differs between reports", () => {
  const a = incidentUuidFor("users/u1/reports/r1");
  assert.equal(a, incidentUuidFor("users/u1/reports/r1"));
  assert.notEqual(a, incidentUuidFor("users/u1/reports/r2"));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("code: town, Manila date, start of the UUID", () => {
  const uuid = "3f9a2c11-0000-5000-8000-000000000000";
  // 2026-11-23 17:30 UTC is already 24 November in Manila.
  const code = incidentCode({ municipality: "Bambang", date: new Date("2026-11-23T17:30:00Z"), uuid });
  assert.equal(code, "NV-BAM-20261124-3F9A2C");
  assert.match(code, CODE_RE);
  assert.equal(incidentCode({ municipality: "Bayombong", date: new Date("2026-11-24T01:00:00Z"), uuid }),
    "NV-BYB-20261124-3F9A2C");
});

test("idsForReport uses reportedAt and the path", () => {
  const ts = { toDate: () => new Date("2026-11-24T02:00:00Z") };
  const ids = idsForReport("users/u1/reports/r1", { municipality: "Solano", reportedAt: ts });
  assert.equal(ids.incidentUuid, incidentUuidFor("users/u1/reports/r1"));
  assert.ok(ids.incidentId.startsWith("NV-SOL-20261124-"));
  assert.equal(ids.incidentId.slice(-6), ids.incidentUuid.replace(/-/g, "").slice(0, 6).toUpperCase());
});
