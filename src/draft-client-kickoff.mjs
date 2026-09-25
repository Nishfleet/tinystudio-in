#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";
import { assertCanonicalFounderPilotCohort, assertFounderPilotRecord, FOUNDER_PILOT } from "./lib/client-scaffold.mjs";
import { atomicWrite, NO_GUARANTEE_CLIENT_SENTENCE, readJson, resolveRepoPath, validateApplication } from "./lib/service-contract.mjs";
import { loadValidatedServiceClient, loadValidatedServiceClients } from "./lib/validated-service-client.mjs";

const clientArg = process.argv[2];
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd();

if (!clientArg) {
  console.error("Usage: npm run client:kickoff -- clients/client-slug");
  process.exit(1);
}

const clientPath = resolveRepoPath(repoRoot, clientArg);

if (!existsSync(clientPath)) {
  console.error(`Client folder not found: ${clientPath}`);
  process.exit(1);
}

function read(relativePath) {
  const path = join(clientPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function field(content, label, fallback = "") {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`- ${escaped}[ \\t]*([^\\n]*)`));
  return match && match[1].trim() ? match[1].trim() : fallback;
}

let serviceClient;
try {
  serviceClient = loadValidatedServiceClient(repoRoot, clientPath);
} catch (error) {
  console.error(`Client kickoff blocked: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
if (!serviceClient.ok || !serviceClient.day0) {
  console.error(`Client kickoff blocked: ${serviceClient.blocked.join("; ") || "a valid paid Day 0 record is required"}`);
  process.exit(1);
}

const sprintPlan = read("sprint-plan.md");
const config = agencyConfig(repoRoot);
const day0 = assertFounderPilotRecord(serviceClient.day0);
const application = validateApplication(readJson(join(clientPath, "service-application.json")), { repoRoot });

const paidClients = loadValidatedServiceClients(repoRoot).filter((client) => client.ok && client.day0);
assertCanonicalFounderPilotCohort(paidClients);
const pilotPosition = day0.pilotSequence;
const founderPilotPrice = `$${day0.offerPriceUsd.toLocaleString("en-US")} founder pilot`;
if (!paidClients.some((client) => client.applicationId === serviceClient.applicationId)) {
  console.error("Client kickoff blocked: paid client is not present in the canonical Day 0 capacity history");
  process.exit(1);
}
if (config.offerName !== day0.offerName || config.founderSprintPrice !== founderPilotPrice || config.firstClientCount !== FOUNDER_PILOT.capacity) {
  console.error("Client kickoff blocked: active founder-pilot configuration does not match the immutable Day 0 offer");
  process.exit(1);
}
const name = application.applicant.company;
const website = application.applicant.website;
const approvalOwner = day0.approvalOwner;
const highestLeveragePage = field(sprintPlan, "Highest-leverage page:", "choose the highest-leverage page");
const sprint = `**${day0.offerName}**\n\nIncluded: ${config.includedDeliverables.join(", ")}.`;
const timingAndPrice = `- Day 0: ${day0.day0StartedAt}\n- Working-day deadline: ${day0.deadlineAt}\n- Clock rule: ${config.dayZeroRule}\n- Founder pilot ${pilotPosition} of ${FOUNDER_PILOT.capacity}: **${founderPilotPrice}**.`;
const approvalOpening = `Thanks for approving ${config.offerName}. Day 0 is recorded and the service is paid.`;

const kickoff = `# ${name} Kickoff Message

## Message

Subject: ${name} sprint kickoff

Hey ${approvalOwner === "the approval owner" ? "team" : approvalOwner},

${approvalOpening}

Here is the operating plan:

- Highest-leverage page: ${highestLeveragePage}
- Website: ${website}

## The sprint

${sprint}

## Timing and price

${timingAndPrice}

What I need from you today:

1. The URL for the one highest-leverage page in scope.
2. Analytics screenshots or simple traffic/conversion notes.
3. Reviews, testimonials, or proof points we are allowed to use.
4. 2-5 competitors you care about.
5. Any prior versions or experiments on this page.
6. The person who can approve claims, proof, pricing, and final copy.

What you will get:

- Fault map.
- Rewrite or redesign of the one highest-leverage page.
- One implementation pass or dev-ready handoff.
- Search-trust basics.
- Before/after proof and Loom walkthrough.
- Measurement plan, one client revision, and 14-day implementation tracking.

One guardrail: ${NO_GUARANTEE_CLIENT_SENTENCE} I will not use backlink schemes. The sprint is built to give you sharper diagnosis, cleaner assets, real search trust improvements, and a measurement plan.

Once I have the context, I will send the first fault map.

Nish

## Internal Checklist

- [x] Confirm payment and Day 0 record.
- [ ] Confirm approval owner.
- [ ] Save client context into \`brain/\`.
- [ ] Fill claim-proof ledger before client-facing copy.
- [ ] Send Day 1 fault hypotheses.
`;

const outputPath = join(clientPath, "kickoff-message.md");
atomicWrite(outputPath, kickoff);

console.log(JSON.stringify({ status: "created", path: outputPath }, null, 2));
