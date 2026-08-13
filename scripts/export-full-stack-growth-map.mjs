#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { localIsoDate } from "./date-utils.mjs";
import { handleHelp } from "./lib/operator-cli.mjs";

handleHelp(process.argv.slice(2), `Usage: node scripts/export-full-stack-growth-map.mjs`);
const today = localIsoDate();
const outputPath = "growth-brain/ops/full-stack-growth-map.md";
const htmlPath = "growth-brain/ops/full-stack-growth-map.html";

const tiers = [
  {
    tier: "Proof Sprint",
    price: "$1,000-$5,000",
    fit: "First engagement; prove value before asking for a retainer.",
    channels: "CRO, search trust, ad/email angles, dashboard"
  },
  {
    tier: "Weekly Growth Desk",
    price: "$2,000-$5,000/month",
    fit: "One visible improvement loop per week.",
    channels: "CRO, SEO basics, email/SMS, content angles, reputation, analytics"
  },
  {
    tier: "Full-Stack Growth Desk",
    price: "$5,000-$12,000/month",
    fit: "Client has traffic, data, access, budget, and at least two ready growth channels.",
    channels: "SEO, paid search/social, lifecycle, content, CRO, reputation, analytics"
  },
  {
    tier: "Operator-Led Growth Pod",
    price: "$12,000+/month",
    fit: "High-LTV client with multi-channel need and implementation capacity.",
    channels: "Senior strategy, channel owners, implementation support, monthly growth review"
  }
];

const channels = [
  ["CRO / conversion", "landing pages, service pages, forms, offers", "page/funnel, buyer action, implementation path", "before/after plus next measurement"],
  ["SEO / search trust", "technical basics, structure, FAQ/schema, local relevance", "editable site and clear intent", "search trust review"],
  ["Content / authority", "expert POV, case studies, comparison pages, useful citeable pages", "real expertise or proof plus distribution", "content plan and measurement"],
  ["Paid search", "ad angles, keyword hypotheses, landing-page loop, tracking", "budget, conversion tracking, follow-up path", "ad test plan"],
  ["Paid social", "creative angles, audience hypotheses, retargeting", "creative inputs and budget", "creative test matrix"],
  ["Email/SMS/lifecycle", "welcome, activation, nurture, abandoned cart, winback", "consented list and ESP access", "sequence map"],
  ["Social / distribution", "founder posts, LinkedIn/X, community distribution", "voice and approval cadence", "calendar plus proof-backed posts"],
  ["Local/reputation", "GBP, citations, reviews, service-area proof", "real location/service area", "review and reputation loop"],
  ["Analytics / attribution", "events, UTMs, source-of-truth reporting", "conversion definition and analytics access", "measurement contract"],
  ["Creative / design", "ad briefs, page sections, proof assets", "approved message and proof", "approval-ready assets"],
  ["Marketing automation", "weekly reports, agents, reminders, monitoring", "clear input/action/output/check", "autonomous run log"]
];

const sources = [
  ["WebFX package pricing", "https://www.webfx.com/digital-marketing/services/packages/"],
  ["WebFX services", "https://www.webfx.com/digital-marketing/services/"],
  ["SmartSites service menu", "https://www.smartsites.com/digital-marketing-services/"],
  ["Ignite Visibility services", "https://ignitevisibility.com/"],
  ["Thrive services", "https://thriveagency.com/"],
  ["MarketHire 2026 agency pricing", "https://marketerhire.com/blog/marketing-agency-pricing"],
  ["GoodFirms 2026 digital marketing pricing", "https://www.goodfirms.co/blog/digital-marketing-pricing-guide"],
  ["HubSpot 2026 State of Marketing", "https://www.hubspot.com/state-of-marketing"],
  ["Technotize pricing transparency", "https://technotize.io/pricing"]
];

