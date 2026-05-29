# Daily Sales Workflow

## Goal

Create enough high-quality conversations to close the first 1-3 paid sprints.

## Daily Minimum

Start with:

```bash
npm run growth:start
```

Then do the bottleneck it names.

Before the first client, the default daily minimum is:

- clear due follow-ups
- prep the recording batch with `npm run prospect:prep-recording -- --limit=5`
- record the current scored batch
- send every recorded Loom
- use contact forms or DMs when `send:setup` warns; email is blocked until setup is clean
- mark each send with the actual channel used
- work every reply or booked call from `prospects/sales-cockpit.html`
- score more prospects only after the current send batch is clear
- use `prospects/lead-scoring-cockpit.html` when scoring, add a specific reason for every row, then run `npm run prospect:batch-score -- --from-clipboard`
- prepare contact routes for the next batch with `npm run prospect:batch-contact-plan -- --limit=10`

## Prospect Sources

- Google Maps for local service businesses.
- LinkedIn for B2B service companies.
- Shopify stores with weak product pages.
- X/LinkedIn founders discussing SEO, ads, email, or conversion problems.
- Warm referrals from Nish's existing network.

## Daily Board

| Time | Action | Done |
|---|---|---|
| Morning | Run `npm run growth:start` |  |
| Morning | Clear due follow-ups or replies |  |
| Midday | Record the mission queue |  |
| Afternoon | Fill `prospects/loom-links.txt` and run batch send prep |  |
| Afternoon | Send from `prospects/outbox.html` and run batch sent |  |
| Evening | Check metrics and update next bottleneck |  |

## Stop Conditions

Stop researching and start selling when:

- the current scored batch has not been recorded and sent
- the prospect has a clear money page problem
- there is a visible decision-maker
- the business likely sells a high-ticket or repeat-purchase offer
- the Loom can show the leak in under 2 minutes
