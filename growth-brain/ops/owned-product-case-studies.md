# Owned-Product Case Studies

Generated: 2026-06-01

## Rule

Owned startup proof = delivery proof. External client proof = market proof. Use these packets to show our method honestly, not to imply client results.

## Moat Story

We do not sell vague marketing. We run measurable improvement loops on real products, including our own, and show the proof every week.

## Scoreboard

| Area | Count |
|---|---:|
| Owned products | 3 |
| Delivery-proof ready | 3 |
| Business-metric case-study ready | 0 |
| Need current metric | 0 |
| Need business metric | 3 |

## Packets

| Product | Status | Baseline Screenshot Sources | Current Metrics | Business Metrics | Public Delivery Metrics | Measurement Contract | Metric Capture Row | Packet |
|---|---|---:|---:|---:|---:|---|---|---|
| AI Converter | delivery-proof-ready | 2 | 1 | 0 | 1 | complete | `clients/ai-converter|Upload starts|LAST_REAL_VALUE|CURRENT_REAL_VALUE|Source: product analytics export after accounting wedge` | `clients/ai-converter/owned-product-proof-packet.md` |
| SiteRep | delivery-proof-ready | 1 | 1 | 0 | 1 | complete | `clients/siterep|Widget installs|LAST_REAL_VALUE|CURRENT_REAL_VALUE|Source: product analytics or install log after source-backed positioning` | `clients/siterep/owned-product-proof-packet.md` |
| Five to Nine 0509 | delivery-proof-ready | 4 | 1 | 0 | 1 | complete | `clients/five-to-nine-0509|Fresh monitoring runs|LAST_REAL_VALUE|CURRENT_REAL_VALUE|Source: product analytics or run log after proof-loop positioning` | `clients/five-to-nine-0509/owned-product-proof-packet.md` |

## Outbound-Safe Proof Lines

- We run measurable improvement loops on our own products every week too. AI Converter is owned-product proof: before/after, proof source, client-visible value, and next measurement. It is not a client-result claim.
- We run measurable improvement loops on our own products every week too. SiteRep is owned-product proof: before/after, proof source, client-visible value, and next measurement. It is not a client-result claim.
- We run measurable improvement loops on our own products every week too. Five to Nine 0509 is owned-product proof: before/after, proof source, client-visible value, and next measurement. It is not a client-result claim.

## Business Metric Capture Sheet

Replace LAST_REAL_VALUE and CURRENT_REAL_VALUE with observed analytics or sales values only.

```text
clients/ai-converter|Upload starts|LAST_REAL_VALUE|CURRENT_REAL_VALUE|Source: product analytics export after accounting wedge
clients/siterep|Widget installs|LAST_REAL_VALUE|CURRENT_REAL_VALUE|Source: product analytics or install log after source-backed positioning
clients/five-to-nine-0509|Fresh monitoring runs|LAST_REAL_VALUE|CURRENT_REAL_VALUE|Source: product analytics or run log after proof-loop positioning
```

Then run:

```bash
npm run owned:metrics -- --from-clipboard
```

## Next Actions

- All owned-product packets have a current metric. Keep updating them weekly.
- Add product analytics or sales metrics before calling these full business case studies. Public delivery checks do not count as business metrics.
- Keep the owned-product label in every outbound Loom.
- Keep external market proof separate: replies, sales calls, closes, and paid-client retention still need real external evidence.
