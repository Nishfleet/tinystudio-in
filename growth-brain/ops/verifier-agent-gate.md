# Verifier Agent Gate

## Purpose

The verifier gate is the pre-revenue replacement for a human team of editors, QA analysts, and delivery managers.

It checks whether production output is safe to put in front of Nish, a prospect, or a client.

## Required Checks

| Check | Source |
|---|---|
| Claim safety | `npm run claims:check` |
| Send readiness | `npm run send:check` |
| Sender trust | `npm run send:setup` |
| Prospect readiness | `npm run prospect:check -- prospects/prospect-slug` |
| Recording quality | `npm run prospect:rehearsal -- --limit=5` |
| Market proof session | `npm run market:proof-check` |
| Client readiness | `npm run client:check -- clients/client-slug` |
| Weekly report quality | `npm run client:weekly-check -- clients/client-slug` |
| Market parity | `npm run market:parity` |
| Article/diagram parity | `npm run article:parity` and `npm run agent:parity` |

## Verifier Decision

The verifier returns one of four states:

- `pass`: safe for operator QA.
- `revise`: draft can continue after source, copy, proof, or measurement fixes.
- `escalate`: specialist/manual review is required.
- `block`: output cannot be used because proof, sender setup, legal/compliance, privacy, or readiness is missing.

## Review Standard

Every output must answer:

- What source supports this?
- What changed?
- Why does it matter to this buyer or client?
- What proof is approved?
- What claim still needs approval?
- What measurement checks this next?
- What command or artifact continues the workflow?

## Hard Boundary

The verifier does not approve claims, send messages, publish client assets, mark payment complete, or declare market proof. It prepares the operator QA decision.
