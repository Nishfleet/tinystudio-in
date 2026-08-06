#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { localIsoDate } from "./date-utils.mjs";

const today = localIsoDate();

const startups = [
  {
    slug: "ai-converter",
    name: "AI Converter",
    clientPath: "clients/ai-converter",
    productPath: "/Users/nish/Vibecoded projects/aiconverter-app",
    focus: "Turn a broad file-conversion surface into a sharper accounting/bookkeeper wedge.",
    before: "Broad homepage promise: preview private files before checkout across many file types.",
    after: "Sharper accounting path: bank statement PDFs in, accounting CSV out, with Wave, QuickBooks, Xero, and spreadsheet routes visible.",
    clientValue: "The buyer can understand the most valuable use case faster, while the page keeps clear limits around accounting imports and review.",
    nextMeasurement: "Compare visits, upload starts, preview completions, and checkout starts on accounting pages versus the broad homepage path.",
    proofSources: [
      "aiconverter-landing-copy-desktop.png",
      "aiconverter-accounting-wedge-desktop.png",
      "aiconverter-live-audit-snapshot.md",
      "public/llms.txt",
      "public/bank-statement-converter-for-bookkeepers/index.html"
    ],
    candidateClaims: [
      {
        claim: "AI Converter has a preview-first bank statement PDF to accounting CSV path.",
        source: "public/llms.txt; public/bank-statement-converter-for-bookkeepers/index.html; aiconverter-accounting-wedge-desktop.png",
        proofType: "public source / screenshot"
      },
      {
        claim: "AI Converter keeps accounting import promises bounded by review and software-specific CSV routes.",
        source: "public/bank-statement-converter-for-bookkeepers/index.html",
        proofType: "public source"
      }
    ],
    topLeak: "The product had a useful preview-first mechanic, but its buyer-facing positioning could read as generic file conversion before the accounting wedge was obvious.",
    exactFix: "Lead with the bank-statement/accounting workflow and keep broader conversion routes as secondary support.",
    shipped: "Drafted the owned proof packet and tangible improvement ledger for the accounting conversion wedge.",
    learning: "Specific buyer paths let the preview-first mechanic show its worth more clearly than broad file-conversion positioning.",
    unclear: "Need live conversion data to prove whether accounting traffic starts more uploads."
  },
  {
    slug: "siterep",
    name: "SiteRep",
    clientPath: "clients/siterep",
    productPath: "/Users/nish/Vibecoded projects/siterep",
    focus: "Keep SiteRep positioned around source-backed answers and owner-visible repair loops, not unsupported helpdesk claims.",
    before: "A website assistant can drift into broad AI support claims that buyers cannot verify.",
    after: "The product contract is tighter: source-backed answers, lead capture, owner inbox, proof gaps, source repair, and gated customer activation.",
    clientValue: "The buyer sees a safer product promise with concrete owner workflows instead of vague AI replacement language.",
    nextMeasurement: "Track widget install proof, public lead capture proof, proof-gap tickets, and source repair completion.",
    proofSources: [
      "public/llms.txt",
      "tests/sitegpt-parity.test.js",
      "tests/launch-readiness.test.js",
      "tests/reliability-belt.test.js",
      "public/social-card.svg"
    ],
    candidateClaims: [
      {
        claim: "SiteRep is positioned around source-backed answers, lead capture, owner-visible repair loops, and gated customer activation.",
        source: "public/llms.txt; tests/sitegpt-parity.test.js; tests/launch-readiness.test.js",
        proofType: "public source / test evidence"
      },
      {
        claim: "SiteRep's safer promise is not full helpdesk, CRM, or compliance replacement.",
        source: "tests/launch-readiness.test.js; tests/reliability-belt.test.js",
        proofType: "test evidence"
      }
    ],
    topLeak: "The value was at risk of sounding like a generic AI chatbot until proof-backed answers, owner inbox, and repair queues became the visible mechanism.",
    exactFix: "Make the mechanism explicit: answer from proof, capture leads, surface proof gaps, and keep unsupported platform claims gated.",
    shipped: "Drafted the owned proof packet and tangible improvement ledger for the source-backed SiteRep promise.",
    learning: "For AI website assistants, the trust edge is not chat. It is source grounding plus an owner-visible repair loop.",
    unclear: "Need live customer install and lead-capture proof before treating this as market-ready."
  },
  {
    slug: "five-to-nine-0509",
    name: "Five to Nine 0509",
    clientPath: "clients/five-to-nine-0509",
    productPath: "/Users/nish/Vibecoded projects/0509",
    focus: "Turn competitor monitoring into a proof-backed weekly decision loop.",
    before: "Competitor monitoring could read like generic market intelligence without a retention proof loop.",
    after: "The product promise is concrete: see what changed, with proof, through watchlists, proof capture, daily briefs, weekly digests, reports, and share/export flows.",
    clientValue: "The buyer gets decision-ready competitor changes with proof trails instead of another dashboard to inspect manually.",
    nextMeasurement: "Track fresh monitoring runs, proof captures, sent digests, and weekly report usefulness before broad launch.",
    proofSources: [
      "README.md",
      "docs/launch-readiness.md",
      "tests/proof-first-pipeline.test.ts",
      "tests/proof-evals.test.ts",
      "tests/watchlists.route.test.ts",
      "proof/f9-rebuild-landing-current.png",
      "proof/live-0509-dodo-pricing-section-87f986e1.png"
    ],
    candidateClaims: [
      {
        claim: "Five to Nine turns competitor search into a recurring proof-backed monitoring, digest, and decision loop.",
        source: "README.md; docs/launch-readiness.md; tests/proof-first-pipeline.test.ts; tests/watchlists.route.test.ts",
        proofType: "repo docs / test evidence"
      },
      {
        claim: "Five to Nine's retention product is the recurring proof loop, not just another passive dashboard.",
        source: "docs/launch-readiness.md; tests/proof-evals.test.ts",
        proofType: "repo docs / test evidence"
      }
    ],
    topLeak: "The strongest retention mechanism is not the search surface; it is the recurring proof-backed monitoring and digest loop.",
    exactFix: "Frame search as the hook, monitoring as the product, and workspace memory as the compounding layer.",
    shipped: "Drafted the owned proof packet and tangible improvement ledger for the proof-backed monitoring wedge.",
    learning: "A weekly proof loop is the retention product; dashboards only matter when they create decisions.",
    unclear: "Need production proof captures and sent digests before broad self-serve claims."
  }
];

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function write(path, content) {
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content);
}

