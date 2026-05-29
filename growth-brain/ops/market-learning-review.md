# Market Learning Review

Generated: 2026-05-29

## Verdict

needs-first-proof-batch

No learning loop can be trusted before the first 5 Looms are recorded, sent, and marked sent.

## Next Command

```bash
npm run growth:start -- --view=record
```

## Funnel Snapshot

| Metric | Count |
|---|---:|
| Scored | 5 |
| Looms recorded | 0 |
| Sends | 0 |
| Replies | 0 |
| Calls | 0 |
| Won | 0 |
| Lost | 0 |
| Due follow-ups | 0 |
| Waiting follow-ups | 0 |
| Market proof status | needs-recording |

## Channel Mix

| Channel | Sends | Share |
|---|---:|---:|
| - | 0 | 0% |

## Sent Batch Review

| Prospect | Stage | Channel | Next Follow-Up | Leak | First Fix |
|---|---|---|---|---|---|
| - | - | - | - | No sent prospects yet. | - |

## Replies, Objections, And Decisions

| Date | Prospect | Action | Note |
|---|---|---|---|
| - | - | - | No reply, loss, pause, or decision notes captured yet. |

## Next Batch Experiment

Change one variable at a time. Do not scale volume until the first batch has Loom/send/follow-up proof.

| Area | Status | Next |
|---|---|---|
| Lead fit | hold | Only change the prospect type after the first completed send/follow-up loop shows low reply quality. |
| Audit hook | hold | Keep one visible leak, but make the first 10 seconds more specific to the buyer's category and pain. |
| First message | hold | Keep the Loom useful, shorten the ask, and ask whether they want the exact page structure rather than a broad sprint. |
| Send channel | watch | Compare reply quality by contact form, DM, LinkedIn, X, phone, mixed, other, or email only after sender setup is clean. |

## Rules

- No reply-rate conclusion before at least 5 real sent touches and due follow-ups are complete.
- No market-proof claim until `npm run market:proof-check` reaches `sent-proof-captured`.
- No sales-proof claim until a reply becomes a call, close package, and won sprint.
- Use `prospects/followup-cockpit.html` for due follow-ups before judging a batch.
- Every lost or paused prospect needs a note so the next batch learns something.