function table(rows, headings) {
  return [
    `| ${headings.join(" | ")} |`,
    `| ${headings.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

const markdown = `# Full-Stack Growth Map

Generated: ${today}

## Positioning

TinyStudio can cover the major marketing requirements a company asks for, but only through a proof-led ladder.

We should not sell "everything" on day one. We should start with a visible revenue fault sprint, then expand into the channels that are actually ready.

## Offer Ladder

${table(tiers.map((tier) => [tier.tier, tier.price, tier.fit, tier.channels]), ["Tier", "Price", "Best Fit", "Channel Coverage"])}

## Channel Coverage

${table(channels, ["Channel", "What We Help With", "Readiness Gate", "Proof Output"])}

## Market Pricing Read

- Broad digital marketing packages commonly sit around $2,500-$12,000/month.
- Serious full-service retainers commonly start around $5,000/month and can exceed $25,000/month.
- Paid media management is usually separate from ad spend.
- SEO/content retainers need a longer horizon than a 7-day sprint.
- Email/SMS is valuable when the client has consented list volume and repeat/lead-nurture economics.
- Our $1,000-$5,000 sprint is a trust wedge, not the ceiling.
- Our $5,000-$12,000/month Full-Stack Growth Desk is defensible only after the proof sprint and channel readiness gates are clean.

## Decision Rule

Start narrow, prove value, then expand only into channels where access, economics, measurement, and approval cadence are ready.

## Operating Guardrails

- Do not promise revenue, ROAS, rankings, or sales lift.
- Do not sell ad management without tracking, budget, and stop rules.
- Do not sell SEO without a real horizon and implementation access.
- Do not sell email/SMS without consent, deliverability basics, and unsubscribe path.
- Do not sell social as generic daily posting.
- Do not buy backlinks, fake reviews, fake citations, fake mentions, spam directories, or doorway pages.
- Do not expand scope without a written change order or new monthly tier.

## Sources

${sources.map(([label, url]) => `- ${label}: ${url}`).join("\n")}
`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const tierCards = tiers.map((tier) => `
      <article>
        <h3>${escapeHtml(tier.tier)}</h3>
        <p class="price">${escapeHtml(tier.price)}</p>
        <p>${escapeHtml(tier.fit)}</p>
        <p><strong>Coverage:</strong> ${escapeHtml(tier.channels)}</p>
      </article>`).join("");

const channelRows = channels.map((row) => `
        <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Full-Stack Growth Map</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f6f7f9; color: #15171a; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
    h1 { font-size: 34px; margin: 0 0 8px; letter-spacing: 0; }
    h2 { margin-top: 34px; font-size: 20px; }
    .lead { color: #4c5563; max-width: 760px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    article, section { background: #fff; border: 1px solid #dfe3e8; border-radius: 8px; padding: 18px; }
    article h3 { margin: 0 0 8px; }
    .price { font-weight: 800; font-size: 20px; margin: 0 0 12px; }
    table { border-collapse: collapse; width: 100%; background: #fff; border: 1px solid #dfe3e8; }
    th, td { text-align: left; border-bottom: 1px solid #e7ebf0; padding: 10px; vertical-align: top; }
    th { background: #eef2f6; }
    ul { line-height: 1.55; }
  </style>
</head>
<body>
  <main>
    <h1>Full-Stack Growth Map</h1>
    <p class="lead">TinyStudio can cover the major marketing requirements companies ask for, but only through a proof-led ladder. Start with a visible revenue fault sprint, then expand into ready channels.</p>
    <h2>Offer Ladder</h2>
    <div class="grid">${tierCards}
    </div>
    <h2>Channel Coverage</h2>
    <table>
      <thead><tr><th>Channel</th><th>What We Help With</th><th>Readiness Gate</th><th>Proof Output</th></tr></thead>
      <tbody>${channelRows}
      </tbody>
    </table>
    <h2>Guardrails</h2>
    <section>
      <ul>
        <li>No revenue, ROAS, ranking, or sales-lift promises.</li>
        <li>No ad management without tracking, budget, and stop rules.</li>
        <li>No SEO without horizon and implementation access.</li>
        <li>No email/SMS without consent and unsubscribe path.</li>
        <li>No bought backlinks, fake reviews, fake citations, fake mentions, spam directories, or doorway pages.</li>
      </ul>
    </section>
  </main>
</body>
</html>
`;

mkdirSync("growth-brain/ops", { recursive: true });
writeFileSync(outputPath, markdown);
writeFileSync(htmlPath, html);

console.log(JSON.stringify({
  status: "created",
  path: outputPath,
  htmlPath,
  tiers: tiers.length,
  channels: channels.length,
  sources: sources.length
}, null, 2));
