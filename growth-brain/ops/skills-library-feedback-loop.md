# Skills Library Feedback Loop

## Purpose

The diagram's skills library is the shared memory every agent reads before work starts and updates after delivery.

TinyStudio already has workflow docs, local skills, proof library exports, client brain folders, and owned-product proof packets. This file defines when a learning graduates into each layer.

## Library Layers

| Layer | Use For | Example |
|---|---|---|
| Client brain | Client-specific context, learnings, approved proof, weekly notes | `clients/client-slug/brain/weekly-learnings.md` |
| Proof library | Reusable patterns, objections, claim guardrails, delivery proof | `growth-brain/ops/proof-library.md` |
| Workflow docs | Repeatable service-line process | `growth-brain/workflows/*.md` |
| Repo skills | Repeatable Codex behavior worth invoking directly | `skills/*/SKILL.md` |
| Strategy docs | Bigger business rules and proof boundaries | `docs/strategy/*.md` |

## Promotion Rules

- One-off client fact stays in the client brain.
- Repeated objection or proof pattern goes into the proof library.
- Repeated sequence of steps becomes a workflow doc.
- Repeated Codex behavior with clear inputs and outputs becomes a repo skill.
- Repeated business rule becomes strategy or memory.

## After Every Delivery

The operator or workflow must capture:

- what worked
- what failed
- what source proved it
- what claim became safer
- what artifact should be reused
- what should not be repeated
- where the learning was saved

## Boundary

No secrets, private client data, raw credentials, or unapproved proof can enter shared workflow docs or repo skills.
