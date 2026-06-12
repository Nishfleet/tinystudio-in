# Internal Dashboard

Generated: 2026-06-01

This is the concise owner view. It pulls together the sales bottleneck, current funnel, client retention risk, and 11/10 proof gate.

## Next Move

Record the scored Looms. This is the current money bottleneck.

```bash
npm run growth:start -- --view=record
```

## Status

| Area | Status | Detail |
|---|---|---|
| Workflow | warning | warn: 2 warning(s) |
| Money bottleneck | record | Record the scored Looms. This is the current money bottleneck. |
| Retention | ready | 3/3 weekly reports ready; 0 high-risk client(s) |
| Market proof cockpit | needs-recording | 0/5 sent proof rows; 5 tangible improvement rows |
| Sender trust | warn | Email setup is not clean yet. Prefer contact forms or DMs until send:setup is clean. Warnings: missing physical postal address; DKIM selector not configured |
| Recording rehearsal | ready | 5 script(s); minimum 10/10 |
| Market learning | needs-first-proof-batch | next: npm run growth:start -- --view=record |
| Owned handoff | ready-to-record | 3/3 owned proof handoff(s) ready to record |
| Owned case studies | delivery-proof-ready | 3/3 delivery-proof ready; 0/3 business-metric ready; 0 need metric |
| 11/10 proof | not-11-10-yet | 3/10 full-pass areas |

## Funnel

| Metric | Count |
|---|---:|
| Scored | 5 |
| Looms | 0 |
| Sends | 0 |
| Replies | 0 |
| Calls | 0 |
| Closed | 0 |
| Clients | 3 |
| Due follow-up | 0 |

## Next / Pending Actions

| Priority | Action | Command | Why |
|---|---|---|---|
| P0 | Record the scored Looms. This is the current money bottleneck. | `npm run growth:start -- --view=record` | Current bottleneck |
| P2 | Owned product business metrics: 0/3 packet(s) have business metrics | `npm run owned:metrics -- --from-clipboard` | Full case-study blocker |
| P1 | Sender setup: missing physical postal address; DKIM selector not configured. Use contact form or DM for now. | `npm run send:guide` | Sender trust blocker |
| P1 | Client: ai-converter - Sprint acceptance checklist is not complete | `npm run owned:handoff` | Pending action |
| P1 | Client: five-to-nine-0509 - Sprint acceptance checklist is not complete | `npm run owned:handoff` | Pending action |
| P1 | Client: siterep - Sprint acceptance checklist is not complete | `npm run owned:handoff` | Pending action |
| P0 | Prospect: LayerLogix - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox. | `npm run growth:start -- --view=record` | Pending action |
| P0 | Prospect: PROTBYTE - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox. | `npm run growth:start -- --view=record` | Pending action |
| P0 | Prospect: Sagiss - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox. | `npm run growth:start -- --view=record` | Pending action |
| P0 | Prospect: Scorpion Technology - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox. | `npm run growth:start -- --view=record` | Pending action |
| P0 | Prospect: Stradiant - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox. | `npm run growth:start -- --view=record` | Pending action |
| P0 | Task: **Record first 5 Loom audits** - LayerLogix, PROTBYTE, Sagiss, Scorpion Technology, and Stradiant now have recording scripts; run `prospect:rehearsal -- --limit=5`, use `market:proof-cockpit`, then run `market:after-recording -- --from-clipboard` with the Loom URLs. | `npm run prospect:rehearsal -- --limit=5` | Open task |
| P0 | Task: **Fill owned-product business metrics** - live public delivery metrics are now filled; paste one product analytics or sales metric per owned product with `npm run owned:metrics -- --from-clipboard` before calling AI Converter, SiteRep, and 0509 full business case studies. | `npm run owned:metrics -- --from-clipboard` | Open task |
| P0 | Task: **Complete owned-startup handoff Loom acceptance** - AI Converter, SiteRep, and 0509 now have source-reviewed claims and scorecards; run `npm run owned:handoff`, record the real handoff Looms, then paste the batch sheet into `npm run owned:handoff-complete -- --from-clipboard --reviewer="Nish"`. | `npm run owned:handoff` | Open task |

