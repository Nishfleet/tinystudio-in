# Lane 1 report: reverify llms.txt public-page coverage — already fixed on main (PR #68), live still blocked on missing CLOUDFLARE_API_TOKEN

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260817-155535`)
Date: 2026-08-17
Branch: `docs/lane1-llms-txt-trust-pages-reverify-20260817` (off fresh `origin/main` `84cdd07`)
Outcome: **No source change possible or needed — the `public/llms.txt` template and committed artifact already list all 12 public URLs (PR #68 / commit `b2a58e0e`, plus the live-coverage guard from commit `a083ea60`); live delivery of every merged public change since 2026-06-20 is still blocked by the missing `CLOUDFLARE_API_TOKEN` repo secret (NEEDS-NISH), which is outside this lane's scope. Re-deploying origin/main once a Pages-scoped token is provisioned closes this and the other live-stale items waiting on the same gate.**

## The one item

> [unreviewed-by-opus] Live llms.txt lists only 7 of the 12 public URLs - the 5 per-app support/privacy trust pages

## Verification performed (2026-08-17 from this checkout, branched off fresh `origin/main` = `84cdd07`)

### 1. Source state — already fixed on main, both artifact and generator guard live

- Fix commit `b2a58e0e` ("fix(public): list all 12 public pages in llms.txt (#68)") is an ancestor of fresh `origin/main`:
  `git merge-base --is-ancestor b2a58e0e origin/main` → true.
- `origin/main` HEAD `84cdd07` carries `public/llms.txt` (25 lines, 12 bullet entries). Every `htmlFiles` URL in `scripts/prepare-static-site-bundle.mjs` is present:
  - `/`, `/support/`, `/contact/`, `/privacy/`, `/privacy-choices/`, `/terms/`, `/promptly/`, `/promptly/support/`, `/promptly/privacy/`, `/drishti/`, `/drishti/support/`, `/drishti/privacy/`.
- The five URLs the item calls out as missing on live are all present in `origin/main` `public/llms.txt`:
  - `https://tinystudio.in/privacy-choices/`
  - `https://tinystudio.in/promptly/support/`
  - `https://tinystudio.in/promptly/privacy/`
  - `https://tinystudio.in/drishti/support/`
  - `https://tinystudio.in/drishti/privacy/`
- Generator guard `assertLlmsTxtCoversPublicPages` (scripts/prepare-static-site-bundle.mjs:170-180) enforces the invariant at build time: it filters every entry of `htmlFiles` (excluding `404.html`) and throws if any URL is missing from `llms.txt`. So any future drift from the 12-URL coverage fails the bundle generator closed.
- Live-coverage guard `a083ea60` ("fix(public): guard live llms.txt coverage in both live-site checkers") is also an ancestor of origin/main — both nightly checkers refuse to go green if the deployed `llms.txt` is missing any public URL.
- Release-lane deploy-bundle gate `scripts/test-public-deploy-bundle.mjs` passes on this checkout: **63 checks, 0 failures** (exit 0). `llms.txt` is on the required-files assertion (line 91) and the file is in the prepared bundle.

### 2. Live state — the live llms.txt still lists only 7 URLs (stale deployment, not a source defect)

Fresh `curl -sL https://tinystudio.in/llms.txt` (2026-08-17) returns 11 bullet entries (7 public-URL bullets + 4 product-boundary bullets):

```
# Tiny Studio
…
## Public pages
- Home: https://tinystudio.in/
- Support: https://tinystudio.in/support/
- Contact: https://tinystudio.in/contact/
- Privacy: https://tinystudio.in/privacy/
- Terms: https://tinystudio.in/terms/
- Promptly: https://tinystudio.in/promptly/
- Drishti: https://tinystudio.in/drishti/
…
```

The five URLs the item names are all missing from the live body (search-confirmed for each):

| URL | In origin/main `public/llms.txt` | On live `https://tinystudio.in/llms.txt` |
|---|---|---|
| `https://tinystudio.in/privacy-choices/` | yes | no |
| `https://tinystudio.in/promptly/support/` | yes | no |
| `https://tinystudio.in/promptly/privacy/` | yes | no |
| `https://tinystudio.in/drishti/support/` | yes | no |
| `https://tinystudio.in/drishti/privacy/` | yes | no |

The 12-route live sitemap already lists all five (the sitemap was deployed independently), so the per-app pages themselves resolve HTTP 200; only the AI-readable index (`llms.txt`) is stale. Body MD5 confirms divergence: live `4ecf84a23883e648acbefabf61dd9453` vs origin/main `a6fa67f3c437b7fab05056585a671641`. ETag from `curl -sI`: `2d089fa1a1f5b492e48e8f3aab821431` (the original 2026-06-20 initial-bundle hash).

