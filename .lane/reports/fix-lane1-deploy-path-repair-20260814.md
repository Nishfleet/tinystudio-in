# Lane 1 report: repair the tinystudio.in production deploy path

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260814-194032)
Date: 2026-08-14
Outcome: **Deploy-path code is correct and fail-closed; the live site is stale because the Pages-scoped `CLOUDFLARE_API_TOKEN` is missing (NEEDS-NISH, dashboard action). Landed the one code improvement available: the lane now self-heals via a daily schedule once the token exists.**

## The one item

> [unreviewed-by-opus] Repair the tinystudio.in production deploy path - merged public fixes have not gone live in ~

## Root cause (verified live, 2026-08-14)

Production is still the 2026-06-20-era bundle; every merged public fix since then has never gone live. The deploy lane is not broken in code — it is fail-closed and blocked on missing credential wiring:

- `gh secret list -R nish3451/tinystudio-in` shows only `CLOUDFLARE_ACCOUNT_ID` (set 2026-08-12). `CLOUDFLARE_API_TOKEN` is absent.
- Every recent deploy lane run fails in the "Required Pages secrets not provisioned - fail loudly" step; run 31809551059 (2026-08-14T14:29Z) log shows `CLOUDFLARE_API_TOKEN:` empty and `CLOUDFLARE_ACCOUNT_ID: ***`.
- The fleet Workers token (`/home/nish/.config/fleet-console/cf.env`) authenticates but lacks Pages:Edit — verified by running `wrangler pages project list`: `Authentication error [code: 10000]` on `/accounts/f670a698e17bf160c8e4679823e68916/pages/projects`.
- No wrangler OAuth session exists on this VPS (no `~/.wrangler/config` with OAuth creds), so `wrangler login` cannot substitute for the repo secret.

The site is observably stale: `node scripts/check-public-live-soft-404.mjs` fails 5/9 checks — unknown URLs return HTTP 200 with the homepage (soft-404). Diffing live `/` against `public/index.html` at origin/main shows the whole managed-service section, brand-disambiguation copy, and the disambiguation JSON-LD are missing live (old bundle).

This blocker is exactly the one the previous lanes reported (`.lane/reports/fix-lane1-meta-descriptions-live-gate.md`, commits 377c27e/80df37a). No code change can mint the Pages token — it requires a one-time Cloudflare dashboard step owned by Nish.

## What this lane changed

The one coherent improvement available without the token: the deploy lane now also runs on a daily `schedule` (03:13 UTC, deliberately offset from the 03:23 live-site-check alarm). Once `CLOUDFLARE_API_TOKEN` is set, the lane picks the stale site up and deploys within a day even if no new push to main happens; until then the scheduled run fails loudly like every push run (red until provisioned, never a green skip).

- `.github/workflows/deploy-public-site.yml` — added `schedule` trigger + comments.
- `.lane/reports/fix-lane1-deploy-path-repair-20260814.md` — this report.

No change to the fail-closed contract: `test-deploy-public-site-workflow.mjs` still passes all 10 checks (no dormant step, fail-loud step gated on missing secrets, every deploy step gated on both secrets, live acceptance runs after upload). `test-pages-release.mjs` passes 38 checks; `test-public-deploy-bundle.mjs` passes 63 checks.

## What unblocks live delivery (NEEDS-NISH)

1. Cloudflare dashboard → `dash.cloudflare.com/profile/api-tokens` → Create Token → "Cloudflare Pages: Edit" template, scoped to account `f670a698e17bf160c8e4679823e68916`.
2. `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
3. The lane then self-heals: next main push, `workflow_dispatch`, or the daily scheduled run deploys the merged public fixes and verifies them live (with auto-rollback on acceptance failure).

## PR

https://github.com/nish3451/tinystudio-in/pull/<number> — fix/ci: schedule the tinystudio.in deploy lane so it self-heals once the Pages token lands
