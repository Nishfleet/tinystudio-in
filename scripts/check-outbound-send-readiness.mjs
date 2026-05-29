#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const strict = process.argv.includes("--strict");
const roots = ["prospects"];
const outboundFiles = new Set(["next-message.md", "send-package.md", "outreach.md", "reply-package.md", "call-booked-package.md", "close-package.md"]);
const optOutPattern = /\b(reply no|do not follow up|unsubscribe|opt out|ignore me)\b/i;
const placeholderPattern = /\[(?:add Loom link|link|specific leak|Name)\]|Here is the Loom:\s*$/i;
const salesPlaceholderPattern = /\badd (?:meeting link|payment link|call time)\b/i;

function walk(path) {
  if (!existsSync(path)) return [];
  const files = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...walk(child));
    if (entry.isFile()) files.push(child);
  }
  return files;
}

function section(markdown, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

const findings = [];
const warnings = [];
const files = roots
  .flatMap(walk)
  .filter((file) => outboundFiles.has(file.split("/").at(-1)));

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const filename = file.split("/").at(-1);
  if (filename === "next-message.md" || filename === "send-package.md") {
    const type = section(content, "Type", "first-send");
    const commercialSend = /first-send|day-2|day-5|day-10|follow-up/i.test(type) || filename === "send-package.md";
    if (commercialSend && !optOutPattern.test(content)) {
      findings.push({ file, rule: "missing opt-out language" });
    }
  }

  if (filename === "send-package.md" && placeholderPattern.test(content)) {
    findings.push({ file, rule: "send package still has placeholders" });
  }

  if (["reply-package.md", "call-booked-package.md", "close-package.md"].includes(filename) && salesPlaceholderPattern.test(content)) {
    findings.push({ file, rule: "sales package still has meeting/payment placeholders" });
  }

  if (filename === "outreach.md" && !optOutPattern.test(content)) {
    warnings.push({ file, rule: "template outreach lacks opt-out language" });
  }
}

const result = {
  status: findings.length ? "fail" : warnings.length ? "warn" : "pass",
  filesScanned: files.length,
  findings,
  warnings
};

if (findings.length || (strict && warnings.length)) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
