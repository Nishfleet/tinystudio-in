#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";
import { FOUNDER_PILOT } from "./lib/client-scaffold.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";
import { NO_GUARANTEE_CLIENT_SENTENCE } from "./lib/service-contract.mjs";

const prospectPath = process.argv[2];

if (!prospectPath) {
  console.error("Usage: npm run prospect:script -- prospects/prospect-slug");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

guardOutboundProspectPath(prospectPath);

function read(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function lineValue(content, number, fallback) {
  const pattern = new RegExp(`^${number}\\. [^\\n:]+:[ \\t]*([^\\n]*)$`, "m");
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function wedgeValue(content) {
  const match = content.match(/## Wedge\n+([\s\S]*?)(?:\n## |$)/);
  if (!match) return "Site architecture";
  const first = match[1]
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("Pick one") && !line.startsWith("-"));
  return first || "Site architecture";
}

function cleanFragment(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/"/g, "'")
    .replace(/^Compare against\s+/i, "")
    .replace(/[.]+(?='?$)/g, "")
    .replace(/[.]+$/g, "");
}

function lowerFirst(value) {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function pageName(value) {
  const cleaned = cleanFragment(value);
  return /^homepage$/i.test(cleaned) ? "the homepage" : cleaned;
}

function section(content, heading, level = "##") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextHeading = level === "##" ? "\\n## " : "\\n(?:## |### )";
  const match = content.match(new RegExp(`(?:^|\\n)${level} ${escaped}\\n+([\\s\\S]*?)(?=${nextHeading}|$)`));
  return match ? match[1].trim() : "";
}

function bulletValues(content) {
  return content
    .split("\n")
    .map((line) => line.trim().replace(/^- /, ""))
    .filter((line) => line && line !== "none found" && line !== "-");
}

function labeledValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^- ${escaped}:\\s*([^\\n]+)$`, "m"));
  return match ? cleanFragment(match[1]) : "";
}

function compactList(values, max = 3) {
  return values.slice(0, max).map(cleanFragment).filter(Boolean);
}

function spokenCue(value) {
  const cleaned = cleanFragment(value);
  if (cleaned.length <= 42) return cleaned;
  const servicesMatch = cleaned.match(/^(.{3,30}?\bServices)\b/i);
  if (servicesMatch) return servicesMatch[1].trim();
  const split = cleaned
    .replace(/\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b.*$/, "")
    .replace(/\s+(Day-to-day|Strategic|Security|Support|Services?)\b.*$/i, "")
    .trim();
  return split && split.length >= 8 && split.length <= 42 ? split : cleaned.slice(0, 42).trim();
}

function spokenCues(values, max = 3) {
  return values.slice(0, max).map(spokenCue).filter(Boolean);
}

function genericImpact(value) {
  return /asking buyers to understand multiple technical services|offer feels generic|hard to evaluate|without hunting through the page|safer, clearer choice|more qualified visitors should reach|a buyer can see the right next path sooner|page feels safer because the buyer/i.test(String(value || ""));
}

function scriptImpact({ outlineImpact, cues }) {
  if (outlineImpact && !genericImpact(outlineImpact)) return lowerFirst(cleanFragment(outlineImpact));

  const promise = cues.visiblePromise ? `a buyer landing on '${cleanFragment(cues.visiblePromise)}' can recognize the right path faster` : "a buyer can recognize the right path faster";
  const routeCues = spokenCues(cues.ctas, 3);
  const proofCues = spokenCues(cues.trust, 3);
  const route = routeCues.length ? `, choose between ${routeCues.join(", ")}` : "";
  const proof = proofCues.length ? `, and see proof cues like ${proofCues.join(", ")} closer to the decision` : "";
  return `${promise}${route}${proof}`;
}

function fixRationale(cues) {
  const routeCues = spokenCues(cues.ctas, 3);
  const proofCues = spokenCues(cues.trust, 3);
  const route = routeCues.length ? `make the next step easier to choose around ${routeCues.join(", ")}` : "make the next step easier to choose";
  const proof = proofCues.length ? `, and put proof like ${proofCues.join(", ")} closer to that choice` : "";
  return `${route}${proof}`;
}

function snapshotCues(content) {
  if (!content.trim() || /## Status[\s\S]*Result: failed/.test(content)) {
    return {
      visiblePromise: "",
      description: "",
      h1: [],
      h2: [],
      ctas: [],
      trust: []
    };
  }

  const pagePromise = section(content, "Page Promise");
  const h1 = compactList(bulletValues(section(content, "H1", "###")), 2);
  const h2 = compactList(bulletValues(section(content, "H2", "###")), 4);
  const ctas = compactList(bulletValues(section(content, "CTA And Route Cues")), 5);
  const trust = compactList(
    bulletValues(section(content, "Trust / Proof Cues"))
      .filter((value) => !/\bguarantee(?:d|s)?\b/i.test(value)),
    6
  );

  return {
    visiblePromise: h1[0] || labeledValue(pagePromise, "Title"),
    description: labeledValue(pagePromise, "Description"),
    h1,
    h2,
    ctas,
    trust
  };
}

function cueLine(label, values, fallback) {
  const rendered = Array.isArray(values) ? values.filter(Boolean).join("; ") : values;
  return `- ${label}: ${rendered || fallback}`;
}

const metadataPath = join(prospectPath, "metadata.json");
const metadata = existsSync(metadataPath)
  ? JSON.parse(readFileSync(metadataPath, "utf8"))
  : { name: prospectPath.split("/").pop(), website: "" };

const outline = read("loom-outline.md");
const pageSnapshot = read("page-snapshot.md");
const sharpnessBrief = read("recording-sharpness-brief.md");
const config = agencyConfig();
const cues = snapshotCues(pageSnapshot);
const positioningAngle = section(sharpnessBrief, "Positioning Angle") || "- Generate `recording-sharpness-brief.md` before recording.";
const soWhatChain = section(sharpnessBrief, "So-What Chain") || "- Use feature -> functional -> financial -> emotional before recording.";
const coldOpen = section(sharpnessBrief, "20-Second Cold Open") || "";

const wedge = wedgeValue(outline);
const mainPage = pageName(lineValue(outline, 2, "the main money page"));
const specificLeak = cleanFragment(lineValue(outline, 3, "the page is making the buyer work too hard before the next step is obvious"));
const whyItMatters = scriptImpact({
  outlineImpact: lineValue(outline, 4, ""),
  cues
});
const contrast = cleanFragment(lineValue(outline, 5, "a clearer competitor or reference pattern"));
const firstFix = cleanFragment(lineValue(outline, 6, "clarify the page hierarchy, proof, and CTA path"));
const firstFixRationale = fixRationale(cues);
const price = `$${FOUNDER_PILOT.offerPriceUsd.toLocaleString("en-US")} founder pilot`;
const spokenPagePromise = cleanFragment(cues.visiblePromise || "what the homepage is promising above the fold");

const script = `# ${metadata.name} Loom Recording Script

## Goal

Record a 2-3 minute cold audit that names one clear fault and makes the ${config.offerName} feel like the obvious next step.

## Before Recording

- Open ${metadata.website || "the prospect website"}.
- Open this file, \`recording-sharpness-brief.md\`, and \`page-snapshot.md\`.
- Keep the screen on ${mainPage}.
- ${NO_GUARANTEE_CLIENT_SENTENCE}
- If the live page differs from \`page-snapshot.md\`, trust the live page.

## Live Page Cues

${cueLine("Visible promise", cues.visiblePromise, "verify on the live page before recording")}
${cueLine("Description cue", cues.description, "none captured")}
${cueLine("H2 route cues", cues.h2, "none captured")}
${cueLine("CTA/path cues", cues.ctas, "none captured")}
${cueLine("Proof cues", cues.trust, "none captured")}

## Recording Sharpness

### Angle

${positioningAngle}

### So-What Chain

${soWhatChain}

${coldOpen ? `### Optional Cold Open\n\n${coldOpen}\n` : ""}

## Talk Track

### 0:00-0:20 Open

"Hey ${metadata.name} team, ${config.founderName} here. I recorded this because your business looks like a fit for a quick ${wedge.toLowerCase()} audit. I am not going to pitch a full rebuild. I want to show one specific page fault that looks fixable."

### 0:20-1:05 Show The Fault

"The page promise I would start from is: ${spokenPagePromise}."

"The main page I would look at first is ${mainPage}. The fault I noticed is this: ${specificLeak}."

"That matters because ${whyItMatters}."

### 1:05-1:35 Show The Contrast

"The pattern I would compare this against is ${contrast}. The best pages make the buyer's first decision obvious before they ask for a call."

### 1:35-2:20 Show The First Fix

"The first fix I would make is: ${firstFix}."

"I would not start by publishing a bunch of new content. I would ${firstFixRationale}."

### 2:20-3:00 Close

"If useful, I can run this as a human-reviewed ${config.offerName} for this one highest-leverage page. It includes the fault map, rewrite or redesign, implementation pass or dev-ready handoff, proof, Loom, measurement plan, one client revision, and 14-day implementation tracking. The first 3 founder pilots are exactly ${price}."

"Either way, I hope this was useful."

## After Recording

1. Copy the Loom URL.
2. Run:

\`\`\`bash
npm run prospect:send-prep -- ${prospectPath} https://www.loom.com/share/... --approved
\`\`\`

3. Open \`send-package.md\` and send the right channel version.
4. Open the outbox, confirm only messages actually sent, and mark the real channel there:

\`\`\`bash
npm run prospect:outbox
npm run growth:today
\`\`\`
`;

const outputPath = join(prospectPath, "recording-script.md");
writeFileSync(outputPath, script);

console.log(JSON.stringify({
  status: "created",
  path: outputPath
}, null, 2));
