"use strict";

// Which URLs fetchLinkPreview may fetch: public https hosts only. Blocks
// plain http, IP-literal hosts (v4 and v6), localhost and internal-looking
// names, so the function cannot be pointed at internal or metadata addresses.

function previewUrlAllowed(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return false; }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const h = u.hostname.toLowerCase();
  if (h.startsWith("[") || /^[0-9.]+$/.test(h) || /^0x/i.test(h)) return false; // IP literals
  if (!h.includes(".")) return false; // localhost, bare internal names
  if (/(^|\.)(localhost|local|internal|lan|home|corp)$/.test(h)) return false;
  return true;
}

module.exports = { previewUrlAllowed };
