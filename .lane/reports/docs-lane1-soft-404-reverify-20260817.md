# Lane 1 report: reverify soft-404 item — source already fixed on main (PR #34), live still blocked on missing Cloudflare token

## Item

- [unreviewed-by-opus] Every unknown URL on tinystudio.in returns HTTP 200 with the full homepage - soft-404

## Verdict

**No source change is possible or needed — the soft-404 fix is already merged on main (PR #34, commit `4499dd4`) with a full local/CI/deploy-proof chain; live delivery is still blocked by the missing `CLOUDFLARE_API_TOKEN` repo secret (NEEDS-NISH), which is outside this lane's scope. Re-deploying origin/main once a Pages-scoped token is provisioned closes the item; no code change will be required.**

## Evidence (verified 2026-08-17 from this checkout, branched off fresh `origin/main` = `45ecafa`)

### 1. Source state — fixed on main, test-pinned

- Fix commit `4499dd47a20664ea203f13838c43de19ab771265` ("fix(public): stop soft-404s by serving a real 404 page for unknown URLs (#34)") is an ancestor of fresh `origin/main`:
  `git merge-base --is-ancestor 4499dd4 origin/main` → true.
- `public/404.html` is a real not-found page: `<title>Page not found • Tiny Studio</title>`, `<meta name="robots" content="noindex">`, no canonical to `/`, exactly one H1, 25 internal escape links to real destinations, shared header/footer chrome.
- Guard `scripts/test-public-soft-404.mjs` is wired into `npm test` and `npm run ci` (section D checks both) and passes on this checkout: **19 checks, 0 failures** (exit 0).
- Release-lane deploy proof `d54c91f` ("enforce the top-level real-404 deploy proof in the release lane (#104)") is also an ancestor of origin/main. `scripts/prepare-public-deploy-bundle.mjs` `NEUTRAL_PROOFS` includes a top-level real-404 proof (real title + not a homepage clone + `noindex`) that fails the lane closed, and the deployed bundle gate passes on this checkout:
  `node scripts/prepare-public-deploy-bundle.mjs --source public --output …` → "snoozed buyer-path content removed; neutral fixes verified present", 35 files, exit 0.
- Post-deploy live acceptance `scripts/check-public-live-deploy.mjs` proof C asserts unknown URLs return 404 with a non-homepage body, with auto-rollback on failure (`scripts/publish-public-site.mjs`).

### 2. Live state — the soft-404 is real and is a stale-deployment artifact

- `curl -sL https://tinystudio.in/__ts-soft404-check-<random>.html` → HTTP 200, body is the full current homepage (title "Tiny Studio | Promptly, Drishti, and 0509", canonical `https://tinystudio.in/`).
- `curl -sL https://tinystudio.in/404.html` → HTTP 200, body is ALSO the homepage — the deployed bundle contains no real 404 page.
- `node scripts/check-public-live-soft-404.mjs` → **9 checks, 5 failures**, reproducing the item exactly: unknown URL returns 200 with homepage body; `/404.html` body is the homepage.
- `node scripts/check-public-live-deploy.mjs` → **15 checks, 7 failures** (real-404 proof, /promptly/support/ H2-after-H1, /contact/ JSON-LD, brand-disambiguation JSON-LD, non-affiliation copy) — the whole production deployment is a stale build, not a this-item defect.
- Bundle dating: the live homepage predates PR #29 (no `"alternateName"`, no `not affiliated`) and predates the 2026-08-07 managed-service content, and carries the 2026-06-20 initial-bundle title — consistent with the last successful deploy on 2026-06-20 (Cloudflare GitHub Pages integration broken since then; the wrangler direct-upload lane is the replacement). The 2026-06-20 bundle (`07acd07`, PR #4) has no `404.html` at all, so Cloudflare Pages' single-page application fallback serves `index.html` for every unmatched HTML path — the soft-404.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed: step "Required Pages secrets not provisioned - fail loudly" fails the run when `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is empty, so a skipped publish can never show green.
- `gh secret list -R nish3451/tinystudio-in` (checked 2026-08-17) shows only `CLOUDFLARE_ACCOUNT_ID`; `CLOUDFLARE_API_TOKEN` is still missing.
- Latest `Deploy public site` runs on main pushes all fail at the first gate (2026-08-15/08-17): runs 31879817382, 31877380127, 31875206883, 31874513620, 31872758030, 31981955551 (2026-08-17T00:24:49Z).
- Nightly `Live Site Check` (the deliberate staleness alarm) has failed every night, including 2026-08-16T04:02:44Z (run 31925686688) — the red runs are the design working, not a new regression.
- The only Cloudflare token on this VPS (`/home/nish/.config/fleet-console/cf.env`) is valid but has no Pages permission: `GET /accounts/f670a698e17bf160c8e4679823e68916/pages/projects/tiny-studio-3f5` → HTTP 403 "Authentication error" (checked 2026-08-17). It cannot deploy the site.

### 4. What today's re-verification adds over the prior report (PR #149)

- Same verdict re-confirmed with fresh 2026-08-17 evidence: live probes, static guard 19/19, deploy-bundle gate pass, live check 5 failures, deploy-workflow and nightly-alarm run history, secret list, and VPS token scope check.
- No new regression was introduced by any main change since PR #149; the live bundle is byte-for-byte the same stale 2026-06-20 deployment.

## Required one-time action to resolve the item (deploy fix, outside lane scope)

Provision a Cloudflare Pages-scoped API token and re-run the deploy lane — no code change is needed:

1. https://dash.cloudflare.com/profile/api-tokens -> Create Token
2. Use the "Cloudflare Pages: Edit" template, scope to account `f670a698e17bf160c8e4679823e68916`, create, copy the token.
3. `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
4. Trigger the deploy lane (`workflow_dispatch` on `Deploy public site` or next main merge).
5. Re-run `node scripts/check-public-live-soft-404.mjs` → must report 0 failures (unknown URL returns 404 with the real 404 page). The lane's post-deploy acceptance then holds the live proof forever.

## Files

This lane changed one file (this report):
- `.lane/reports/docs-lane1-soft-404-reverify-20260817.md`

The fix and its guards already live on main via:
- `public/404.html` + `scripts/test-public-soft-404.mjs` (PR #34, commit `4499dd4`)
- Release-lane top-level real-404 deploy proof (PR #104, commit `d54c91f`)
- Prior deploy-gap report (PR #149, commit `377c27e`)