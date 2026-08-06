# Lead Scoring Workflow

## Goal

Spend Loom time only on founder-led Managed IT/MSP/cybersecurity companies with enough pain, proof, and budget to buy the human-reviewed **The Website Correction** for one highest-leverage page.

## Fast Workflow

```bash
npm run growth:start -- --view=score
```

Score enough prospects to fill the next recording batch, add a specific reason for each score, copy the scoring sheet, then run:

```bash
npm run prospect:batch-score -- --from-clipboard
```

Run `npm run prospect:score-check` before trusting a recording batch. It catches stale Loom-duration labels, impossible scores, and score/priority mismatches in existing prospect folders.

## Fit Score

Score each prospect from 0-16.

| Signal | Points |
|---|---:|
| Live managed IT, MSP, or cybersecurity offer | 0-2 |
| Clear decision-maker or founder | 0-2 |
| High-value contract economics | 2 |
| Website has obvious architecture, copy, trust, or CTA leak | 2 |
| Reviews, case studies, or customer proof exist | 0-2 |
| Competitors are clearer than them | 0-2 |
| They can implement one page fix within the sprint or use a dev-ready handoff | 0-2 |
| The fix can be explained in a 2-3 minute Loom | 0-2 |

The batch scorer only accepts strict `N/16` rows. It rejects impossible scores, missing reasons, and priorities that do not match the score band.

## Priority

- `12-16`: record a Loom.
- `9-11`: keep in the list, research more.
- `0-8`: skip for now.

## Best Early Prospects

- Founder-led managed IT providers and regional MSPs.
- Founder-led MSSPs and cybersecurity consultancies.
- Founder-led compliance, vCISO, cloud-security, and incident-response providers with a live high-value offer.

## Disqualifiers

- No live offer.
- No reachable owner/operator.
- Not a founder-led Managed IT/MSP/cybersecurity company.
- No reviews, proof, pages, or existing context.
- Low-ticket business that cannot justify the sprint price.
- Prospect needs full brand strategy before performance fixes.
