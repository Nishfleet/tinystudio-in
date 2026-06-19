# Owned Startup Proof Review

Generated: 2026-06-19

## Rule

Approve only claims with found or confirmed source evidence. Owned-startup proof can prove TinyStudio delivery discipline, but it still does not prove external demand, paid close rate, or paid-client retention.

## Summary

| Area | Count |
|---|---:|
| Clients | 3 |
| Claims | 6 |
| Source-ready claims | 6 |
| Approved claims | 6 |
| Pending claims | 0 |
| Client folders ready | 0 |
| Tangible improvement rows | 3 |

## Tangible Improvement Review

This is the wedge: every client should see a concrete before/after movement, the value it created, and the next measurement. These owned-startup rows prove TinyStudio delivery discipline only; do not use them as external paid-client proof yet.

| Client | Before | After | Client-Visible Value | Next Measurement | Use Externally? |
|---|---|---|---|---|---|
| clients/ai-converter | Broad homepage promise: preview private files before checkout across many file types. | Sharper accounting path: bank statement PDFs in, accounting CSV out, with Wave, QuickBooks, Xero, and spreadsheet routes visible. | The buyer can understand the most valuable use case faster, while the page keeps clear limits around accounting imports and review. | Compare visits, upload starts, preview completions, and checkout starts on accounting pages versus the broad homepage path. | internal/owned proof only until external paid-client proof exists |
| clients/siterep | A website assistant can drift into broad AI support claims that buyers cannot verify. | The product contract is tighter: source-backed answers, lead capture, owner inbox, proof gaps, source repair, and gated customer activation. | The buyer sees a safer product promise with concrete owner workflows instead of vague AI replacement language. | Track widget install proof, public lead capture proof, proof-gap tickets, and source repair completion. | internal/owned proof only until external paid-client proof exists |
| clients/five-to-nine-0509 | Competitor monitoring could read like generic market intelligence without a retention proof loop. | The product promise is concrete: see what changed, with proof, through watchlists, proof capture, daily briefs, weekly digests, reports, and share/export flows. | The buyer gets decision-ready competitor changes with proof trails instead of another dashboard to inspect manually. | Track fresh monitoring runs, proof captures, sent digests, and weekly report usefulness before broad launch. | internal/owned proof only until external paid-client proof exists |

## Claim Review Queue

| Client | # | Source Status | Current Status | Claim | Source Evidence | Dry-Run Approval Command | Dry-Run Remove Command |
|---|---:|---|---|---|---|---|---|
| clients/ai-converter | 1 | source-found | approved | AI Converter has a preview-first bank statement PDF to accounting CSV path. | public/llms.txt: found<br>public/bank-statement-converter-for-bookkeepers/index.html: found<br>aiconverter-accounting-wedge-desktop.png: missing | `npm run client:proof-review -- clients/ai-converter --approve=1 --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/ai-converter --remove=1 --reviewer="Nish" --dry-run` |
| clients/ai-converter | 2 | source-found | approved | AI Converter keeps accounting import promises bounded by review and software-specific CSV routes. | public/bank-statement-converter-for-bookkeepers/index.html: found | `npm run client:proof-review -- clients/ai-converter --approve=2 --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/ai-converter --remove=2 --reviewer="Nish" --dry-run` |
| clients/siterep | 1 | source-found | approved | SiteRep is positioned around source-backed answers, lead capture, owner-visible repair loops, and gated customer activation. | public/llms.txt: found<br>tests/sitegpt-parity.test.js: found<br>tests/launch-readiness.test.js: found | `npm run client:proof-review -- clients/siterep --approve=1 --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/siterep --remove=1 --reviewer="Nish" --dry-run` |
| clients/siterep | 2 | source-found | approved | SiteRep's safer promise is not full helpdesk, CRM, or compliance replacement. | tests/launch-readiness.test.js: found<br>tests/reliability-belt.test.js: found | `npm run client:proof-review -- clients/siterep --approve=2 --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/siterep --remove=2 --reviewer="Nish" --dry-run` |
| clients/five-to-nine-0509 | 1 | source-found | approved | Five to Nine turns competitor search into a recurring proof-backed monitoring, digest, and decision loop. | README.md: found<br>docs/launch-readiness.md: found<br>tests/proof-first-pipeline.test.ts: found | `npm run client:proof-review -- clients/five-to-nine-0509 --approve=1 --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/five-to-nine-0509 --remove=1 --reviewer="Nish" --dry-run` |
| clients/five-to-nine-0509 | 2 | source-found | approved | Five to Nine's retention product is the recurring proof loop, not just another passive dashboard. | docs/launch-readiness.md: found<br>tests/proof-evals.test.ts: found | `npm run client:proof-review -- clients/five-to-nine-0509 --approve=2 --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/five-to-nine-0509 --remove=2 --reviewer="Nish" --dry-run` |

## Bulk Review Commands

Use these only after checking the source snippets. They are shortcuts for source-ready owned proof, not permission to approve weak claims.

| Client | Source-Ready | Pending | Readiness | Bulk Dry Run | Apply After Review | Acceptance Dry Run | Handoff Cockpit |
|---|---:|---:|---|---|---|---|---|
| clients/ai-converter | 2 | 0 | draft | `npm run client:proof-review -- clients/ai-converter --approve=all --approve-scorecard --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/ai-converter --approve=all --approve-scorecard --reviewer="Nish"` | `npm run client:acceptance -- clients/ai-converter --dry-run` | `npm run owned:handoff` |
| clients/siterep | 2 | 0 | draft | `npm run client:proof-review -- clients/siterep --approve=all --approve-scorecard --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/siterep --approve=all --approve-scorecard --reviewer="Nish"` | `npm run client:acceptance -- clients/siterep --dry-run` | `npm run owned:handoff` |
| clients/five-to-nine-0509 | 2 | 0 | draft | `npm run client:proof-review -- clients/five-to-nine-0509 --approve=all --approve-scorecard --reviewer="Nish" --dry-run` | `npm run client:proof-review -- clients/five-to-nine-0509 --approve=all --approve-scorecard --reviewer="Nish"` | `npm run client:acceptance -- clients/five-to-nine-0509 --dry-run` | `npm run owned:handoff` |

## Next

1. Run each dry-run approval command, or the bulk dry-run command, for the claims Nish believes are true.
2. Remove or rewrite any claim that feels too broad.
3. Apply approvals without `--dry-run` only after reviewing the evidence.
4. Run `npm run client:acceptance -- clients/client-slug --dry-run` before final handoff.
5. Run `npm run owned:handoff` to record the tangible-improvement handoff Looms.
