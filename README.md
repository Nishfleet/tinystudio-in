# TinyStudio Growth Brain

This repo is now the operating kit for TinyStudio's cash-now AI marketing ops agency.

The business is simple: sell a Tangible Revenue Leak Sprint + Search Trust Layer to ecommerce and founder-led businesses that already have traffic or sales, then use the TinyStudio Growth Brain system to find leaks, rewrite the highest-leverage marketing assets, tighten search trust, and set up a weekly learning loop. After proof exists, expand into the Full-Stack Growth Desk across SEO, paid ads, email/SMS, content, social, reputation, analytics, CRO, creative, and automation only when each channel passes readiness gates.

## Main Kit

- `growth-brain/README.md` is the whole plan.
- `growth-brain/offer.md` is the offer to sell first.
- `growth-brain/positioning/message-house.md` keeps external naming sharp and consistent.
- `growth-brain/agency-operating-model.md` explains how the agency scales after the first wedge.
- `growth-brain/workflows/` contains the daily sales, Loom, sprint, and retainer workflows.
- `growth-brain/workflows/repeatable-workflow-operating-system.md` is the canonical 10-step loop for turning any service line into a repeatable workflow.
- `growth-brain/build-roadmap.md` says what to build now versus later.
- `growth-brain/sales/` contains offer, proposal, buyer-room, call, objection, and follow-up assets.
- `growth-brain/sales/managed-it-one-page-offer.md` is the first niche-specific sales sheet.
- `growth-brain/quality/` contains proof, acceptance, delivery, and delight gates.
- `growth-brain/quality/conversion-optimization-playbook.md` contains the page, copy, angle, email, distribution, ads, and AI/search no-hack heuristics now required in delivery.
- `growth-brain/strategy/full-stack-growth-offer-ladder.md` defines the researched service ladder from proof sprint to full-stack retainers.
- `growth-brain/quality/channel-readiness-scorecard.md` blocks selling channels that lack access, economics, measurement, or approval cadence.
- `growth-brain/ops/full-stack-growth-map.md` and `.html` show the current service/pricing/channel map.
- `growth-brain/retention/` contains Weekly Growth Desk, health score, expansion, and case-study assets.
- `scripts/export-client-weekly-report.mjs` and `scripts/check-client-weekly-report.mjs` generate and verify retention-grade weekly reports.
- `scripts/export-retention-checkups.mjs` generates weekly/monthly client checkups and a retention dashboard.
- `scripts/export-client-facing-dashboard.mjs` generates the proof-aware client dashboard with the first-screen tangible improvement, measurement contract, shipped work, learnings, next action, and approved proof.
- `scripts/export-client-renewal-review.mjs` generates the guarded month-end renewal review and blocks renewal asks until proof is clean.
- `scripts/review-client-acceptance.mjs` completes final sprint acceptance only after proof, scorecard, and delivery readiness blockers are clean.
- `growth-brain/verticals/` contains niche-specific audit playbooks.
- `growth-brain/ai-visibility/` contains AI/search audit prompts and workflow.
- `growth-brain/delivery/` contains implementation handoff and communication cadence templates.
- `growth-brain/ops/` contains command-center, browser cockpit, internal dashboard, retention dashboard, and review templates.
- `growth-brain/ops/agency-config.json` keeps founder name, offer name, price defaults, placeholders, and opt-out language consistent across generated copy.
- `scripts/check-outbound-sender-setup.mjs` checks SPF, DMARC, DKIM, and common DKIM selector discovery before email is allowed into outbound.
- `scripts/configure-sender-setup.mjs` applies the real sender address and DKIM selector, then reruns sender trust checks.
- `growth-brain/ops/value-retention-stress-test.md` is the north-star stress test for tangible improvement proof, retention, customer-perceived value, and client delight.
- `growth-brain/positioning/tangible-improvement-moat.md` defines the no-trust-startup wedge: show the delta, the proof source, the value, the next measurement, and the customer's continue/retain signal.
- `growth-brain/ops/market-parity-readiness.md` is the honest 11/10 gate: it separates internal automation strength from market, sales, delivery, and retention proof.
- `growth-brain/ops/competitive-proof-matrix.html` compares TinyStudio against current market alternatives and shows which better/comparable claims are allowed or blocked.
- `growth-brain/ops/11-10-proof-run.md` turns the 11/10 blockers into the exact next proof-capture run.
- `growth-brain/ops/market-proof-run-check.md` verifies whether the 5-Loom proof session is recorded, send-prepped, and actually sent.
- `growth-brain/ops/market-proof-cockpit.html` is the tangible-improvement proof cockpit for the first external proof run.
- `docs/strategy/solo-ai-agency-pre-customer-parity.md` defines the pre-customer/pre-revenue parity gate against the solo AI agency article; `npm run article:parity` checks that the public workflow view, internal workflow engine, acquisition loop, and proof boundaries are all present.
- `docs/strategy/solo-ai-agency-90-day-rollout.md` adapts the article's 90-day path to TinyStudio without claiming revenue before proof exists.
- `docs/strategy/90-day-start-here.md` is the Day 1 runbook for starting the first proof batch.
- `docs/strategy/friction-triggered-build-backlog.md` parks cold email setup, intake form, background agents, hard-wired model routing, and public case-study pages until real friction proves they are needed.
- `growth-brain/ops/pre-revenue-agent-orchestration.md` maps the agent-agency diagram into TinyStudio's pre-revenue operating architecture: operator touchpoints, intake, routing, parallel lanes, specialist escalation, verifier QA, handoff, skills/library feedback, background pool, and unit economics.
- `scripts/export-agent-orchestration-run.mjs` creates the current diagram-shaped work packet; `npm run agent:parity` verifies that pre-revenue diagram parity is present without claiming revenue or autonomous delivery.
- `growth-brain/ops/model-routing-standard.md` defines workhorse, specialist, utility, and manual task routing.
- `growth-brain/ops/unit-economics-ledger.md` defines what cost, time, and review data must be captured before any margin or delivery-cost claim.
- The active Codex automation `TinyStudio Retention Checkups` prepares weekly checkups every Friday and flags month-end reviews; it never sends client messages automatically.
- `growth-brain/prospecting/` contains query banks, warm-network scripts, and first-50 templates.
- `growth-brain/agents/` contains the first repeatable agent workflows, including the marketing-agent workbench loops.
- `growth-brain/client-brain-template/` is the context folder copied for every client.
- `growth-brain/sprint-checklist.md` is the 7-day delivery path.
- `growth-brain/loom-audit-script.md` and `growth-brain/outreach-tracker.md` are for getting the first clients.
- `docs/strategy/first-14-days.md` is the immediate money plan.

