# Lane 1 report: refresh the public sitemap (stale lastmod dates)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260814-231032)
Date: 2026-08-14
Outcome: **No source change possible or needed — the sitemap refresh is already merged in main; live delivery is blocked by a missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope.**

## The one item

> [unreviewed-by-opus] Refresh the public sitemap: lastmod dates stale (2026-05-20) and missing on 7 of 12 URLs.

## Verification performed

### 1. Source state — the fix is already merged

- Commit `67222dd` "fix(public): refresh sitemap lastmod dates to real page changes (#116)", merged 2026-08-13.
- Verified: `git merge-base --is-ancestor 67222dd origin/main` = yes; worktree HEAD == origin/main == `80df37a`.
- `public/sitemap.xml` now carries a `lastmod` on **all 12 URLs**, dated 2026-08-09..2026-08-11 to match real page changes (parsed and verified programmatically; no missing `lastmod` remains).

### 2. Live state — still stale, but not because of this item

- Live `https://tinystudio.in/sitemap.xml` (fetched 2026-08-14) still shows `lastmod 2026-05-20` on 5 URLs and **no lastmod on 7 URLs** — exactly the stale state the item describes.
- This is not a source defect: production is byte-identical to the 2026-06-20 build (`07acd07`). Every merged public fix since 2026-08-07 (17+ PRs, incl. #116) has never reached production.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` fails closed when `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is missing.
- `gh secret list -R nish3451/tinystudio-in` → only `CLOUDFLARE_ACCOUNT_ID` exists (set 2026-08-12); `CLOUDFLARE_API_TOKEN` is missing.
- Latest deploy run (run 31809551059, 2026-08-14 14:27Z, on push `80df37a`) failed at the "Required Pages secrets not provisioned - fail loudly" step; log shows `CLOUDFLARE_API_TOKEN:` empty. Every main-merge deploy since 2026-06-20 fails identically.
- Provisioning requires a Cloudflare dashboard token — a Nish action, owned by the canonical deploy-pipeline gap. No code change can unblock it.

## Why no branch/PR was opened

The packet's fallback: "or by reporting plainly why the item cannot be done." The item's source work is already merged (PR #116); the only remaining gate is the missing Cloudflare secret, a NEEDS-NISH action outside this lane. Creating a duplicate PR would touch no owned files and deliver nothing.

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch); the refreshed sitemap then goes live with the other ~17 merged public fixes.
3. The backlog item can then be ticked on live proof.

## Files touched

- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — claims list (empty; no repo files claimed)
- `.lane/reports/docs-lane1-public-sitemap-live-gate-20260814.md` — this report
- No repository files changed.
