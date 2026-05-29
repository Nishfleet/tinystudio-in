#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const startups = [
  {
    name: "AI Converter",
    website: "https://aiconverter.app",
    mainOffer: "AI-assisted file conversion utility",
    targetBuyer: "people and teams who need faster file conversion workflows",
    wedge: "Landing page and conversion path",
    proofGoal: "Use the sprint to improve clarity, conversion copy, AI/search visibility, and weekly learning cadence on a live owned product."
  },
  {
    name: "SiteRep",
    website: "https://siterep.net",
    mainOffer: "website improvement and reputation intelligence surface",
    targetBuyer: "founders and local/service businesses evaluating their website quality",
    wedge: "Product positioning and proof-led website flow",
    proofGoal: "Use the sprint to stress-test the same site architecture, proof, dashboard, and retention loop offered to clients."
  },
  {
    name: "Five to Nine 0509",
    website: "owned startup surface",
    mainOffer: "after-hours market visibility and growth briefing workflow",
    targetBuyer: "founders and growth leads who need market changes summarized into next actions",
    wedge: "Offer clarity and landing page conversion path",
    proofGoal: "Use the sprint to turn existing 0509 concept work into approved buyer-facing copy, measurable next tests, and weekly learning proof."
  }
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function replaceLine(content, label, value) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^- ${escaped}:[ \\t]*.*$`, "m");
  return pattern.test(content)
    ? content.replace(pattern, `- ${label}: ${value}`)
    : `${content.trimEnd()}\n- ${label}: ${value}\n`;
}

function replaceStatusLine(content, label, value) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^- ${escaped}:[ \\t]*.*$`, "m");
  return content.replace(pattern, `- ${label}: ${value}`);
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

const seeded = [];
const skipped = [];

for (const startup of startups) {
  const slug = slugify(startup.name);
  const clientPath = join("clients", slug);

  if (!existsSync(clientPath)) {
    execFileSync("node", ["scripts/create-client-sprint.mjs", startup.name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    seeded.push(clientPath);
  } else {
    skipped.push(clientPath);
  }

  let intake = readFileSync(join(clientPath, "intake.md"), "utf8");
  intake = replaceLine(intake, "Website", startup.website);
  intake = replaceLine(intake, "Main offer", startup.mainOffer);
  intake = replaceLine(intake, "Target buyer", startup.targetBuyer);
  intake = replaceLine(intake, "Approval contact", "Nish");
  intake = replaceLine(intake, "Payment / written approval", "owned startup proof lane");
  intake = replaceLine(intake, "Sprint dates", "schedule in weekly owner dashboard");
  write(join(clientPath, "intake.md"), intake);

  let sprintPlan = readFileSync(join(clientPath, "sprint-plan.md"), "utf8");
  sprintPlan = sprintPlan.replace(
    /Pick one:\n\n- Site architecture\n- Product page\n- Landing page\n- Offer\n- Email\/SMS\n- Ads/,
    startup.wedge
  );
  sprintPlan = replaceStatusLine(sprintPlan, "Intake", "owned startup seeded");
  sprintPlan = replaceStatusLine(sprintPlan, "Brain filled", "pending");
  sprintPlan = replaceStatusLine(sprintPlan, "Drafted", "pending");
  sprintPlan = replaceStatusLine(sprintPlan, "Approved", "pending");
  sprintPlan = replaceStatusLine(sprintPlan, "Delivered", "pending");
  sprintPlan = replaceStatusLine(sprintPlan, "Follow-up", "pending");
  write(join(clientPath, "sprint-plan.md"), sprintPlan);

  write(join(clientPath, "proof-context.md"), `# ${startup.name} Owned Startup Proof Context

## Proof Type

owned-startup

## Use This For

- Stress-test TinyStudio delivery on a real owned product.
- Create real shipped-work, learning, dashboard, and weekly-report evidence.
- Improve the startup itself while hardening the agency workflow.

## Do Not Use This For

- Do not count this as external market demand.
- Do not count this as a paid-client close.
- Do not publish a case study until claims are approved and sanitized.

## Current Proof Goal

${startup.proofGoal}

## Required Before It Counts As Delivery Proof

- Client readiness passes.
- Claim-proof ledger has at least one approved row.
- Conversion scorecard is filled and approved.
- Delivery artifacts and implementation handoff are filled.
- Week 1 report has shipped work, a learning, and a next test.
`);

  for (const args of [
    ["scripts/export-client-delivery-cockpit.mjs", clientPath],
    ["scripts/export-client-facing-dashboard.mjs", clientPath],
    ["scripts/export-client-renewal-review.mjs", clientPath]
  ]) {
    execFileSync("node", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }
}

console.log(JSON.stringify({
  status: "ready",
  seeded,
  skipped,
  clients: startups.map((startup) => join("clients", slugify(startup.name))),
  rule: "owned startup proof can support delivery and retention stress proof, but not external market or paid sales proof"
}, null, 2));
