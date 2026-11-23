"use strict";

// Reads a secret from Google Secret Manager when it is needed, instead of
// binding it at deploy time (a bound secret that does not exist yet makes
// every `firebase deploy` fail or stop to ask for it). Requires the functions'
// runtime service account to have "Secret Manager Secret Accessor" on the
// secret; docs/post-maker.md has the command. Cached for 10 minutes.

const { GoogleAuth } = require("google-auth-library");

const cache = new Map();
const TTL_MS = 10 * 60e3;

function projectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try { return JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId || null; } catch { return null; }
}

/** The secret's latest value, or null if it does not exist or is not readable. */
async function readSecret(name, { now = Date.now } = {}) {
  const hit = cache.get(name);
  if (hit && now() - hit.at < TTL_MS) return hit.value;
  const project = projectId();
  if (!project) return null;
  let value = null;
  try {
    const client = await new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] }).getClient();
    const res = await client.request({
      url: `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${encodeURIComponent(name)}/versions/latest:access`,
      timeout: 5000,
    });
    const data = res.data && res.data.payload && res.data.payload.data;
    value = data ? Buffer.from(data, "base64").toString("utf8").trim() || null : null;
  } catch (e) {
    const status = e && e.response && e.response.status;
    if (status !== 404 && status !== 403) console.error(`readSecret(${name}) failed:`, e.message);
    value = null;
  }
  cache.set(name, { value, at: now() });
  return value;
}

module.exports = { readSecret };
