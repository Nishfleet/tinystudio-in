# Lane 1 report: reverify Google AI answers brand-disambiguation item — source still fixed on main (PR #29), live still blocked on missing Cloudflare token

## Item

- [unreviewed-by-opus] Google AI answers confuse Tiny Studio / tinystudio.in with unrelated "tiny studio" brands - A

## Verdict

**No source change is possible or needed — the disambiguation fix is already merged on main (PR #29, commit `4202d54`); live delivery is still blocked by the missing `CLOUDFLARE_API_TOKEN` secret (NEEDS-NISH), which is outside this lane's scope. This is a pure re-verification of the 2026-08-15 reverify on a fresh checkout of `origin/main` two days later; the source-vs-live gap is unchanged.**

## Evidence

### 1. Source state — still fixed on main, test-pinned

- Branched off fresh `origin/main` (`550316a` "docs(lane1): reverify thin label-only meta descriptions on five trust/support pages ...").
- Fix commit `4202d54c9c40d1ad352b5da7aa5788a12bed01ec` ("fix(public): disambiguate Tiny Studio from unrelated tiny studio brands (#29)") is an ancestor of fresh `origin/main`:
  `git merge-base --is-ancestor 4202d54 origin/main` → true.
- `public/index.html` Organization `@id` https://tinystudio.in/#organization still carries:
  - `"alternateName": "tinystudio.in"`
  - `"description": "Tiny Studio is the independent product company at tinystudio.in behind Promptly, Drishti, and 0509. It is not affiliated with other apps or studios that use the name Tiny Studio."`
  - visible body copy: "Tiny Studio is an independent product company at tinystudio.in." / "It is not affiliated with any other app or studio that uses the name Tiny Studio."
- `public/llms.txt` (1148 bytes) still opens with the disambiguation line and lists every public route including `/privacy-choices/` and the per-app support/privacy pages.
- Guard script `scripts/test-public-brand-disambiguation.mjs` is wired into both `npm test` and `npm run ci` (section C of the script verifies the wiring).
- Live on this fresh checkout:
  - `node scripts/test-public-brand-disambiguation.mjs` → **11 checks, 0 failures** (exit 0).
  - Sections A, B, C all green: homepage copy, Organization entity, llms.txt line, npm wiring.

### 2. Live state — still stale, identical failure profile to 2026-08-15

- Live `https://tinystudio.in/` (fetched 2026-08-17, 12,720 bytes):
  - `grep -c alternateName` → **0**
  - `grep -c "not affiliated"` → **0**
  - `grep -c '"@type":"Organization"'` → **0** (one empty `<script type="application/ld+json">` placeholder, no entity inside)
  - Identity text still reads: "Tiny Studio is the company layer behind Promptly, Drishti, and ..." (the pre-fix description).
- Live `https://tinystudio.in/llms.txt` (854 bytes) still reads "Tiny Studio is a small product company behind Promptly, Drishti, and 0509." with no `tinystudio.in` home line and no `not affiliated` statement; per-app support/privacy and `/privacy-choices/` routes are absent from the public-page list.
- `node scripts/check-public-live-deploy.mjs` (live deploy proof) → **15 checks, 7 failures**, identical failure set to 2026-08-15:
  - `FAIL brand-disambiguation JSON-LD is live (PR #29)` (no `"alternateName"`)
  - `FAIL non-affiliation copy is live (PR #29)` (no `not affiliated`)
  - plus the same five other live proofs (`/promptly/support/`, `/contact/`, unknown-URL 404, etc.) — every public fix since 2026-08-07 is still gated on the same stale bundle.
- This matches the canonical deploy-pipeline gap: every merged public fix since 2026-08-07 has never reached production, and this item cannot be ticked on live proof until that gate opens.

### 3. Deploy blocker (the real gate, NEEDS-NISH) — unchanged

- `.github/workflows/deploy-public-site.yml` lines 65-72 are fail-closed: the "Required Pages secrets not provisioned - fail loudly" step fails the run when `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is empty, so a skipped publish can never show green.
- `gh` is not present in this lane's path; the prior reverify (2026-08-15) already confirmed `gh secret list -R nish3451/tinystudio-in` shows only `CLOUDFLARE_ACCOUNT_ID`; `CLOUDFLARE_API_TOKEN` is the operator-owned gap.
- Provisioning requires a Cloudflare dashboard token — a Nish action owned by the canonical deploy-pipeline item. No code change can unblock it, and re-running the same code-only reverification in this lane is a closed loop.

## Files

None changed (verification-only run). This branch contains exactly one new file:

- `.lane/reports/docs-lane1-google-ai-answers-brand-disambiguation-reverify-20260817.md` — this report.

The prior fix (PR #29) touched:

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

1. Nish provisions a Cloudflare Pages:Edit token: `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`.
2. The deploy lane runs on the next main push (or workflow_dispatch); the disambiguation then goes live with the other ~17 merged public fixes.
3. The backlog item can then be ticked on live proof (`node scripts/check-public-live-deploy.mjs` green).
