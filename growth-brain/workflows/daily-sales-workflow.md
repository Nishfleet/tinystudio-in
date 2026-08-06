# Daily Sales Workflow

## Goal

Create enough high-quality conversations to close the first 1-3 paid human-reviewed **The Website Corrections** with founder-led Managed IT/MSP/cybersecurity companies. Every invitation is for one highest-leverage page.

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

- LinkedIn searches for founder-led managed IT providers, MSPs, MSSPs, and cybersecurity consultancies.
- Public MSP, Microsoft partner, cybersecurity, and compliance-provider directories.
- X/LinkedIn founders discussing a visible website, trust, positioning, or lead-path problem.
- Warm referrals to founder-led Managed IT/MSP/cybersecurity companies.

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
- the company sells a high-value managed IT, MSP, or cybersecurity offer
- the Loom can show the leak in under 2 minutes