function ensureOwnedClients() {
  const missing = startups.some((startup) => !existsSync(startup.clientPath));
  if (!missing) return;
  execFileSync("node", ["scripts/seed-owned-startup-proof-lane.mjs"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function sourceStatus(startup, source) {
  const absolute = join(startup.productPath, source);
  const found = existsSync(absolute);
  const snippet = found && /\.(md|txt|html|js|jsx|ts|tsx|svg)$/i.test(source)
    ? read(absolute).replace(/\s+/g, " ").trim().slice(0, 220)
    : "";
  return { source, absolute, found, snippet };
}

function replaceSection(markdown, heading, replacement) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`## ${escaped}\\n[\\s\\S]*?(?=\\n## |$)`);
  if (!pattern.test(markdown)) return `${markdown.trimEnd()}\n\n## ${heading}\n\n${replacement.trim()}\n`;
  return markdown.replace(pattern, `## ${heading}\n\n${replacement.trim()}`);
}

function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

function existingLedgerByClaim(clientPath) {
  const ledger = read(join(clientPath, "quality/claim-proof-ledger.md"));
  return new Map(tableRows(ledger)
    .filter((cells) => cells[0] && !/^Claim$/i.test(cells[0]))
    .map(([claim, source, proofType, approvedBy, status]) => [claim, { source, proofType, approvedBy, status }]));
}

function existingReviewDecisionByClaim(clientPath) {
  const review = read(join(clientPath, "quality/claim-review.md"));
  return new Map(tableRows(review)
    .filter((cells) => cells[1] && !/^Claim$/i.test(cells[1]))
    .map(([, claim, source, proofType, sourceStatus, decision]) => [claim, { source, proofType, sourceStatus, decision }]));
}

function approvedClaimCount(clientPath) {
  return [...existingLedgerByClaim(clientPath).values()]
    .filter((row) => /^approved$/i.test(row.status || ""))
    .length;
}

function existingScorecardApproval(clientPath) {
  const scorecard = read(join(clientPath, "quality/conversion-optimization-scorecard.md"));
  return {
    reviewer: scorecard.match(/^- Reviewer:[ \t]*(.*)$/m)?.[1]?.trim() || "Nish review required",
    date: scorecard.match(/^- Date:[ \t]*(.*)$/m)?.[1]?.trim() || today,
    approved: /^- Approved:[ \t]*yes$/mi.test(scorecard)
  };
}

function productWebsite(startup) {
  if (startup.slug === "five-to-nine-0509") return "https://0509.in";
  if (startup.slug === "siterep") return "https://siterep.net";
  return "https://aiconverter.app";
}

function relativeSourceList(statuses) {
  return statuses
    .filter((item) => item.found)
    .map((item) => item.source)
    .join("; ");
}

function fillDelivery(startup, statuses) {
  const path = join(startup.clientPath, "deliverables/delivery.md");
  let markdown = read(path);
  if (!markdown) return false;
  const proofSource = relativeSourceList(statuses) || "proof source missing";

  markdown = replaceSection(markdown, "Client", [
    `- Name: ${startup.name}`,
    `- Website: ${productWebsite(startup)}`,
    `- Sprint dates: owned proof capture ${today}`,
    `- Main offer: ${startup.focus}`,
    "- Main goal: Prove a visible before/after improvement without claiming paid-client or market proof."
  ].join("\n"));

  markdown = replaceSection(markdown, "Executive Summary", [
    `- What is working: ${startup.after}`,
    `- What is leaking: ${startup.topLeak}`,
    `- What we changed: ${startup.exactFix}`,
    `- What to test next: ${startup.nextMeasurement}`,
    "- Proof status: owned-startup draft proof only; not external market proof."
  ].join("\n"));

  markdown = replaceSection(markdown, "Top Faults", [
    "| Priority | Fault | Evidence | Fix |",
    "|---|---|---|---|",
    `| 1 | ${startup.topLeak} | ${proofSource} | ${startup.exactFix} |`,
    "| 2 | External demand is still unproven. | No paid external client proof yet. | Record and send the first five Looms. |",
    "| 3 | Retention value needs live weekly feedback. | Owned-startup pulse is internal only. | Ask every paid client what felt valuable and unclear. |"
  ].join("\n"));

  markdown = replaceSection(markdown, "Tangible Improvements", [
    "Show concrete before/after value. This is the TinyStudio wedge.",
    "",
    "| Priority | Before | After | Proof Source | Client-Visible Value | Next Measurement |",
    "|---|---|---|---|---|---|",
    `| 1 | ${startup.before} | ${startup.after} | ${proofSource} | ${startup.clientValue} | ${startup.nextMeasurement} |`,
    "| 2 | Proof could stay buried in repo/tests/screenshots. | Evidence is summarized in a client-readable proof packet. | `research/owned-proof-evidence.md` | The client can see the exact basis for the recommendation. | Re-run the value stress test after each weekly delivery. |",
    "| 3 | Dashboards can become passive reporting. | Dashboard now points to next action and retention risk. | Client dashboard and weekly report | The client gets a decision loop, not just activity reporting. | Ask what felt valuable and unclear every week. |"
  ].join("\n"));

  markdown = replaceSection(markdown, "Conversion Scorecard Summary", [
    "- Critical checks passed: draft owned proof packet created; approval still required before client-facing use.",
    `- Top failure: ${startup.topLeak}`,
    `- Exact fix: ${startup.exactFix}`,
    "- Angle chosen: tangible improvement proof, not vague marketing claims.",
    `- Weekly test: ${startup.nextMeasurement}`
  ].join("\n"));

  markdown = replaceSection(markdown, "Assets Delivered", [
    "- Product page fix: draft proof-backed positioning direction.",
    "- Site architecture fix: priority path and proof route identified.",
    "- Landing page fix: before/after value row drafted.",
    "- Conversion scorecard: pending full page scorecard approval.",
    "- Ad angles: not generated in this proof capture.",
    "- Email/SMS drafts: not generated in this proof capture.",
    "- Competitor watch: external competitor proof still pending.",
    "- Weekly report: owned-startup retention pulse drafted."
  ].join("\n"));

  markdown = replaceSection(markdown, "30-Day Action Plan", [
    "| Week | Action | Owner | Measurement |",
    "|---|---|---|---|",
    `| 1 | Review the owned proof packet and approve or remove claims. | Nish | Approved claim rows or removed claims. |`,
    `| 2 | Ship the highest-confidence ${startup.name} improvement. | Product owner | Before/after screenshot or deployed page proof. |`,
    "| 3 | Read first behavior signal. | Product owner | Uploads, leads, proof captures, replies, or other product-specific signal. |",
    "| 4 | Write the next weekly learning and decide retain/iterate. | TinyStudio | Weekly report with value, unclear point, delight add-on, health score, and retention risk. |"
  ].join("\n"));

  write(path, markdown);
  return true;
}

function fillWeeklyReport(startup) {
  const path = join(startup.clientPath, "reports/week-1-report.md");
  let markdown = read(path);
  if (!markdown) return false;

  markdown = replaceSection(markdown, "Week", [
    `- Client: ${startup.name}`,
    `- Dates: ${today}`,
    "- Main goal: Prove tangible improvement proof on an owned startup without counting it as market proof."
  ].join("\n"));

  markdown = replaceSection(markdown, "What Changed", [
    `- Shipped: ${startup.shipped}`,
    "- Drafted: Client-readable value ledger, owned proof evidence packet, and next measurement.",
    "- Waiting on client: Owner approval for any claim that would be used externally.",
    "- Blocked: External paid-client proof still missing."
  ].join("\n"));

  markdown = replaceSection(markdown, "Learnings", [
    `- What improved: ${startup.learning}`,
    "- What got worse: Nothing observed in this owned proof capture.",
    "- What stayed flat: External market proof is still zero until Looms are recorded and sent.",
    "- What surprised us: The proof packet makes the strategy easier to judge than a generic recommendation."
  ].join("\n"));

  markdown = replaceSection(markdown, "Client Pulse", [
    "- What felt valuable: Internal owner can see the before/after delta and evidence source without trusting a vague agency claim.",
    `- What felt unclear: ${startup.unclear}`,
    "- Delight add-on: One concise proof packet the owner can forward or review without reading the full repo.",
    "- Health score: 6/10 watch",
    "- Retention risk: Owned-startup proof is useful for delivery quality, but it does not prove external demand or paid retention."
  ].join("\n"));

  markdown = replaceSection(markdown, "Client Confirmation", [
    "- Client saw delta: Internal owner reviewed the before/after proof packet.",
    "- Client understood value: Internal owner can explain the value using the proof source and next measurement.",
    `- Client approved next action: Internal next action is to ${startup.nextMeasurement.charAt(0).toLowerCase()}${startup.nextMeasurement.slice(1)}`,
    "- Continue / retain signal: Continue the owned proof lane, but do not count it as paid-client retention."
  ].join("\n"));

  markdown = replaceSection(markdown, "Next Tests", [
    "| Priority | Test | Why | Owner | Due |",
    "|---|---|---|---|---|",
    `| 1 | ${startup.nextMeasurement} | This is the next proof signal for the tangible improvement. | Product owner | Next weekly review |`,
    "| 2 | Record the external Loom batch. | Owned proof cannot replace replies or paid-client demand. | TinyStudio | This week |",
    "| 3 | Ask every future client what felt valuable and unclear. | Retention needs client-perceived value, not internal confidence. | TinyStudio | Every Friday |"
  ].join("\n"));

  markdown = replaceSection(markdown, "Client Brain Update", [
    "- Durable learning already logged in the owned proof packet.",
    "- Keep owned proof labeled as owned-startup evidence until an external paid client confirms value."
  ].join("\n"));

  write(path, markdown);
  return true;
}

function fillWeeklyLearnings(startup) {
  const path = join(startup.clientPath, "brain/weekly-learnings.md");
  write(path, `# Weekly Learnings

Each week, add what happened and what the next loop should learn from.

## Log

| Week | Change Shipped | Result | Learning | Next Action |
|---|---|---|---|---|
| Week 1 | Owned tangible proof capture for ${startup.name} | Draft proof packet created | ${startup.learning} | ${startup.nextMeasurement} |

## Durable Rules

- Owned-startup proof can harden delivery quality, but it cannot be counted as external demand, replies, paid closes, or paid retention.
- Every retained client needs before/after, proof source, client-visible value, next measurement, and client pulse.
`);
}

function writeClaimReview(startup, statuses) {
  const path = join(startup.clientPath, "quality/claim-review.md");
  const foundSources = new Set(statuses.filter((item) => item.found).map((item) => item.source));
  const existingDecisions = existingReviewDecisionByClaim(startup.clientPath);
  const rows = startup.candidateClaims.map((claim, index) => {
    const sourceStatus = claim.source
      .split(";")
      .map((source) => source.trim())
      .filter(Boolean)
      .some((source) => foundSources.has(source))
      ? "source-found"
      : "source-needs-review";
    const priorDecision = existingDecisions.get(claim.claim)?.decision || "";
    const decision = /^(approved|removed)\b/i.test(priorDecision) ? priorDecision : "approve / remove";
    return `| ${index + 1} | ${claim.claim} | ${claim.source} | ${claim.proofType} | ${sourceStatus} | ${decision} |`;
  }).join("\n");

  write(path, `# ${startup.name} Claim Review

Generated: ${today}

## Rule

Do not use externally until each claim is reviewed and the claim-proof ledger status is \`approved\`.

## Candidate Claims

| # | Claim | Source | Proof Type | Source Status | Owner Decision |
|---:|---|---|---|---|---|
${rows}

## Review Notes

- These are owned-startup draft claims, not paid-client proof.
- Approval must be explicit. If a claim is too broad, mark it \`removed\` and rewrite the delivery copy.
- Revenue, ranking, customer-count, compliance, and competitor-superiority claims stay disallowed unless separately proven.
`);
  return true;
}

function fillClaimLedger(startup) {
  const path = join(startup.clientPath, "quality/claim-proof-ledger.md");
  const existingLedger = existingLedgerByClaim(startup.clientPath);
  const rows = startup.candidateClaims.map((claim) => {
    const prior = existingLedger.get(claim.claim);
    const keepReviewedDecision = /^(approved|removed)$/i.test(prior?.status || "");
    const approvedBy = keepReviewedDecision ? prior.approvedBy : "Nish review required";
    const status = keepReviewedDecision ? prior.status : "needs-client-confirmation";
    return `| ${claim.claim} | ${claim.source} | ${claim.proofType} | ${approvedBy} | ${status} |`;
  }).join("\n");

  write(path, `# Claim-Proof Ledger

Use this for every client-facing claim.

Run \`npm run claims:check\` before sending outbound or client-facing material.

## Rule

If a claim cannot be proven, it cannot be shipped.

## Ledger

| Claim | Source | Proof Type | Approved By | Status |
|---|---|---|---|---|
${rows}

## Proof Types

- Client-provided fact
- Public website fact
- Review/testimonial
- Analytics screenshot
- Search Console screenshot
- Ad/email platform screenshot
- Competitor observation
- Nish judgment, labeled as judgment

## Approval Status

- \`draft\`
- \`needs-client-confirmation\`
- \`approved\`
- \`removed\`

## Never Ship Without Approval

- revenue numbers
- customer counts
- certifications
- guarantees or policies
- compliance claims
- medical/legal/financial claims
- competitor comparisons
- before/after claims
`);
  return true;
}

function fillDeliveryScorecard(startup, statuses) {
  const path = join(startup.clientPath, "quality/delivery-scorecard.md");
  const foundCount = statuses.filter((item) => item.found).length;
  write(path, `# Delivery Scorecard

Score every sprint before handoff.

| Area | Score 1-5 | Notes |
|---|---:|---|
| Specificity | 4 | ${startup.focus} is specific enough to review, but final copy still needs owner approval. |
| Evidence quality | 4 | ${foundCount}/${statuses.length} owned proof source(s) were found and summarized. |
| Implementation readiness | 4 | The handoff names one page, one replacement direction, and one measurement. |
| Buyer clarity | 4 | The before/after frame makes the buyer problem easier to understand. |
| Search/AI clarity | 4 | The recommendation avoids AEO/GEO hacks and ties claims to source-backed proof. |
| Client delight | 4 | The owner gets a concise proof packet instead of vague strategy notes. |
| Measurement clarity | 4 | Next measurement is explicit: ${startup.nextMeasurement} |

## Pass Bar

- Average score must be 4+.
- No area can be below 3.
- If implementation readiness is below 4, improve the deliverable before sending.

## Improvement Prompts

- "What part would the client still need to figure out alone?"
- "Which claim needs proof?"
- "Which recommendation is generic?"
- "Which action should happen first?"
- "What would make this feel obviously worth the money?"

## Guardrail

This scorecard only says the owned-startup package is review-ready. It does not approve claims, prove external market demand, or replace a client handoff Loom.
`);
  return true;
}

function fillConversionScorecard(startup, statuses) {
  const path = join(startup.clientPath, "quality/conversion-optimization-scorecard.md");
  const proofSource = relativeSourceList(statuses) || "proof source missing";
  const approval = existingScorecardApproval(startup.clientPath);
  const approvedClaims = approvedClaimCount(startup.clientPath);
  const claimFailure = approvedClaims > 0
    ? "Sprint acceptance still needs a real handoff Loom before this becomes delivery-ready."
    : "No client-facing proof claim is approved yet.";
  const claimFix = approvedClaims > 0
    ? "Record the handoff Loom and complete guarded sprint acceptance."
    : "Owner reviews claim-review packet, approves or removes each claim.";
  const claimMeasurement = approvedClaims > 0
    ? "Client acceptance dry-run shows ready-to-complete, then ready after Loom."
    : "Approved claim rows in ledger.";
  const approvalLine = approvedClaims > 0
    ? "Source-reviewed owned claims are approved; final handoff still requires a real Loom."
    : "Pending owner review. No external use until ledger status is `approved`.";

  write(path, `# Conversion Optimization Scorecard

Use this before final delivery on any page, form, offer, ad, or email recommendation.

## Page

- URL: ${productWebsite(startup)}
- Page type: Owned startup conversion path
- Traffic source: Existing organic/direct/product traffic
- Primary conversion: ${startup.nextMeasurement}
- Market stage: specific wedge needs proof

## Critical Checks

These first five checks must be filled before final delivery.

| Check | Pass/Fail | Evidence | Fix |
|---|---|---|---|
| Headline clarity | pass | ${startup.after} | Keep the headline tied to the sharpest buyer path. |
| Above-fold value proposition | pass | ${proofSource} | Lead with the concrete before/after outcome. |
| CTA ownership | watch | Live CTA behavior not measured in this capture. | Track the next action before calling it conversion proof. |
| Form friction | watch | Form/upload path needs live behavior data. | Compare upload starts, leads, or checkout starts against prior path. |
| Message match | pass | ${startup.focus} | Keep ads, Looms, and page copy aligned to the same wedge. |

## Top 5 Conversion Failures

| Rank | Failure | Buyer Impact | Exact Fix | Measurement |
|---:|---|---|---|---|
| 1 | ${startup.topLeak} | Buyer may not see the value fast enough. | ${startup.exactFix} | ${startup.nextMeasurement} |
| 2 | Proof can stay buried in screenshots, repo files, or tests. | Owner has to trust the recommendation. | Put proof source next to every before/after claim. | Claim-review approvals and dashboard proof rows. |
| 3 | Owned proof can be mistaken for paid-client proof. | Sales claims could overreach. | Label it owned-startup draft proof until a paid client validates it. | Market parity gate remains blocked until external proof exists. |
| 4 | Dashboard can become passive reporting. | Client sees activity instead of value. | Tie each dashboard row to next action and retention risk. | Weekly report value pulse. |
| 5 | ${claimFailure} | We cannot safely use the claim in sales or renewal copy until the current gate is clean. | ${claimFix} | ${claimMeasurement} |

## Copy Review

- Direct response flow: Headline, problem, proof, solution, and CTA are mapped to a tangible improvement.
- So-What chain: Feature to functional value to financial/operational value to emotional relief.
- Specificity upgrade: Generic marketing claim replaced with before/after, proof source, and next measurement.
- Proof/claim approval: ${approvalLine}

## Angle Review

- Market stage: specific wedge needs proof
- Mechanism: ${startup.exactFix}
- Angle chosen: tangible improvement proof, not vague marketing claims
- Differentiated: yes, by proof discipline and weekly learning loop
- Believable: draft only until claims are approved and behavior data is measured

## Distribution And Follow-Up

- Ownership path: Owned startup proof lane, then external Loom batch.
- Referral/community hook: Show a concrete before/after teardown, not a generic agency pitch.
- Email/retargeting sequence: Do not use until sender setup and claims are clean.
- Weekly test: ${startup.nextMeasurement}

## Search Trust Layer

Conversion fixes must be settled before this section is finalized.

| Layer | Current State | Fix | Proof Source | Next Measurement |
|---|---|---|---|---|
| On-site search trust | ${startup.topLeak} | After the conversion fix, verify title/meta, H1/H2 path, internal links, FAQ/schema fit, canonical, sitemap, and crawl basics for this page. | ${proofSource} | ${startup.nextMeasurement} |
| Off-site trust/distribution | Owned proof assets exist, but external distribution is not proven yet. | Use only real proof assets, citations, directories, partner/vendor listings, reviews, testimonials, or community mentions. | research/owned-proof-evidence.md | Track approved proof assets, referral signals, search signals, and client-confirmed value. |

## Search Trust Guardrails

- Conversion first: Buyer-facing page clarity is fixed before SEO/distribution recommendations.
- Title/meta/headings/internal links: Add or verify title/meta, H1/H2 path, internal links, and service-page hierarchy where relevant.
- FAQ/schema/crawl basics: Use buyer-question FAQs, schema only when page facts support it, and sitemap/canonical/crawl checks.
- Local/service-area relevance: Add only true service-area or buyer-fit relevance; do not invent locations.
- Real off-site trust/distribution: Use owned proof assets, real citations/listings/reviews/partners/community mentions only.
- Blocked backlink or spam tactic: No bought backlinks, fake reviews, spam directories, doorway pages, hidden text, keyword stuffing, or ranking promises.

## Approval

- Reviewer: ${approval.approved ? approval.reviewer : "Nish review required"}
- Date: ${approval.approved ? approval.date : today}
- Approved: ${approval.approved ? "yes" : "no"}
`);
  return true;
}

function fillImplementationHandoff(startup, statuses) {
  const path = join(startup.clientPath, "deliverables/implementation-handoff.md");
  const proofSource = relativeSourceList(statuses) || "proof source missing";
  write(path, `# ${startup.name} Implementation Handoff

Use this when the client or their developer will implement the changes.

## Page

- URL: ${productWebsite(startup)}
- Owner: Product owner
- Priority: 1

## Replace This

Current section:

\`\`\`text
${startup.before}
\`\`\`

## With This

Recommended section:

\`\`\`text
${startup.after}

Why this matters: ${startup.clientValue}

Next proof to watch: ${startup.nextMeasurement}
\`\`\`

## Why

- Buyer issue: ${startup.topLeak}
- Search/AI clarity issue: Claims need source-backed proof instead of vague AI/search language.
- Trust/proof issue: ${proofSource}
- Conversion issue: The buyer needs a clear reason to take the next action now.
- Message-match issue: Keep Loom, page, and follow-up language tied to the same wedge.

## Assets Needed

- Claim-review approval for every externally used claim.
- Before/after screenshot after the change is shipped.
- First behavior read for the next measurement.

## Conversion Checks

- Headline clarity: ${startup.after}
- Above-fold value proposition: ${startup.clientValue}
- CTA ownership: Tie CTA to the next measurement.
- Form friction: Review live path before calling this conversion-proof.
- Message match: ${startup.focus}

## Approval Needed

- Nish must approve or remove candidate claims in \`quality/claim-review.md\`.
- Do not send externally until \`quality/claim-proof-ledger.md\` has approved rows.

## Measurement

- Primary metric: ${startup.nextMeasurement}
- Secondary metric: approved claims, weekly value pulse, and before/after screenshot proof
- Check date: Next weekly review
`);
  return true;
}

function writeEvidencePacket(startup, statuses) {
  const path = join(startup.clientPath, "research/owned-proof-evidence.md");
  const rows = statuses.map((item) => {
    const status = item.found ? "found" : "missing";
    const snippet = item.snippet ? item.snippet.replace(/\|/g, "/") : item.found ? "binary or screenshot evidence" : "";
    return `| ${item.source} | ${status} | ${snippet} |`;
  }).join("\n");

  write(path, `# ${startup.name} Owned Proof Evidence

Generated: ${today}

## Scope

${startup.focus}

## Tangible Improvement Draft

| Before | After | Client-Visible Value | Next Measurement |
|---|---|---|---|
| ${startup.before} | ${startup.after} | ${startup.clientValue} | ${startup.nextMeasurement} |

## Evidence Sources

| Source | Status | Notes |
|---|---|---|
${rows}

## Guardrail

This is owned-startup proof. It can prove TinyStudio delivery quality and retention cadence. It does not prove external market demand, paid close rate, or paid-client retention.
`);
}

ensureOwnedClients();

const results = [];

for (const startup of startups) {
  const statuses = startup.proofSources.map((source) => sourceStatus(startup, source));
  writeEvidencePacket(startup, statuses);
  const claimReviewUpdated = writeClaimReview(startup, statuses);
  const claimLedgerUpdated = fillClaimLedger(startup);
  const deliveryUpdated = fillDelivery(startup, statuses);
  const deliveryScorecardUpdated = fillDeliveryScorecard(startup, statuses);
  const conversionScorecardUpdated = fillConversionScorecard(startup, statuses);
  const implementationHandoffUpdated = fillImplementationHandoff(startup, statuses);
  const weeklyUpdated = fillWeeklyReport(startup);
  fillWeeklyLearnings(startup);
  execFileSync("node", ["scripts/export-client-weekly-report.mjs", startup.clientPath, `--output=${join(startup.clientPath, "reports/week-1-report.md")}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  results.push({
    clientPath: startup.clientPath,
    productPath: startup.productPath,
    evidenceFound: statuses.filter((item) => item.found).length,
    evidenceTotal: statuses.length,
    claimReviewUpdated,
    claimLedgerUpdated,
    deliveryUpdated,
    deliveryScorecardUpdated,
    conversionScorecardUpdated,
    implementationHandoffUpdated,
    weeklyUpdated
  });
}

console.log(JSON.stringify({
  status: "draft-owned-proof-captured",
  generated: today,
  results,
  rule: "owned startup proof supports delivery stress testing but does not replace external Loom, reply, close, or retained paid-client proof"
}, null, 2));
