# Command Center

Open this first each working day.

Run:

```bash
npm run growth:start
```

This refreshes the mission and opens the daily browser page.

For focused startup pages:

```bash
npm run growth:start -- --view=record
npm run growth:start -- --view=score
npm run growth:start -- --view=send
npm run growth:start -- --view=followup
npm run growth:start -- --view=sales
```

If you only want to generate files without opening the browser:

```bash
npm run growth:start -- --no-open
```

Before a recording block, prep the whole batch:

```bash
npm run prospect:prep-recording -- --limit=5
```

This checks the sites, refreshes live page snapshots, rebuilds the recording scripts, and updates the recording queue, cockpit, teleprompter, and mission page.

To refresh without opening anything else, run:

```bash
npm run growth:mission
```

After recording a batch, copy the Loom-link sheet from the mission page and run:

```bash
npm run market:after-recording -- --from-clipboard
```

This updates Loom URLs, preserves proof notes, prepares send packages, refreshes the outbox, and refreshes the proof cockpit without marking anything sent.

After scoring a batch, copy the scoring sheet and run:

```bash
npm run prospect:batch-score -- --from-clipboard
```

This refreshes the daily mission, current bottleneck, recording queue, Loom-link sheet, metrics, proof library, and browser pages.

Then run:

```bash
npm run growth:today
```

This shows the live next actions from `TASKS.md`, `prospects/`, and `clients/`.

For a browser start screen, run:

```bash
npm run growth:cockpit
```

Check the live scoreboard:

```bash
npm run growth:metrics
```

When follow-ups are due, open the follow-up cockpit:

```bash
npm run prospect:followups
```

Check `Sent this follow-up` before copying a Mark Follow-Up command so the pipeline only advances after a real touch.

When a prospect replies or books a call, open the sales cockpit:

```bash
npm run prospect:sales-cockpit
```

## Today's One Job

Use the daily mission constraint. Pick one only if the mission is clear:

- Follow up if follow-ups are due.
- Close if calls or open proposals exist.
- Record Looms if scored prospects are waiting.
- Send if Looms exist but messages are not sent.
- Score prospects only after the current recording/send batch is clear.
- Deliver or retain once a paid client exists.

If there is no paid client yet, default to prospects, Looms, and follow-up.

## Daily Scoreboard

| Metric | Target | Actual |
|---|---:|---:|
| Prospects added | 20 |  |
| Leads scored | 10 |  |
| Looms recorded | 3 |  |
| Messages sent | 3 |  |
| Follow-ups sent | 5 |  |
| Calls booked | 1 |  |
| Sprints closed |  |  |

## Decision Rule

- If `growth:mission` names a bottleneck, do that first.
- If Looms are not being recorded, stop researching.
- If messages are not being sent, stop editing templates.
- If calls are not booking, improve lead fit or Loom hook.
- If clients are not retaining, improve weekly value visibility.

## End Of Day Review

- What shipped?
- What got a reply?
- What was avoided?
- What should be repeated tomorrow?
- What should be cut?
