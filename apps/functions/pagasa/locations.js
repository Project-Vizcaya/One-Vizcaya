"use strict";

// Municipality <-> PAGASA location matching — PREPARED, NOT ACTIVE.
//
// The repository holds no per-municipality PSGC codes (the "PSGC 2023" notes in
// apps/web/src/data/municipalities.ts and nv_geofence.dart refer only to the
// source of the boundary GeoJSON). So the mapping is NOT hardcoded here: it
// must be built from PAGASA's own /api/v1/location response once a token
// exists, and any code PAGASA returns is taken as authoritative.
//
// This file is the schema-independent half: given candidates already
// extracted from that response as {name, id}, it matches them to the app's
// municipality names and reports anything that does not match cleanly, so a
// human resolves it rather than the code guessing.

/** Lowercase, strip diacritics (ñ -> n), drop "Municipality of"/"City of", tidy. */
function normalize(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(municipality|city|town) of\b/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string[]} appNames  the app's municipality names
 * @param {{name: string, id: string|number}[]} candidates  from /location
 * @returns {{
 *   matched: Object<string, {name: string, id: string|number}>,
 *   unmatched: string[],
 *   ambiguous: Object<string, {name: string, id: string|number}[]>
 * }}
 */
function matchMunicipalities(appNames, candidates) {
  const byNorm = new Map();
  for (const c of candidates) {
    const k = normalize(c.name);
    if (!byNorm.has(k)) byNorm.set(k, []);
    byNorm.get(k).push(c);
  }

  const matched = {};
  const unmatched = [];
  const ambiguous = {};
  for (const name of appNames) {
    const hits = byNorm.get(normalize(name)) || [];
    if (hits.length === 1) matched[name] = hits[0];
    else if (hits.length > 1) ambiguous[name] = hits;
    else unmatched.push(name);
  }
  return { matched, unmatched, ambiguous };
}

module.exports = { normalize, matchMunicipalities };
