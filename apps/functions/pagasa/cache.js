"use strict";

// Response cache for the PAGASA client — PREPARED, NOT ACTIVE.
//
// PAGASA's rate limits are NOT known yet (the documentation PDF could not be
// retrieved). Until they are, the defaults are deliberately conservative: the
// TenDay product is an issued forecast, not a live feed, so re-fetching it more
// than every 30 minutes gains nothing and risks the quota. Replace the defaults
// with the published limits once confirmed.
//
// Behaviour:
//   - fresh hit (age < ttlMs)            -> cached value, no upstream call
//   - concurrent misses for one key       -> ONE upstream call, shared
//   - upstream fails, cache < maxStaleMs  -> cached value, marked stale
//   - upstream fails, nothing usable      -> the original error is rethrown
//
// It never fabricates data: a stale result is the last real response, flagged
// as stale with its true fetch time, so the UI can say how old it is.

const DEFAULT_TTL_MS = 30 * 60 * 1000;        // 30 min
const DEFAULT_MAX_STALE_MS = 6 * 60 * 60 * 1000; // 6 h

/**
 * @template T
 * @typedef {Object} CacheResult
 * @property {T}       value
 * @property {boolean} stale     true when served because upstream failed
 * @property {string}  fetchedAt ISO time the value was actually retrieved
 */

function createCache({
  ttlMs = DEFAULT_TTL_MS,
  maxStaleMs = DEFAULT_MAX_STALE_MS,
  now = () => Date.now(),
} = {}) {
  /** @type {Map<string, {value: unknown, at: number}>} */
  const entries = new Map();
  /** @type {Map<string, Promise<unknown>>} */
  const inflight = new Map();

  /**
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} fetcher
   * @returns {Promise<CacheResult<T>>}
   */
  async function getOrFetch(key, fetcher) {
    const hit = entries.get(key);
    if (hit && now() - hit.at < ttlMs) {
      return { value: hit.value, stale: false, fetchedAt: new Date(hit.at).toISOString() };
    }

    let p = inflight.get(key);
    if (!p) {
      p = fetcher().finally(() => inflight.delete(key));
      inflight.set(key, p);
    }

    try {
      const value = await p;
      const at = now();
      entries.set(key, { value, at });
      return { value, stale: false, fetchedAt: new Date(at).toISOString() };
    } catch (err) {
      if (hit && now() - hit.at < maxStaleMs) {
        return { value: hit.value, stale: true, fetchedAt: new Date(hit.at).toISOString() };
      }
      throw err;
    }
  }

  return { getOrFetch, size: () => entries.size };
}

module.exports = { createCache, DEFAULT_TTL_MS, DEFAULT_MAX_STALE_MS };
