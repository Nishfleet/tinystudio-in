#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prospectPath = process.argv[2];

if (!prospectPath) {
  console.error("Usage: npm run prospect:package -- prospects/client-slug");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

const metadataPath = join(prospectPath, "metadata.json");
const metadata = existsSync(metadataPath)
  ? JSON.parse(readFileSync(metadataPath, "utf8"))
  : { name: prospectPath.split("/").pop(), website: "", vertical: "", city: "", contact: "" };

const auditBrief = existsSync(join(prospectPath, "audit-brief.md"))
  ? readFileSync(join(prospectPath, "audit-brief.md"), "utf8")
  : "";
const loomOutline = existsSync(join(prospectPath, "loom-outline.md"))
  ? readFileSync(join(prospectPath, "loom-outline.md"), "utf8")
  : "";
const outreach = existsSync(join(prospectPath, "outreach.md"))
  ? readFileSync(join(prospectPath, "outreach.md"), "utf8")
  : "";
const buyerRoom = existsSync(join(prospectPath, "buyer-room.md"))
  ? readFileSync(join(prospectPath, "buyer-room.md"), "utf8")
  : "";

const packageText = `# ${metadata.name} Loom Package

## Prospect

- Website: ${metadata.website || ""}
- Vertical: ${metadata.vertical || ""}
- City: ${metadata.city || ""}
- Contact: ${metadata.contact || ""}

## Recording Outline

${loomOutline || "Fill loom-outline.md before recording."}

## Message To Send

${outreach || "Fill outreach.md before sending."}

## Buyer Room

${buyerRoom || "Fill buyer-room.md before sending."}

## Audit Brief Source

${auditBrief}
`;

const outputPath = join(prospectPath, "loom-package.md");
writeFileSync(outputPath, packageText);

console.log(JSON.stringify({
  status: "created",
  path: outputPath
}, null, 2));
