#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const name = process.argv.slice(2).join(" ").trim();

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

if (!name) {
  console.error("Usage: npm run client:new -- \"Client Name\"");
  process.exit(1);
}

const slug = slugify(name);
if (!slug) {
  console.error("Client name must contain letters or numbers.");
  process.exit(1);
}

const clientRoot = join("clients", slug);
if (existsSync(clientRoot)) {
  console.error(`Client sprint already exists: ${clientRoot}`);
  process.exit(1);
}

for (const dir of ["brain", "deliverables", "ops/weekly-runs", "research", "reports"]) {
  mkdirSync(join(clientRoot, dir), { recursive: true });
}

mkdirSync(join(clientRoot, "quality"), { recursive: true });

const brainTemplateRoot = "growth-brain/client-brain-template";
for (const file of readdirSync(brainTemplateRoot)) {
  if (file.endsWith(".md")) {
    copyFileSync(join(brainTemplateRoot, file), join(clientRoot, "brain", file));
  }
}

writeFileSync(join(clientRoot, "intake.md"), `# ${name} Intake

## Client

- Name: ${name}
- Website:
- Main offer:
- Target buyer:
- Approval contact:
- Payment / written approval:
- Sprint dates:

## Required Context

- Website URLs:
- Competitors:
- Reviews/testimonials:
- Analytics screenshots:
- Ads/emails:
- Founder notes:

## Access Notes

- Analytics:
- CMS:
- Email/SMS:
- Ads:

## Open Questions

-
`);

writeFileSync(join(clientRoot, "sprint-plan.md"), `# ${name} Sprint Plan

## Wedge

Pick one:

- Site architecture
- Product page
- Landing page
- Offer
- Email/SMS
- Ads

## Sprint Checklist

Use \`growth-brain/sprint-checklist.md\`.

## Deliverables

- Leak map:
- Page/site fix:
- Ad angles:
- Email/SMS drafts:
- Competitor watch:
- Weekly report:
- 30-day plan:

## Approval Gates

- Claims:
- Pricing:
- Proof:
- Competitor-inspired ideas:
- Final client-facing copy:

## Status

- Intake:
- Brain filled:
- Drafted:
- Approved:
- Delivered:
- Follow-up:
`);

const deliveryTemplate = readFileSync("growth-brain/delivery-template.md", "utf8");
writeFileSync(join(clientRoot, "deliverables", "delivery.md"), deliveryTemplate.replace("# Client Delivery Template", `# ${name} Delivery`));

const handoffTemplate = readFileSync("growth-brain/delivery/implementation-handoff-template.md", "utf8");
writeFileSync(join(clientRoot, "deliverables", "implementation-handoff.md"), handoffTemplate);

const reportTemplate = readFileSync("growth-brain/weekly-report-template.md", "utf8");
writeFileSync(join(clientRoot, "reports", "week-1-report.md"), reportTemplate.replace("# Weekly Growth Brain Report", `# ${name} Week 1 Report`));

for (const file of [
  "claim-proof-ledger.md",
  "channel-readiness-scorecard.md",
  "conversion-optimization-scorecard.md",
  "delivery-scorecard.md",
  "sprint-acceptance-checklist.md"
]) {
  copyFileSync(join("growth-brain/quality", file), join(clientRoot, "quality", file));
}

const buyerRoom = readFileSync("growth-brain/sales/buyer-room-template.md", "utf8");
writeFileSync(join(clientRoot, "buyer-room.md"), buyerRoom.replace("# Buyer Room Template", `# ${name} Buyer Room`));

const aiWorkflow = readFileSync("growth-brain/ai-visibility/ai-search-audit-workflow.md", "utf8");
writeFileSync(join(clientRoot, "research", "ai-search-audit.md"), aiWorkflow);

execFileSync("node", ["scripts/draft-client-kickoff.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-delivery-cockpit.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-channel-readiness.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-repeatable-workflow.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-facing-dashboard.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

execFileSync("node", ["scripts/export-client-renewal-review.mjs", clientRoot], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

console.log(JSON.stringify({
  status: "created",
  client: name,
  path: clientRoot
}, null, 2));
