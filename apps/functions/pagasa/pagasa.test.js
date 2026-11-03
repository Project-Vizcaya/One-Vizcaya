"use strict";

// Tests for the PREPARED (inactive) PAGASA TenDay client, cache and location
// matcher. Run: npm test (from apps/functions).
//
// FIXTURES ARE TRANSPORT-LEVEL ONLY. The TenDay response schema has not been
// seen, so no fixture here pretends to be a forecast. Success bodies are
// opaque markers asserted to pass through UNINTERPRETED. The only real body is
// the one observed live: {"error":"Token is required"} from /api/v1/validate.
// Schema fixtures must be added from the official documentation.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { request, KINDS, PagasaError, BASE_URL, ENDPOINTS } = require("./client");
const { createCache } = require("./cache");
const { normalize, matchMunicipalities } = require("./locations");

// A fake token used only inside these tests. It is never sent anywhere.
const TOKEN = "test-token-not-real";
const noSleep = async () => {};

function fakeFetch(responses) {
  const calls = [];
  const queue = [...responses];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: async () => next.body,
    };
  };
  return { impl, calls };
}

// ── client: auth and transport ─────────────────────────────────────────────

test("sends the token in a `token` header — not Bearer, not the URL", async () => {
  const f = fakeFetch([{ status: 200, body: '{"opaque":true}' }]);
  await request("current", { token: TOKEN, fetchImpl: f.impl });
  const { url, init } = f.calls[0];
  assert.equal(init.headers.token, TOKEN);
  assert.equal(init.headers.Authorization, undefined);
  assert.ok(!url.includes(TOKEN), "token must never appear in the URL");
  assert.equal(url, `${BASE_URL}${ENDPOINTS.current}`);
});

test("refuses to call upstream without a token", async () => {
  const f = fakeFetch([]);
  await assert.rejects(
    request("current", { token: "", fetchImpl: f.impl }),
    (e) => e instanceof PagasaError && e.kind === KINDS.NO_TOKEN,
  );
  assert.equal(f.calls.length, 0);
});

test("returns the body uninterpreted, labelled as PAGASA with retrieval time", async () => {
  const f = fakeFetch([{ status: 200, body: '{"opaque":{"nested":[1,2,3]}}' }]);
  const r = await request("full", { token: TOKEN, fetchImpl: f.impl });
  assert.deepEqual(r.data, { opaque: { nested: [1, 2, 3] } });
  assert.equal(r.provider, "PAGASA");
  assert.equal(r.endpoint, ENDPOINTS.full);
  assert.ok(!Number.isNaN(Date.parse(r.retrievedAt)));
});

test("passes query parameters through verbatim without assuming names", async () => {
  const f = fakeFetch([{ status: 200, body: "{}" }]);
  await request("date", { token: TOKEN, fetchImpl: f.impl, query: { any_name: "v" } });
  assert.ok(f.calls[0].url.endsWith("?any_name=v"));
});

test("rejects an unknown endpoint name", async () => {
  await assert.rejects(request("nope", { token: TOKEN }), /Unknown PAGASA endpoint/);
});

// ── client: error mapping (and no retry on 4xx) ────────────────────────────

for (const [status, kind] of [
  [400, KINDS.BAD_REQUEST],
  [401, KINDS.AUTH],
  [403, KINDS.AUTH],
  [404, KINDS.NOT_FOUND],
  [429, KINDS.RATE_LIMITED],
]) {
  test(`HTTP ${status} -> ${kind}, not retried`, async () => {
    const f = fakeFetch([
      { status, body: '{"error":"x"}' },
      { status: 200, body: "{}" },
    ]);
    await assert.rejects(
      request("current", { token: TOKEN, fetchImpl: f.impl, sleep: noSleep }),
      (e) => e.kind === kind && e.status === status,
    );
    assert.equal(f.calls.length, 1, "4xx must not be retried");
  });
}

test("the real observed tokenless reply maps to bad_request", async () => {
  // Observed live 2026-11-03 from GET /api/v1/validate with no token.
  const f = fakeFetch([{ status: 400, body: '{"error":"Token is required"}' }]);
  await assert.rejects(
    request("validate", { token: TOKEN, fetchImpl: f.impl }),
    (e) => e.kind === KINDS.BAD_REQUEST,
  );
});

test("HTTP 500 is retried with backoff, then surfaces as server", async () => {
  const waits = [];
  const f = fakeFetch([
    { status: 500, body: "" },
    { status: 502, body: "" },
    { status: 503, body: "" },
  ]);
  await assert.rejects(
    request("current", {
      token: TOKEN, fetchImpl: f.impl, retries: 2, backoffMs: 100,
      sleep: async (ms) => { waits.push(ms); },
    }),
    (e) => e.kind === KINDS.SERVER,
  );
  assert.equal(f.calls.length, 3);
  assert.deepEqual(waits, [100, 200]);
});

