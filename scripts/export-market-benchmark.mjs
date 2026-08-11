#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";
import { NO_GUARANTEE_CLIENT_SENTENCE } from "./lib/service-contract.mjs";
import { runRepoJson as runJson } from "./lib/runtime-roots.mjs";
import { handleHelp, resolveOutputPath } from "./lib/operator-cli.mjs";

const args = process.argv.slice(2);
handleHelp(args, `Usage: npm run market:benchmark -- [--output=docs/strategy/market-parity-benchmark-2026.md] [--ops=growth-brain/ops/competitive-proof-matrix.md] [--html=growth-brain/ops/competitive-proof-matrix.html]`);
const outputArg = args.find((arg) => arg.startsWith("--output="));
const opsArg = args.find((arg) => arg.startsWith("--ops="));
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : "docs/strategy/market-parity-benchmark-2026.md";
const opsPath = opsArg ? opsArg.split("=").slice(1).join("=") : "growth-brain/ops/competitive-proof-matrix.md";
const htmlPath = htmlArg ? htmlArg.split("=").slice(1).join("=") : "growth-brain/ops/competitive-proof-matrix.html";
const today = localIsoDate();
const MARKET_ANCHORS_LAST_CHECKED = "2026-05-29";
function write(path, content, flag = "--output") {
  const resolved = resolveOutputPath(path, { flag });
  const dir = resolved.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(resolved, content);
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function statusLabel(value) {
  if (value === "pass") return "can claim";
  if (value === "watch") return "use carefully";
  return "do not claim yet";
}

const metrics = runJson(["scripts/export-growth-metrics.mjs"]);
const sender = runJson(["scripts/check-outbound-sender-setup.mjs"]);
const proofRun = existsSync("prospects/loom-links.txt")
  ? runJson(["scripts/check-market-proof-run.mjs"])
  : { status: "missing", validApprovedRows: 0, sentProofRows: 0 };

const marketProofReady = metrics.counts.loomsRecorded >= 5 && metrics.counts.sends >= 5 && metrics.counts.replies >= 1;
const senderReady = sender.status === "pass";
const deliveryProofStarted = metrics.counts.clients >= 3;

const alternatives = [
  {
    name: "AI CRO audit tools",
    source: "CROAudits",
    sourceUrl: "https://croaudits.com/pricing/",
    marketSignal: "$99/month; $2.5k audit.",
    strongAt: "Automation.",
    tinyStudioCanBeatBy: "Review + fix.",
    currentStatus: proofRun.validApprovedRows >= 5 ? "watch" : "fail",
    allowedClaim: "After proof."
  },
  {
    name: "Large CRO/digital agencies",
    source: "WebFX CRO services",
    sourceUrl: "https://www.webfx.com/digital-marketing/services/conversion-rate-optimization/",
    marketSignal: "$3.6k-$9.2k.",
    strongAt: "Large team.",
    tinyStudioCanBeatBy: "One-page speed.",
    currentStatus: marketProofReady ? "watch" : "fail",
    allowedClaim: "After paid proof."
  },
  {
    name: "Enterprise experimentation programs",
    source: "Speero full-service experimentation",
    sourceUrl: "https://speero.com/experimentation-services/full-service-experimentation-program",
    marketSignal: "$10k/month; 100k+ visits.",
    strongAt: "A/B testing.",
    tinyStudioCanBeatBy: "Pre-test fix.",
    currentStatus: deliveryProofStarted ? "watch" : "fail",
    allowedClaim: "Not an A/B replacement."
  },
  {
    name: "Specialist CRO agencies",
    source: "Conversion CRO services",
    sourceUrl: "https://www.conversion.is/services/conversion-rate-optimization-services",
    marketSignal: "100+ checks.",
    strongAt: "CRO depth.",
    tinyStudioCanBeatBy: "Ship and prove.",
    currentStatus: metrics.counts.clientsReady > 0 ? "watch" : "fail",
    allowedClaim: "Not deeper."
  },
  {
    name: "AI automation audit offers",
    source: "OpenClaw Audit",
    sourceUrl: "https://openclawaudit.com/",
    marketSignal: "$2k-$5k; 48 hours.",
    strongAt: "Fast maps.",
    tinyStudioCanBeatBy: "Implement + track.",
    currentStatus: metrics.counts.clientsReady > 0 ? "watch" : "fail",
    allowedClaim: "After proof."
  },
  {
    name: "Full-service digital agencies",
    source: "WebFX digital marketing packages",
    sourceUrl: "https://www.webfx.com/digital-marketing/services/packages/",
    marketSignal: "$2.5k-$12k/month.",
    strongAt: "Capacity.",
    tinyStudioCanBeatBy: "Small proof loop.",
    currentStatus: marketProofReady && metrics.counts.clientsReady > 0 ? "watch" : "fail",
    allowedClaim: "Not broader."
  },
  {
    name: "Paid acquisition agencies",
    source: "GoodFirms digital marketing pricing guide",
    sourceUrl: "https://www.goodfirms.co/blog/digital-marketing-pricing-guide",
    marketSignal: "Spend-share.",
    strongAt: "Media ops.",
    tinyStudioCanBeatBy: "Fix before spend.",
    currentStatus: senderReady && metrics.counts.clientsReady > 0 ? "watch" : "fail",
    allowedClaim: "No media claim."
  },
  {
    name: "Lifecycle/email providers",
    source: "HubSpot State of Marketing",
    sourceUrl: "https://www.hubspot.com/state-of-marketing",
    marketSignal: "Email retainers.",
    strongAt: "Retention.",
    tinyStudioCanBeatBy: "Proof + owner.",
    currentStatus: metrics.counts.clientsReady > 0 ? "watch" : "fail",
    allowedClaim: "Out of scope."
  },
  {
    name: "Transparent boutique retainers",
    source: "Technotize pricing",
    sourceUrl: "https://technotize.io/pricing",
    marketSignal: "Recurring retainers.",
    strongAt: "Packaging.",
    tinyStudioCanBeatBy: "Shipped proof.",
    currentStatus: metrics.counts.clientsReady > 0 && metrics.counts.loomsRecorded >= 5 ? "watch" : "fail",
    allowedClaim: "After delivery."
  }
];

const proofBars = [
  {
    area: "Automated workflow depth",
    status: "pass",
    evidence: "Automation prepares intake, research, drafts, QA, evidence, handoff, and routing; humans decide fit, claims, delivery, acceptance, and renewal."
  },
  {
    area: "Tangible improvement cadence",
    status: deliveryProofStarted ? "watch" : "fail",
    evidence: `${metrics.counts.clients} canonical paid client folder(s); ${metrics.counts.clientsReady} client-ready folder(s).`
  },
  {
    area: "Market traction",
    status: marketProofReady ? "pass" : "fail",
    evidence: `${metrics.counts.loomsRecorded}/5 Looms, ${metrics.counts.sends}/5 sends, ${metrics.counts.replies} replies.`
  },
  {
    area: "Sender trust",
    status: senderReady ? "pass" : "fail",
    evidence: sender.warnings?.length ? sender.warnings.map((warning) => warning.rule).join("; ") : "sender setup clean."
  },
  {
    area: "Proof-run discipline",
    status: proofRun.status === "sent-proof-captured" ? "pass" : "fail",
    evidence: `proof run ${proofRun.status}; approved rows ${proofRun.validApprovedRows || 0}; sent rows ${proofRun.sentProofRows || 0}.`
  }
];

const markdownRows = alternatives
  .map((item) => `| ${item.name} | ${item.marketSignal} | ${item.strongAt} | ${item.tinyStudioCanBeatBy} | ${statusLabel(item.currentStatus)} | ${item.allowedClaim} |`)
  .join("\n");

const proofRows = proofBars
  .map((item) => `| ${item.area} | ${statusLabel(item.status)} | ${item.evidence} |`)
  .join("\n");

const sourceRows = alternatives
  .map((item) => `- ${item.source}: ${item.sourceUrl}`)
  .join("\n");

const markdown = `# Market Parity Benchmark 2026

Generated: ${today}

## Purpose

Use this to judge whether TinyStudio is merely internally polished or actually comparable with strong CRO, SEO/site-architecture, paid acquisition, lifecycle/email, AI automation audit, and full-service growth providers.

## Current Position

TinyStudio is not trying to beat full-service enterprise CRO agencies on long statistical testing programs. The sharper comparison is:

- one-time CRO audit and implementation-readiness projects
- boutique SEO/site-architecture audits
- paid search/social and lifecycle/email retainers
- AI-assisted marketing operations retainers
- human-reviewed website revenue fault sprints for founder-led Managed IT, MSP, and cybersecurity companies

## Decision Rule

Use this benchmark as an owner dashboard for market claims. If a row says "do not claim yet", the claim stays internal until the proof bar is cleared.

## Market Price Anchors

Generated: ${today}.
Market anchors last checked: ${MARKET_ANCHORS_LAST_CHECKED}.

Current public market signals:

- AI CRO audit tooling can be cheap: CROAudits lists a $99/month AI report product and a request-an-audit entry point starting at $2,500.
- WebFX lists CRO setup/ongoing tiers from $3,600/$1,800 through $9,200/$9,200.
- Speero says full-service experimentation starts from $10,000/month on a 12-month program and is aimed at sites with at least 100,000 unique visitors/month.
- Conversion describes CRO audits across analytics, behavior, technical performance, content, and competitive positioning, with recommendations ranked by estimated revenue impact.
- OpenClaw Audit lists $2,000 and $5,000 AI automation audit packages with a 48-hour turnaround.
- WebFX, SmartSites, Ignite Visibility, and Thrive all position as multi-channel agencies across SEO, PPC, paid social, email, CRO, analytics, content, reputation, and web work.
- MarketHire and GoodFirms pricing guides put serious full-service retainers into the $5,000-$25,000+/month zone depending on scope, channels, and seniority.

## Competitive Proof Matrix

| Alternative | Market Signal | They Are Strong At | TinyStudio Can Beat By | Current Proof Status | Allowed Claim |
|---|---|---|---|---|---|
${markdownRows}

## TinyStudio Proof Bar

| Area | Status | Evidence |
|---|---|---|
${proofRows}

## TinyStudio Pricing Interpretation

- The first three clients receive exactly the $1,000 founder pilot for one The Website Correction.
- No alternate package, recurring retainer, software product, or channel-spend service is active in this benchmark.
- Day 0 starts only after payment, required context, an approval owner, and an implementation owner; client delay pauses the clock.

## To Be Better Than Average Agencies

TinyStudio must prove these advantages:

| Area | Average Provider | TinyStudio Must Beat It By |
|---|---|---|
| Speed | 2-6 week audit/report | 7-day sprint with implementation-ready assets |
| Specificity | Generic best-practice checklist | Approved application context, real page evidence, and claim-safe customer language |
| Output | PDF recommendations | Fault map, page fix, implementation handoff, proof, and measurement plan |
| Channel breadth | Sell every channel by default | Add only ready channels with access, economics, measurement, and approval |
| Trust | Loose claims | Claim-proof ledger and approval gates |
| Automation | Manual agency ops | Repeatable scripts, generated cockpits, batch prep, readiness checks |
| Follow-through | Monthly report | 14-day implementation tracking plus updated client evidence |

## 11/10 Proof Bar

Do not claim the workflow is 11/10 until:

1. Five Looms have been recorded and sent.
2. At least one real prospect replies.
3. At least one sales call happens.
4. At least one external application is human-approved and reaches paid Day 0.
5. At least one sprint is delivered through readiness and human acceptance gates.
6. At least one approved claim, testimonial, or before/after proof row exists in the same ready client folder.
7. At least one 14-day tracking evidence record shows implementation, usefulness, acceptance, and a next action.

## Customer Happiness Thesis

Customers should finish the sprint with visible forward motion:

- a performance read
- one priority decision
- one shipped or implementation-ready improvement
- a client evidence update
- one next action during 14-day tracking

${NO_GUARANTEE_CLIENT_SENTENCE} Automation records implementation and usefulness signals; humans decide acceptance and any renewal.

## Sources

${sourceRows}
`;

const htmlRows = alternatives.map((item) => `
        <tr>
          <td>${htmlEscape(item.name)}</td>
          <td>${htmlEscape(item.marketSignal)}</td>
          <td>${htmlEscape(item.strongAt)}</td>
          <td>${htmlEscape(item.tinyStudioCanBeatBy)}</td>
          <td><span class="pill ${item.currentStatus === "fail" ? "bad" : item.currentStatus === "watch" ? "warn" : "good"}">${htmlEscape(statusLabel(item.currentStatus))}</span></td>
          <td>${htmlEscape(item.allowedClaim)}</td>
        </tr>`).join("");

const htmlProofRows = proofBars.map((item) => `
        <tr>
          <td>${htmlEscape(item.area)}</td>
          <td><span class="pill ${item.status === "fail" ? "bad" : item.status === "watch" ? "warn" : "good"}">${htmlEscape(statusLabel(item.status))}</span></td>
          <td>${htmlEscape(item.evidence)}</td>
        </tr>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TinyStudio Competitive Proof Matrix</title>
  <style>
    :root { color-scheme: light; --ink:#14161a; --muted:#667085; --line:#d9e1ea; --paper:#f7f9fc; --good:#0f7b45; --warn:#9a5b00; --bad:#b42318; }
    * { box-sizing: border-box; }
    body { margin:0; background:#fff; color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width:1180px; margin:0 auto; padding:28px 18px 48px; }
    h1 { margin:0; font-size:clamp(30px, 4vw, 46px); line-height:1; letter-spacing:0; }
    p { color:var(--muted); max-width:780px; }
    section { margin-top:20px; }
    table { width:100%; border-collapse:collapse; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
    th, td { padding:11px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:var(--paper); color:#475467; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    .pill { display:inline-flex; padding:4px 8px; border-radius:999px; color:#fff; font-size:12px; font-weight:800; text-transform:uppercase; }
    .good { background:var(--good); }
    .warn { background:var(--warn); }
    .bad { background:var(--bad); }
    a { color:#0d6b57; }
    @media (max-width:760px) { table { display:block; overflow-x:auto; } }
  </style>
</head>
<body>
  <main>
    <h1>Competitive Proof Matrix</h1>
    <p>Generated ${htmlEscape(today)}. Market anchors last checked ${htmlEscape(MARKET_ANCHORS_LAST_CHECKED)}. This shows where TinyStudio can credibly compete and where claims are still blocked by missing proof.</p>
    <section>
      <h2>Market Alternatives</h2>
      <table><thead><tr><th>Alternative</th><th>Market Signal</th><th>They Are Strong At</th><th>TinyStudio Can Beat By</th><th>Status</th><th>Allowed Claim</th></tr></thead><tbody>${htmlRows}
      </tbody></table>
    </section>
    <section>
      <h2>Decision Rule</h2>
      <p>Use this as the owner dashboard for market claims. If a row says do not claim yet, the claim stays internal until the proof bar is cleared.</p>
    </section>
    <section>
      <h2>TinyStudio Proof Bar</h2>
      <table><thead><tr><th>Area</th><th>Status</th><th>Evidence</th></tr></thead><tbody>${htmlProofRows}
      </tbody></table>
    </section>
    <section>
      <h2>Sources</h2>
      <ul>${alternatives.map((item) => `<li><a href="${htmlEscape(item.sourceUrl)}">${htmlEscape(item.source)}</a></li>`).join("")}</ul>
    </section>
  </main>
</body>
</html>
`;

write(outputPath, markdown);
write(opsPath, markdown, "--ops");
write(htmlPath, html, "--html");

const status = proofBars.some((item) => item.status === "fail")
  ? "market-proof-needed"
  : proofBars.some((item) => item.status === "watch")
    ? "watch"
    : "pass";

console.log(JSON.stringify({
  status,
  path: outputPath,
  opsPath,
  htmlPath,
  alternatives: alternatives.length,
  proofBars,
  sources: alternatives.map((item) => item.sourceUrl)
}, null, 2));
