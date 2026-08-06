#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";

const prospectPath = process.argv[2];

if (!prospectPath) {
  console.error("Usage: npm run prospect:package -- prospects/client-slug");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

const metadataPath = join(prospectPath, "metadata.json");
const metadata = existsSync(metadataPath)
  ? JSON.parse(readFileSync(metadataPath, "utf8"))
  : { name: prospectPath.split("/").pop(), website: "", vertical: "", city: "", contact: "" };

for (const script of ["scripts/draft-loom-recording-script.mjs", "scripts/draft-prospect-message.mjs"]) {
  execFileSync(process.execPath, [script, prospectPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

const recordingScript = readFileSync(join(prospectPath, "recording-script.md"), "utf8");
const nextMessage = readFileSync(join(prospectPath, "next-message.md"), "utf8");

const packageText = `# ${metadata.name} Loom Package

## Prospect

- Website: ${metadata.website || ""}
- Vertical: ${metadata.vertical || ""}
- City: ${metadata.city || ""}
- Contact: ${metadata.contact || ""}

## Recording Script

${recordingScript}

## Message To Send

${nextMessage}
`;

const outputPath = join(prospectPath, "loom-package.md");
writeFileSync(outputPath, packageText);

console.log(JSON.stringify({
  status: "created",
  path: outputPath
}, null, 2));
