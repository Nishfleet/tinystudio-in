# Lane 1 report: Promptly privacy social share image — source already complete on main (PR #26), live still blocked on missing Cloudflare token

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260815-124031)
Date: 2026-08-15 (verified against fresh origin/main `84a1563`)
Outcome: **No source change possible or needed — the /promptly/privacy social share image is fully declared in source (og:image block + twitter:image, merged via PR #26, commit `ffe6e1f`) and test-pinned (137 checks, 0 failures); live delivery is still blocked by the missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope.**

## The one item

> [dogfood 82771ab0cb63] Social share image incomplete on /promptly/privacy [dogfood 20260809T013017Z-msl4lamt]

## Verification performed

### 1. Source state — the full social share image block is already merged and test-pinned

- Fresh `git fetch origin main` (HEAD `84a1563`, 2026-08-15) then `git merge-base --is-ancestor ffe6e1f origin/main` = yes. Commit `ffe6e1f` "fix(public): add JSON-LD structured data to trust and support pages (#26)" is what introduced the og:image block into the public pages (verified via `git log -S 'og:image'` on `public/promptly/privacy/index.html`).
- Worktree `public/promptly/privacy/index.html` at origin/main carries the complete block:
  - `og:image` = `https://tinystudio.in/social/promptly-social.png`
  - `og:image:secure_url` (same), `og:image:type` image/png, `og:image:width` 1200, `og:image:height` 630, non-empty `og:image:alt`
  - `twitter:card` = summary_large_image, `twitter:image` (matches og:image), non-empty `twitter:image:alt`
- The referenced file `public/social/promptly-social.png` ships in the repo and is a valid 1200×630 PNG (83,733 bytes).
- Every other public page (12 total) carries the same complete 6-tag og:image block pointing at its family image (`tiny-studio-social.png` / `promptly-social.png` / `drishti-social.png`).
- The repo gate covers this: `scripts/test-public-social-preview.mjs` asserts the full og:image block, the matching twitter card/image, and that every referenced image file ships in `public/social/`. `npm test` / `npm run ci` wire it in. **137 checks, 0 failures** on this worktree.

### 2. Live state — still stale, but not because of this item

- Live `https://tinystudio.in/promptly/privacy/` (fetched 2026-08-15) serves **zero** og:image/twitter:image tags (0 matches), with `twitter:card` = `summary` and the old thin description. This is exactly the "incomplete social share image" the dogfood finding observed — the live page is a stale build that predates PR #26.
- The social image file itself is live (`https://tinystudio.in/social/promptly-social.png` → HTTP 200, 1200×630 PNG), so the only missing piece is the stale HTML that never declares it.
- This matches the canonical deploy-pipeline gap: production is a stale build; every merged public fix since 2026-08-07 has never reached production.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed: missing `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` fails the run loudly (step "Required Pages secrets not provisioned - fail loudly").
- `gh secret list -R nish3451/tinystudio-in` (checked 2026-08-15) shows only `CLOUDFLARE_ACCOUNT_ID`; `CLOUDFLARE_API_TOKEN` is still missing.
- Latest deploy runs on main pushes still fail (e.g. run 31868538339 on 2026-08-15; the most recent main push `84a1563` is queued behind the same gate).
- The deploy bundle is a verbatim copy of `public/` (`scripts/publish-public-site.mjs --prepare-only`), so once the secret exists the next deploy carries the complete share-image block.
- Provisioning requires a Cloudflare dashboard token — a Nish action owned by the canonical deploy-pipeline item. No code change can unblock it.

## Why no source branch/PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #26) and test-pinned in `npm test` / `npm run ci`; the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane. Re-implementing a merged, test-pinned fix would duplicate shipped work and touch no owned files.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch); the complete social share image block then goes live with the other ~18 merged public fixes.
3. The backlog item can then be ticked on live proof.

## Files touched

- `.lane/reports/fix-lane1-promptly-privacy-social-share-image-20260815.md` — this report (unique to this lane)
- No repository source files changed.
