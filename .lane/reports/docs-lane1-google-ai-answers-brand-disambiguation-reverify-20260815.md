# Lane 1 report: reverify Google AI answers brand-disambiguation item — source already fixed on main (PR #29), live still blocked on missing Cloudflare token

## Item

- [unreviewed-by-opus] Google AI answers confuse Tiny Studio / tinystudio.in with unrelated "tiny studio" brands

## Verdict

**No source change is possible or needed — the disambiguation fix is already merged on main (PR #29, commit `4202d54`); live delivery is still blocked by the missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope.**

## Evidence

### 1. Source state — fixed on main, test-pinned

- Fix commit `4202d54c9c40d1ad352b5da7aa5788a12bed01ec` ("fix(public): disambiguate Tiny Studio from unrelated tiny studio brands (#29)") is an ancestor of fresh `origin/main` (`b6d00c6`):
  `git merge-base --is-ancestor 4202d54 origin/main` → true.
- The fix landed the disambiguation identity statement in visible homepage copy and the Organization JSON-LD of every public page, plus `public/llms.txt` and its generator template in `scripts/prepare-static-site-bundle.mjs` (14 files, 108 insertions).
- `public/index.html` currently carries, in the Organization `@id` https://tinystudio.in/#organization node:
  - `"description": "Tiny Studio is the independent product company at tinystudio.in behind Promptly, Drishti, and 0509. It is not affiliated with other apps or studios that use the name Tiny Studio."`
  - visible body copy: "Tiny Studio is an independent product company at tinystudio.in."
- Guard script `scripts/test-public-brand-disambiguation.mjs` is wired into both `npm test` and `npm run ci` (package.json lines 96/98, section C of the script checks this).
- Live on this checkout (branched off fresh `origin/main`):
  - `node scripts/test-public-brand-disambiguation.mjs` → **11 checks, 0 failures** (exit 0).

### 2. Live state — still stale, but not because of this item

- Live `https://tinystudio.in/` (fetched 2026-08-15 13:55 UTC) serves a stale bundle with **no** brand disambiguation:
  - No `"alternateName"` and no `not affiliated` anywhere in the homepage HTML.
  - No `application/ld+json` at all — the homepage has no Organization node.
  - The only identity text is the old meta description "Tiny Studio builds products for people and one sharper software system for teams, including Promptly, Drishti, and 0509."
- Live `https://tinystudio.in/llms.txt` (854 bytes) also lacks the fix — it still reads "Tiny Studio is a small product company behind Promptly, Drishti, and 0509" with no `tinystudio.in` home and no not-affiliated statement.
- `node scripts/check-public-live-deploy.mjs` (proof 4 of the release lane, lines 91-101) fails against the live site: **15 checks, 7 failures**, including both disambiguation checks:
  - `FAIL brand-disambiguation JSON-LD is live (PR #29)` (no `"alternateName"`)
  - `FAIL non-affiliation copy is live (PR #29)` (no `not affiliated`)
  - The same run also fails every other live proof (heading hierarchy, /contact/ JSON-LD, real 404), i.e. the whole production deployment is a stale build.
- This matches the canonical deploy-pipeline gap: every merged public fix since 2026-08-07 has never reached production.

### 3. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` (lines 65-72) is fail-closed: the "Required Pages secrets not provisioned - fail loudly" step fails the run when `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is empty, so a skipped publish can never show green.
- `gh secret list -R nish3451/tinystudio-in` (checked 2026-08-15) shows only `CLOUDFLARE_ACCOUNT_ID`; `CLOUDFLARE_API_TOKEN` is still missing.
- Latest deploy runs on main pushes all fail (2026-08-15): runs 31872758030, 31871844366, 31868538339, 31867935810, 31863747417.
- Provisioning requires a Cloudflare dashboard token — a Nish action owned by the canonical deploy-pipeline item. No code change can unblock it.

## Files

None changed (verification-only run). The prior fix (PR #29) touched:
- `package.json`
- `public/index.html`
- `public/contact/index.html`
- `public/drishti/index.html`
- `public/drishti/privacy/index.html`
- `public/drishti/support/index.html`
- `public/llms.txt`
- `public/privacy-choices/index.html`
- `public/privacy/index.html`
- `public/promptly/index.html`
- `public/promptly/privacy/index.html`
- `public/promptly/support/index.html`
- `public/support/index.html`
- `public/terms/index.html`
- `scripts/prepare-static-site-bundle.mjs`
- `scripts/test-public-brand-disambiguation.mjs`

## What unblocks live delivery

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch); the disambiguation then goes live with the other ~17 merged public fixes.
3. The backlog item can then be ticked on live proof (`node scripts/check-public-live-deploy.mjs` green).
