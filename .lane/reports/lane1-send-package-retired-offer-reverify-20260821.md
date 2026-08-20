# Lane 1 — Active prospect send package still sells the retired 7-day sprint + 30-day action plan: already fixed and merged on main (reverify 2026-08-21)

## Item

> [unreviewed-by-opus] Active prospect send package still sells the retired 7-day sprint + 30-day action plan in 191

## Verdict

**Already fixed and merged on main (PR #158).** Re-dispatched to this lane a
second time; re-verified the shipped fix against fresh `origin/main`
(`6c3d83f`, merge of #201). No source change is possible or needed; this run
documents the reverification.

## Evidence

- The shipped guard (`scripts/check-outbound-send-readiness.mjs`) is an
  ancestor of fresh `origin/main`:
  `git merge-base --is-ancestor 868d4c9 6c3d83f` → true.
- `868d4c9` ("fix(sales): block retired offer copy in send-package
  contact-plan inputs") and its parent `aca231a` ("fix(sales): gate every
  runtime record/send surface against retired offer copy", #112) both
  pre-date fresh main.
- Canonical retired-offer regex lives in
  `scripts/lib/retired-offer-pattern.mjs`:
  `7[- ]day (site|website) revenue (leak|fault) (fix )?sprint | 7[- ]day
   sprint | tangible revenue (leak|fault) sprint | 30[- ]day action plan
   | growth desk | three pages | founder sprint | $ 500`.
- `scripts/check-outbound-send-readiness.mjs` scans every active record/send
  surface (16 files): `next-message.md`, `send-package.md`,
  `recording-notes.md`, `outreach.md`, `reply-package.md`,
  `call-booked-package.md`, `close-package.md`, `loom-outline.md`,
  `recording-script.md`, `recording-sharpness-brief.md`, `audit-brief.md`,
  `buyer-room.md`, `loom-package.md`, `contact-plan.md`,
  `value-calculator.md`, `sales-call-prep.md`, `lead-score.md`.
- `scripts/prepare-prospect-send.mjs` (the active send-package generator)
  in-path blocks any of the three inputs that are embedded verbatim into
  the generated `send-package.md` — `next-message.md`, `contact-plan.md`,
  `recording-notes.md` — unless `--force` is passed for explicit recovery.
- `scripts/prepare-prospect-batch-send.mjs` delegates to
  `prepare-prospect-send.mjs` per row (line 207), so the in-path check
  covers the batch path too.

## Live verification on this checkout (branch off fresh `origin/main`)

- Per-sheet guard probe (11 retired fixtures, one per runtime sheet):
  `node scripts/check-outbound-send-readiness.mjs --strict` failed with
  `outbound package sells a retired offer` for every sheet. Sheets tested:
  `send-package.md`, `recording-notes.md`, `loom-outline.md`,
  `recording-script.md`, `next-message.md`, `recording-sharpness-brief.md`,
  `outreach.md`, `contact-plan.md`, `value-calculator.md`,
  `sales-call-prep.md`, `lead-score.md`. None leaked through.
- Send-prep in-path block: a fixture with a clean `next-message.md` /
  `recording-notes.md` and a retired `contact-plan.md` (7-Day Site Revenue
  Fault Sprint + 30-day action plan) produced
  `status: blocked` / `reason: Send package inputs still sell a retired
  offer` / `files: ["contact-plan.md"]` — no `send-package.md` written.
- `--force` recovery: with the same retired fixture, `prepare-prospect-send
  --approved --force` produced `status: ready` and wrote the package,
  proving the bypass remains explicit and recovery-only.
- Test suite:
  - `node scripts/test-outbound-send-readiness.mjs` →
    `Outbound send readiness fixture checks passed.` (exit 0)
  - `node scripts/test-active-offer-projection.mjs` →
    `Active offer projection checks passed.` (exit 0)
  - `node scripts/test-active-operator-surfaces.mjs` →
    `Active operator surface checks passed.` (exit 0)
- `git status --porcelaine` after all probes: only the pre-existing
  untracked `node_modules` symlink (the worktree symlink to
  `/home/nish/workspaces/products/tinystudio-in/node_modules`).

## Files

None changed (verification-only run). The prior fix (PR #158) touched:

- `scripts/check-outbound-send-readiness.mjs` — adds `contact-plan.md`,
  `value-calculator.md`, `sales-call-prep.md`, `lead-score.md` to the
  scanned file set; imports the canonical `RETIRED_OFFER_PATTERN`.
- `scripts/lib/retired-offer-pattern.mjs` (new) — single source of truth
  for the retired-offer regex.
- `scripts/prepare-prospect-send.mjs` — refuses to generate a send
  package when any of `next-message.md`, `contact-plan.md`,
  `recording-notes.md` still matches `RETIRED_OFFER_PATTERN` (bypass via
  `--force`).
- `scripts/test-outbound-send-readiness.mjs` — adds retired + canonical
  fixtures for the four newly scanned files.
- `scripts/test-active-offer-projection.mjs` — proves the in-path block
  blocks a retired `contact-plan.md` and `--force` recovers.

PR: <https://github.com/nish3451/tinystudio-in/pull/158>
