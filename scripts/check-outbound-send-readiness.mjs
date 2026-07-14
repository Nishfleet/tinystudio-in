#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { isServiceApplicationFolder } from "./lib/outbound-prospects.mjs";
import { serviceRoot } from "./lib/runtime-roots.mjs";
import { resolveRepoPath } from "./lib/service-contract.mjs";

const defaultRoot = resolveRepoPath(serviceRoot, "prospects");

function parseArgs(args) {
  let strict = false;
  let roots = [defaultRoot];
  let rootsOverrideSeen = false;

  for (const argument of args) {
    if (argument === "--strict") {
      if (strict) throw new Error("duplicate option: --strict");
      strict = true;
      continue;
    }

    if (argument.startsWith("--roots=")) {
      if (rootsOverrideSeen) throw new Error("duplicate option: --roots");
      rootsOverrideSeen = true;
      const rawRoots = argument.slice("--roots=".length);
      const values = rawRoots.split(/[,\n]/).map((value) => value.trim());
      if (!rawRoots.trim() || values.some((value) => !value)) {
        throw new Error("--roots requires a non-empty comma- or newline-separated list");
      }

      const normalizedRoots = values.map((value) => {
        if (isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
          throw new Error(`--roots entry must stay within the configured service root: ${value}`);
        }
        const resolved = resolveRepoPath(serviceRoot, value);
        if (resolved === serviceRoot) throw new Error("--roots entry must name a directory, not the service root");
        if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
          throw new Error(`--roots entry is missing or not a directory: ${value}`);
        }
        return resolved;
      });

      if (new Set(normalizedRoots).size !== normalizedRoots.length) {
        throw new Error("--roots entries must be unique");
      }
      roots = normalizedRoots;
      continue;
    }

    if (argument.startsWith("--")) throw new Error(`unknown option: ${argument}`);
    throw new Error(`unexpected positional argument: ${argument}`);
  }

  for (const root of roots) {
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      if (!rootsOverrideSeen && root === defaultRoot && !existsSync(root)) continue;
      throw new Error(`scan root is missing or not a directory: ${root}`);
    }
  }

  return { roots, strict };
}

let config;
try {
  config = parseArgs(process.argv.slice(2));
} catch (error) {
  const result = {
    status: "fail",
    filesScanned: 0,
    findings: [{ rule: "invalid command arguments", detail: error.message }],
    warnings: []
  };
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

const { roots, strict } = config;
const outboundFiles = new Set(["next-message.md", "send-package.md", "outreach.md", "reply-package.md", "call-booked-package.md", "close-package.md"]);
const optOutPattern = /\b(reply no|do not follow up|unsubscribe|opt out|ignore me)\b/i;
const placeholderPattern = /\[(?:add Loom link|link|specific leak|Name)\]|Here is the Loom:\s*$/i;
const salesPlaceholderPattern = /\badd (?:meeting link|payment link|call time)\b/i;

function walk(path) {
  if (!existsSync(path)) return [];
  if (isServiceApplicationFolder(path)) return [];
  const files = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory() && !isServiceApplicationFolder(child)) files.push(...walk(child));
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
