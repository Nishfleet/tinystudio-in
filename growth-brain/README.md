# TinyStudio service operating kit

This folder powers one human-reviewed managed service: the **The Website Correction**.

## Exact offer

- Buyer: founder-led Managed IT/MSP/cybersecurity companies with a live site and high-value offer.
- Pilot: first 3 clients at exactly **$1,000 founder pilot**.
- Scope: one highest-leverage page.
- Delivery: leak map, rewrite or redesign, one implementation pass or dev-ready handoff, search-trust basics, before/after proof, Loom, measurement plan, one revision, and 14-day implementation tracking.
- Day 0: payment, required context, approval owner, and implementation owner must all be recorded. Client delay pauses the clock.
- Promise boundary: no revenue, ranking, ROAS, conversion, booked-call, or sales-volume guarantees.

## Autonomous preparation

Automation prepares research, drafts, QA, packages, and routing. Humans review fit, claims, client-facing work, delivery/acceptance, and renewal. Automation never sends, publishes, spends, approves, accepts, or renews.

Run the service through:

```bash
npm run service:import -- application.json
npm run service:queue -- --mode=prepare
npm run service:decide -- APPLICATION_ID --decision approve --reviewer "Reviewer" --note "Fit reviewed"
npm run service:queue -- --mode=apply
npm run service:day0 -- APPLICATION_ID --payment-evidence "paid: invoice INV-123" --required-context "..." --approval-owner "..." --implementation-owner "..."
```

Payment evidence must use an affirmative status plus a reference, such as `paid: invoice INV-123`; pending, unpaid, failed, or ambiguous text cannot start Day 0. Paid Day 0 creates the canonical client scaffold. `client:new -- APPLICATION_ID` is repair-only for that existing paid record; it never creates a client from a name or an outbound prospect. The fourth paid Day 0 is blocked until a human reviews and implements a post-pilot offer.

The detailed contract is in `../PRODUCT.md`; delivery lives in `sprint-checklist.md`, `delivery-template.md`, and `workflows/client-sprint-workflow.md`.

## Evidence rule

Do not activate another package, recurring offer, or software product from internal templates or historical research. The software graduation evidence gate requires at least 10 paid sprints, the same problem in at least 7, at least 70% workflow repeatability, usefulness at least 8/10, approval at least 70%, recurring need, and at least 3 deposits or preorders.
