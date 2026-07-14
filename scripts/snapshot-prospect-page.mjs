#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const prospectPath = args.find((arg) => !arg.startsWith("--"));
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
const timeoutMs = timeoutArg ? Number(timeoutArg.split("=")[1]) : 10000;
const today = localIsoDate();

if (!prospectPath) {
  console.error("Usage: npm run prospect:snapshot -- prospects/prospect-slug [--html=fixture.html]");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

function json(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function compact(value, maxLength = 220) {
  const normalized = decodeHtml(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function stripHtml(value) {
  return decodeHtml(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractTitle(html) {
  return compact(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
}

function extractMeta(html) {
  const tags = Array.from(html.matchAll(/<meta\b[^>]*>/gi)).map((match) => match[0]);
  for (const tag of tags) {
    const name = tag.match(/\b(?:name|property)=["']?([^"'\s>]+)/i)?.[1]?.toLowerCase() || "";
    if (!["description", "og:description", "twitter:description"].includes(name)) continue;
    const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1] || "";
    if (content.trim()) return compact(content, 300);
  }
  return "";
}

function extractHeadings(html, tag) {
  return unique(Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")))
    .map((match) => compact(stripHtml(match[1]), 140))
    .filter(Boolean))
    .slice(0, tag === "h1" ? 4 : 10);
}

function extractCtas(html) {
  const items = [
    ...Array.from(html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)),
    ...Array.from(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi))
  ]
    .map((match) => compact(stripHtml(match[1]), 80))
    .filter((text) => /contact|call|book|schedule|quote|consult|audit|assessment|demo|get started|learn more|services|support|talk/i.test(text));
  return unique(items).slice(0, 12);
}

function extractTrustSignals(text) {
  const patterns = [
    /\b(?:SOC ?2|HIPAA|compliance|certified|certification|MSP|Cloud Verify|Microsoft|Cisco|partner|award|reviews?|testimonials?|case studies?|24\/7|years?|clients?|customers?|rating|guarantee|insured|licensed)\b/gi
  ];
  const hits = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) hits.push(match[0]);
  }
  return unique(hits.map((hit) => compact(hit, 80))).slice(0, 16);
}

async function loadHtml(url) {
  if (htmlArg) {
    const htmlPath = htmlArg.split("=")[1];
    return {
      html: readFileSync(htmlPath, "utf8"),
      statusCode: 200,
      finalUrl: url || htmlPath,
      source: htmlPath
    };
  }

  if (!url) throw new Error("Prospect website is missing.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "TinyStudio recording snapshot; contact hello@tinystudio.io"
      }
    });
    const html = await response.text();
    clearTimeout(timer);
    return {
      html,
      statusCode: response.status,
      finalUrl: response.url,
      source: response.url
    };
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

const metadata = json(join(prospectPath, "metadata.json"));
const name = metadata.name || prospectPath.split("/").at(-1);
const website = metadata.website || "";

let loaded;
try {
  loaded = await loadHtml(website);
} catch (error) {
  const outputPath = join(prospectPath, "page-snapshot.md");
  const markdown = `# ${name} Page Snapshot

Generated: ${today}

## Status

- Result: failed
- Website: ${website || "-"}
- Error: ${error.name === "AbortError" ? `timeout after ${timeoutMs}ms` : error.message}

## Recording Use

Open the site manually before recording. Do not rely on stale local notes if the live page cannot be fetched.
`;
  writeFileSync(outputPath, markdown);
  console.log(JSON.stringify({ status: "failed", prospectPath, outputPath, error: error.message }, null, 2));
  process.exit(0);
}

const text = stripHtml(loaded.html);
const h1 = extractHeadings(loaded.html, "h1");
const h2 = extractHeadings(loaded.html, "h2");
const ctas = extractCtas(loaded.html);
const trustSignals = extractTrustSignals(text);

const markdown = `# ${name} Page Snapshot

Generated: ${today}

Use this as a fast recording prep sheet. Verify visually before mentioning anything in a Loom.

## Source

- Website: ${website || "-"}
- Final URL: ${loaded.finalUrl}
- HTTP: ${loaded.statusCode}

## Page Promise

- Title: ${extractTitle(loaded.html) || "-"}
- Description: ${extractMeta(loaded.html) || "-"}

## Above-The-Fold Cues

### H1

${h1.length ? h1.map((item) => `- ${item}`).join("\n") : "- none found"}

### H2

${h2.length ? h2.map((item) => `- ${item}`).join("\n") : "- none found"}

## CTA And Route Cues

${ctas.length ? ctas.map((item) => `- ${item}`).join("\n") : "- none found"}

## Trust / Proof Cues

${trustSignals.length ? trustSignals.map((item) => `- ${item}`).join("\n") : "- none found"}

## Recording Use

- Start with the visible promise.
- Show the clearest mismatch between promise, buyer route, proof, and next step.
- Keep the Loom to one leak, one buyer impact, one fix, and one ask.

## Text Sample

${compact(text, 900) || "-"}
`;

const outputPath = join(prospectPath, "page-snapshot.md");
writeFileSync(outputPath, markdown);

console.log(JSON.stringify({
  status: "created",
  prospectPath,
  outputPath,
  finalUrl: loaded.finalUrl,
  statusCode: loaded.statusCode,
  h1: h1.length,
  h2: h2.length,
  ctas: ctas.length,
  trustSignals: trustSignals.length
}, null, 2));
