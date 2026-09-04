#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";
import { FOUNDER_PILOT } from "./lib/client-scaffold.mjs";
import { serviceRecordPaths } from "./lib/review-queue.mjs";
import { NO_GUARANTEE_CLIENT_SENTENCE, resolveRepoPath } from "./lib/service-contract.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";
import { codeRoot } from "./lib/runtime-roots.mjs";

const prospectArg = process.argv[2];
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd();

function founderPilotPrice() {
  return `$${FOUNDER_PILOT.offerPriceUsd.toLocaleString("en-US")} founder pilot`;
}

function canonicalScope() {
  return `- Sprint: ${FOUNDER_PILOT.offerName}
- Scope: one highest-leverage page
- Timeline: Day 0 starts only after payment, required context, an approval owner, and an implementation owner; 14-day implementation tracking
- Price: ${founderPilotPrice()}`;
}

function assertCanonicalSalesContract(config) {
  if (
    config.offerName !== FOUNDER_PILOT.offerName ||
    config.founderSprintPrice !== founderPilotPrice() ||
    config.firstClientCount !== FOUNDER_PILOT.capacity ||
    config.scope !== "one highest-leverage page"
  ) {
    throw new Error("active sales configuration must match the immutable first-three $1,000 founder-pilot contract");
  }
}

function assertFounderPilotSlot() {
  const paidPilotCount = serviceRecordPaths(repoRoot, "clients").length;
  if (paidPilotCount >= FOUNDER_PILOT.capacity) {
    throw new Error(`founder pilot capacity is complete after ${FOUNDER_PILOT.capacity} paid clients; a human-reviewed post-pilot offer is required before another sales call close`);
  }
  return FOUNDER_PILOT.capacity - paidPilotCount;
}

function runSalesGuard(action) {
  try {
    return action();
  } catch (error) {
    console.error(`prospect:call-prep failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (!prospectArg) {
  console.error("Usage: npm run prospect:call-prep -- prospects/prospect-slug");
  process.exit(1);
}

const prospectPath = runSalesGuard(() => resolveRepoPath(repoRoot, prospectArg));

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

runSalesGuard(() => guardOutboundProspectPath(prospectPath));

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
const config = runSalesGuard(() => {
  const activeConfig = agencyConfig(repoRoot);
  assertCanonicalSalesContract(activeConfig);
  return activeConfig;
});
const pilotSlotsRemaining = runSalesGuard(assertFounderPilotSlot);
const leadScore = read("lead-score.md");
const loomOutline = read("loom-outline.md");
const buyerRoom = read("buyer-room.md");
const valueCalculator = read("value-calculator.md");
const salesScript = readFileSync(join(codeRoot, "growth-brain/sales/sales-call-script.md"), "utf8");
const objections = readFileSync(join(codeRoot, "growth-brain/sales/objection-handling.md"), "utf8");

const name = metadata.name || prospectPath.split("/").at(-1);
const website = metadata.website || "";
const vertical = metadata.vertical || "";
const contact = metadata.contact || "";
const score = leadScore.match(/- Score:[ \t]*([^\n]*)/)?.[1]?.trim() || "not scored";
const priority = leadScore.match(/- Priority:[ \t]*([^\n]*)/)?.[1]?.trim() || "not chosen";
const mainPage = lineValue(loomOutline, 2, "main money page");
const fault = lineValue(loomOutline, 3, "the clearest fault from the Loom");
const firstFix = lineValue(loomOutline, 6, "the first implementation-ready fix");
const faults = section(buyerRoom, "What I Saw", "- Fault 1:\n- Fault 2:\n- Fault 3:");
const scope = canonicalScope();
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

Confirm whether the one highest-leverage page is worth fixing now, then close the human-reviewed ${config.offerName}. Do not turn the call into free consulting.

## Audit Recap

- Main page: ${mainPage}
- Specific fault: ${fault}
- First fix: ${firstFix}

## Buyer Room Summary

${faults}

${scope}

${payback}

## Questions To Ask

1. What made the audit worth replying to?
2. Is this page supposed to generate calls, demos, audits, or another action?
3. Who approves page, copy, or site structure changes?
4. What context can you share: analytics, reviews, competitors, customer objections, and implementation access?
5. If the sprint gives you implementation-ready fixes with 14-day tracking, is this worth doing now?

## Close

"The ${FOUNDER_PILOT.offerName} is exactly a ${founderPilotPrice()} for one highest-leverage page. Human reviewers gate the claims and client-facing work. You receive the fault map, rewrite or redesign, one implementation pass or dev-ready handoff, search-trust basics, before/after proof, Loom, measurement plan, one client revision, and 14-day implementation tracking. Day 0 starts after payment, context, and named approval and implementation owners."

## Guardrails

- ${NO_GUARANTEE_CLIENT_SENTENCE}
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
npm run service:import -- /path/to/consented-sprint-application.json
npm run service:queue -- --mode=prepare
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
  path: outputPath,
  pilotSlotsRemaining
}, null, 2));
