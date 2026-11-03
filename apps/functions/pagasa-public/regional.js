"use strict";

// Public PAGASA weather products for Nueva Vizcaya, read from PAGASA's own
// published Northern Luzon PRSD regional forecast page.
//
// Kept separate from ../pagasa/ (the authenticated TenDay API client, which
// stays unconnected until a token and its documentation exist).
//
// SOURCE (verified 2026-11-03, HTTP 200, no authentication):
//   https://www.pagasa.dost.gov.ph/regional-forecast/nlprsd
// The page embeds its own data as a JavaScript object literal,
// `let regional = {...}`, which is valid JSON. Its `provincial.data` block is
// keyed by province and carries a real 10-digit PSGC code per province;
// Nueva Vizcaya is key "205000000" with psgc_code "0205000000".
//
// What this reads, and its true coverage:
//   - Provincial forecast (day/night) ............ PROVINCE: Nueva Vizcaya
//   - Extended weather outlook (5 days) .......... PROVINCE: Nueva Vizcaya
//   - Synopsis incl. tropical cyclone info ....... REGION: Northern Luzon
//   - Heavy rainfall warning status .............. REGION: Northern Luzon
//   - Thunderstorm information / watch ........... REGION: Northern Luzon
//     (individual items name the provinces they cover, by hashtag)
// None of these is a municipal observation. Nothing here may be presented as a
// reading for Bayombong, Bambang or any other single town. The province record's
// lat/lon is a map anchor for the province, not a weather station.
//
// Extended-outlook day labels are NOT in the JSON. The page renders weekday
// labels in HTML, and PAGASA's own script pairs them with outlook entries by
// position (outlook[0] is the 24-hour provincial forecast; the rest fill the
// outlook items in order). This module pairs them the same way and refuses to
// guess if the counts disagree. The HTML's rendered VALUES belong to the
// default province (Ilocos Norte), so values are taken from the JSON only.
//
// Not yet observed, so handled verbatim rather than parsed into fields:
// an ACTIVE heavy-rainfall warning (none was in force when this was written).

const SOURCE_URL = "https://www.pagasa.dost.gov.ph/regional-forecast/nlprsd";
const OFFICE = "PAGASA Northern Luzon PRSD (NLPRSD)";
const NV_KEY = "205000000";
const NV_PSGC = "0205000000";

class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "PagasaParseError";
  }
}

// ── low-level extraction ──────────────────────────────────────────────────

/** Parses the JSON object literal that follows `let <name> =` in the page. */
function extractObjectLiteral(html, name) {
  const m = new RegExp(`let\\s+${name}\\s*=\\s*`).exec(html);
  if (!m) throw new ParseError(`"let ${name} =" not found in page`);
  const start = m.index + m[0].length;
  if (html[start] !== "{") throw new ParseError(`"${name}" is not an object literal`);

  // Balanced-brace scan that respects JSON strings and escapes.
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch (e) {
        throw new ParseError(`"${name}" is not valid JSON: ${e.message}`);
      }
    }
  }
  throw new ParseError(`"${name}" object literal is unterminated`);
}

/** Inner HTML of the <div> with the given id, honouring nested divs. */
function innerOfDivById(html, id) {
  const open = new RegExp(`<div[^>]*\\bid=["']${id}["'][^>]*>`, "i").exec(html);
  if (!open) return null;
  const from = open.index + open[0].length;
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = from;
  let depth = 1;
  let t;
  while ((t = tag.exec(html))) {
    if (t[0][1] === "/") {
      if (--depth === 0) return html.slice(from, t.index);
    } else depth++;
  }
  return null;
}

