# Lane report: fix-send-package-retired-offer-contact-plan-lane1

## Item

> Active prospect send package still sells the retired 7-day sprint + 30-day action plan in 191

"191" is the 191 stale runtime files under prospects/ from commit aca231a (#112) that
still sold the retired offer. That PR extended `check-outbound-send-readiness` to scan
more surfaces, but the guard missed `contact-plan.md`, which `prepare-prospect-send.mjs`
embeds verbatim (Best Route section) into the active send package.

## Root cause (proven)

1. `prepare-prospect-send.mjs` reads `next-message.md`, `contact-plan.md`, `recording-notes.md`
   and embeds them into the generated `send-package.md`.
2. `check-outbound-send-readiness.mjs` (`send:check`) scanned next-message/send-package/
   recording-notes/outreach/reply-package/call-booked-package/close-package/loom-outline/
   recording-script/recording-sharpness-brief/audit-brief/buyer-room/loom-package —
   but NOT `contact-plan.md` (nor `value-calculator.md`, `sales-call-prep.md`, `lead-score.md`).
3. Repro: a fixture with a retired "7-Day Site Revenue Fault Sprint with a 30-day action
   plan" in `contact-plan.md` made `send:check` exit 0/pass and the send package was
   generated containing it. The guard's own comment said it mirrors "every runtime sheet
   that feeds" the send package — contact-plan was the missing sheet.

## Changes

- `scripts/lib/retired-offer-pattern.mjs` (new): canonical `RETIRED_OFFER_PATTERN`,
  shared by the guard and send prep (previously duplicated regexes).
- `scripts/check-outbound-send-readiness.mjs`: scan `contact-plan.md`,
  `value-calculator.md`, `sales-call-prep.md`, `lead-score.md`; use shared pattern.
- `scripts/prepare-prospect-send.mjs`: in-path guard — refuse to generate a send package
  when any input (next-message.md, contact-plan.md, recording-notes.md) still sells a
  retired offer, unless `--force` (explicit recovery).
- `scripts/test-outbound-send-readiness.mjs`: retired + canonical fixtures for the 4
  newly scanned files.
- `scripts/test-active-offer-projection.mjs`: proves send prep blocks a retired
  contact-plan.md and `--force` recovers.

## Verification

- `node scripts/test-outbound-send-readiness.mjs` -> pass
- `node scripts/test-active-offer-projection.mjs` -> pass
- All 16 non-retention CI checks pass; `npm test`'s only failure is the pre-existing
  `check-retention-automation` env failure (reproduced on clean origin/main via stash).
- Manual repro with SERVICE_REPO_ROOT fixture:
  - retired contact-plan.md -> send:check FAIL ("outbound package sells a retired offer"),
    prospect:send-prep exits blocked, no send-package.md written
  - clean contact-plan.md -> send prep generates normally

## PR

https://github.com/nish3451/tinystudio-in/pull/158
