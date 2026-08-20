# Lane 1 report — operator copy doubled-article offerName re-verification

## Item

- [ ] [unreviewed-by-opus] Operator copy interpolates offerName "The Website Correction" after the word "the", producing doubled-article text ("the The Website Correction") in operator-facing output.

## Outcome

**Re-verification on 2026-08-20 confirms the item is fixed and live on `origin/main` (HEAD `6c3d83f`).**

The bug was fixed in PR #178 (`fix/operator-copy-offername-article-lane1-20260815`, merge `527f9619`, "fix(ops): stop operator copy from doubling the article before offerName") and the regression guard is still active. No code change is needed; this lane verifies the fix is still in place and that the regression guard still catches the bug.

## Verification on current `origin/main` (`6c3d83f`)

- `scripts/draft-client-kickoff.mjs` line 70 reads `Thanks for approving ${config.offerName}.` (no article; "approving The Website Correction.").
- `scripts/draft-loom-recording-script.mjs` lines 194 and 250 read `positions ${config.offerName} as the obvious next step.` and `run this as a human-reviewed ${config.offerName} for this one highest-leverage page.`
- `scripts/draft-recording-sharpness-brief.mjs` line 222 reads `CTA: Offer ${config.offerName} at ${price} without promising revenue, rankings, ROAS, or lift.`
- `scripts/draft-sales-call-prep.mjs` line 131 reads `... then close ${config.offerName}, a human-reviewed fixed-scope engagement.`
- `scripts/draft-prospect-message.mjs` line 121 reads `...the exact one-page scope for ${config.offerName}.`

All five operator-copy sites that previously doubled the article now interpolate the offer name directly. None of the fixed files source the offer name via `${config.offerName}` or `${FOUNDER_PILOT.offerName}` directly after the article `the`.

- `scripts/check-product-truth.mjs` lines 252-268 — the regression guard scans the five fixed scripts plus `scripts/lib/canonical-service-copy.mjs` and `scripts/lib/client-scaffold.mjs` and fails any source that still interpolates `(?:the|The)\s*${(config|FOUNDER_PILOT|day0).offerName}`.

## Commands run (all passed)

- `node --check` on the five fixed scripts and `check-product-truth.mjs` — OK.
- `node scripts/check-product-truth.mjs` — exit 0, `"status": "passed"`, no `failures`.
- `node scripts/check-agency-defaults.mjs` — exit 0 (canonical config has `offerName: "The Website Correction"`).
- Mutation test: re-introduced `the ${config.offerName}` in `draft-client-kickoff.mjs` approval line; `node scripts/check-product-truth.mjs` then exits 1 with the guard message `scripts/draft-client-kickoff.mjs: offer name is interpolated directly after the article 'the'`. Restore returns to exit 0.

## Files not changed in this lane

The fix is already on `main`. This lane ships only the re-verification report at `.lane/reports/fix-operator-copy-offername-article-reverify-lane1-20260820.md`. No source file in `scripts/` was touched, so the source tree diff against `origin/main` is empty for this item.

## Item close-out

The original item is a backlog checkbox under `[unreviewed-by-opus]`. The implementation is live and the regression guard is active, so the item can be marked complete: the fix is the merge at `527f9619` and the guard is `scripts/check-product-truth.mjs` lines 252-268. This lane pushes a fresh branch from `origin/main` carrying only this re-verification report so the reviewer can see the guard is still active on the current HEAD.
