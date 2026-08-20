# Lane 1 report: reverify "six trust/support pages carry no JSON-LD" item — already merged on main, live already green

## Item

- [unreviewed-by-opus] Six trust/support pages carry no JSON-LD structured data while the other six public pages do

## Verdict

**No source change is possible or needed — the structured-data fix is already merged on main (PR #26, commit `ffe6e1fc`), and the live deploy guard added in PR #127 (commit `786e9650`, merged at `607e99e4`) confirms all twelve public paths now return 200 with exactly one `application/ld+json` block on the live site. Both source invariant and live proofs pass on a fresh checkout of `origin/main`. Accept already met.**

## Evidence

### 1. Source state — fixed on main, structured-data regression extended to all 12 routes

- Source-fix commit `ffe6e1fc` ("fix(public): add JSON-LD structured data to trust and support pages (#26)") is an ancestor of fresh `origin/main` (`161b27f`):
  `git merge-base --is-ancestor ffe6e1fc 161b27f` → true.
- PR #26 added truthful, page-type-grounded JSON-LD to the six named trust/support pages without changing copy, layout, or routing:

| File | @graph @types carried live |
| ---- | ---- |
| `public/privacy/index.html` | `Organization`, `WebPage` |
| `public/privacy-choices/index.html` | `Organization`, `WebPage` |
| `public/terms/index.html` | `Organization`, `WebPage` |
| `public/drishti/privacy/index.html` | `Organization`, `WebPage` |
| `public/drishti/support/index.html` | `Organization`, `ContactPage` |
| `public/promptly/support/index.html` | `Organization`, `ContactPage` |

The Organization block at `@id https://tinystudio.in/#organization` and the per-page `WebPage`/`ContactPage` node carry identical canonical URL, `<title>` text, and `<meta name="description">` content as the visible HTML, exactly matching the schema-level invariant from `scripts/test-public-structured-data.mjs` (one Organization reference, one page node per page, name = title, description = description, url = canonical, `isPartOf @id` = `https://tinystudio.in/#website`, `about @id` = organization). PR #26 made no launch / data-collection / retention / capability claim beyond what each page already says — the structured data is grounded in visible copy only.

- Structured-data regression `scripts/test-public-structured-data.mjs` was extended in PR #26 to:
  - Section A — assert each of eight audited pages (the original two plus the six trust/support pages plus `public/drishti/privacy/index.html` and `public/drishti/support/index.html`) has exactly one `application/ld+json` block, parses to JSON, uses `https://schema.org` as the `@context`, declares an `Organization` reference plus the correct page `@type` (`ContactPage` for support pages, `WebPage` for everything else), and matches the visible HTML on canonical / title / description / `isPartOf` / `about`.
  - Section B — invariant that **every** `public/**/index.html` (12 pages) carries exactly one `application/ld+json` block, so a future page can never ship without structured data again.
  - Section C — wires the regression into both `npm test` and `npm run ci`.
- Live on this checkout (branch `lane1-trust-support-jsonld-already-merged`, fresh off `origin/main` = `161b27f`):
  - `node scripts/test-public-structured-data.mjs` → **127 checks, 0 failures** (exit 0).
  - `node scripts/test-public-deploy-bundle.mjs` → 73 checks, 0 failures (PR #127 added three per-page JSON-LD survival assertions to `NEUTRAL_PROOFS`).
  - `npm test` and `npm run ci` both run the structured-data regression (package.json lines 96/98).

### 2. Live state — green on tinystudio.in for every one of the six previously-missing pages

- `node scripts/check-public-live-deploy.mjs` (proof F, "every public page carries structured data (PR #26)") returned the live proof green against `https://tinystudio.in/`:

```
F. every public page carries structured data (PR #26)
  ok / returns 200 (got 200)
  ok / carries exactly one application/ld+json block (got 1)
  ok /contact/ returns 200 (got 200)
  ok /contact/ carries exactly one application/ld+json block (got 1)
  ok /support/ returns 200 (got 200)
  ok /support/ carries exactly one application/ld+json block (got 1)
  ok /privacy/ returns 200 (got 200)
  ok /privacy/ carries exactly one application/ld+json block (got 1)
  ok /privacy-choices/ returns 200 (got 200)
  ok /privacy-choices/ carries exactly one application/ld+json block (got 1)
  ok /terms/ returns 200 (got 200)
  ok /terms/ carries exactly one application/ld+json block (got 1)
  ok /promptly/ returns 200 (got 200)
  ok /promptly/ carries exactly one application/ld+json block (got 1)
  ok /promptly/support/ returns 200 (got 200)
  ok /promptly/support/ carries exactly one application/ld+json block (got 1)
  ok /promptly/privacy/ returns 200 (got 200)
  ok /promptly/privacy/ carries exactly one application/ld+json block (got 1)
  ok /drishti/ returns 200 (got 200)
  ok /drishti/ carries exactly one application/ld+json block (got 1)
  ok /drishti/support/ returns 200 (got 200)
  ok /drishti/support/ carries exactly one application/ld+json block (got 1)
  ok /drishti/privacy/ returns 200 (got 200)
  ok /drishti/privacy/ carries exactly one application/ld+json block (got 1)
```

Full live run on `2026-08-20`: **240 checks, 0 failures** — every previously-missing trust/support page and every other public path is live with exactly one `application/ld+json` block.

- Independent curl sanity check (2026-08-20, no auth required) on the six pages named in the original finding:

```
/privacy/                  HTTP 200 ld+json=1
/privacy-choices/          HTTP 200 ld+json=1
/terms/                    HTTP 200 ld+json=1
/promptly/support/         HTTP 200 ld+json=1
/drishti/support/          HTTP 200 ld+json=1
/drishti/privacy/          HTTP 200 ld+json=1
```

The live deploy-pipeline gate that previously held the six pages at `ld+json=0` even after the source fix is no longer triggering for any of these paths.

### 3. Why this lane did not edit the worktree

- The original finding's two acceptance branches — "each of the six pages gains truthful JSON-LD consistent with the existing blocks" and "the existing structured-data regression is extended to cover all 12 routes" — are both already met on `origin/main` by merged work:
  - Source branch: PR #26 (`ffe6e1fc`), merged 2026-08-09.
  - Source regression extension: same PR #26 added Section B invariant on all 12 pages.
  - Live guard: PR #127 (`c1326331` → `786e9650`, merged via `607e99e4` 2026-08-19), `scripts/check-public-live-deploy.mjs` proof F plus `scripts/prepare-public-deploy-bundle.mjs` `NEUTRAL_PROOFS` per-page assertions.
- The worktree changed branch from `main` to `lane1-trust-support-jsonld-already-merged` (no file edits) to satisfy "branch from fresh origin/main, push early, open a PR" — pushing the branch and opening the PR lets the controller record the reverify without claiming ownership of the prior fix work.
- The lane report is the only new artifact this lane wrote (`claims: ['.lane/reports/lane1-trust-support-jsonld-already-merged.md']`).

## Files

None changed (verification-only run). Prior fixes that closed the finding (do not duplicate):
- Source fix: PR #26 commit `ffe6e1fc` — added JSON-LD to the six trust/support pages and extended `scripts/test-public-structured-data.mjs` to cover all 12 routes (`public/privacy/index.html`, `public/privacy-choices/index.html`, `public/terms/index.html`, `public/drishti/privacy/index.html`, `public/drishti/support/index.html`, `public/promptly/support/index.html`, plus `public/promptly/privacy/index.html` and the regression).
- Live guard: PR #127 commits `c1326331` + `786e9650` merged at `607e99e4` — added proof F (`scripts/check-public-live-deploy.mjs`) and per-page JSON-LD survival assertions in `scripts/prepare-public-deploy-bundle.mjs`.

This lane only wrote:
- `.lane/reports/lane1-trust-support-jsonld-already-merged.md` (this report)
