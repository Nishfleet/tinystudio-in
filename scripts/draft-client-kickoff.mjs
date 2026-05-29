#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agencyConfig } from "./lib/agency-config.mjs";

const clientPath = process.argv[2];

if (!clientPath) {
  console.error("Usage: npm run client:kickoff -- clients/client-slug");
  process.exit(1);
}

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

function section(content, heading, fallback = "") {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : fallback;
}

const intake = read("intake.md");
const sprintPlan = read("sprint-plan.md");
const buyerRoom = read("buyer-room.md");
const config = agencyConfig();

const name = field(intake, "Name:", clientPath.split("/").at(-1));
const website = field(intake, "Website:", "");
const approvalContact = field(intake, "Approval contact:", "the approval owner");
const paymentApproval = field(intake, "Payment / written approval:", "");
const wedge = section(sprintPlan, "Wedge", "Site architecture").split("\n").find((line) => line.trim() && !line.includes("Pick one"))?.trim() || "Site architecture";
const scope = section(buyerRoom, "Scope", `- Sprint: ${config.offerName}\n- Timeline: 7 days\n- Price:`);
const approvalOpening = paymentApproval
  ? `Thanks for approving the ${config.offerName}.`
  : `Before I start the ${config.offerName}, please confirm payment or written approval.`;

const kickoff = `# ${name} Kickoff Message

## Message

Subject: ${name} sprint kickoff

Hey ${approvalContact === "the approval owner" ? "team" : approvalContact},

${approvalOpening}

Here is the operating plan:

- Sprint focus: ${wedge}
- Website: ${website}
${scope}

What I need from you today:

1. Website URLs for the main pages you care about.
2. Analytics screenshots or simple traffic/conversion notes.
3. Reviews, testimonials, or proof points we are allowed to use.
4. 2-5 competitors you care about.
5. Any ads, emails, landing pages, or campaigns you have tried.
6. The person who can approve claims, proof, pricing, and final copy.

What you will get:

- Leak map.
- Implementation-ready page/copy fixes.
- Search trust cleanup: title/meta, headings, internal links, FAQs, useful schema, and crawl basics where relevant.
- Proof and FAQ plan.
- Ad angle and email/SMS ideas where relevant.
- Competitor notes.
- 30-day action plan.

One guardrail: I will not promise revenue, rankings, ROAS, or conversion lift, and I will not use backlink schemes. The sprint is built to give you sharper diagnosis, cleaner assets, real search trust improvements, and a measurement plan.

Once I have the context, I will send the first leak map.

Nish

## Internal Checklist

- [${paymentApproval ? "x" : " "}] Confirm payment or written approval.
- [ ] Confirm approval owner.
- [ ] Save client context into \`brain/\`.
- [ ] Fill claim-proof ledger before client-facing copy.
- [ ] Send Day 1 leak hypotheses.
`;

const outputPath = join(clientPath, "kickoff-message.md");
writeFileSync(outputPath, kickoff);

console.log(JSON.stringify({
  status: "created",
  path: outputPath
}, null, 2));
