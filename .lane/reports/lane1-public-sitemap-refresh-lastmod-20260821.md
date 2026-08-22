# Lane 1 report: refresh the public sitemap (stale lastmod dates)

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260821-031534)
Date: 2026-08-21
Branch: `lane1/public-sitemap-refresh-lastmod-20260821`
PR: https://github.com/nish3451/tinystudio-in/pull/227
Outcome: **Fix committed, pushed, PR opened. Every `lastmod` re-sourced from the last commit on `origin/main` that touched the corresponding HTML file; 12 URLs, 12 `lastmod` entries, 0 missing.**

## The one item

> [unreviewed-by-opus] Refresh the public sitemap: lastmod dates stale (2026-05-20) and missing on 7 of 12 URLs.

## Why this needed a refresh again

The previous refresh was merged in PR #116 (commit `67222dd1`, 2026-08-13). It correctly closed the original "2026-05-20" / missing-`lastmod` defect by sourcing each `lastmod` from the last main commit that touched the corresponding HTML file at that time.

Since then, eight public HTML files have been edited by other merged fixes:

| Commit | Date | Subject | Files |
|---|---|---|---|
| `b117084e` | 2026-08-14 | fix(public): disambiguate Tiny Studio identity across every page and llms.txt | `/support/`, `/contact/`, `/privacy-choices/`, `/promptly/support/`, `/drishti/support/`, `/privacy/`, `/promptly/privacy/`, `/terms/`, `/drishti/privacy/` |
| `2796b33e` | 2026-08-14 | fix(public): keep product hero early-access CTA in the first mobile viewport | `/promptly/`, `/drishti/` |
| `497d690c` | 2026-08-14 | fix(public): repair homepage managed-service heading hierarchy (H2->H3) | `/` |
| `2dc939f4` | 2026-08-17 | fix(public): replace internal submission-prep notes on four pages | `/privacy/`, `/terms/`, `/promptly/privacy/`, `/drishti/privacy/` |

Every `lastmod` in the sitemap was therefore stale relative to its actual content history. The "5 stale 2026-05-20 dates + 7 missing lastmod" complaint had been resolved by PR #116, but the snapshot nature of that fix left the file drifting again on every subsequent public edit. This PR restamps every `lastmod` to the current source of truth.

## What changed

`public/sitemap.xml` — one file, 12 `lastmod` updates:

| URL | Old lastmod | New lastmod | Source commit (HTML diff-filter=M, origin/main) |
|---|---|---|---|
| `/` | 2026-08-09 | **2026-08-14** | `497d690c` |
| `/support/` | 2026-08-10 | **2026-08-14** | `b117084e` |
| `/contact/` | 2026-08-10 | **2026-08-14** | `b117084e` |
| `/privacy/` | 2026-08-11 | **2026-08-17** | `2dc939f4` |
| `/privacy-choices/` | 2026-08-10 | **2026-08-14** | `b117084e` |
| `/terms/` | 2026-08-11 | **2026-08-17** | `2dc939f4` |
| `/promptly/` | 2026-08-10 | **2026-08-14** | `2796b33e` |
| `/promptly/support/` | 2026-08-10 | **2026-08-14** | `b117084e` |
| `/promptly/privacy/` | 2026-08-10 | **2026-08-17** | `2dc939f4` |
| `/drishti/` | 2026-08-10 | **2026-08-14** | `2796b33e` |
| `/drishti/support/` | 2026-08-10 | **2026-08-14** | `b117084e` |
| `/drishti/privacy/` | 2026-08-11 | **2026-08-17** | `2dc939f4` |

Every date matches `git log origin/main --format="%as" --diff-filter=M -1 -- <html>` for the HTML file behind that URL, to the day.

## Verification

- **Structure**: Python `xml.etree.ElementTree.parse` succeeds; 12 `<url>` children, 12 `<lastmod>` children, 0 missing — same invariant as PR #116.
- **Source alignment**: each `lastmod` equals the date of the last commit on `origin/main` that touched the backing HTML file (`git log --diff-filter=M -1`).
- **Live state (status, not blocking)**: `https://tinystudio.in/sitemap.xml` currently serves the PR #116 values from the 2026-08-20 deploy. After this PR merges, the next deploy lane run will replace those with the refreshed dates.
- **No other files touched**: claims list contains only `public/sitemap.xml`; no test, workflow, or build artifact was modified.

## Live-deploy gate (informational, NEEDS-NISH)

Live delivery is owned by the deploy lane. PR #227 is one-file and trivially mergeable; the deploy gate (and the gap that previously held up the 2026-08-14 -> 2026-08-20 deploys) is outside this lane's scope. The recent `fix(release)` series on `main` (#208 CF_API_BASE typo, #209 Node 22, #211 acceptance section J) is the canonical fix path; nothing in PR #227 reopens or duplicates that work.

## Files touched

- `public/sitemap.xml` — 12 line edits (one per `lastmod`)
- `/home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json` — `claims` field set to `["public/sitemap.xml"]` (atomic temp-file + rename)
- `.lane/reports/lane1-public-sitemap-refresh-lastmod-20260821.md` — this report

No other control-plane or repository file was modified.
