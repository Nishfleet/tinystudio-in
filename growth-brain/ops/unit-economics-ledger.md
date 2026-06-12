# Unit Economics Ledger

## Purpose

The solo AI agency article makes unit economics central: recurring revenue only works if delivery cost stays low and founder review time stays bounded.

TinyStudio must track this from the first real sprint instead of claiming margins from vibes.

## Current Status

Pre-customer / pre-revenue. No TinyStudio revenue, gross margin, model spend, or paid-client delivery cost claim is approved yet.

## What To Track Per Sprint

| Field | Required |
|---|---|
| Client / prospect | Yes |
| Offer tier | Yes |
| Price or approval value | Yes |
| Scope | Yes |
| Intake time | Yes |
| Production tool/model route | Yes |
| Production time | Yes |
| Review time | Yes |
| Rework count | Yes |
| Direct software/model cost | Yes |
| External contractor cost | Yes |
| Delivery artifact | Yes |
| Client-visible value | Yes |
| Measurement signal | Yes |
| Next check date | Yes |
| Retention / continuation signal | When available |

## Agent Parity Fields

When `agent:run` is used for real paid work, add these to the sprint row:

| Field | Required |
|---|---|
| Intake approval time | Yes |
| Route tier | Yes |
| Parallel lanes used | Yes |
| Specialist escalations | Yes |
| Verifier status | Yes |
| Handoff approval time | Yes |
| Background checks used | Yes |
| Skills/library update destination | Yes |

## Cost Buckets

- Model or agent runtime
- Hosting and infrastructure
- Design/reference tools
- Browser/snapshot/research tools
- Email/sender/tools
- Payment processing
- Contractor or specialist help
- Founder review time

## Margin Rule

Do not publish or sell with a margin number until the ledger has real paid-client rows.

Internally, use the ledger to answer:

- Did this sprint stay bounded?
- Which repeated step should become a workflow?
- Which step required too much human judgment?
- Which tool/model route was too expensive or too weak?
- Is the monthly continuation still profitable after review time?

## First Real Row Template

| Client | Offer | Price | Intake | Production Route | Production Time | Review Time | Direct Cost | Rework | Value Signal | Next Check |
|---|---|---:|---:|---|---:|---:|---:|---:|---|---|
|  | Tangible Revenue Leak Sprint |  |  | Workhorse / Specialist / Utility / Manual |  |  |  |  |  |  |

## Claim Boundary

Allowed before customers:

- TinyStudio has a unit-economics ledger and will track real cost/time from first paid sprint.
- TinyStudio's offer is designed to be systemized before adding headcount.

Blocked before customers:

- Any claim of 90% margin.
- Any claim of under-$300/month delivery cost.
- Any claim that AI replaced a team for TinyStudio.
- Any claim that TinyStudio can carry a specific number of clients solo.
