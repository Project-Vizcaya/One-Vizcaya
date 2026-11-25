#!/usr/bin/env node
// Single source of truth for report categories: the mobile app's enum
// (apps/mobile/lib/domain/enums/report_category.dart). This script generates
// the web console's copy from it.
//
//   node scripts/gen-report-categories.mjs          # regenerate
//   node scripts/gen-report-categories.mjs --check  # fail if out of date (CI)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "apps/mobile/lib/domain/enums/report_category.dart";
const OUT = "apps/web/src/data/reportCategories.ts";

const dart = readFileSync(join(root, SRC), "utf8");
const body = dart.slice(dart.indexOf("enum ReportCategory {"), dart.indexOf("final String displayName;"));
// identifier( 'Display name', '<description, may contain \'>', ReportPriority.x )
const re = /^\s{2}\w+\(\s*'((?:[^'\\]|\\.)*)',[\s\S]*?ReportPriority\.(critical|high|medium|low),?\s*\)/gm;
const cats = [...body.matchAll(re)].map((m) => ({ name: m[1].replace(/\\'/g, "'"), basePriority: m[2] }));
if (cats.length < 5) throw new Error(`Parsed only ${cats.length} categories from ${SRC}; the enum's format changed.`);

const out = `// GENERATED from ${SRC}
// by scripts/gen-report-categories.mjs. Do not edit: change the Dart enum,
// then run \`node scripts/gen-report-categories.mjs\`. CI fails if this is stale.

export const REPORT_CATEGORIES = [
${cats.map((c) => `  { name: ${JSON.stringify(c.name)}, basePriority: "${c.basePriority}" },`).join("\n")}
] as const;

export type ReportCategoryName = (typeof REPORT_CATEGORIES)[number]["name"];
`;

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(join(root, OUT), "utf8"); } catch { /* missing */ }
  if (current !== out) {
    console.error(`${OUT} is out of date. Run: node scripts/gen-report-categories.mjs`);
    process.exit(1);
  }
  console.log(`${OUT} is up to date (${cats.length} categories).`);
} else {
  writeFileSync(join(root, OUT), out);
  console.log(`Wrote ${OUT} (${cats.length} categories).`);
}
