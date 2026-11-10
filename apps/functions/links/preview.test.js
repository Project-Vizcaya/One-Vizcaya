"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { previewUrlAllowed } = require("./preview");
const { reportPhotoPathOk } = require("../reports/retention");

test("public https pages are allowed", () => {
  assert.equal(previewUrlAllowed("https://www.facebook.com/PGNV/posts/123"), true);
  assert.equal(previewUrlAllowed("https://nuevavizcaya.gov.ph/news?id=1"), true);
});

test("http, IPs, localhost, internal names, odd ports and credentials are refused", () => {
  for (const u of [
    "http://example.com", "https://169.254.169.254/latest/meta-data", "https://10.0.0.5/",
    "https://[::1]/", "https://localhost/", "https://metadata.google.internal/", "https://intranet/",
    "https://example.com:8443/", "https://user:pw@example.com/", "ftp://example.com", "not a url", "",
  ]) assert.equal(previewUrlAllowed(u), false, u);
});

test("only the owner's own report photo may be deleted", () => {
  assert.equal(reportPhotoPathOk("report_images/abc_1700000000.jpg", "abc"), true);
  assert.equal(reportPhotoPathOk("residency_proofs/victim_1.jpg", "abc"), false);
  assert.equal(reportPhotoPathOk("report_images/victim_1.jpg", "abc"), false);
  assert.equal(reportPhotoPathOk("report_images/abc_/../../residency_proofs/x.jpg", "abc"), false);
  assert.equal(reportPhotoPathOk("report_images/abc_1.jpg", ""), false);
});
