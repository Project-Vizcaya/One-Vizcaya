"use strict";

// Which PAGASA alerts concern Nueva Vizcaya, and in what order to show them.
// The matching rules are data (DEFAULT_RULES, overridable from the Firestore
// document config/weather.alertRules) so the team can adjust them without a
// code change.

const DEFAULT_RULES = Object.freeze({
  // An alert is kept if any entry of locations[] equals one of these...
  locations: ["Nueva Vizcaya", "Cagayan Valley", "Region II", "Region 2", "Northern Luzon"],
  // ...or its message mentions one of these.
  messageContains: ["Nueva Vizcaya", "#NLPRSD"],
});

const norm = (s) => String(s || "").trim().toLowerCase();

function resolveRules(cfg) {
  const list = (v, d) => (Array.isArray(v) && v.every((x) => typeof x === "string") && v.length ? v : d);
  return {
    locations: list(cfg && cfg.locations, DEFAULT_RULES.locations),
    messageContains: list(cfg && cfg.messageContains, DEFAULT_RULES.messageContains),
  };
}

function matches(alert, rules) {
  const wanted = new Set(rules.locations.map(norm));
  if ((alert.locations || []).some((l) => wanted.has(norm(l)))) return true;
  const msg = norm(alert.message);
  return rules.messageContains.some((m) => msg.includes(norm(m)));
}

/**
 * Active alerts for Nueva Vizcaya: matching, not expired, highest priority
 * first, then newest. An alert with no valid-until time is kept (never
 * declared expired without one).
 */
function nvAlerts(alerts, rulesCfg, nowMs) {
  const rules = resolveRules(rulesCfg);
  return alerts
    .filter((a) => matches(a, rules))
    .filter((a) => a.validUntilMs === null || a.validUntilMs === undefined || a.validUntilMs > nowMs)
    .sort((a, b) => (b.priority - a.priority) || ((b.issuedAtMs || 0) - (a.issuedAtMs || 0)));
}

module.exports = { nvAlerts, resolveRules, DEFAULT_RULES };
