# Claim-Proof Ledger

Use this for every client-facing claim.

Run `npm run claims:check` before sending outbound or client-facing material.

## Rule

If a claim cannot be proven, it cannot be shipped.

## Ledger

| Claim | Source | Proof Type | Approved By | Status |
|---|---|---|---|---|
|  |  | review / analytics / client / public source / screenshot |  | draft |

## Proof Types

- Client-provided fact
- Public website fact
- Review/testimonial
- Analytics screenshot
- Search Console screenshot
- Ad/email platform screenshot
- Competitor observation
- Nish judgment, labeled as judgment

## Approval Status

- `draft`
- `needs-client-confirmation`
- `approved`
- `removed`

## Never Ship Without Approval

- revenue numbers
- customer counts
- certifications
- guarantees or policies
- compliance claims
- medical/legal/financial claims
- competitor comparisons
- before/after claims
