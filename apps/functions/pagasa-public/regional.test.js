"use strict";

// Tests for the public PAGASA NLPRSD parser. The fixture is a VERBATIM, trimmed
// excerpt of the real page captured 2026-11-03 (see the fixture's header
// comment), so expected values below are what PAGASA actually published.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  parseNlprsd, ParseError, parseIssuedAt, datesForLabels, toText, SOURCE_URL,
} = require("./regional");

const REAL = fs.readFileSync(path.join(__dirname, "fixtures", "nlprsd-2026-11-03.html"), "utf8");
const AT = "2026-11-03T03:00:00.000Z";

/** Rewrites the embedded `regional` JSON — for negative tests only. */
function withRegional(html, mutate) {
  const m = /let\s+regional\s*=\s*/.exec(html);
  const start = m.index + m[0].length;
  const end = html.indexOf(";\n</script>", start);
  const obj = JSON.parse(html.slice(start, end));
  mutate(obj);
  return html.slice(0, start) + JSON.stringify(obj) + html.slice(end);
}

// ── the real capture ───────────────────────────────────────────────────────

test("labels the product as PAGASA with the source and retrieval time", () => {
  const r = parseNlprsd(REAL, AT);
  assert.equal(r.provider, "PAGASA");
  assert.equal(r.sourceUrl, SOURCE_URL);
  assert.equal(r.retrievedAt, AT);
  assert.deepEqual(r.parseWarnings, []);
});

test("provincial forecast is Nueva Vizcaya's own record, with PAGASA's timestamps", () => {
  const f = parseNlprsd(REAL, AT).provincialForecast;
  assert.deepEqual(f.coverage, { level: "province", name: "Nueva Vizcaya", psgc: "0205000000" });
  assert.equal(f.issuedAt, "2026-11-03T01:00:00.000Z"); // 09:00 PHT
  assert.equal(f.validUntil, "2026-11-04T01:00:00.000Z");
  assert.equal(f.day.description, "Partly cloudy skies with isolated rainshowers");
  assert.equal(f.day.high, 32);
  assert.equal(f.day.low, 24);
  assert.equal(f.day.windDirection, "Northeast");
  assert.equal(f.night.low, 23);
});

test("missing values stay null — nothing is filled in", () => {
  const f = parseNlprsd(REAL, AT).provincialForecast;
  assert.equal(f.day.heatIndex, null);
  assert.equal(f.day.coastalCondition, null);
});

test("extended outlook uses Nueva Vizcaya's JSON values, not the HTML's default province", () => {
  const o = parseNlprsd(REAL, AT).extendedOutlook;
  assert.equal(o.issuedAt, "2026-11-03T01:00:00.000Z"); // 09:00 AM PHT
  assert.deepEqual(
    o.days.map((d) => `${d.label} ${d.date}`),
    ["Tuesday 2026-11-03", "Wednesday 2026-11-04", "Thursday 2026-11-05",
      "Friday 2026-11-06", "Saturday 2026-11-07"],
  );
  // The HTML renders the DEFAULT province (Ilocos Norte: 25/33 on Tuesday).
  // Nueva Vizcaya's own record says 24/32.
  assert.equal(o.days[0].low, 24);
  assert.equal(o.days[0].high, 32);
  assert.match(o.days[2].description, /thunderstorm/);
  assert.equal(o.days[4].windSpeed, "Moderate");
});

test("synopsis is regional and verbatim, including tropical cyclone information", () => {
  const s = parseNlprsd(REAL, AT).synopsis;
  assert.deepEqual(s.coverage, { level: "region", name: "Northern Luzon" });
  assert.equal(s.issuedAt, "2026-11-02T21:00:00.000Z");
  assert.match(s.text, /SEVERE TROPICAL STORM IN-FA \(2631\)/);
  assert.match(s.text, /OUTSIDE PAR/);
});

test("rainfall warning: PAGASA's exact 'none issued' sentence", () => {
  const w = parseNlprsd(REAL, AT).rainfallWarning;
  assert.equal(w.noneIssued, true);
  assert.equal(w.text, "As of today, there is no Heavy Rainfall Warning Issued.");
});