/** Direct child <div>s of a fragment, as inner HTML strings. */
function childDivs(fragment) {
  const out = [];
  const tag = /<\/?div\b[^>]*>/gi;
  let depth = 0;
  let begin = -1;
  let t;
  while ((t = tag.exec(fragment))) {
    if (t[0][1] === "/") {
      if (--depth === 0 && begin >= 0) {
        out.push(fragment.slice(begin, t.index));
        begin = -1;
      }
    } else if (depth++ === 0) begin = t.index + t[0].length;
  }
  return out;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", deg: "°" };

function toText(fragment) {
  return String(fragment)
    .replace(/\s+/g, " ") // raw HTML whitespace is insignificant; only <br> breaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);?/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-z]+);?/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Parses PAGASA's "Issued at" stamps, which appear in two observed spellings:
 *   "Issued at: 09:00 AM, 3 November, 2026"   (outlook header)
 *   "Issued at 09:37 AM 03 November 2026"     (thunderstorm items)
 * Returns an ISO string in Philippine time (+08:00), or null — never a guess.
 */
function parseIssuedAt(text) {
  const m = /Issued at:?\s*(\d{1,2}):(\d{2})\s*(AM|PM),?\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/i.exec(
    String(text),
  );
  if (!m) return null;
  let hh = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") hh += 12;
  const mon = MONTHS[m[5].toLowerCase()];
  if (!mon) return null;
  const p = (n) => String(n).padStart(2, "0");
  return `${m[6]}-${p(mon)}-${p(Number(m[4]))}T${p(hh)}:${m[2]}:00+08:00`;
}

/** "…+08:00" local stamp -> UTC ISO, or null. */
const utc = (local) => (local ? new Date(local).toISOString() : null);

// ── products ──────────────────────────────────────────────────────────────

function period(rec, key) {
  const v = (f) => (rec[`${key}_${f}`] === undefined ? null : rec[`${key}_${f}`]);
  return {
    description: v("description"),
    pagasaIcon: v("icon"), // PAGASA's own icon number; meaning not documented
    high: v("high"),
    low: v("low"),
    heatIndex: v("heat_index"),
    windSpeed: v("wind_speed"),
    windDirection: v("wind_direction"),
    coastalCondition: v("coastal_condition"),
  };
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Calendar dates for consecutive weekday labels, starting on/after `fromIso`. */
function datesForLabels(labels, fromIso) {
  if (!fromIso) return labels.map(() => null);
  const [y, mo, d] = fromIso.slice(0, 10).split("-").map(Number);
  const cur = new Date(Date.UTC(y, mo - 1, d));
  return labels.map((label) => {
    const want = WEEKDAYS.indexOf(label.toLowerCase());
    if (want < 0) return null;
    for (let i = 0; i < 7 && cur.getUTCDay() !== want; i++) cur.setUTCDate(cur.getUTCDate() + 1);
    const iso = cur.toISOString().slice(0, 10);
    cur.setUTCDate(cur.getUTCDate() + 1);
    return iso;
  });
}

function parseExtendedOutlookHeader(html) {
  const i = html.search(/Extended Weather Outlook\s*<\/span>/i);
  if (i < 0) return { issuedAt: null, labels: [] };
  const tail = html.slice(i, i + 20000);
  const issuedAt = parseIssuedAt(toText(tail.slice(0, 400)));
  const labels = [];
  const re = /class=["']outlook-weather["'][^>]*>\s*<span[^>]*>\s*([A-Za-z]+)\s*<\/span>/g;
  let m;
  while ((m = re.exec(tail))) labels.push(m[1]);
  return { issuedAt, labels };
}

// PAGASA's own product names. The kind is read ONLY from the item's title as
// published; anything unrecognised is "other" and is shown verbatim, unranked.
function thunderstormKind(title) {
  if (/^Thunderstorm Advisory/i.test(title)) return "advisory";
  if (/^Thunderstorm Watch/i.test(title)) return "watch";
  if (/^Thunderstorm Information/i.test(title)) return "information";
  return "other";
}

function parseThunderstorms(html) {
  const inner = innerOfDivById(html, "thunderstorms");
  if (inner === null) return null;
  const seen = new Set();
  return childDivs(inner)
    .map((frag) => {
      const text = toText(frag);
      const lines = text.split("\n");
      const issuedIdx = lines.findIndex((l) => /^Issued at/i.test(l));
      const title = lines[0] || null;
      const issuedAt = utc(parseIssuedAt(text));
      const body = (issuedIdx >= 0 ? lines.slice(issuedIdx + 1) : lines.slice(1)).join("\n").trim();
      // Validity only when the publication states it ("... within 12 hours").
      // No stated window -> null; the app then says so instead of assuming one.
      const hrs = /within\s+(\d{1,2})\s+hours?/i.exec(body);
      const validUntil = hrs && issuedAt
        ? new Date(Date.parse(issuedAt) + Number(hrs[1]) * 3600 * 1000).toISOString()
        : null;
      return {
        kind: thunderstormKind(title || ""),
        title,
        issuedAt,
        validUntil,
        body,
        text, // verbatim, for display exactly as PAGASA published it
        mentionsNuevaVizcaya: /#?\bNueva\s*Vizcaya\b/i.test(text),
      };
    })
    .filter((x) => x.text)
    // PAGASA occasionally repeats an item; show each distinct text once.
    .filter((x) => (seen.has(x.text) ? false : (seen.add(x.text), true)));
}

function parseRainfall(html) {
  const inner = innerOfDivById(html, "rainfalls");
  if (inner === null) return null;
  const text = toText(inner);
  return {
    text, // verbatim
    issuedAt: utc(parseIssuedAt(text)),
    // True ONLY when PAGASA's exact "none issued" sentence is present. Any
    // other content is shown verbatim and treated as a possible warning.
    noneIssued: /there is no Heavy Rainfall Warning Issued/i.test(text),
  };
}

/**
 * Normalises the NLPRSD page into One Vizcaya's PAGASA product document.
 * @param {string} html  the page as fetched
 * @param {string} retrievedAt ISO time of retrieval
 */
function parseNlprsd(html, retrievedAt) {
  const regional = extractObjectLiteral(html, "regional");

  const nv = regional?.provincial?.data?.[NV_KEY];
  if (!nv) throw new ParseError(`province key ${NV_KEY} missing from provincial.data`);
  if (nv.name !== "Nueva Vizcaya" || nv.psgc_code !== NV_PSGC) {
    throw new ParseError(
      `province ${NV_KEY} is "${nv.name}" / ${nv.psgc_code}, expected Nueva Vizcaya / ${NV_PSGC}`,
    );
  }
  const outlook = Array.isArray(nv.outlook) ? nv.outlook : [];
  if (outlook.length === 0) throw new ParseError("Nueva Vizcaya has no outlook entries");

  const warnings = [];
  const head = parseExtendedOutlookHeader(html);
  const ext = outlook.slice(1);
  let extendedOutlook = null;
  if (ext.length && head.labels.length === ext.length) {
    // Map weekday labels using the Philippine-local issue date: converting to
    // UTC first would move a pre-08:00 issue onto the previous calendar day.
    const dates = datesForLabels(head.labels, head.issuedAt);
    extendedOutlook = {
      coverage: { level: "province", name: "Nueva Vizcaya", psgc: NV_PSGC },
      issuedAt: utc(head.issuedAt),
      days: ext.map((rec, i) => ({
        label: head.labels[i],
        date: dates[i],
        ...period(rec, "day"),
      })),
    };
  } else if (ext.length) {
    warnings.push(
      `extended outlook skipped: ${ext.length} entries vs ${head.labels.length} day labels`,
    );
  }

  const thunderstorms = parseThunderstorms(html);
  if (thunderstorms === null) warnings.push("thunderstorm section not found");
  const rainfallWarning = parseRainfall(html);
  if (rainfallWarning === null) warnings.push("rainfall warning section not found");

  const iso = (v) => (v ? new Date(v).toISOString() : null);

  return {
    provider: "PAGASA",
    office: OFFICE,
    sourceUrl: SOURCE_URL,
    retrievedAt,
    provincialForecast: {
      coverage: { level: "province", name: "Nueva Vizcaya", psgc: NV_PSGC },
      issuedAt: iso(regional.provincial.issued_date),
      validUntil: iso(regional.provincial.valid_date),
      day: period(outlook[0], "day"),
      night: period(outlook[0], "night"),
    },
    extendedOutlook,
    synopsis: regional.weather
      ? {
          coverage: { level: "region", name: "Northern Luzon" },
          issuedAt: iso(regional.weather.issued_date),
          validUntil: iso(regional.weather.valid_date),
          text: regional.weather.condition ?? null, // verbatim
          // True when the published synopsis contains tropical cyclone
          // information. It does NOT mean the cyclone affects Nueva Vizcaya:
          // the text (e.g. "OUTSIDE PAR") is shown verbatim for that.
          mentionsTropicalCyclone:
            /TROPICAL (CYCLONE|DEPRESSION|STORM)|\bTYPHOON\b/i.test(regional.weather.condition ?? ""),
        }
      : null,
    rainfallWarning: rainfallWarning && {
      coverage: { level: "region", name: "Northern Luzon" },
      ...rainfallWarning,
    },
    thunderstorms: thunderstorms && {
      coverage: { level: "region", name: "Northern Luzon" },
      items: thunderstorms,
    },
    parseWarnings: warnings,
  };
}

module.exports = {
  SOURCE_URL,
  NV_PSGC,
  ParseError,
  parseNlprsd,
  // exported for tests
  extractObjectLiteral,
  innerOfDivById,
  childDivs,
  toText,
  parseIssuedAt,
  datesForLabels,
};
