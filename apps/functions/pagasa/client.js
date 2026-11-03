"use strict";

// PAGASA TenDay API client — PREPARED, NOT ACTIVE.
//
// Not exported from index.js and not deployed: no authorised token exists yet,
// and binding a Secret Manager secret that does not exist would fail the deploy.
//
// Built ONLY from confirmed facts:
//   - Base URL https://tenday.pagasa.dost.gov.ph
//   - Auth: request header `token: <API token>` — per PAGASA's documentation.
//     Deliberately NOT `Authorization: Bearer`.
//   - The six documented endpoints below.
//   - Live probe, 2026-11-03: GET /api/v1/validate with no token returned
//     400 {"error":"Token is required"} from the application backend; the other
//     endpoints were refused (403) at PAGASA's load balancer before reaching it.
//
// NOT yet known — the documentation PDF could not be retrieved from the dev
// environment (PAGASA's load balancer answers 403):
//   - each endpoint's query parameters,
//   - the response JSON structure,
//   - published rate limits,
//   - error body shapes beyond the one observed.
// So this client returns validated-but-UNINTERPRETED JSON. It never reads a
// forecast field, and nothing here may be presented to users as PAGASA data
// until a parser is written against the real schema and verified live.

const BASE_URL = "https://tenday.pagasa.dost.gov.ph";

const ENDPOINTS = Object.freeze({
  current: "/api/v1/tenday/current",
  full: "/api/v1/tenday/full",
  date: "/api/v1/tenday/date",
  issuance: "/api/v1/tenday/issuance",
  location: "/api/v1/location",
  validate: "/api/v1/validate",
});

/** Error kinds the caller can branch on without parsing messages. */
const KINDS = Object.freeze({
  NO_TOKEN: "no_token",
  BAD_REQUEST: "bad_request",
  AUTH: "auth",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  SERVER: "server",
  NETWORK: "network",
  TIMEOUT: "timeout",
  INVALID_JSON: "invalid_json",
});

class PagasaError extends Error {
  /**
   * @param {string} kind one of KINDS
   * @param {string} message never contains the token
   * @param {number|null} status upstream HTTP status, if any
   */
  constructor(kind, message, status = null) {
    super(message);
    this.name = "PagasaError";
    this.kind = kind;
    this.status = status;
  }

  /** Worth retrying: transient failures only, never 4xx. */
  get retryable() {
    return (
      this.kind === KINDS.SERVER ||
      this.kind === KINDS.NETWORK ||
      this.kind === KINDS.TIMEOUT
    );
  }
}

function classify(status) {
  if (status === 400) return KINDS.BAD_REQUEST;
  if (status === 401 || status === 403) return KINDS.AUTH;
  if (status === 404) return KINDS.NOT_FOUND;
  if (status === 429) return KINDS.RATE_LIMITED;
  if (status >= 500) return KINDS.SERVER;
  return KINDS.BAD_REQUEST;
}

/**
 * @typedef {Object} PagasaResponse
 * @property {unknown} data       parsed JSON, deliberately uninterpreted
 * @property {number}  status     upstream HTTP status
 * @property {"PAGASA"} provider
 * @property {string}  endpoint   documented path that was called
 * @property {string}  retrievedAt ISO timestamp of retrieval (not issuance)
 */

/**
 * Calls one documented TenDay endpoint.
 *
 * @param {keyof typeof ENDPOINTS} name
 * @param {Object} opts
 * @param {string} opts.token     from Secret Manager (PAGASA_API_TOKEN); required
 * @param {Object<string,string>} [opts.query] passed through verbatim — the
 *        documented parameter names are not yet confirmed, so none are assumed
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {number} [opts.timeoutMs=10000]
 * @param {number} [opts.retries=2]    extra attempts, transient errors only
 * @param {number} [opts.backoffMs=500] doubles per attempt
 * @param {(ms:number)=>Promise<void>} [opts.sleep]
 * @returns {Promise<PagasaResponse>}
 */
async function request(name, opts = {}) {
  const path = ENDPOINTS[name];
  if (!path) throw new Error(`Unknown PAGASA endpoint: ${name}`);

  const {
    token,
    query,
    fetchImpl = fetch,
    timeoutMs = 10000,
    retries = 2,
    backoffMs = 500,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;

  // Never call upstream unauthenticated: it cannot succeed, and repeated
  // tokenless calls are exactly the traffic a load balancer learns to block.
  if (!token) {
    throw new PagasaError(KINDS.NO_TOKEN, "PAGASA_API_TOKEN is not configured.");
  }

  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoffMs * 2 ** (attempt - 1));
    try {
      return await once(url, path, token, fetchImpl, timeoutMs);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof PagasaError) || !e.retryable) throw e;
    }
  }
  throw lastErr;
}

async function once(url, path, token, fetchImpl, timeoutMs) {
  let res;
  try {
    res = await fetchImpl(url.toString(), {
      method: "GET",
      // The token travels ONLY in this header — never in the URL, where it
      // would land in logs and proxies.
      headers: { token, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const isTimeout = e && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new PagasaError(
      isTimeout ? KINDS.TIMEOUT : KINDS.NETWORK,
      isTimeout ? `PAGASA ${path} timed out.` : `PAGASA ${path} unreachable.`,
    );
  }

  const text = await res.text();
  if (!res.ok) {
    throw new PagasaError(classify(res.status), `PAGASA ${path} returned ${res.status}.`, res.status);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new PagasaError(KINDS.INVALID_JSON, `PAGASA ${path} returned non-JSON.`, res.status);
  }

  return {
    data,
    status: res.status,
    provider: "PAGASA",
    endpoint: path,
    retrievedAt: new Date().toISOString(),
  };
}

module.exports = { BASE_URL, ENDPOINTS, KINDS, PagasaError, request };
