# Metrics Dashboard

Track only numbers that change decisions.

For the live version, run:

```bash
npm run growth:metrics
```

The generated scoreboard is `growth-brain/ops/live-metrics.md`.

For the concise owner dashboard with next actions, pending work, to-dos, retention risk, and 11/10 blockers, run:

```bash
npm run growth:dashboard
```

The private generated dashboard is `runs/internal-dashboard.html`.

## Sales Funnel

| Week | Prospects | Scored | Looms | Sends | Replies | Calls | Closed | Revenue |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|  |  |  |  |  |  |  |  |  |

## Conversion Rates

| Metric | Formula | Current |
|---|---|---:|
| Loom send rate | Looms / scored leads |  |
| Reply rate | Replies / sends |  |
| Call rate | Calls / replies |  |
| Close rate | Closed / calls |  |
| Revenue per Loom | Revenue / Looms |  |

## Delivery Metrics

| Metric | Target | Current |
|---|---:|---:|
| Sprint delivery days | 7 |  |
| Acceptance score | 4+ |  |
| Client response time | 2 business days |  |
| Approval blockers | 0-2 |  |

## Retention Metrics

| Metric | Target | Current |
|---|---:|---:|
| Weekly report sent | 100% |  |
| Health score | 8+ |  |
| Retainer conversion | 30%+ |  |
| Monthly retained revenue |  |  |
