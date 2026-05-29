# Lead Scoring Workflow

## Goal

Spend Loom time only on prospects with enough pain, proof, and budget to buy the sprint.

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
| Live service/product offer | 0-2 |
| Clear decision-maker or founder | 0-2 |
| High-ticket or repeat-purchase economics | 2 |
| Website has obvious architecture, copy, trust, or CTA leak | 2 |
| Reviews, case studies, or customer proof exist | 0-2 |
| Competitors are clearer than them | 0-2 |
| They are already spending on SEO, ads, email, or content | 0-2 |
| The fix can be explained in a 2-3 minute Loom | 0-2 |

The batch scorer only accepts strict `N/16` rows. It rejects impossible scores, missing reasons, and priorities that do not match the score band.

## Priority

- `12-16`: record a Loom.
- `9-11`: keep in the list, research more.
- `0-8`: skip for now.

## Best Early Prospects

- Managed IT and cybersecurity/compliance firms.
- Accountants, bookkeepers, tax advisors.
- Dental, med spa, clinic, and specialist health practices.
- Home service companies with high-value jobs.
- Legal and financial service firms with service-page confusion.
- Ecommerce stores with real reviews and weak product pages.

## Disqualifiers

- No live offer.
- No reachable owner/operator.
- No reviews, proof, pages, or existing context.
- Low-ticket business that cannot justify the sprint price.
- Prospect needs full brand strategy before performance fixes.