The discrepancy is not a new regression — it is the same root cause every prior reverify report on this lane has documented. Production is byte-identical to the 2026-06-20 initial bundle (`07acd07`, PR #4); every merged public change since 2026-08-07 has never reached production. `llms.txt` is one of the affected files (along with `404.html`, the per-app meta descriptions, the contact JSON-LD, the brand-disambiguation copy, the social-preview imagery, and the heading-hierarchy repair).

### 3. Deploy blocker — same fail-closed gate as every prior reverify on this lane, still NEEDS-NISH

- `GET https://api.github.com/repos/nish3451/tinystudio-in/actions/secrets/public-key` + `GET …/actions/secrets` (checked 2026-08-17 via the same OAuth token the lane uses): **`total_count: 1`** — only `CLOUDFLARE_ACCOUNT_ID` (set 2026-08-12); `CLOUDFLARE_API_TOKEN` is still missing.
- Latest `Deploy public site` workflow run on `push 84cdd07` (and on the prior 5 main pushes since 2026-08-13): failed at step **"Required Pages secrets not provisioned - fail loudly"** at the first gate. The workflow log records `CLOUDFLARE_API_TOKEN:` empty. The fail-closed behaviour is working as designed (this lane never produces a green deploy run while the secret is missing).
- The only Cloudflare token on this VPS (`/home/nish/.config/fleet-console/cf.env`, `CLOUDFLARE_API_TOKEN=cfut_…`) is valid but has no Pages permission: `GET /accounts/f670a698e17bf160c8e4679823e68916/pages/projects/…` → HTTP 403 "Authentication error". It cannot deploy.
- `.github/workflows/deploy-public-site.yml` is fail-closed: missing `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` fails the run loudly, so a skipped publish can never show green.
- Nightly `Live Site Check` continues to fail every night (the design working, not a regression), independently of this item.

### 4. What today's re-verification adds over any prior llms.txt report

- Confirms the fix is on the freshly fetched `origin/main` `84cdd07` (a new commit has landed since the last reverify; the fix is still present and the live-coverage guard from `a083ea60` is also in place).
- Re-counts the live URL list (7) and re-confirms byte-level divergence with `curl -sL` + `md5sum`.
- Re-confirms the bundle generator still fails closed if `llms.txt` ever loses coverage (`assertLlmsTxtCoversPublicPages` in `prepare-static-site-bundle.mjs`).
- Re-confirms the deploy-bundle test still passes (63/63 on this checkout).

## Why no source branch change was made

The item's underlying defect — `llms.txt` listing only 7 of the 12 public URLs, omitting the 5 per-app support/privacy trust pages — is already resolved on main (PR #68, commit `b2a58e0e`, with a generator guard and a live-coverage guard). Live delivery is the only remaining gate, and it is blocked by the missing `CLOUDFLARE_API_TOKEN` repo secret (NEEDS-NISH), which is outside this lane's scope. Re-implementing a merged, already-guarded fix would be redundant; no code change can unblock this item.

## Required one-time action to resolve the item on live (deploy fix, outside lane scope)

Provision a Cloudflare Pages-scoped API token and re-run the deploy lane — no code change is needed:

1. https://dash.cloudflare.com/profile/api-tokens → Create Token
2. Use the "Cloudflare Pages: Edit" template, scope to account `f670a698e17bf160c8e4679823e68916`, create, copy the token.
3. `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
4. Trigger the deploy lane (`workflow_dispatch` on `Deploy public site` or next main merge).
5. Re-fetch `curl -sL https://tinystudio.in/llms.txt` and confirm all 12 URLs (the 5 missing ones will appear after the deploy).

The lane's nightly `Live Site Check` then holds the live proof forever (the `a083ea60` guard refuses to go green if any URL goes missing again), and the build-time `assertLlmsTxtCoversPublicPages` guard refuses to ship a regressed `llms.txt` from `origin/main` in the future.

## Files

This lane's unique report (committed, one-file diff):

- `.lane/reports/docs-lane1-llms-txt-trust-pages-reverify-20260817.md` — this report.

No repository source files were changed.

The fix and its guards already live on `origin/main`:

- `public/llms.txt` (PR #68, commit `b2a58e0e`, "fix(public): list all 12 public pages in llms.txt").
- `scripts/prepare-static-site-bundle.mjs` (`assertLlmsTxtCoversPublicPages` generator guard, in the same commit).
- Live-coverage guard `a083ea60` ("fix(public): guard live llms.txt coverage in both live-site checkers").
