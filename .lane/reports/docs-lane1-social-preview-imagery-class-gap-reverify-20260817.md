# Lane 1 report: Social preview imagery — class gap after the closed /promptly

Lane: tinystudio-in lane 1 (worktree `tinystudio-in-lane1-20260817-153536`)
Date: 2026-08-17 (verified against fresh `origin/main` `550316a`)
Outcome: **No source branch/code change possible or needed — the class gap
"social preview imagery missing on 7 of 12 public pages" is fully closed in
source on `origin/main`; live delivery is still blocked on the missing
`CLOUDFLARE_API_TOKEN` (NEEDS-NISH), outside this lane's scope.**

## The one item

> [unreviewed-by-opus] Social preview imagery missing on 7 of 12 public pages
> — class gap after the closed /promptly

## What "class gap after the closed /promptly" actually means

The earlier `/promptly` finding (`a6e1be8` → PR #26, `ffe6e1f`) only added
og:image/twitter:image to a narrow set of pages. The remainder of the public
surface (privacy, privacy-choices, terms, the Promptly and Drishti support/
privacy pairs) still declared no social-image block, so shared links from
those URLs rendered as bare text cards. The fix for that broader class —
commit `415c1cd5` "fix(public): add social preview imagery to the 7 pages
missing it" — was merged into `origin/main` (see merge verification below)
and now ships in this worktree's source.

## Verification performed

### 1. Source state on `origin/main` — every one of the 12 public pages declares the complete og:image + twitter:image block

- Fresh `git fetch origin main` (HEAD `550316a`, 2026-08-17) gives HEAD =
  `550316a999d80921c6742c5b1ed459725a6c7100` for this worktree.
- The seven pages the original gap item flagged now carry the full block
  (verified by reading source on this worktree):
  - `public/promptly/support/index.html` → `https://tinystudio.in/social/promptly-social.png`
  - `public/promptly/privacy/index.html` → `https://tinystudio.in/social/promptly-social.png`
  - `public/drishti/support/index.html` → `https://tinystudio.in/social/drishti-social.png`
  - `public/drishti/privacy/index.html` → `https://tinystudio.in/social/drishti-social.png`
  - `public/privacy/index.html` → `https://tinystudio.in/social/tiny-studio-social.png`
  - `public/privacy-choices/index.html` → `https://tinystudio.in/social/tiny-studio-social.png`
  - `public/terms/index.html` → `https://tinystudio.in/social/tiny-studio-social.png`
- All twelve pages also carry the matching twitter card: `twitter:card` =
  `summary_large_image`, `twitter:image` equals og:image, non-empty
  `twitter:image:alt`. Same per-family image assignment as the og:image block.
- Referenced files all ship: `public/social/tiny-studio-social.png`,
  `public/social/promptly-social.png`, `public/social/drishti-social.png`
  (each is a valid PNG that the deploy bundle ships verbatim).

### 2. Repo gate — source is regression-proofed

- `scripts/test-public-social-preview.mjs` is the gate the fix added. It runs
  on this worktree without modification:
  - `node scripts/test-public-social-preview.mjs` → **137 checks, 0 failures**
  - Asserts og:image + 4 companion meta tags on every public page
  - Asserts twitter:card = `summary_large_image`, twitter:image matches
    og:image, non-empty alt
  - Asserts every referenced image file ships in `public/social/`
  - Asserts npm test and npm run ci wire the script in (matrix gates checked)
- The 12-page list is the canonical PUBLIC_PAGES list in the script (matches
  the test-public-footer-targets list, kept in sync).

### 3. Lineage — the class-gap fix is on `origin/main`, with a duplicate sibling commit

- Commit `415c1cd5` "fix(public): add social preview imagery to the 7 pages
  missing it" — author message names the exact class gap (post-closed /promptly
  heading work, leftover on the same page families). Landed into
  `origin/main` (this worktree's HEAD-tree already contains the diff:
  privacy, privacy-choices, terms, support/privacy pairs each gain +10 lines
  of og:image + twitter:image meta).
- `git branch --contains 415c1cd5 -a` shows it on the historical branch
  `fix/public-social-preview-imagery`; `origin/main` carries the same diff.
