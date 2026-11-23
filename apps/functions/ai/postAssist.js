"use strict";

// Optional AI helper for Post Maker (docs/post-maker.md): drafts a tidier
// headline and a caption from what the admin already wrote. Claude (Anthropic)
// via the official SDK. Every draft is shown to the admin to edit; nothing is
// posted automatically.
//
// Off unless BOTH: the ANTHROPIC_API_KEY secret exists in Secret Manager
// (read at call time, so deploying never needs the key) and
// config/ai.postAssistEnabled is not false.

const MODEL = "claude-opus-5-5";
const LANGS = { en: "English", tl: "Tagalog (Filipino)", il: "Ilocano" };
const TEMPLATES = ["announcement", "advisory", "emergency", "event"];
const DAILY_LIMIT = 30; // drafts per admin per day

const SYSTEM = `You help Local Government Units (LGUs) of the Province of Nueva Vizcaya, Philippines, write public announcements for their official social media pages.

Given an admin's draft, return:
- "headline": a clear headline of at most 90 characters, in the requested language.
- "caption": a social media caption of at most 900 characters in the requested language: the key message first, then what residents should do, then where to get help if the draft names it. Plain, calm wording that a frightened or hurried reader understands. No more than three hashtags, ending with #NuevaVizcaya.

Rules:
- Use ONLY facts in the draft. Never add dates, times, places, numbers, names, phone numbers or instructions that are not there. If something important seems missing, leave it out rather than guess.
- Keep official names exactly as written (offices, barangays, agencies such as PAGASA, PHIVOLCS, MDRRMO).
- For an emergency, put the action residents must take first.
- No emoji. No exaggeration. No political or partisan wording; do not praise officials.
- If the requested language is Ilocano or Tagalog, write natural, everyday wording; keep agency names and numbers unchanged.`;

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    caption: { type: "string" },
  },
  required: ["headline", "caption"],
  additionalProperties: false,
};

class AssistError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** Validates the callable's input; throws AssistError("invalid-argument"). */
function validate(data) {
  const d = data || {};
  const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const out = {
    template: TEMPLATES.includes(d.template) ? d.template : "announcement",
    issuer: str(d.issuer, 80),
    headline: str(d.headline, 140),
    body: str(d.body, 600),
    lang: Object.prototype.hasOwnProperty.call(LANGS, d.lang) ? d.lang : "en",
  };
  if (out.headline.length < 3) throw new AssistError("invalid-argument", "Write a headline first.");
  if (!out.issuer) throw new AssistError("invalid-argument", "The issuing LGU is missing.");
  return out;
}

function buildParams(input) {
  const draft = [
    `Issuing LGU: ${input.issuer}`,
    `Kind of post: ${input.template}`,
    `Language to write in: ${LANGS[input.lang]}`,
    "",
    `Headline draft: ${input.headline}`,
    `Details: ${input.body || "(none)"}`,
  ].join("\n");
  return {
    model: MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: draft }],
  };
}

/** Reads the model's JSON answer; throws AssistError on refusal or bad output. */
function parseResponse(msg) {
  if (!msg || msg.stop_reason === "refusal") {
    throw new AssistError("failed-precondition", "The AI declined this text. Please write it yourself.");
  }
  if (msg.stop_reason === "max_tokens") {
    throw new AssistError("unavailable", "The AI did not finish. Try again.");
  }
  const text = (msg.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new AssistError("unavailable", "The AI answer could not be read. Try again."); }
  const headline = typeof parsed.headline === "string" ? parsed.headline.trim().slice(0, 140) : "";
  const caption = typeof parsed.caption === "string" ? parsed.caption.trim().slice(0, 1500) : "";
  if (!headline || !caption) throw new AssistError("unavailable", "The AI answer was incomplete. Try again.");
  return { headline, caption, model: msg.model || MODEL };
}

/** Today's key for the per-admin daily limit, in Manila time. */
const dayKey = (nowMs) => new Date(nowMs + 8 * 3600e3).toISOString().slice(0, 10);

module.exports = { validate, buildParams, parseResponse, AssistError, dayKey, MODEL, DAILY_LIMIT, SYSTEM };
