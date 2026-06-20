# Growth Doctor

Generated: 2026-06-20

## Status

Warning. The workflow can run, but sender setup needs attention before cold email.

## Current Bottleneck

Record the scored Looms. This is the current money bottleneck.

Target view: record

Recording prep: fresh

Recording rehearsal: ready (minimum 10/10)

Next command:

```bash
npm run growth:start -- --view=record
```

## Safety Checks

| Check | Status | Detail | Time |
|---|---|---|---:|
| Agency defaults | pass | passed | 88ms |
| Sender setup | warn | warn: 2 warning(s) | 418ms |
| Claim safety | pass | pass | 108ms |
| Send readiness | pass | pass | 77ms |

## Warnings

| Check | Rule | Detail |
|---|---|---|
| Sender setup | missing physical postal address | Commercial email needs a valid physical postal address. Use a business address, PO box, or private mailbox before cold email. |
| Sender setup | DKIM selector not configured | Set dkimSelector after enabling DKIM in the mail provider. No common DKIM selectors were found in DNS. |

Sender setup warnings: run `npm run send:configure -- --physical-address="..." --dkim-selector=... --dry-run` with real values before using cold email.

## Scoreboard

| Metric | Count |
|---|---:|
| Prospects total | 50 |
| Scored prospects | 5 |
| Looms recorded | 0 |
| Ready to send | 0 |
| Sends | 0 |
| Replies | 0 |
| Calls | 0 |
| Closed | 0 |
| Due follow-up | 0 |
| Clients | 3 |

## Today's Focus

- Client: ai-converter - Sprint acceptance checklist is not complete
- Client: five-to-nine-0509 - Sprint acceptance checklist is not complete
- Client: siterep - Sprint acceptance checklist is not complete
- Prospect: ByteMe Networks - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox.
- Prospect: IT Umbrella Group - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox.
- Prospect: Talos Cyber Solutions - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox.
- Prospect: Xentz Technologies - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox.
- Prospect: YPM IT Solutions - Record from the teleprompter, paste the Loom URL into market:after-recording, then send from the outbox.

## Rule

Do not build more system surface until the current bottleneck is worked.