test("thunderstorm items keep PAGASA's text verbatim with parsed issue times", () => {
  const items = parseNlprsd(REAL, AT).thunderstorms.items;
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Thunderstorm Information #NLPRSD");
  assert.equal(items[0].issuedAt, "2026-11-03T01:37:00.000Z"); // 09:37 AM PHT
  assert.equal(items[1].body,
    "Thunderstorm is MORE LIKELY to develop over #IlocosNorte and #Cagayan within 12 hours.");
  assert.equal(items.some((i) => i.mentionsNuevaVizcaya), false);
});

// ── refusing to guess ──────────────────────────────────────────────────────

test("refuses if the province record is not Nueva Vizcaya", () => {
  const bad = withRegional(REAL, (o) => { o.provincial.data["205000000"].name = "Quirino"; });
  assert.throws(() => parseNlprsd(bad, AT), ParseError);
});

test("refuses if the Nueva Vizcaya record is missing", () => {
  const bad = withRegional(REAL, (o) => { delete o.provincial.data["205000000"]; });
  assert.throws(() => parseNlprsd(bad, AT), /205000000 missing/);
});

test("drops the extended outlook rather than mis-pairing days when counts differ", () => {
  const bad = withRegional(REAL, (o) => { o.provincial.data["205000000"].outlook.pop(); });
  const r = parseNlprsd(bad, AT);
  assert.equal(r.extendedOutlook, null);
  assert.match(r.parseWarnings[0], /4 entries vs 5 day labels/);
  assert.ok(r.provincialForecast, "the 24-hour forecast is still reported");
});

test("fails loudly when the page no longer embeds the data", () => {
  assert.throws(() => parseNlprsd("<html>redesigned</html>", AT), /not found/);
});

test("an unfamiliar rainfall text is kept verbatim and NOT treated as 'none'", () => {
  const html = REAL.replace("As of today, there is no Heavy Rainfall Warning Issued.",
    "ORANGE WARNING: Nueva Vizcaya");
  const w = parseNlprsd(html, AT).rainfallWarning;
  assert.equal(w.noneIssued, false);
  assert.equal(w.text, "ORANGE WARNING: Nueva Vizcaya");
});

test("detects Nueva Vizcaya in thunderstorm hashtags", () => {
  const html = REAL.replace("#IlocosNorte and #Cagayan", "#NuevaVizcaya and #Quirino");
  const items = parseNlprsd(html, AT).thunderstorms.items;
  assert.equal(items[1].mentionsNuevaVizcaya, true);
});

// ── helpers ────────────────────────────────────────────────────────────────

test("parseIssuedAt handles both observed spellings, PM, and refuses junk", () => {
  assert.equal(parseIssuedAt("Issued at: 09:00 AM, 3 November, 2026"), "2026-11-03T09:00:00+08:00");
  assert.equal(parseIssuedAt("Issued at 09:37 AM 03 November 2026"), "2026-11-03T09:37:00+08:00");
  assert.equal(parseIssuedAt("Issued at 02:34 PM, 3 November, 2026"), "2026-11-03T14:34:00+08:00");
  assert.equal(parseIssuedAt("Issued at 12:15 AM 04 November 2026"), "2026-11-04T00:15:00+08:00");
  assert.equal(parseIssuedAt("Issued at sometime"), null);
});

test("weekday dates use the local issue date (an early-morning issue is not shifted)", () => {
  // 07:00 PHT is 23:00 UTC the previous day; Tuesday must stay 2026-11-03.
  assert.deepEqual(datesForLabels(["Tuesday", "Wednesday"], "2026-11-03T07:00:00+08:00"),
    ["2026-11-03", "2026-11-04"]);
});

test("toText treats raw newlines as spaces and only <br> as a break", () => {
  assert.equal(toText("A<br />\n  B&amp;C &deg;"), "A\nB&C °");
});
