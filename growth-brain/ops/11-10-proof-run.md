# 11/10 Proof Run

Generated: 2026-08-06

## Current Verdict

Not 11/10 yet. The internal system is useful, but the proof run below must be completed before making stronger claims.

Parity score: 5/10.

## Current Proof Blockers

| Area | Current Evidence | Required Proof |
|---|---|---|
| Sender trust | missing physical postal address; DKIM selector not configured | Run `npm run send:configure -- --physical-address="..." --dkim-selector=... --dry-run` with the real values, then apply it without `--dry-run`. Until then, use contact forms or DMs. |
| Market proof | 0/5 Looms, 0/5 sends, 0 replies | Record and send 5 approved Looms with leak, impact, fix, and ask notes. |
| Sales proof | 0 external client(s) with a validated application, human fit approval, and paid Day 0 | Capture at least 1 external consented application, human fit approval, and validated paid Day 0 record. |
| Delivery proof | 0 external paid client(s) ready with approved delivery; 0 with approved claims | Complete hash-bound human approval, implementation acceptance, approved claims, scorecard, and client readiness for that paid client. |
| Retention proof | 0 external paid client(s) with human-approved 14-day tracking evidence | Complete the 14-day tracking gate with hash-bound evidence and human-approved customer usefulness and acceptance. |

## Today’s Proof Run

1. Open the recording view:

```bash
npm run growth:start -- --view=record
```

2. Record the five-item batch in the recording view. The folders and approved notes are in `prospects/loom-links.txt`. Each Loom shows one leak, its buyer impact, the first fix, and one ask.

3. Paste the recorded Loom URLs into the post-recording prep command:

The prefilled sheet is in `prospects/loom-links.txt`; it is the single source for approved leak, impact, fix, and ask notes. After recording, copy five Loom URLs in the same order, then run:

```bash
npm run market:after-recording -- --from-clipboard
```

4. Check the proof run status:

```bash
npm run market:proof-check
```

5. Send from the outbox, using the route shown for each prospect. Recommended channel right now: contact form or DM.

Sender warnings: missing physical postal address; DKIM selector not configured.

6. After sending, use the outbox copied sent sheet:

```bash
npm run prospect:batch-sent -- --from-clipboard
```

7. Run the proof check again. It should say `sent-proof-captured` before the market proof blocker can clear.

## Proof Capture Rules

- Market proof is real only after 5 Looms are recorded, send packages are ready, messages are sent, and stages are marked sent.
- Email sent proof does not count while `npm run send:setup` still warns. Use contact forms, DMs, LinkedIn, X, phone, mixed, or other until sender trust is clean.
- Sales proof is real only after an external consented application, human fit approval, and validated paid Day 0 record exist.
- Delivery proof is real only after that paid client has a hash-bound human-approved delivery, implementation acceptance, approved claims, filled scorecard, completed acceptance checks, and clean readiness.
- Retention proof is real only after the 14-day tracking gate has hash-bound evidence and human-approved customer usefulness and acceptance.
- Do not claim better, comparable, 11/10, retained, or proven until `npm run market:parity` passes.

## Current Counts

| Metric | Count |
|---|---:|
| Scored prospects | 0 |
| Looms recorded | 0 |
| Sends | 0 |
| Replies | 0 |
| Calls | 0 |
| Closed | 0 |
| Clients ready | 0 |
