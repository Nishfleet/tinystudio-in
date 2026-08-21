# Lane 1 report: Promptly privacy social share image — RESOLVED on source and live (dogfood 82771ab0cb63)

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260821-053532`)
Branch: `docs/lane1-promptly-privacy-social-share-image-reverify-20260821`
Date: 2026-08-21 (verified against fresh `origin/main` `ccfbd4b`)
Outcome: **No source change needed — the /promptly/privacy social share image is complete in source AND live. The deploy blocker that kept the prior reverify (2026-08-17) at "NEEDS-NISH" (`CLOUDFLARE_API_TOKEN` missing from the repo secret store) is resolved, the deploy lane now succeeds, and the live page serves the complete og:image + twitter:image block.**

## The one item

> [dogfood 82771ab0cb63] Social share image incomplete on /promptly/privacy [dogfood 20260809T013017Z-msl4lamt]

## Verification performed

### 1. Source state — `public/promptly/privacy/index.html` declares the complete og:image + twitter:image block

Fresh `git fetch origin main`; this worktree HEAD is `ccfbd4b` (2026-08-21), the tip of `origin/main`. The page source carries the full block:

```
<meta property="og:image" content="https://tinystudio.in/social/promptly-social.png">
<meta property="og:image:secure_url" content="https://tinystudio.in/social/promptly-social.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Promptly privacy policy by Tiny Studio.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://tinystudio.in/social/promptly-social.png">
<meta name="twitter:image:alt" content="Promptly privacy policy by Tiny Studio.">
```

The original fix landed via PR #26, commit `ffe6e1f` (introduced the og:image block on the page families that had it); the class-gap extension that closed the remaining pages landed via `415c1cd5` "fix(public): add social preview imagery to the 7 pages missing it" (merged into `origin/main`). Both are on this worktree's HEAD tree. Re-implementing them would duplicate shipped, test-pinned work.

The referenced image file `public/social/promptly-social.png` ships in the repo: a valid 1200×630 PNG, 83,733 bytes.

### 2. Repo gate — source is regression-proofed

`node scripts/test-public-social-preview.mjs` → **137 checks, 0 failures**. The gate asserts, on every one of the 12 canonical public pages: the full og:image block (`og:image`, `og:image:secure_url`, `og:image:type`, `og:image:width` 1200, `og:image:height` 630, non-empty `og:image:alt`); `twitter:card` = `summary_large_image`; `twitter:image` matches `og:image` with non-empty `twitter:image:alt`; every referenced image ships in `public/social/`; and the script is wired into `npm test` and `npm run ci`.

### 3. Deploy pipeline — the blocker that kept the prior reverify open is resolved

The 2026-08-15 reverify (`fix-lane1-promptly-privacy-social-share-image-20260815.md`) and the 2026-08-17 class-gap reverify (`docs-lane1-social-preview-imagery-class-gap-reverify-20260817.md`) both ended on `NEEDS-NISH`: `CLOUDFLARE_API_TOKEN` was missing from the repo secret store, so the deploy workflow `.github/workflows/deploy-public-site.yml` aborted at its fail-closed step "Required Pages secrets not provisioned - fail loudly".

Since 2026-08-20 that token has been provisioned. The 2026-08-20 broader-class reverify (`docs-lane1-social-preview-imagery-class-gap-reverify-20260820.md`) recorded the deploy lane going green on main pushes, and the subsequent merge history (`ccfbd4b`, `ca70044`, `6c3d83f`, `d996776`, `5fd717c`, plus PRs #201 and #202) confirms the deploy pipeline is delivering current source to `tinystudio.in` again. The `scripts/publish-public-site.mjs --prepare-only` bundle is a verbatim copy of `public/`, so the deploy carries every merged public-page fix.

### 4. Live state — `/promptly/privacy/` and every other public page serve the full block

Live HTTP fetch against `https://tinystudio.in/promptly/privacy/` (2026-08-21) returns the same complete block, including `og:image` and `twitter:image` pointing at `https://tinystudio.in/social/promptly-social.png`, `twitter:card` = `summary_large_image`, and the `1200×630` width/height pair. The image itself is live: `https://tinystudio.in/social/promptly-social.png` → HTTP 200, `content-type: image/png`, `content-length: 83733`, matching the bytes in `public/social/promptly-social.png`.

Per-page scan of all 12 public URLs (`/`, `/contact/`, `/promptly/`, `/promptly/privacy/`, `/promptly/support/`, `/drishti/`, `/drishti/privacy/`, `/drishti/support/`, `/privacy/`, `/privacy-choices/`, `/terms/`, `/support/`) — every page returns `og:image` hits = 6, `twitter:image` hits = 2, `twitter:card` = `summary_large_image`. The 7 previously stale URLs (`/promptly/privacy/`, `/promptly/support/`, `/drishti/privacy/`, `/drishti/support/`, `/privacy/`, `/privacy-choices/`, `/terms/`) now match the other 5.

The live-site guard `scripts/check-public-live-social-preview.mjs` (PR #153) was last seen green in the 2026-08-20 class-gap reverify (99 checks, 0 failures against the live site).

## Why no source branch change was made

1. The fix is already merged into `origin/main` (PR #26 + `415c1cd5`) and is regression-proofed by `scripts/test-public-social-preview.mjs` (137/137 green on this worktree).
2. The live gap that justified the prior reverifies has now closed: the missing `CLOUDFLARE_API_TOKEN` was provisioned 2026-08-20 and the deploy lane succeeded, so `https://tinystudio.in/promptly/privacy/` now serves the imagery exactly as the source declares.
3. Re-doing the merged, test-pinned work would touch no owned files and duplicate shipped work — the situation the packet's re-implementation discipline warns against. Nothing remains to change in source.

## Files touched

- `.lane/reports/docs-lane1-promptly-privacy-social-share-image-reverify-20260821.md` — this report (unique to this lane; the prior 2026-08-15 and 2026-08-17 reports were left untouched)
- `agent-state/lanes/tinystudio-in/lane-1.json` — `claims` field updated with the report path before any other file edit (claim-publication contract)
- No repository source files changed.

## Completed
