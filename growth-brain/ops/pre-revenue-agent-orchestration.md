# Pre-Revenue Agent Orchestration Map

## Purpose

This is the TinyStudio version of the agent-agency diagram before revenue exists.

Parity here means the repo can run the same operating shape:

- one operator
- three human touchpoints
- intake
- routing
- parallel production lanes
- specialist escalation
- verifier QA
- handoff
- skills/library feedback
- background pool
- unit-economics tracking

It does not mean TinyStudio has paid-client proof, revenue, margin proof, or unattended delivery.

## Operator Touchpoints

The operator talks to the workflow only three times:

1. Intake approval: confirm the prospect/client, goal, proof boundary, and output destination.
2. QA decision: accept, revise, or escalate verifier findings.
3. Handoff approval: approve the client/prospect-facing package before anything is sent or published.

All other steps must be represented as agent-to-agent work packets, CLI outputs, or review artifacts.

## Diagram Translation

| Diagram Piece | TinyStudio Pre-Revenue Artifact | Current Boundary |
|---|---|---|
| Client request | Prospect/client folder plus intake, page snapshot, contact plan, Loom package, or client brain | Human confirms the target and goal |
| Intake | `prospect:new`, `client:new`, kickoff, client brain template, recording prep | No autonomous client intake form yet |
| Route | `growth-brain/ops/model-routing-standard.md` plus `agent:run` route section | Manual routing policy, not a live model router |
| Parallel production pool | `growth-brain/ops/parallel-production-pool.md` | Work packets are generated; model calls stay operator-run |
| Specialist | `growth-brain/ops/specialist-escalation-lane.md` | Escalation is explicit before high-risk output |
| Verifier agent | `growth-brain/ops/verifier-agent-gate.md` | Static checks plus human QA; no unreviewed approve step |
| QA / you | Claim safety, send readiness, client readiness, rehearsal, parity gates | Human-owned final decision |
| Handoff agent | `growth-brain/ops/handoff-agent-gate.md` | Prepares package only; does not send |
| Skills library | `growth-brain/ops/skills-library-feedback-loop.md` | Reusable lessons are saved as workflow docs, skills, proof-library rows, or client-brain updates |
| Background pool | `growth-brain/ops/background-agent-pool.md` | Draft/check/report only; no sends, publishing, spend, or approvals |
| Unit economics | `growth-brain/ops/unit-economics-ledger.md` | Ledger exists; no margin claim until paid rows exist |

## Default Run Shape

1. Intake packet is selected from a prospect, client, owned-product proof lane, or manual brief.
2. Route chooses one of four tiers: workhorse, specialist, utility, manual.
3. Production splits into four parallel packets:
   - K-1: leak map and proof source
   - K-2: copy/content/offer draft
   - K-3: trust/search/measurement review
   - K-4: tests, gates, and handoff readiness
4. Specialist reviews only the risky parts: claims, pricing, legal/compliance, data, security, paid media, or unfamiliar integrations.
5. Verifier checks every output against source facts, claim safety, readiness, measurement contract, and approval status.
6. Operator makes the QA decision.
7. Handoff package is generated for the prospect or client.
8. Useful learnings are saved back into the skills/library loop.
9. Background pool prepares next checkups, monitors, and reminders without touching external systems.
10. Unit-economics ledger receives a row only when real delivery data exists.

## Pre-Revenue Done State

Pre-revenue agent parity is ready when:

- `npm run agent:run` creates a current orchestration packet.
- `npm run agent:parity` passes.
- `npm run article:parity` passes.
- The public and internal docs keep revenue, margin, model-spend, paid-client proof, and autonomous-delivery claims blocked.
- The next commercial action is still the first proof batch, not more architecture.
