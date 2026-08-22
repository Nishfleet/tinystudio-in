# tinystudio.in production deploy path — repair and proof

Lane: tinystudio-in lane 1 · branch `fix/lane1-deploy-promotion-proof-20260821`
Date: 2026-08-21 · Worker: minimax-vps

## Item

> Repair the tinystudio.in production deploy path — merged public fixes have not gone live in ~…

## What I found

**The acute outage was already repaired on `main` hours before this lane opened**, by
three commits landed 2026-08-20:

| PR | Commit | Defect |
|----|--------|--------|
| #208 | `b64f242` | `CF_API_BASE` was `/api/v4` — every Cloudflare call 403'd |
| #209 | `7461f57` | wrangler 4.123 refuses Node 20; the lane pinned Node 20 |
| #211 | `161b27f` | acceptance section J was dead code (`PUBLIC_PAGE_URLS is not defined`) |

Deploy lane runs (`gh run list --workflow=deploy-public-site.yml`): red on every run
from creation through `32388518665`, then **success** on `32389387626` (15:59Z) and
`32394934577` (16:57Z, merge commit `6c3d83f`). The successful run uploaded 23 files
and reported `✨ Deployment complete! … https://d0c399f4.tiny-studio-3f5.pages.dev`.

I re-verified production independently from this worktree:

- `node scripts/check-public-live-deploy.mjs` → **240 checks, 0 failures**
- Byte-level diff of the bundle built from `origin/main` (`6c3d83f`, 35 files) against
  every live URL: 9 files byte-identical; the other 13 differ **only** because
  Cloudflare's Email Address Obfuscation rewrites `mailto:` links and appends
  `email-decode.min.js`; `_headers` 404s because Pages consumes it. No stale content.

So the site is live and current. That leaves the real question: **why did a lane
whose job is to publish let production sit on the 2026-06-20 bundle?**

## The defect that is still live on main

The pipeline was: capture rollback target → upload → *"verify"* by running
`scripts/check-public-live-deploy.mjs` against `https://tinystudio.in`.

That acceptance asserts a fixed list of **already-merged** fixes. Those assertions pass
against the **old** site. Nothing anywhere proved the uploaded bundle became the
production deployment. So an upload that never goes live — preview branch, wrong
project, no-op upload, custom domain served by another project — still ends with:

```
[publish] done: live site matches the verified bundle
```

Reproduced against the pre-change pipeline (hermetic; Cloudflare faked so
`canonical_deployment` never moves; acceptance scripted to pass):

```
[publish] uploading bundle
[publish] running live acceptance against the neutral merged fixes
[publish] done: live site matches the verified bundle

RED: pre-change pipeline reported SUCCESS while production is still previous-deployment
```

A release lane that reports success over a stale site is the mechanism by which
"merged public fixes have not gone live" survives for two months. Repairing the deploy
path means removing that possibility, not just re-greening yesterday's run.

## The fix

`scripts/publish-public-site.mjs` — between upload and acceptance the lane now **proves
promotion** (`verifyProductionPromotion`):

1. the canonical production deployment id must move away from the captured rollback
   target; and
2. when Cloudflare reports one, the promoted deployment's source commit must be this
   bundle's `source_commit` (`--commit-hash`, compared case-insensitively and
   short-sha-tolerantly, minimum 7 chars).

Cloudflare's project read is read-after-write, so promotion is polled (`6 × 5s`) before
it counts as a failure, and a transient read error is retried rather than failing a
release that did go live. Sleep, attempts and delay are injectable, so tests are
instant and hermetic.

Promotion failure is deliberately **not** a rollback case:

- production never moved → there is nothing to restore; it already *is* the
  pre-release state;
- production moved to a foreign deployment → rolling back would clobber somebody
  else's release.

Both fail loudly, naming the deployment production is stuck on (or the commit that is
not ours).

Same run against the fixed pipeline:

```
GREEN-GUARD: pipeline refused: UPLOAD DID NOT GO LIVE: production on Pages project
tiny-studio is still previous-deployment (…) after wrangler reported a successful
upload. … The live acceptance is NOT proof here: it asserts already-merged fixes and
passes against the stale site.
```

## Documentation that was actively harmful

- `.github/workflows/live-site-check.yml` told every reader the nightly staleness alarm
  **"is expected to FAIL"**. That is how a red alarm becomes wallpaper. It now says red
  means act, and records that the site was restored 2026-08-20.
- `.github/workflows/deploy-public-site.yml` claimed the Pages token was unprovisioned
  and that the lane "fails every main merge … red until provisioned". It has been
  provisioned since 2026-08-20 (as the secret name `CLOUDFLARE`). The header now
  records the real failure history (#208/#209/#211), the promotion proof, and keeps the
  fail-closed contract.

## Files changed

| File | Why |
|------|-----|
| `scripts/publish-public-site.mjs` | promotion proof + bundled-commit helpers; wired into `releasePipeline` between upload and acceptance |
| `scripts/test-pages-release.mjs` | section H (promotion proof: not promoted / foreign / vanished / slow / transient-error / proven) and section I (commit helpers); fake wrangler now attaches the commit it was given instead of inventing one |
| `scripts/test-deploy-public-site-workflow.mjs` | structural guard: the pipeline must prove promotion after upload and before acceptance |
| `.github/workflows/deploy-public-site.yml` | header truth + promotion step documented |
| `.github/workflows/live-site-check.yml` | header truth: red is not "expected" |

## Verification

```
node scripts/test-pages-release.mjs               → 63 checks, 0 failures
node scripts/test-deploy-public-site-workflow.mjs → 12 checks, 0 failures
node scripts/test-public-deploy-bundle.mjs        → pass
node scripts/check-public-live-deploy.mjs         → 240 checks, 0 failures (live)
find scripts -name '*.mjs' | xargs -n1 node --check → clean
```

RED proof that the new tests are not vacuous — same tests against `origin/main`'s
`publish-public-site.mjs`:

```
SyntaxError: The requested module './publish-public-site.mjs' does not provide an
export named 'bundleSourceCommit'

  FAIL publish script proves the upload became the production deployment
  FAIL the release pipeline proves promotion after the upload and before the acceptance
  12 checks, 2 failures
```

Full `npm run ci` chain, run test-by-test on this box: 35/36 pass. Two are not
runnable here and are untouched by this branch:

- `test-operator-check-strictness.mjs` shells out to `npm`, which is not installed on
  this VPS (`npm_execpath` unset → `spawnSync("npm")` fails). It passes on the runner.
- `check-retention-automation.mjs` fails on live operator state outside this repo
  (`/home/nish/workspaces/products/tinystudio-in` + `~/.codex/automations/…`: 3 active
  clients, 0 `service-decisions`, 0 `runs/service-engine`). Nothing in this diff
  touches that path; it is the separate retention item.

## What this does not do

It does not re-deploy. Production already serves `6c3d83f` and passes acceptance. When
this merges, the lane's own push run exercises the new promotion proof against the real
Cloudflare API — that is the intended live confirmation.
