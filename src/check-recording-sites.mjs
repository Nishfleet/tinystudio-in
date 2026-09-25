#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listOutboundProspectFolders } from "./lib/outbound-prospects.mjs";
import { localIsoDate } from "./date-utils.mjs";
import { checkProspectReadiness, prospectWarningWeight } from "./lib/prospect-readiness.mjs";

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : "prospects/recording-site-check.md";
const timeoutArg = process.argv.find((arg) => arg.startsWith("--timeout="));
const timeoutMs = timeoutArg ? Number(timeoutArg.split("=")[1]) : 8000;
const strict = process.argv.includes("--strict");
const today = localIsoDate();

function listFolders(root) {
  return listOutboundProspectFolders(root);
}

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function queuedProspects() {
  return listFolders("prospects")
    .map((path) => {
      const metadata = json(join(path, "metadata.json"));
      const pipeline = json(join(path, "pipeline.json"));
      const result = checkProspectReadiness(path);
      return {
        path,
        name: metadata.name || path.split("/").at(-1),
        website: metadata.website || "",
        stage: pipeline.stage || "new",
        weight: prospectWarningWeight(result.warnings || [])
      };
    })
    .filter((prospect) => prospect.website && !["won", "lost", "paused"].includes(prospect.stage))
    .sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name))
    .slice(0, limit);
}

async function checkSite(prospect) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(prospect.website, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "TinyStudio recording preflight; contact hello@tinystudio.io"
      }
    });
    clearTimeout(timer);
    return {
      ...prospect,
      ok: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      finalUrl: response.url,
      ms: Date.now() - started,
      error: ""
    };
  } catch (error) {
    clearTimeout(timer);
    return {
      ...prospect,
      ok: false,
      statusCode: 0,
      finalUrl: "",
      ms: Date.now() - started,
      error: error.name === "AbortError" ? `timeout after ${timeoutMs}ms` : error.message
    };
  }
}

const prospects = queuedProspects();
const results = [];

for (const prospect of prospects) {
  results.push(await checkSite(prospect));
}

const rows = results.map((result) => (
  `| ${result.name} | ${result.ok ? "ready" : "check manually"} | ${result.statusCode || "-"} | ${result.ms}ms | ${result.finalUrl || result.error || "-"} | ${result.path} |`
)).join("\n");

const markdown = `# Recording Site Check

Generated: ${today}

Use this before a recording block. If a site fails here, open it manually before spending recording time.

| Prospect | Status | HTTP | Time | Final URL / Error | Folder |
|---|---|---:|---:|---|---|
${rows || "| - | - | - | - | No queued prospects with websites. | - |"}
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, markdown);

const failures = results.filter((result) => !result.ok);
const payload = {
  status: failures.length ? "warning" : "ready",
  path: outputPath,
  checked: results.length,
  failures: failures.map((result) => ({
    prospect: result.name,
    website: result.website,
    error: result.error || result.statusCode
  })),
  results
};

console.log(JSON.stringify(payload, null, 2));

if (strict && failures.length) process.exit(1);
