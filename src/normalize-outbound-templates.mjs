#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";

const config = agencyConfig();
const optOut = config.optOutLine;
const optOutPattern = /\b(reply no|do not follow up|unsubscribe|opt out|ignore me)\b/i;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function normalizeOutreach(path) {
  if (!existsSync(path)) return false;
  const before = readFileSync(path, "utf8");
  if (optOutPattern.test(before)) return false;
  const after = before.replace(/\nNish(\n|$)/, `\n${optOut}\n\nNish$1`);
  if (after === before) return false;
  writeFileSync(path, after);
  return true;
}

function normalizePrice(path) {
  if (!existsSync(path)) return false;
  const before = readFileSync(path, "utf8");
  let after = before;
  for (const legacyPrice of config.legacyFounderSprintPrices || []) {
    after = after.replace(new RegExp(escapeRegex(legacyPrice), "g"), config.founderSprintPrice);
  }
  for (const legacyOfferName of config.legacyOfferNames || []) {
    after = after.replace(new RegExp(escapeRegex(legacyOfferName), "g"), config.offerName);
  }
  if (after === before) return false;
  writeFileSync(path, after);
  return true;
}

const updated = [];

for (const prospectPath of listFolders("prospects")) {
  const outreachPath = join(prospectPath, "outreach.md");
  if (normalizeOutreach(outreachPath)) updated.push(outreachPath);
  for (const file of ["buyer-room.md", "loom-package.md", "recording-script.md", "next-message.md", "send-package.md", "close-package.md"]) {
    const target = join(prospectPath, file);
    if (normalizePrice(target)) updated.push(target);
  }
}

console.log(JSON.stringify({
  status: "normalized",
  updated: updated.length,
  files: updated
}, null, 2));
