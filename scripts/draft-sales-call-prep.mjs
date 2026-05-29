#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const prospectPath = process.argv[2];

if (!prospectPath) {
  console.error("Usage: npm run prospect:call-prep -- prospects/prospect-slug");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

function read(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function lineValue(content, number, fallback) {
  const pattern = new RegExp(`^${number}\\. [^\\n:]+:[ \\t]*([^\\n]*)$`, "m");
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

const metadata = json("metadata.json");
const pipeline = json("pipeline.json");
const leadScore = read("lead-score.md");
const loomOutline = read("loom-outline.md");
const buyerRoom = read("buyer-room.md");
const valueCalculator = read("value-calculator.md");
const salesScript = readFileSync("growth-brain/sales/sales-call-script.md", "utf8");
const objections = readFileSync("growth-brain/sales/objection-handling.md", "utf8");

const name = metadata.name || prospectPath.split("/").at(-1);
const website = metadata.website || "";
const vertical = metadata.vertical || "";
const contact = metadata.contact || "";
const score = leadScore.match(/- Score:[ \t]*([^\n]*)/)?.[1]?.trim() || "not scored";
const priority = leadScore.match(/- Priority:[ \t]*([^\n]*)/)?.[1]?.trim() || "not chosen";
const mainPage = lineValue(loomOutline, 2, "main money page");
const leak = lineValue(loomOutline, 3, "the clearest leak from the Loom");
const firstFix = lineValue(loomOutline, 6, "the first implementation-ready fix");
const leaks = section(buyerRoom, "What I Saw", "- Leak 1:\n- Leak 2:\n- Leak 3:");
const scope = section(buyerRoom, "Scope", "- Sprint:\n- Timeline:\n- Price:");
const payback = section(valueCalculator, "Payback", "- Payback customers needed:");
const stage = pipeline.stage || "new";

const prep = `# ${name} Sales Call Prep

## Snapshot

- Website: ${website}
- Vertical: ${vertical}
- Contact: ${contact}
- Pipeline stage: ${stage}
- Fit score: ${score}
- Priority: ${priority}

## Call Goal

Confirm whether the leak is worth fixing now, then close the Tangible Revenue Leak Sprint + Search Trust Layer. Do not turn the call into free consulting.

## Audit Recap

- Main page: ${mainPage}
- Specific leak: ${leak}
- First fix: ${firstFix}

## Buyer Room Summary

${leaks}

${scope}

${payback}

## Questions To Ask

1. What made the audit worth replying to?
2. Is this page supposed to generate calls, demos, audits, or another action?
3. Who approves page, copy, or site structure changes?
4. What context can you share: analytics, reviews, competitors, ad/email history, or customer objections?
5. If the sprint gives you implementation-ready fixes in 7 days, is this worth doing now?

## Close

"The sprint is 7 days. I will build the client brain, map the leak, rewrite the priority sections, give you competitor/search visibility notes, and hand you a 30-day action plan. The first step is payment and intake."

## Guardrails

- Do not guarantee revenue, rankings, ROAS, conversion lift, or sales volume.
- Do not diagnose every page on the call.
- Do not promise implementation until the platform and access are known.
- If the prospect wants a full rebuild, scope that separately after the sprint.

## Likely Objections

${objections}

## Full Call Script Reference

${salesScript}

## After The Call

If won:

\`\`\`bash
npm run prospect:stage -- ${prospectPath} won --note "Approved sprint"
npm run prospect:convert -- ${prospectPath}
\`\`\`

If follow-up needed:

\`\`\`bash
npm run prospect:close-prep -- ${prospectPath} --note "Needs decision follow-up"
\`\`\`
`;

const outputPath = join(prospectPath, "sales-call-prep.md");
writeFileSync(outputPath, prep);

console.log(JSON.stringify({
  status: "created",
  path: outputPath
}, null, 2));
