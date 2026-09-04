#!/usr/bin/env node
import { existsSync } from "node:fs";
import { checkProspectReadiness } from "./lib/prospect-readiness.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";

const prospectPath = process.argv[2];
const strict = process.argv.includes("--strict");

if (!prospectPath) {
  console.error("Usage: npm run prospect:check -- prospects/prospect-slug [-- --strict]");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

const result = checkProspectReadiness(prospectPath);

console.log(JSON.stringify(result, null, 2));

if (strict && result.status !== "ready") process.exit(1);
