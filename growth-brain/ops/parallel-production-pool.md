# Parallel Production Pool

## Purpose

This file turns the diagram's parallel agent pool into TinyStudio work packets.

Before revenue, this is not an always-on model swarm. It is a repeatable packet format that lets the operator or Codex run several production lanes without losing source truth, proof boundaries, or review control.

## Pool Contract

Every production run splits into four lanes.

| Lane | Job | Default Inputs | Output | Must Not Do |
|---|---|---|---|---|
| K-1 Leak Map | Find the visible buyer-facing leak and source evidence | Page snapshot, client brain, proof context, competitor notes | Leak map, before state, proof source | Invent performance impact |
| K-2 Content | Draft copy, offer, email, SMS, or Loom wording | Client brain, claim ledger, voice, offer, K-1 leak | Draft asset and approval-needed claims | Publish, send, or add unsupported claims |
| K-3 Trust | Check search trust, page structure, measurement, and distribution | Site architecture notes, search trust layer, analytics notes | Trust/measurement review and next check | Promise rankings or AI visibility outcomes |
| K-4 Tests | Check gates, readiness, handoff, and learning capture | Quality gates, send readiness, client readiness, proof ledger | Test results, blockers, handoff readiness | Mark work approved without QA |

## Routing Rule

- Routine production starts in the workhorse lane.
- Formatting and table cleanup can use utility.
- Anything involving pricing, legal/compliance, security, payments, private client data, claims, or final recommendations escalates to specialist or manual.
- Every lane writes a source note and a confidence note.

## Output Format

Each lane must produce:

- source inputs used
- draft output
- assumptions
- proof gaps
- approval-needed claims
- measurement hook
- next command or handoff artifact

## Pre-Revenue Boundary

This pool prepares work. It does not call live client tools, send messages, change websites, manage ad spend, approve claims, or update billing.
