#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";
import { FOUNDER_PILOT } from "./lib/client-scaffold.mjs";
import { serviceRecordPaths } from "./lib/review-queue.mjs";
import { NO_GUARANTEE_CLIENT_SENTENCE } from "./lib/service-contract.mjs";
import { resolveRepoPath } from "./lib/service-contract.mjs";
import { guardOutboundProspectPath } from "./lib/outbound-prospects.mjs";

const args = process.argv.slice(2);
const prospectArg = args[0];
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd();

function founderPilotPrice() {
  return `$${FOUNDER_PILOT.offerPriceUsd.toLocaleString("en-US")} founder pilot`;
}

function canonicalScope() {
  return `- Sprint: ${FOUNDER_PILOT.offerName}
- Scope: one highest-leverage page
- Timeline: Day 0 after payment, context, and named approval and implementation owners; 14-day implementation tracking
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
    throw new Error(`founder pilot capacity is complete after ${FOUNDER_PILOT.capacity} paid clients; a human-reviewed post-pilot offer is required before close prep or payment`);
  }
  return FOUNDER_PILOT.capacity - paidPilotCount;
}

function runSalesGuard(action) {
  try {
    return action();
  } catch (error) {
    console.error(`prospect:close-prep failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function assertNoAlternatePrice(value, name) {
  for (const match of value.matchAll(/\$\s*(\d[\d,]*(?:\.\d{1,2})?)/g)) {
    const amount = Number(match[1].replace(/,/g, ""));
    if (amount !== FOUNDER_PILOT.offerPriceUsd) {
      throw new Error(`${name} contains a noncanonical founder-pilot price`);
    }
  }
}

function validatePaymentLink(value) {
  if (!value) return "";
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("payment must be an HTTP(S) URL"); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error("payment must be an HTTP(S) URL without credentials");
  }
  return value;
}

function option(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || "" : "";
}

const note = option("note");
const rawPriceOverride = option("price");
const rawPaymentLink = option("payment");
const rawNextStepOverride = option("next-step");
const force = args.includes("--force");

if (!prospectArg) {
  console.error("Usage: npm run prospect:close-prep -- prospects/prospect-slug [--payment \"https://...\"] [--note \"...\"] [--next-step \"...\"] [--force]");
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

function lineValue(content, pattern, fallback = "") {
  const match = content.match(pattern);
  return match && match[1].trim() ? match[1].trim() : fallback;
}

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

function trimPunctuation(value) {
  return value.trim().replace(/[.!?]+$/g, "");
}

const metadata = json("metadata.json");
const pipeline = json("pipeline.json");
const config = runSalesGuard(() => {
  const activeConfig = agencyConfig(repoRoot);
  assertCanonicalSalesContract(activeConfig);
  return activeConfig;
});

if (!force && !["call-booked", "won"].includes(pipeline.stage || "")) {
  console.error("Close prep requires a call-booked or won prospect. Use --force only for explicit recovery.");
  process.exit(1);
}

const price = founderPilotPrice();
if (rawPriceOverride && rawPriceOverride !== price) {
  console.error(`Close prep price is immutable during the founder pilot: ${price}.`);
  process.exit(1);
}
const pilotSlotsRemaining = runSalesGuard(assertFounderPilotSlot);
const requestedPaymentLink = rawPaymentLink.trim() === config.paymentPlaceholder || /^add payment link$/i.test(rawPaymentLink.trim()) ? "" : rawPaymentLink;
const paymentLink = runSalesGuard(() => {
  assertNoAlternatePrice(requestedPaymentLink, "payment");
  return validatePaymentLink(requestedPaymentLink);
});
const nextStepOverride = /^add next step$/i.test(rawNextStepOverride.trim()) ? "" : rawNextStepOverride;
runSalesGuard(() => assertNoAlternatePrice(nextStepOverride, "next-step"));
const name = metadata.name || prospectPath.split("/").at(-1);
const website = metadata.website || "";
const contact = metadata.contact || "";
const loomOutline = read("loom-outline.md");
const buyerRoom = read("buyer-room.md");
const valueCalculator = read("value-calculator.md");

const mainPage = lineValue(loomOutline, /^2\. [^\n:]+:[ \t]*([^\n]*)$/m, "the main money page");
const specificLeak = lineValue(loomOutline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, "the page is making the buyer work too hard");
const firstFix = lineValue(loomOutline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, "the first implementation-ready fix");
const payback = section(valueCalculator, "Payback", "- Payback customers needed:");
const leakBullets = section(buyerRoom, "What I Saw", `- Fault 1: ${specificLeak}`);
const scope = canonicalScope();
const nextStep = nextStepOverride || (paymentLink ? `Complete payment here: ${paymentLink}` : "Reply approved and I will send the payment link.");
const leakFragment = trimPunctuation(specificLeak);

const followUpSubject = `${name} sprint next step`;
const followUpBody = `Thanks for the call.

My read: the first useful fix is still ${firstFix}.

Sprint scope:

${scope}

What the sprint includes:

- fault map for ${mainPage}
- rewrite or redesign of the one highest-leverage page
- one implementation pass or dev-ready handoff
- search-trust basics, before/after proof, and Loom
- measurement plan, one client revision, and 14-day implementation tracking

Next step: ${nextStep}

One guardrail: ${NO_GUARANTEE_CLIENT_SENTENCE} The sprint gives you sharper diagnosis, cleaner assets, and a clear action plan.

${config.founderName}`;

const packageContent = `# ${name} Close Package

## Prospect

- Folder: ${prospectPath}
- Website: ${website}
- Contact: ${contact}
- Stage: ${pipeline.stage || "unknown"}
- Note: ${note || "none"}

## Decision Summary

- Main page: ${mainPage}
- Specific fault: ${leakFragment}
- First fix: ${firstFix}
- Price: ${price}
- Payment: ${paymentLink || "send after approval"}

## Follow-Up Subject

${followUpSubject}

## Follow-Up Body

${followUpBody}

## Proposal

### Problem We Saw

${leakBullets}

### Sprint Outcome

Within the fixed sprint scope, ${name} receives:

- fault map
- rewrite or redesign of the one highest-leverage page
- one implementation pass or dev-ready handoff
- search-trust basics
- before/after proof and Loom
- measurement plan, one client revision, and 14-day implementation tracking

### Scope

${scope}

### Payback

${payback}

### Not Included

- Full website rebuild.
- Direct publishing without approval.
- Ad account management.
- SEO ranking promises.
- Unlimited revisions.

### Approval Rules

The client must approve all claims, proof, pricing, legal-sensitive content, and final publish-ready copy.

## If They Approve

\`\`\`bash
npm run prospect:stage -- ${prospectPath} won --note "Approved sprint"
npm run service:import -- /path/to/consented-sprint-application.json
npm run service:queue -- --mode=prepare
\`\`\`

## If They Need More Time

\`\`\`bash
npm run prospect:stage -- ${prospectPath} call-booked --note "Decision follow-up sent"
\`\`\`

## Sales Contract

${scope}

This close package is valid only while a founder-pilot slot remains. After the first three paid clients, payment and close preparation stop until a human-reviewed post-pilot offer is implemented.
`;

const outputPath = join(prospectPath, "close-package.md");
writeFileSync(outputPath, packageContent);

console.log(JSON.stringify({
  status: "created",
  prospectPath,
  path: outputPath,
  price,
  paymentLink: paymentLink || "",
  pilotSlotsRemaining
}, null, 2));
