# Lane 1 report — operator copy doubled-article offerName fix

## Item

Operator copy interpolates offerName "The Website Correction" after the word "the", producing doubled-article text ("the The Website Correction").

## Investigation

- The canonical offer name is `"The Website Correction"` (`scripts/lib/client-scaffold.mjs`, `growth-brain/ops/agency-config.json`) — it already contains the article.
- Five operator copy sites on current `origin/main` still interpolate it directly after an article:
  - `scripts/draft-client-kickoff.mjs` — "Thanks for approving the ${config.offerName}..."
  - `scripts/draft-loom-recording-script.mjs` — "...positions the ${config.offerName} as the obvious next step."
  - `scripts/draft-recording-sharpness-brief.mjs` — "CTA: Offer the ${config.offerName} at..."
  - `scripts/draft-sales-call-prep.mjs` — "The ${FOUNDER_PILOT.offerName} is exactly a..."
  - `scripts/draft-prospect-message.mjs` — "...the exact one-page ${config.offerName} scope."
- Prior unattached attempts existed (`fix/operator-copy-offername-article` PR #39, `fix/operator-copy-offername-article-lane1-20260814` PR #144, `fix/operator-copy-offer-article`) — all unmerged. PR #144 is still open and contains the identical fix plus guard; this lane re-landed it fresh from current origin/main so the PR is mergeable today.

## Fix (branch `fix/operator-copy-offername-article-lane1-20260815`)

Dropped the redundant article at the five sites above (kept grammar natural: "the exact one-page scope for ${config.offerName}").

Added a regression guard in `scripts/check-product-truth.mjs` (runs in `npm run ci`) that fails any active operator copy source interpolating `offerName` directly after "the" across the five fixed scripts plus `scripts/lib/canonical-service-copy.mjs` and `scripts/lib/client-scaffold.mjs`.

## Verification (all passed)

- `node --check` on all six changed files — OK
- `node scripts/check-product-truth.mjs` — exit 0 (new guard active)
- Mutation test: reintroducing "the ${config.offerName}" in kickoff makes the truth gate exit 1 with the guard message; restore returns to exit 0
- Full `npm test` — exit 0 (retention-automation check reports its expected environment-only "fail" in this isolated worktree; unrelated)
- `git diff --check` clean
