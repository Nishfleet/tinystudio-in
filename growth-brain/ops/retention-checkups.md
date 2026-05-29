# Retention Checkups

Generated: 2026-05-29

This is the retention control surface. It should make weekly and monthly client checkups automatic to prepare, but it does not send anything automatically and never fakes proof.

## Summary

| Signal | Count |
|---|---:|
| Clients | 3 |
| Delivery-ready clients | 0 |
| Weekly reports ready | 3 |
| High-risk clients | 0 |
| Watch clients | 3 |
| Monthly review due now | 3 |

## Weekly Checkups

| Client | Delivery readiness | Weekly report | Client confirmation | Risk | Next action | Command |
|---|---|---|---|---|---|---|
| AI Converter | draft | ready | ready | watch | Record proof handoff before renewal talk: Sprint acceptance checklist is not complete | `npm run owned:handoff` |
| Five to Nine 0509 | draft | ready | ready | watch | Record proof handoff before renewal talk: Sprint acceptance checklist is not complete | `npm run owned:handoff` |
| SiteRep | draft | ready | ready | watch | Record proof handoff before renewal talk: Sprint acceptance checklist is not complete | `npm run owned:handoff` |

## Monthly Checkups

| Client | Monthly review | Current lane | Next action |
|---|---|---|---|
| AI Converter | due | Landing page and conversion path | Run renewal review: npm run client:renewal -- clients/ai-converter |
| Five to Nine 0509 | due | Offer clarity and landing page conversion path | Run renewal review: npm run client:renewal -- clients/five-to-nine-0509 |
| SiteRep | due | Product positioning and proof-led website flow | Run renewal review: npm run client:renewal -- clients/siterep |

## Dashboard

Open `growth-brain/ops/retention-dashboard.html` for the visual dashboard.

## Operating Rules

- Weekly checkup: run this every Friday before client updates.
- Monthly checkup: the same run marks monthly reviews due during the final week of the month, or run with `--monthly`.
- Do not pitch renewal, expansion, or a higher retainer unless the weekly report shows shipped work, a learning, and a next test.
- Do not count retention proof until the client confirms they saw the delta, understood the value, approved the next action, and gave a continue/retain signal.
- Do not send automatically. Prepare the checkup, then make a human/client-safe decision.