## To-Do List

| Bucket | Priority | Task | Command |
|---|---|---|---|
| Active | P0 | **Record first 5 Loom audits** - LayerLogix, PROTBYTE, Sagiss, Scorpion Technology, and Stradiant now have recording scripts; run `prospect:rehearsal -- --limit=5`, use `market:proof-cockpit`, then run `market:after-recording -- --from-clipboard` with the Loom URLs. | `npm run growth:start -- --view=record` |
| Active | P0 | **Fill owned-product business metrics** - live public delivery metrics are now filled; paste one product analytics or sales metric per owned product with `npm run owned:metrics -- --from-clipboard` before calling AI Converter, SiteRep, and 0509 full business case studies. | `npm run owned:metrics -- --from-clipboard` |
| Active | P0 | **Complete owned-startup handoff Loom acceptance** - AI Converter, SiteRep, and 0509 now have source-reviewed claims and scorecards; run `npm run owned:handoff`, record the real handoff Looms, then paste the batch sheet into `npm run owned:handoff-complete -- --from-clipboard --reviewer="Nish"`. | `npm run owned:handoff` |
| Active | P0 | **Run market learning review after first send batch** - use `npm run market:learn` before changing lead fit, hook, first message, or channel. | `npm run market:learn` |
| Active | P0 | **Close first paid sprint** - use the buyer room, proposal, and follow-up sequence. | `npm run growth:start -- --view=sales` |
| Active | P0 | **Deliver first sprint** - create a client folder, run the sprint, and update the client brain. | `npm run retention:checkups` |
| Waiting On | P1 | **First client data** - waiting on paid client intake before measuring actual delivery friction. | `npm run retention:checkups` |
| Backlog | P2 | **Build intake form** - only after first client friction is visible. | `npm run client:new -- client-slug` |
| Backlog | P2 | **Export buyer room to PDF/site** - only after one buyer room has helped close or nearly close. | `npm run growth:start -- --view=sales` |
| Backlog | P2 | **Deepen weekly report automation** - add analytics ingestion after retained clients expose the real reporting pattern. | `npm run retention:checkups` |

## 11/10 Blockers

| Area | Evidence | Command |
|---|---|---|
| Sender trust | missing physical postal address; DKIM selector not configured | `npm run send:configure -- --physical-address="..." --dkim-selector=... --dry-run` |
| Market proof | 0/5 Looms, 0/5 sends, 0 replies | `npm run market:proof-cockpit` |
| Sales proof | 0 won sprint(s) with close package and won note | `npm run growth:start -- --view=sales` |
| Delivery proof | 0 external and 0 owned-startup ready client(s); approved claim folders: 0 external, 3 owned-startup | `npm run owned:handoff` |

## Dashboards

- Internal dashboard: `growth-brain/ops/internal-dashboard.html`
- Retention dashboard: `growth-brain/ops/retention-dashboard.html`
- Recording rehearsal: `prospects/recording-rehearsal-check.html`
- Sender setup: `growth-brain/ops/sender-setup-guide.html`
- Market proof cockpit: `growth-brain/ops/market-proof-cockpit.html`
- Market learning review: `growth-brain/ops/market-learning-review.html`
- Owned handoff cockpit: `growth-brain/ops/owned-handoff-loom-cockpit.html`
- Owned case studies: `growth-brain/ops/owned-product-case-studies.html`
- Owned live signals: `growth-brain/ops/owned-product-live-signals.html`
- Growth doctor: `growth-brain/ops/growth-doctor.md`
- Live metrics: `growth-brain/ops/live-metrics.md`
- Market parity: `growth-brain/ops/market-parity-readiness.md`