## Mobbin Reference Engine

The preserved Mobbin work stays here as a design-reference subsystem. Use it when a page, landing page, or visual direction needs stronger examples before building.

- `scripts/run-design-system-proving-lab.mjs` builds and checks the proving-lab packet.
- `scripts/test-design-system-proving-lab.mjs` verifies the lab stays blocked until real proof exists.
- `docs/MOBBIN_PRO_*` documents the workflow and collection rules.

## Operating Workflow

Run the business from the bottleneck first. The default workflow logic is: find the bottleneck, study the gap, extract the principle, design the flow, build the smallest system, test with real output, feed results back, and iterate. Use `npm run growth:dashboard` when you want the full owner command center with next actions, pending work, and the to-do list.

1. Start with `npm run growth:doctor -- --plain`.
2. Do the exact next command it gives. If recording prep is already fresh, it will point you straight at the recording view instead of telling you to prep again.
3. If the bottleneck is recording, run `npm run market:proof-run`, then `npm run prospect:rehearsal -- --limit=5`. Record only when every Loom script shows a specific leak, buyer-visible improvement, first fix, and clean ask.
4. Run `npm run market:proof-cockpit`, record the Looms, then paste the Loom URLs into `npm run market:after-recording -- --from-clipboard`. It updates Loom rows, prepares send packages, refreshes the outbox, and refreshes the proof cockpit without marking anything sent.
5. Run `npm run market:proof-cockpit` after recording and again after sending so the proof session has one proof dashboard and one clean status.
6. If the bottleneck is sending, use the outbox, choose the safest channel, check only the messages actually sent, then mark the batch sent from the copied sent sheet. The outbox and stage commands require ready, Loom-approved send packages.
7. After sending or follow-ups, run `npm run market:learn` before changing lead fit, hook, message, or volume.
8. If the bottleneck is follow-up or sales, use the follow-up cockpit or sales cockpit and move each prospect to the next pipeline stage. High-stakes sales commands require a confirmation checkbox.
9. After every batch, run `npm test`, `npm run send:check`, and `npm run claims:check` before trusting generated outbound or sales materials.
10. Run `npm run market:parity` before claiming the offer is 11/10, comparable, or better than alternatives.
11. Run `npm run market:benchmark` when the comparison needs to be refreshed against current CRO, SEO, and AI-audit alternatives.
12. If the parity gate fails, run `npm run market:proof-run` and complete the proof packet before building more system surface.
13. Run `npm run value:stress` before calling the workflow high-value. Every client sprint needs a before/after tangible improvement, proof source, client-visible value, measurement contract, and client confirmation.
14. Run `npm run owned:live-signals` weekly for AI Converter, SiteRep, and 0509. This creates a real public delivery metric, not revenue proof.
15. Treat tangible improvement proof as the trust wedge: show the change and evidence first, confirm the client saw the value, then let dashboards and reports carry the weekly loop.
16. Keep the value line buyer-specific. Repeated "this helps qualified visitors" language is not enough; the value must reference the prospect's actual promise, route, proof, or decision moment.
17. Save new objections, audit patterns, and client learnings into the proof/learning library so the Growth Brain gets sharper each cycle.

