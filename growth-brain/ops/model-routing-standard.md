# Model And Task Routing Standard

## Purpose

TinyStudio uses AI as a delivery system, not as an unreviewed publisher. The routing rule is simple: match the tool/model to the risk of the task, then keep human judgment on intake, QA, client relationship, and final approval.

This document is the internal answer to the solo AI agency article's model-stack idea. It does not claim a specific vendor, price, margin, or quality result.

## Routing Tiers

| Tier | Use For | Human Gate |
|---|---|---|
| Workhorse | Routine production: leak maps, rewrite options, search-trust notes, ad/email drafts, competitor summaries, checklist generation, and repeatable code or workflow updates | Operator reviews before client-facing use |
| Specialist | High-stakes architecture, security-sensitive handling, legal-sensitive copy, pricing/claims, payment/billing, customer data, or novel work where a wrong answer is expensive | Operator must review and approve |
| Utility | Formatting, normalization, boilerplate, simple summaries, fixture generation, and low-risk cleanup | Spot check or automated check |
| Manual | Relationship judgment, sales calls, claim approval, final page approval, client-sensitive interpretation, and any task the system cannot verify | Human-only |

## Default Flow

1. Intake turns the client request into a short spec.
2. `agent:run` turns that spec into a route packet with parallel production lanes.
3. The workhorse tier drafts the repeatable production work.
4. The specialist tier is used only when failure cost is high.
5. Utility tasks stay cheap and mechanical.
6. The operator reviews output against the spec, proof source, verifier notes, and client context.
7. Nothing gets sent, published, approved, or billed automatically.

## Cost Discipline

The goal is high margin through systemized delivery, but TinyStudio must not publish unverified inference-cost, margin, or model-quality claims.

Track real cost and time once paid client work exists:

- task type
- tool/model used
- input source
- output artifact
- review time
- failure/rework notes
- client-visible value
- next measurement

## When To Escalate

Escalate from workhorse to specialist/manual when the task involves:

- client private data
- security, auth, payments, or production access
- legal/compliance-sensitive claims
- pricing or guarantee language
- unfamiliar integrations
- final client-facing recommendations
- anything that cannot be checked by tests, source evidence, or human review

## Done State

Model routing is ready for a paid sprint only when every service workflow has:

- a clear input spec
- a default production path
- a specialist/manual escalation rule
- a review checklist
- a proof source
- a measurement contract
- a no-auto-send/no-auto-publish boundary
