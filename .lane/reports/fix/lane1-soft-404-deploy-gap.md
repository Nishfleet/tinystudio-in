# Lane report: fix/lane1-soft404-deploy-gap

## Item

Every unknown URL on tinystudio.in returns HTTP 200 with the full homepage - a
soft-404.

## What was wrong (root cause)

The soft-404 is NOT a repo bug: `public/404.html` is a real not-found page and
the static guard (`scripts/test-public-soft-404.mjs`) passes. The live site
serves a **stale deployment bundle from 2026-06-20** (commit
`a0d1de5`, before PR #34 merged the 404 fix), and nothing has re-deployed since
because the release lane cannot run.

Evidence (2026-08-14):

- `curl https://tinystudio.in/__ts-lane1-abc123.html` -> HTTP 200, body is the
  homepage (`<title>Tiny Studio | Promptly, Drishti, and 0509</title>`).
- `curl https://tinystudio.in/404.html` -> HTTP 200, body is ALSO the homepage
  (the deployed bundle has no real 404 page, so Pages' SPA fallback serves
  index.html for everything).
- `node scripts/test-public-soft-404.mjs` -> 19 checks, 0 failures (repo is
  correct).
- `node scripts/check-public-live-soft-404.mjs` -> 5 failures, reproducing the
  item exactly (unknown URL 200 + homepage body; /404.html body is homepage).
- Deploy workflow `Deploy public site` fails on main at the first gate,
  "Required Pages secrets not provisioned - fail loudly":
  `CLOUDFLARE_API_TOKEN` is empty in repo secrets (`CLOUDFLARE_ACCOUNT_ID` is
  set 2026-08-12, the token never was).
- The nightly `Live Site Check` has failed every night since the fail-closed
  lane landed (it is the deliberate staleness alarm; see workflow comment).

The repo's release pipeline is deliberately fail-closed (a skipped publish must
never look green) - the red deploy runs are the design working as intended, and
the comment in `scripts/publish-public-site.mjs` documents the site has been
stale since 2026-06-20 for exactly this reason.

## What I verified

- Live probes of tinystudio.in (random unknown paths + `/404.html`) reproduce
  the reported soft-404.
- Static repo guards for the real 404 page all pass on origin/main:
  - `scripts/test-public-soft-404.mjs` (19 checks)
  - deploy-bundle proof for 404.html in
    `scripts/prepare-public-deploy-bundle.mjs` (`NEUTRAL_PROOFS` includes the
    top-level real-404 proof).
- The only Cloudflare token on this VPS (`/home/nish/.config/fleet-console/cf.env`,
  `CLOUDFLARE_API_TOKEN`) is valid but scoped to the 0509.in zone only:
  `GET /accounts/.../pages/projects/tiny-studio-3f5` -> HTTP 403
  "Authentication error" (no Pages permission). It cannot deploy the site.
- Repo secret `CLOUDFLARE_API_TOKEN` is unset (verified via `gh secret list` and
  the deploy run logs show the empty env var).

## What I changed

No code change is possible that fixes the live soft-404 from inside this repo
without a deploy credential; the repo already carries the fix and its guards.
This lane's durable deliverable is this report and the live evidence it
documents.

## Required one-time action to resolve the item (deploy fix)

Provision a Cloudflare Pages-scoped API token and re-run the deploy lane - no
code change is needed:

1. https://dash.cloudflare.com/profile/api-tokens -> Create Token
2. Use the "Cloudflare Pages: Edit" template, scope to account
   `f670a698e17bf160c8e4679823e68916`, create, copy the token.
3. `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
4. Trigger the deploy lane (merge to main or `workflow_dispatch` on
   `Deploy public site`).
5. Re-run `node scripts/check-public-live-soft-404.mjs` -> must report 0
   failures (unknown URL returns 404 with the real 404 page).

The release lane already captures the rollback target, publishes via wrangler,
and runs `check-public-live-deploy.mjs` (which asserts the live 404 proof) with
auto-rollback - once the token exists, the deploy is self-verifying.

## Notes

- Per the packet: investigation was done by reading code and running the
  existing tests/probes, not by adding throwaway scripts to the worktree.
- The live check (`check-public-live-soft-404.mjs`) intentionally lives outside
  `npm test`/`npm ci` so repo checks stay green on repo state alone (documented
  in its header); the nightly workflow is the staleness net.
- PR: https://github.com/nish3451/tinystudio-in/pull/NNN (this report only; the
  code fix for the 404 is already on main via PR #34).
