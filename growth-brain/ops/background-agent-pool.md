# Background Agent Pool

## Purpose

The diagram has a background pool that monitors, maintains, and alerts while production work continues.

TinyStudio's pre-revenue pool is intentionally report-only. It prepares work and flags risks. It does not send, publish, approve, spend, or mutate client systems.

## Allowed Background Jobs

| Job | Cadence | Output | Boundary |
|---|---|---|---|
| Retention checkups | Weekly/monthly | `growth-brain/ops/retention-checkups.md` and dashboard | No client messages |
| Sender trust check | Before outbound sessions | Sender setup warnings and guide | No DNS or provider changes without approval |
| Market proof check | Before/after proof batch | Proof session status and next command | No send marking without sent proof |
| Market learning review | After sends/follow-ups | One-variable learning and next experiment | No channel/offer change without operator decision |
| Owned-product live signals | Weekly | Delivery signal notes for AI Converter, SiteRep, 0509 | Not revenue or paid-client proof |
| Skill/library review | After delivery | Learning destination recommendation | No private data copied into shared docs |

## Report-Only Contract

Every background job must state:

- source files read
- output files written
- warnings
- next human decision
- actions it refused to take

## Blocked Until Revenue Or Repeated Friction

- unattended client delivery
- auto-sending email, DMs, forms, or client messages
- automatic claim approval
- automatic web publishing
- ad budget changes
- hard-wired model routing with live external spend
- public case-study publication
