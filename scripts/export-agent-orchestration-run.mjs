#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { localIsoDate } from "./date-utils.mjs";
import { agencyConfig } from "./lib/agency-config.mjs";

const args = process.argv.slice(2);
const outputArg = args.find((arg) => arg.startsWith("--output="));
const targetArg = args.find((arg) => arg.startsWith("--target="));
const modeArg = args.find((arg) => arg.startsWith("--mode="));
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "growth-brain/ops/pre-revenue-agent-parity-run.md";
const target = targetArg ? targetArg.split("=").slice(1).join("=") : "";
const mode = modeArg ? modeArg.split("=").slice(1).join("=") : "first-proof-batch";
const today = localIsoDate();
const config = agencyConfig();

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function listDirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !/^(kit|import)-smoke/.test(entry.name))
    .map((entry) => join(path, entry.name))
    .sort();
}

function json(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

function field(markdown, label, fallback = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`^- ${escaped}:[ \\t]*([^\\n]*)$`, "m"))?.[1]?.trim() || fallback;
}

function prospectName(path) {
  const metadata = json(join(path, "metadata.json"));
  return metadata.name || basename(path);
}

function selectedTargets() {
  if (target) return [target];

  const loomRows = read("prospects/loom-links.txt")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("prospects/") && line.includes("|approved|"))
    .map((line) => line.split("|")[0])
    .filter(Boolean);

  if (loomRows.length) return [...new Set(loomRows)].slice(0, 5);

  const activeProspects = listDirs("prospects")
    .filter((path) => !["won", "lost", "paused"].includes(json(join(path, "pipeline.json")).stage))
    .slice(0, 5);

  if (activeProspects.length) return activeProspects;

  return listDirs("clients").slice(0, 3);
}

const targets = selectedTargets();
const lanes = [
  {
    id: "K-1",
    name: "Leak map and proof source",
    agent: "landing-page-fixer / site-architecture-fixer",
    output: "visible leak, before state, source evidence, proof gap"
  },
  {
    id: "K-2",
    name: "Copy, offer, and content draft",
    agent: "product-page-fixer / ad-angle-generator / email-sms-generator",
    output: "draft copy, angle, CTA, approval-needed claims"
  },
  {
    id: "K-3",
    name: "Trust, search, and measurement",
    agent: "site-architecture-fixer / weekly-performance-analyst",
    output: "search trust review, measurement contract, next check"
  },
  {
    id: "K-4",
    name: "Tests and handoff readiness",
    agent: "verifier gate",
    output: "claim safety, send readiness, client readiness, handoff blockers"
  }
];

const targetRows = targets.map((path) => {
  const type = path.startsWith("clients/") ? "client" : "prospect";
  const name = type === "client"
    ? field(read(join(path, "intake.md")), "Name", basename(path))
    : prospectName(path);
  const stage = type === "prospect" ? json(join(path, "pipeline.json")).stage || "new" : "client";
  return { path, type, name, stage };
});

const routeRows = targetRows.map((row) => {
  const route = row.type === "client" ? "workhorse plus verifier, specialist on claims" : "workhorse plus verifier";
  const next = row.type === "client"
    ? "Run client dashboard, proof review, readiness, and acceptance dry run."
    : "Record Loom, run market:after-recording, send from outbox, then run market:learn.";
  return { ...row, route, next };
});

const specialistTriggers = [
  "pricing, guarantee, or payment language",
  "legal/compliance-sensitive wording",
  "private client data",
  "security, DNS, auth, sender setup, or production access",
  "paid media budget or tracking changes",
  "revenue, ROAS, ranking, conversion, retention, or savings claims",
  "final client-facing recommendation"
];

const backgroundJobs = [
  "retention checkups",
  "sender trust check",
  "market proof check",
  "market learning review",
  "owned-product live signals",
  "skills/library review"
];

const markdown = `# Pre-Revenue Agent Parity Run

Generated: ${today}

## Status

Structural parity run created.

Mode: ${mode}

Offer: ${config.offerName}

This run proves operating shape only. It does not prove revenue, margin, paid-client delivery, customer retention, or unattended delivery.

## Operator Touchpoints

1. Intake approval: confirm target, goal, proof boundary, and output destination.
2. QA decision: accept, revise, escalate, or block verifier findings.
3. Handoff approval: approve the package before anything is sent or published.

## Intake Targets

| Target | Type | Stage | Route | Next |
|---|---|---|---|---|
${routeRows.map((row) => `| ${row.name} | ${row.type} | ${row.stage} | ${row.route} | ${row.next} |`).join("\n") || "| No active target | - | - | manual | Create or select a prospect/client folder. |"}

## Route

Default route source: \`growth-brain/ops/model-routing-standard.md\`

| Tier | Use |
|---|---|
| Workhorse | routine leak maps, drafts, search trust notes, checklists, and repeatable workflow updates |
| Specialist | high-risk claims, pricing, legal/compliance, private data, security, payments, unfamiliar integrations |
| Utility | formatting, normalization, boilerplate, fixtures, low-risk summaries |
| Manual | relationship judgment, sales calls, final approval, client-sensitive interpretation |

## Parallel Production Pool

| Lane | Job | Agent Workflow | Output |
|---|---|---|---|
${lanes.map((lane) => `| ${lane.id} | ${lane.name} | ${lane.agent} | ${lane.output} |`).join("\n")}

## Specialist Escalation

Escalate if any output touches:

${specialistTriggers.map((trigger) => `- ${trigger}`).join("\n")}

## Verifier Gate

Verifier checks:

- claim safety
- send readiness
- sender trust
- prospect/client readiness
- recording quality
- market proof status
- measurement contract
- approved proof status
- handoff blockers

Verifier output must be one of: pass, revise, escalate, block.

## Handoff Gate

Handoff package must include:

- what changed
- before state
- after/fix
- proof source
- client-visible value
- approval-needed claims
- measurement contract
- next action
- rollback or do-not-use notes

The handoff gate prepares packages only. It does not send, publish, approve, or bill.

## Skills Library Feedback

Every useful learning must go to one destination:

- client brain
- proof library
- workflow doc
- repo skill
- strategy doc

No secrets or unapproved private client proof can enter shared docs.

## Background Pool

Report-only jobs:

${backgroundJobs.map((job) => `- ${job}`).join("\n")}

Blocked background actions:

- sending messages
- approving claims
- publishing assets
- changing ad spend
- changing DNS/provider settings
- marking acceptance or renewal

## Unit Economics

Unit economics source: \`growth-brain/ops/unit-economics-ledger.md\`

No margin, model-cost, delivery-cost, capacity, or revenue claim is allowed until real paid-client rows exist.

## Next Command

\`\`\`bash
npm run agent:parity
\`\`\`
`;

const outputDir = outputPath.split("/").slice(0, -1).join("/");
if (outputDir) mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, markdown);

console.log(JSON.stringify({
  status: "created",
  gate: "pre-revenue-agent-parity-run",
  path: outputPath,
  mode,
  targets: targetRows.length,
  lanes: lanes.length,
  operatorTouchpoints: 3,
  backgroundJobs: backgroundJobs.length,
  commercialProof: "blocked-until-real-revenue-and-delivery-rows"
}, null, 2));