## Commands

```bash
npm test
npm run claims:check
npm run send:configure -- --physical-address="..." --dkim-selector=... --dry-run
npm run send:setup
npm run send:guide
npm run send:normalize
npm run send:check
npm run growth:start
npm run growth:doctor
npm run growth:mission
npm run growth:today
npm run growth:cockpit
npm run growth:metrics
npm run growth:proof
npm run growth:dashboard
npm run value:stress
npm run growth-brain:check
npm run market:benchmark
npm run market:parity
npm run market:proof-run
npm run market:recordings -- --from-clipboard
npm run market:after-recording -- --from-clipboard
npm run market:proof-check
npm run market:proof-cockpit
npm run market:learn
npm run article:parity
npm run agent:run
npm run agent:parity
npm run owned:startups
npm run owned:proof
npm run owned:proof-review
npm run owned:case-studies
npm run owned:workflow-proof
npm run owned:live-signals
npm run owned:metrics -- --from-clipboard
npm run owned:handoff
npm run retention:automation-check
npm run prospect:new -- "Prospect Name"
npm run prospect:import -- prospects.txt
npm run prospect:contact-plan -- prospects/prospect-slug
npm run prospect:batch-contact-plan -- --limit=10
npm run prospect:score-cockpit
npm run prospect:batch-score -- --from-clipboard
npm run prospect:score-check
npm run prospect:prep-recording -- --limit=5
npm run prospect:site-check
npm run prospect:batch-snapshot -- --limit=5
npm run prospect:brief -- prospects/prospect-slug
npm run prospect:queue -- --limit=5
npm run prospect:cockpit -- --limit=5
npm run prospect:teleprompter -- --limit=5
npm run prospect:rehearsal -- --limit=5
npm run prospect:outbox
npm run prospect:followups
npm run prospect:sales-cockpit
npm run prospect:package -- prospects/prospect-slug
npm run prospect:script -- prospects/prospect-slug
npm run prospect:loom -- prospects/prospect-slug https://www.loom.com/share/...
npm run prospect:send-prep -- prospects/prospect-slug https://www.loom.com/share/... --approved
npm run market:recordings -- --from-clipboard
npm run market:after-recording -- --from-clipboard
npm run prospect:batch-send-prep
npm run prospect:batch-sent -- --from-clipboard
npm run prospect:message -- prospects/prospect-slug
npm run prospect:check -- prospects/prospect-slug
npm run prospect:stage -- prospects/prospect-slug sent --channel contact-form
npm run prospect:reply-prep -- prospects/prospect-slug
npm run prospect:call-booked-prep -- prospects/prospect-slug
npm run prospect:call-prep -- prospects/prospect-slug
npm run prospect:close-prep -- prospects/prospect-slug
npm run prospect:stage -- prospects/prospect-slug won --note "Approved sprint"
npm run prospect:convert -- prospects/prospect-slug
npm run client:new -- "Client Name"
npm run client:cockpit -- clients/client-slug
npm run client:dashboard -- clients/client-slug
npm run client:kickoff -- clients/client-slug
npm run client:proof-review -- clients/client-slug --dry-run
npm run client:acceptance -- clients/client-slug --dry-run
npm run client:renewal -- clients/client-slug
npm run client:weekly-report -- clients/client-slug
npm run client:weekly-check -- clients/client-slug
npm run client:workflow -- clients/client-slug
npm run retention:checkups
npm run client:check -- clients/client-slug
npm run sales:one-pager
npm run mobbin:check
```

`owned:proof-review` writes both `growth-brain/ops/owned-proof-review.md` and `growth-brain/ops/owned-proof-review.html` so owned-startup proof claims can be reviewed from one approval cockpit before any claim is marked approved. It now includes per-claim commands plus bulk dry-run/apply commands for source-ready owned proof.

`owned:handoff` writes `growth-brain/ops/owned-handoff-loom-cockpit.md` and `.html`, plus one `handoff-loom-script.md` per owned startup. It makes the tangible improvement visible and keeps acceptance blocked until a real Loom URL is attached.

## Hard Rules

- Do not promise specific revenue, ROAS, ranking, or sales-multiple outcomes.
- Do not sell to pre-revenue clients who do not have enough real context to improve.
- Do not ship AI output without human review.
- Do not copy competitors, Mobbin screens, brands, claims, or exact layouts.
- Keep the loop tight: collect context, deploy the workflow, measure the result, update the client brain.
- Keep the active retention automation checked. `retention:automation-check` verifies the weekly prep loop is active, points at this repo, and cannot auto-send or auto-approve claims.
