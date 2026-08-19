# Lane 1 report: live llms.txt lists only 7 of the 12 public URLs

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260814-184032)
Date: 2026-08-14
Branch: `fix/lane1-live-llms-txt-coverage-20260814` (commit a083ea6)
PR: #154 — "fix(public): guard live llms.txt coverage in both live-site checkers"

## The one item

> [unreviewed-by-opus] Live llms.txt lists only 7 of the 12 public URLs — the 5 per-app support/privacy trust pages.

## Root cause (verified live)

- `https://tinystudio.in/llms.txt` (fetched 2026-08-14) lists only 7 URLs: Home, Support, Contact, Privacy, Terms, Promptly, Drishti. Missing: `/privacy-choices/`, `/promptly/support/`, `/promptly/privacy/`, `/drishti/support/`, `/drishti/privacy/`.
- The repo source was already fixed: commit `b2a58e0` (PR #68) lists all 12 URLs in `public/llms.txt`, and `public/sitemap.xml` has all 12 too.
- The live site is byte-identical to the **June-20 build `07acd07`**: the release lane cannot publish because `CLOUDFLARE_API_TOKEN` is not provisioned in repo secrets (only `CLOUDFLARE_ACCOUNT_ID` exists). This is the canonical, already-reported deploy gap (see `.lane/reports/fix-lane1-meta-descriptions-live-gate.md`, commit ffc5133 #150, 377c27e #149). It is a NEEDS-NISH dashboard action, out of any lane's scope.
- Second gap: neither live guard checked llms.txt coverage, so the stale/truncated llms.txt shipped silently. The guard fix existed as open-but-stale PR #109 (`fix/live-llms-txt-coverage-check`, commit 8d53862), conflicting with main since 2026-08-12 and never merged.

## What this lane delivered

A fresh, rebased-on-main version of the live-coverage guard, plus a blocking regression test:

- **`scripts/lib/public-pages.mjs`** (new) — single source of truth for the 12 public page URLs (`PUBLIC_HTML_FILES`, `PUBLIC_PAGE_URLS`, `missingFromLlmsTxt`), so generator and guards cannot drift again (drift is how the June-20 bundle shipped 7 URLs).
- **`scripts/check-public-live-deploy.mjs`** — release-lane post-deploy verifier now asserts `/llms.txt` lists every public page (proof E).
- **`scripts/check-public-live-soft-404.mjs`** — nightly stale-bundle net now fetches `/llms.txt` and reports exactly which URLs are missing (check E).
- **`scripts/prepare-static-site-bundle.mjs`** — uses the shared list; behavior unchanged.
- **`scripts/test-public-soft-404.mjs`** — blocking suite now asserts the worktree `public/llms.txt` covers every public page (C2), so the source can never regress silently again.

## Verification (evidence)

- `node --check` clean on all five files.
- Public test suites on the branch, all green: deploy-bundle 63/63, soft-404 21/21, structured-data 127/127, brand-disambiguation 11/11, heading-hierarchy 93/93, conversion-signal 126/126, link-targets 77/77, social-preview 137/137, deploy-workflow 10/10, pages-release 38/38 (703 checks, 0 failures).
- Both live guards now **fail loudly against the live site with the exact missing list** (the intended loud signal while the deploy is stale):

```
E. the deployed llms.txt lists every public page (PR #68 live)
  ok GET /llms.txt returns HTTP 200
  FAIL llms.txt lists all 12 public pages (missing: https://tinystudio.in/privacy-choices/, https://tinystudio.in/promptly/support/, https://tinystudio.in/promptly/privacy/, https://tinystudio.in/drishti/support/, https://tinystudio.in/drishti/privacy/)
```

- `npm run check` exits 1, but the ONLY failing check is `tinystudio-retention-checkups` (pre-existing data/workspace issue: this worktree is not the canonical retention workspace, `service-decisions`/`runs` counts are 0). Verified identical failure on a pristine origin/main clone (`/tmp/tsin-main-check.log`). No new failures from this change.

## What actually unblocks the live item

The live site leaves the June-20 bundle only after the one-time Cloudflare dashboard step (owned by the canonical deploy-pipeline item, NEEDS-NISH):

1. Create a `Cloudflare Pages: Edit` token in the dashboard.
2. `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
3. `gh secret set CLOUDFLARE_ACCOUNT_ID -R nish3451/tinystudio-in -b f670a698e17bf160c8e4679823e68916` (already set 2026-08-12)
4. The deploy lane then publishes on the next main merge; the new proof E verifies all 12 URLs live, and the nightly net keeps watching.

## Notes on other lanes' state

- Open PR #109 (`fix/live-llms-txt-coverage-check`) is the stale predecessor of this exact change; it has not been merged and conflicts with main. This lane's PR #154 supersedes it (same fix, rebased, plus the blocking regression test). PR #109 can be closed on merge of #154.
- The pre-existing `git stash` entries in this worktree (`stash@{0..1}` "WIP on chore/pin-required-verifiers") were not created or modified by this lane.