test("a transient 500 followed by success returns the success", async () => {
  const f = fakeFetch([{ status: 500, body: "" }, { status: 200, body: '{"ok":1}' }]);
  const r = await request("current", { token: TOKEN, fetchImpl: f.impl, sleep: noSleep });
  assert.deepEqual(r.data, { ok: 1 });
});

test("network failure -> network; timeout -> timeout", async () => {
  const net = fakeFetch([new TypeError("fetch failed")]);
  await assert.rejects(
    request("current", { token: TOKEN, fetchImpl: net.impl, retries: 0 }),
    (e) => e.kind === KINDS.NETWORK,
  );
  const to = Object.assign(new Error("t"), { name: "TimeoutError" });
  const slow = fakeFetch([to]);
  await assert.rejects(
    request("current", { token: TOKEN, fetchImpl: slow.impl, retries: 0 }),
    (e) => e.kind === KINDS.TIMEOUT,
  );
});

test("non-JSON body -> invalid_json", async () => {
  const f = fakeFetch([{ status: 200, body: "<html>maintenance</html>" }]);
  await assert.rejects(
    request("current", { token: TOKEN, fetchImpl: f.impl }),
    (e) => e.kind === KINDS.INVALID_JSON,
  );
});

test("error messages never contain the token", async () => {
  const f = fakeFetch([{ status: 401, body: "" }]);
  await assert.rejects(
    request("current", { token: TOKEN, fetchImpl: f.impl }),
    (e) => !e.message.includes(TOKEN),
  );
});

// ── cache ──────────────────────────────────────────────────────────────────

test("fresh hits do not call upstream", async () => {
  let t = 0;
  const cache = createCache({ ttlMs: 1000, now: () => t });
  let calls = 0;
  const fetcher = async () => ({ n: ++calls });
  await cache.getOrFetch("k", fetcher);
  t = 999;
  const r = await cache.getOrFetch("k", fetcher);
  assert.equal(calls, 1);
  assert.equal(r.stale, false);
});

test("expired entries are re-fetched", async () => {
  let t = 0;
  const cache = createCache({ ttlMs: 1000, now: () => t });
  let calls = 0;
  await cache.getOrFetch("k", async () => ++calls);
  t = 1000;
  await cache.getOrFetch("k", async () => ++calls);
  assert.equal(calls, 2);
});

test("concurrent misses share one upstream call", async () => {
  const cache = createCache();
  let calls = 0;
  const fetcher = () => new Promise((r) => setTimeout(() => r(++calls), 5));
  await Promise.all([cache.getOrFetch("k", fetcher), cache.getOrFetch("k", fetcher)]);
  assert.equal(calls, 1);
});

test("upstream failure serves the last real value, flagged stale with its true time", async () => {
  let t = 0;
  const cache = createCache({ ttlMs: 1000, maxStaleMs: 10_000, now: () => t });
  await cache.getOrFetch("k", async () => ({ v: "real" }));
  t = 5000;
  const r = await cache.getOrFetch("k", async () => {
    throw new PagasaError(KINDS.SERVER, "down", 503);
  });
  assert.equal(r.stale, true);
  assert.deepEqual(r.value, { v: "real" });
  assert.equal(r.fetchedAt, new Date(0).toISOString());
});

test("too-old cache is not served: the error propagates", async () => {
  let t = 0;
  const cache = createCache({ ttlMs: 1000, maxStaleMs: 2000, now: () => t });
  await cache.getOrFetch("k", async () => 1);
  t = 3000;
  await assert.rejects(
    cache.getOrFetch("k", async () => { throw new Error("down"); }),
    /down/,
  );
});

test("nothing cached + failure: the error propagates, nothing is invented", async () => {
  const cache = createCache();
  await assert.rejects(cache.getOrFetch("k", async () => { throw new Error("down"); }), /down/);
});

// ── location matching ──────────────────────────────────────────────────────

test("normalize handles diacritics, prefixes and punctuation", () => {
  assert.equal(normalize("Alfonso Castañeda"), "alfonso castaneda");
  assert.equal(normalize("Municipality of Dupax del Norte"), "dupax del norte");
  assert.equal(normalize("  BAYOMBONG (Capital) "), "bayombong capital");
});

test("matches, and reports unmatched and ambiguous instead of guessing", () => {
  const appNames = ["Bayombong", "Alfonso Castañeda", "Kasibu", "Quezon"];
  const candidates = [
    { name: "BAYOMBONG", id: "A" },
    { name: "Alfonso Castaneda", id: "B" },
    // "Quezon" exists in several provinces — must not be silently picked.
    { name: "Quezon", id: "Q1" },
    { name: "Quezon", id: "Q2" },
  ];
  const r = matchMunicipalities(appNames, candidates);
  assert.equal(r.matched.Bayombong.id, "A");
  assert.equal(r.matched["Alfonso Castañeda"].id, "B");
  assert.deepEqual(r.unmatched, ["Kasibu"]);
  assert.equal(r.ambiguous.Quezon.length, 2);
});
