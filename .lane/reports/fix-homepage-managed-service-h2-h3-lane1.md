# Lane report: fix/homepage-managed-service-h2-h3-lane1

## Item

Homepage managed-service section skips H2->H4 and is missing from the public heading-hierarchy.

## What was wrong

`public/index.html` line 298: the `#managed-service` section's feature heading was an H4 directly
under the H2 section title, skipping H3. The public heading-hierarchy test
(`scripts/test-public-heading-hierarchy.mjs`) covered every other page but not the homepage.

## Fix

- `public/index.html`: H4 -> H3 for the managed-service feature heading (outline H2 -> H3,
  matching the sibling `#teams` block).
- `public/styles.css`: `.team-feature h4` became `.team-feature :is(h3, h4)` (keeps margin) plus
  `.team-feature h3 { font-size: clamp(1.55rem, 1.8vw, 2rem) }` so the block renders at the
  former h4 scale.
- `scripts/test-public-heading-hierarchy.mjs`: added homepage coverage (outline has no jump > 1,
  managed-service section opens H2 then H3, CSS pairing asserted). Sections renamed D/E/F.

## Verification

- `node scripts/test-public-heading-hierarchy.mjs` -> 89 checks, 0 failures (was 81 before; 8 new
  homepage checks).
- All public-site tests pass (conversion-signal, structured-data, brand-disambiguation,
  heading-hierarchy, link-targets, social-preview, soft-404, deploy-bundle, pages-release).
- `npm test` failure in `check-retention-automation.mjs` is pre-existing: verified identical
  failure on clean origin/main (service-decisions parity + stale checkout at
  /home/nish/workspaces/products/tinystudio-in). Unrelated to this change.
- Note: the deploy-bundle test still filters the managed-service section for the public bundle,
  and still passes.

## Notes

- Existing remote branches `fix/homepage-managed-service-heading-hierarchy` and
  `fix/lane1-homepage-managed-service-heading-hierarchy` already contained an equivalent fix
  (never merged). This lane rebuilt the fix cleanly on fresh origin/main under a new branch name
  `fix/homepage-managed-service-h2-h3-lane1` to avoid the stale merge-tangle in the old ones.
- PR: https://github.com/nish3451/tinystudio-in/pull/143
