#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";

const args = process.argv.slice(2);
const prospectPath = args[0];

function option(name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] || "" : "";
}

const note = option("note");
const rawPriceOverride = option("price");
const rawPaymentLink = option("payment");
const rawNextStepOverride = option("next-step");
const force = args.includes("--force");

if (!prospectPath) {
  console.error("Usage: npm run prospect:close-prep -- prospects/prospect-slug [--price \"$1,000\"] [--payment \"https://...\"] [--note \"...\"] [--next-step \"...\"] [--force]");
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
const config = agencyConfig();

if (!force && !["call-booked", "won"].includes(pipeline.stage || "")) {
  console.error("Close prep requires a call-booked or won prospect. Use --force only for explicit recovery.");
  process.exit(1);
}

const priceOverride = rawPriceOverride;
const paymentLink = rawPaymentLink.trim() === config.paymentPlaceholder || /^add payment link$/i.test(rawPaymentLink.trim()) ? "" : rawPaymentLink;
const nextStepOverride = /^add next step$/i.test(rawNextStepOverride.trim()) ? "" : rawNextStepOverride;
const name = metadata.name || prospectPath.split("/").at(-1);
const website = metadata.website || "";
const contact = metadata.contact || "";
const loomOutline = read("loom-outline.md");
const buyerRoom = read("buyer-room.md");
const valueCalculator = read("value-calculator.md");
const salesCallPrep = read("sales-call-prep.md");

const mainPage = lineValue(loomOutline, /^2\. [^\n:]+:[ \t]*([^\n]*)$/m, "the main money page");
const specificLeak = lineValue(loomOutline, /^3\. [^\n:]+:[ \t]*([^\n]*)$/m, "the page is making the buyer work too hard");
const firstFix = lineValue(loomOutline, /^6\. [^\n:]+:[ \t]*([^\n]*)$/m, "the first implementation-ready fix");
const priceFromBuyerRoom = lineValue(buyerRoom, /^- Price:[ \t]*([^\n]*)$/m, "");
const price = priceOverride || priceFromBuyerRoom || config.founderSprintPrice;
const payback = section(valueCalculator, "Payback", "- Payback customers needed:");
const leakBullets = section(buyerRoom, "What I Saw", `- Leak 1: ${specificLeak}`);
const scope = section(buyerRoom, "Scope", `- Sprint: ${config.offerName}\n- Timeline: 7 days\n- Price: ${price}`);
const nextStep = nextStepOverride || (paymentLink ? `Complete payment here: ${paymentLink}` : "Reply approved and I will send the payment link.");
const leakFragment = trimPunctuation(specificLeak);

const followUpSubject = `${name} 7-day sprint next step`;
const followUpBody = `Thanks for the call.

My read: the first useful fix is still ${firstFix}.

Sprint scope:

${scope}

What I will send by the end of the sprint:

- leak map for ${mainPage}
- implementation-ready page or site-architecture fixes
- proof, FAQ, and trust-section recommendations
- competitor/search visibility notes
- 30-day action plan

Next step: ${nextStep}

One guardrail: I am not promising revenue, rankings, ROAS, or conversion lift. The sprint gives you sharper diagnosis, cleaner assets, and a clear action plan.

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
- Specific leak: ${leakFragment}
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

By the end of 7 days, ${name} receives:

- leak map
- page or architecture fix
- copy blocks
- FAQ/trust recommendations
- competitor notes
- 30-day action plan
- optional Weekly Growth Desk plan

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
npm run prospect:convert -- ${prospectPath}
npm run client:kickoff -- clients/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)}
\`\`\`

## If They Need More Time

\`\`\`bash
npm run prospect:stage -- ${prospectPath} call-booked --note "Decision follow-up sent"
\`\`\`

## Sales Call Context

${salesCallPrep ? salesCallPrep.replace(/^# .+\n+/, "").trim() : "Run prospect:call-prep before the call if this section is blank."}
`;

const outputPath = join(prospectPath, "close-package.md");
writeFileSync(outputPath, packageContent);

console.log(JSON.stringify({
  status: "created",
  prospectPath,
  path: outputPath,
  price,
  paymentLink: paymentLink || ""
}, null, 2));
