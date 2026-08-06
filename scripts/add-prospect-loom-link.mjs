#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isValidLoomUrl, loomUrlError } from "./lib/loom-url.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";

const [prospectPath, loomUrl] = process.argv.slice(2);

if (!prospectPath || !loomUrl) {
  console.error("Usage: npm run prospect:loom -- prospects/prospect-slug https://www.loom.com/share/...");
  process.exit(1);
}

if (!isValidLoomUrl(loomUrl)) {
  console.error(loomUrlError());
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

function updateFile(relativePath, updater) {
  const path = join(prospectPath, relativePath);
  if (!existsSync(path)) return false;
  const before = readFileSync(path, "utf8");
  const after = updater(before);
  if (after === before) return false;
  writeFileSync(path, after);
  return true;
}

const updated = [];

if (updateFile("buyer-room.md", (content) => content.replace(/- Link:\s*.*/m, `- Link: ${loomUrl}`))) {
  updated.push("buyer-room.md");
}

if (updateFile("outreach.md", (content) => content.replace(/Here is the Loom:\s*(?:\[link\])?/m, `Here is the Loom: ${loomUrl}`))) {
  updated.push("outreach.md");
}

if (updateFile("loom-package.md", (content) => {
  let next = content.replace(/Here is the Loom:\s*(?:\[link\])?/m, `Here is the Loom: ${loomUrl}`);
  next = next.replace(/- Link:\s*.*/m, `- Link: ${loomUrl}`);
  return next;
})) {
  updated.push("loom-package.md");
}

console.log(JSON.stringify({
  status: "updated",
  prospectPath,
  loomUrl,
  updated
}, null, 2));
