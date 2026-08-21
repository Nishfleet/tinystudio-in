# Lane 1 report: Social preview imagery — class gap CLOSED live on tinystudio.in

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260821-004037`)
Date: 2026-08-20 (verified against fresh `origin/main` `6c3d83f`)
Outcome: **No source change needed — the class gap "social preview imagery
missing on 7 of 12 public pages" is closed in source AND verified live. The
deploy blocker that kept the prior reverify (2026-08-17) at "NEEDS-NISH"
(`CLOUDFLARE_API_TOKEN` missing from the repo secret store) is resolved, the
deploy pipeline now succeeds, and the live site serves the complete
og:image + twitter:image block on all 12 public pages.**

## The one item

> [unreviewed-by-opus] Social preview imagery missing on 7 of 12 public pages
> — class gap after the closed /promptly

## Verification performed

### 1. Source state — every one of the 12 public pages declares the complete og:image + twitter:image block

Fresh `git fetch origin main`; worktree HEAD is `6c3d83f` (2026-08-20), the
tip of `origin/main`. The 7 pages the gap item flagged carry the full block
(verified by reading source in this worktree):

- `public/promptly/support/index.html` → `https://tinystudio.in/social/promptly-social.png`
- `public/promptly/privacy/index.html` → `https://tinystudio.in/social/promptly-social.png`
- `public/drishti/support/index.html` → `https://tinystudio.in/social/drishti-social.png`
- `public/drishti/privacy/index.html` → `https://tinystudio.in/social/drishti-social.png`
- `public/privacy/index.html` → `https://tinystudio.in/social/tiny-studio-social.png`
- `public/privacy-choices/index.html` → `https://tinystudio.in/social/tiny-studio-social.png`
- `public/terms/index.html` → `https://tinystudio.in/social/tiny-studio-social.png`

The class-gap fix (`415c1cd5`, merged into `origin/main`; documented in the
2026-08-17 reverify) is already on main. Re-implementing it would duplicate
shipped, test-pinned work.

### 2. Repo gate — source is regression-proofed

`node scripts/test-public-social-preview.mjs` → **137 checks, 0 failures**.
Asserts the og:image block (+4 companion tags) and twitter card on every one
of the 12 canonical public pages, that every referenced image ships in
`public/social/`, and that npm test/ci wire the script in.

### 3. Deploy pipeline — the blocker is resolved and deploys succeed

The 2026-08-17 reverify's blocker was missing `CLOUDFLARE_API_TOKEN`. That
token now exists in the repo secret store:

```
gh secret list -R nish3451/tinystudio-in
CLOUDFLARE              2026-08-20T00:21:38Z
CLOUDFLARE_ACCOUNT_ID   2026-08-20T15:09:45Z
CLOUDFLARE_API_TOKEN    2026-08-20T15:09:37Z
```

The deploy workflow now runs green on main pushes (today):

- `32394934577` Deploy public site — success (main, 2026-08-20T16:57Z, on HEAD `6c3d83f` / PR #201)
- `32389387626` Deploy public site — success (main, 2026-08-20T15:59Z)
- (earlier today's failures were the token/typo/deploy-lane fixes themselves)

### 4. Live state — all 12 public pages now serve the social preview imagery

`node scripts/check-public-live-social-preview.mjs` → **99 checks, 0
failures** against the live site:

- Section A: every live public page declares the complete og:image block
  (og:image, secure_url, type, width 1200, height 630, non-empty alt) — the
  7 previously stale URLs (`/promptly/support/`, `/promptly/privacy/`,
  `/drishti/support/`, `/drishti/privacy/`, `/privacy/`, `/privacy-choices/`,
  `/terms/`) all pass.
- Section B: every live page's twitter card is `summary_large_image` with
  twitter:image matching og:image.
- Section C: all three social images are served: `/social/tiny-studio-social.png`,
  `/social/promptly-social.png`, `/social/drishti-social.png` → HTTP 200.

## Why no source branch/PR was opened

1. The fix is already merged into `origin/main` (`415c1cd5`) and is
   regression-proofed by `scripts/test-public-social-preview.mjs` (137/137
   green on this worktree).
2. The live gap that justified a reverify has now closed: the missing
   `CLOUDFLARE_API_TOKEN` was provisioned (2026-08-20) and the deploy lane
   succeeded, so the live site now serves the imagery on all 12 pages
   (99/99 live checks green).
3. Re-doing the merged, test-pinned work would touch no owned files and
   duplicate shipped work — the situation the packet's re-implementation
   discipline warns against. Nothing remains to change in source.

## Files touched

- `.lane/reports/docs-lane1-social-preview-imagery-class-gap-reverify-20260820.md` —
  this report (unique to this lane; the shared docs-lane1 report file from
  2026-08-17 was left untouched)
- `agent-state/lanes/tinystudio-in/lane-1.json` — `claims` field updated
  with the report path before any other file edit (claim-publication
  contract)
- No repository source files changed. No PR opened.

## Completed
