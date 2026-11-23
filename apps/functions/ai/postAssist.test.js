"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validate, buildParams, parseResponse, AssistError, dayKey, SYSTEM } = require("./postAssist");

test("input is validated and trimmed; a headline is required", () => {
  const v = validate({ template: "emergency", issuer: " Municipality of Bambang ", headline: " Evacuate now ", body: "x".repeat(900), lang: "il" });
  assert.equal(v.issuer, "Municipality of Bambang");
  assert.equal(v.headline, "Evacuate now");
  assert.equal(v.body.length, 600);
  assert.equal(v.lang, "il");
  assert.equal(validate({ issuer: "X", headline: "Hello", lang: "fr", template: "spam" }).lang, "en");
  assert.throws(() => validate({ issuer: "X", headline: "" }), AssistError);
  assert.throws(() => validate({ headline: "Hello there" }), AssistError);
});

test("the request uses the default model at low effort, JSON output and refusal fallbacks", () => {
  const p = buildParams(validate({ issuer: "Province of Nueva Vizcaya", headline: "Road closed", body: "Dalton Pass", lang: "tl" }));
  assert.equal(p.model, "claude-opus-5-5");
  assert.equal(p.output_config.effort, "low");
  assert.equal(p.output_config.format.type, "json_schema");
  assert.deepEqual(p.output_config.format.schema.required, ["headline", "caption"]);
  assert.equal(p.fallbacks, "default");
  assert.deepEqual(p.betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(p.thinking, undefined, "thinking cannot be disabled on this model; effort controls it");
  assert.match(p.messages[0].content, /Tagalog/);
  assert.match(p.messages[0].content, /Dalton Pass/);
  assert.match(SYSTEM, /ONLY facts in the draft/);
});

test("a good answer is parsed and bounded", () => {
  const r = parseResponse({ stop_reason: "end_turn", model: "claude-opus-5-5",
    content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify({ headline: " Road closed ", caption: "Use the bypass." }) }] });
  assert.deepEqual(r, { headline: "Road closed", caption: "Use the bypass.", model: "claude-opus-5-5" });
});

test("refusals, truncation and bad JSON become clear errors", () => {
  assert.throws(() => parseResponse({ stop_reason: "refusal", content: [] }), (e) => e.code === "failed-precondition");
  assert.throws(() => parseResponse({ stop_reason: "max_tokens", content: [] }), (e) => e.code === "unavailable");
  assert.throws(() => parseResponse({ stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] }), (e) => e.code === "unavailable");
  assert.throws(() => parseResponse({ stop_reason: "end_turn", content: [{ type: "text", text: "{\"headline\":\"\"}" }] }), (e) => e.code === "unavailable");
});

test("the daily limit counts by Manila date", () => {
  assert.equal(dayKey(Date.UTC(2026, 10, 23, 15, 59)), "2026-11-23");
  assert.equal(dayKey(Date.UTC(2026, 10, 23, 16, 1)), "2026-11-24");
});