- A duplicate sibling commit `7075178e` "fix(public): add social preview
  imagery to the 7 pages missing it" exists (sibling commit author/date
  identical). It is not on `origin/main`; the canonical commit on main is
  `415c1cd5`. No conflict — both diffs were the same.
- Three later "fix(public): guard the live site against missing social
  preview imagery" commits (`74a954b3` / `965507f2` / `e3e3e568`) add a
  live-guard module under `scripts/`. The merged one on main is
  `e3e3e568`. They sit alongside the npm test/ci wiring.

### 4. Live state — still stale on 7 of 12, exactly matching the original gap

Live HTTP fetches (`https://tinystudio.in/<path>`, 2026-08-17) confirm the
class gap as the live site sees it:

| Path | og:image on live? |
| --- | --- |
| `/` | yes (studio image) |
| `/contact/` | yes (studio image) |
| `/promptly/` | yes (promptly image) |
| `/drishti/` | yes (drishti image) |
| `/support/` | yes (studio image) |
| `/promptly/support/` | **no** |
| `/promptly/privacy/` | **no** |
| `/drishti/support/` | **no** |
| `/drishti/privacy/` | **no** |
| `/privacy/` | **no** |
| `/privacy-choices/` | **no** |
| `/terms/` | **no** |

5 of 12 pages have og:image on live; 7 of 12 do not. The 7 missing live are
exactly the set this gap item names (privacy, privacy-choices, terms, the
Promptly and Drishti support/privacy pairs). This matches the canonical
deploy-pipeline gap: production is a stale build that predates the merged
fix, identical to the gated situation every other lane-1 source-only fix
hits.

The social image files themselves are live (the `/social/*.png` URLs
return HTTP 200 for valid PNGs); only the HTML wrapper is stale on those 7
URLs.

### 5. Deploy blocker (the real gate, NEEDS-NISH)

- `.github/workflows/deploy-public-site.yml` is fail-closed: missing
  `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` aborts the run with the
  explicit step "Required Pages secrets not provisioned - fail loudly".
- `gh secret list -R nish3451/tinystudio-in` (re-verified 2026-08-17): only
  `CLOUDFLARE_ACCOUNT_ID` is present; `CLOUDFLARE_API_TOKEN` is still missing
  from the repo secret store — a Cloudflare dashboard action, not a code
  action.
- The deploy bundle is a verbatim copy of `public/`
  (`scripts/publish-public-site.mjs --prepare-only`), so once the token is
  provisioned the next main push carries the complete social share-image
  block to all 7 stale URLs.

## Why no source branch/PR was opened (re-implementing the fix)

The packet's fallback: "or by reporting plainly why the item cannot be
done." Three reasons stacked:

1. The fix is already merged into `origin/main` (`415c1cd5`) and added
   the same kind of diff any reopen would touch (privacy, privacy-choices,
   terms, support/privacy pairs each gain +10 lines).
2. The repo-level test gate the fix introduced
   (`scripts/test-public-social-preview.mjs`) passes locally in 0 failures
   across 137 checks.
3. The 7/12 live gap is the same upstream-pipeline blocker the previous
   lane-1 reports documented for the /promptly/social-share subset; only
   Nish provisioning the Cloudflare Pages:Edit token unblocks live.

Re-doing the merged, test-pinned work would touch no owned files and
duplicate shipped work, exactly the situation the packet's
re-implementation discipline warns against.

## What unblocks live delivery for the 7/12 pages

1. Nish provisions a Cloudflare Pages:Edit token:
   `gh secret set CLOUDFLARE_API_TOKEN -R nish3451/tinystudio-in`
2. The deploy lane runs on the next main push (or workflow_dispatch). The
   7 stale URLs pick up the merged fix together with all other ~18 merged
   public-side improvements stalled on the same gate.
3. This backlog item can then be ticked on live proof (re-pull each of the
   seven URLs, confirm og:image + twitter:image card appears; the gate
   `node scripts/test-public-social-preview.mjs` continues to pass at
   137/137).

## Files touched

- `.lane/reports/docs-lane1-social-preview-imagery-class-gap-reverify-20260817.md` —
  this report (unique to this lane)
- `agent-state/lanes/tinystudio-in/lane-1.json` — `claims` field updated
  with the report path before any other file edit (claim-publication
  contract)
- No repository source files changed. No PR opened.
