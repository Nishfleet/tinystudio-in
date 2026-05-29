#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";

const config = agencyConfig();
const requiredStringKeys = [
  "founderName",
  "offerName",
  "founderSprintPrice",
  "standardSprintPriceRange",
  "monthlyContinuationRange",
  "fullStackRetainerRange",
  "operatorPodRange",
  "optOutLine",
  "meetingPlaceholder",
  "paymentPlaceholder"
];

const contentRoots = [
  "README.md",
  "MEMORY.md",
  "TASKS.md",
  "growth-brain",
  "prospects",
  "clients"
];

const allowedFiles = new Set([
  "growth-brain/ops/agency-config.json"
]);

const checkedExtensions = new Set([".md", ".html", ".json", ".txt"]);
const failures = [];
const scanned = [];

function listFiles(path) {
  if (!existsSync(path)) return [];
  const entries = readdirSync(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(target));
    } else if (entry.isFile() && checkedExtensions.has(extname(entry.name))) {
      files.push(target);
    }
  }
  return files;
}

for (const key of requiredStringKeys) {
  if (typeof config[key] !== "string" || !config[key].trim()) {
    failures.push(`agency-config missing required value: ${key}`);
  }
}

for (const key of ["legacyFounderSprintPrices", "legacyPriceRanges", "legacyOfferNames"]) {
  if (!Array.isArray(config[key])) {
    failures.push(`agency-config must define ${key} as an array`);
  }
}

const bannedValues = [
  ...(config.legacyFounderSprintPrices || []),
  ...(config.legacyPriceRanges || []),
  ...(config.legacyOfferNames || [])
].filter(Boolean);

const files = contentRoots.flatMap((root) => {
  if (!existsSync(root)) return [];
  if (checkedExtensions.has(extname(root))) return [root];
  return listFiles(root);
});

for (const file of files) {
  if (allowedFiles.has(file)) continue;
  const content = readFileSync(file, "utf8");
  scanned.push(file);
  for (const bannedValue of bannedValues) {
    if (content.includes(bannedValue)) {
      failures.push(`${file} contains stale agency default: ${bannedValue}`);
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({
    status: "failed",
    scanned: scanned.length,
    failures
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  scanned: scanned.length,
  requiredStringKeys,
  bannedValues: bannedValues.length
}, null, 2));
