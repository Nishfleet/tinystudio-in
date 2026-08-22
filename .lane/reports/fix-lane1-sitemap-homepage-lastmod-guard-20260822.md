# Item

Self-directed cycle, tinystudio-in lane 1: homepage `public/sitemap.xml` `<lastmod>` was 8 days stale (`2026-08-14`) versus the real last content change of `public/index.html` (`a8387869`, dated `2026-08-22`). Nothing in CI failed when a public page edit landed without restamping `lastmod`.

# Why (drift history: pre-#116 rot -> PR #116 -> PR #227 2026-08-21 -> broken again by a8387869 2026-08-22)

This is the third recurrence of sitemap `lastmod` drift:

1. Pre-#116: dates stuck at `2026-05-20` and 7 of 12 URLs missing `<lastmod>`.
2. PR #116 (`67222dd1`, 2026-08-13) restamped from git history. Snapshot, no detector.
3. PR #227 (merged 2026-08-21) restamped all 12 again after later HTML edits. Home became `2026-08-14` from `497d690c`. Still no detector.
4. `a8387869` (2026-08-22) changed `public/index.html` (homepage JSON-LD Organization/WebSite copy). Home `<lastmod>` stayed `2026-08-14`.

# Overlap vs open PRs (#207 stale-base sitemap hunk, no guard; #249/#245/#216/#206 unrelated files)

Checked open PRs at packet time: #249, #245, #216, #207, #206.

- #207 touches `public/sitemap.xml` from a pre-#227 base (home `2026-08-09` -> `2026-08-20`, already superseded by `a8387869` `2026-08-22`) and adds no freshness guard. It only adds the future `/website-correction/` URL. Merge-order: whichever of #207 and this branch merges second rebases; #207's home stamp `2026-08-20` is stale versus `a8387869`.
- #249 / #245 own `public/llms.txt`.
- #216 owns homepage title/meta.
- #206 owns a public voice test.

None of those five add a lastmod freshness guard or restamp home to `2026-08-22`.

# What changed (the three files)

- `public/sitemap.xml` — home `<lastmod>` `2026-08-14` -> `2026-08-22`. No other byte. The other 11 entries were already correct.
- `scripts/test-public-sitemap-lastmod.mjs` — new CI guard: each sitemap `lastmod` must equal `git log -1 --format=%cs --diff-filter=AM origin/main -- <backing html>`.
- `package.json` — insert `node scripts/test-public-sitemap-lastmod.mjs` into both `"ci"` and `"test"` immediately after the homepage JSON-LD offer test.

Sweep on origin/main `4604b9b8` before the home restamp (methodology: `git log -1 --format=%cs --diff-filter=AM origin/main -- <backing>`):

| loc | sitemap lastmod | backing file | git %cs | backing SHA | status |
| --- | --- | --- | --- | --- | --- |
| https://tinystudio.in/ | 2026-08-14 | public/index.html | 2026-08-22 | a8387869 | STALE |
| https://tinystudio.in/support/ | 2026-08-14 | public/support/index.html | 2026-08-14 | b117084e | OK |
| https://tinystudio.in/contact/ | 2026-08-14 | public/contact/index.html | 2026-08-14 | b117084e | OK |
| https://tinystudio.in/privacy/ | 2026-08-17 | public/privacy/index.html | 2026-08-17 | 2dc939f4 | OK |
| https://tinystudio.in/privacy-choices/ | 2026-08-14 | public/privacy-choices/index.html | 2026-08-14 | b117084e | OK |
| https://tinystudio.in/terms/ | 2026-08-17 | public/terms/index.html | 2026-08-17 | 2dc939f4 | OK |
| https://tinystudio.in/promptly/ | 2026-08-14 | public/promptly/index.html | 2026-08-14 | 2796b33e | OK |
| https://tinystudio.in/promptly/support/ | 2026-08-14 | public/promptly/support/index.html | 2026-08-14 | b117084e | OK |
| https://tinystudio.in/promptly/privacy/ | 2026-08-17 | public/promptly/privacy/index.html | 2026-08-17 | 2dc939f4 | OK |
| https://tinystudio.in/drishti/ | 2026-08-14 | public/drishti/index.html | 2026-08-14 | 2796b33e | OK |
| https://tinystudio.in/drishti/support/ | 2026-08-14 | public/drishti/support/index.html | 2026-08-14 | b117084e | OK |
| https://tinystudio.in/drishti/privacy/ | 2026-08-17 | public/drishti/privacy/index.html | 2026-08-17 | 2dc939f4 | OK |

# Verification

1. Fresh base:

```
$ git merge-base --is-ancestor origin/main HEAD && echo FRESH
FRESH
```

2. Guard passes post-fix:

```
$ node scripts/test-public-sitemap-lastmod.mjs
test-public-sitemap-lastmod: every sitemap lastmod matches the backing page's last change date on origin/main
  ok https://tinystudio.in/ lastmod=2026-08-22
  ok https://tinystudio.in/support/ lastmod=2026-08-14
  ok https://tinystudio.in/contact/ lastmod=2026-08-14
  ok https://tinystudio.in/privacy/ lastmod=2026-08-17
  ok https://tinystudio.in/privacy-choices/ lastmod=2026-08-14
  ok https://tinystudio.in/terms/ lastmod=2026-08-17
  ok https://tinystudio.in/promptly/ lastmod=2026-08-14
  ok https://tinystudio.in/promptly/support/ lastmod=2026-08-14
  ok https://tinystudio.in/promptly/privacy/ lastmod=2026-08-17
  ok https://tinystudio.in/drishti/ lastmod=2026-08-14
  ok https://tinystudio.in/drishti/support/ lastmod=2026-08-14
  ok https://tinystudio.in/drishti/privacy/ lastmod=2026-08-17
sitemap lastmod freshness: 12 checked, 0 skipped, 0 failures
```

exit 0.

3. Wiring landed in both chains:

```
$ grep -c 'scripts/test-public-sitemap-lastmod.mjs' package.json
2
```

4. Sitemap well-formed, 12 URLs, home restamped:

Spec one-liner uses `.//url`, which does not match default-namespaced `{http://www.sitemaps.org/schemas/sitemap/0.9}url` on this pre-existing xmlns (already on origin/main). Namespace-aware count plus the spec's grep:

```
$ python3 -c "import xml.etree.ElementTree as ET;us=ET.parse('public/sitemap.xml').findall('.//{*}url');assert len(us)==12;print(len(us))" && grep -A1 '<loc>https://tinystudio.in/</loc>' public/sitemap.xml | grep -o '2026-08-22'
12
2026-08-22
```

exit 0.

5. Diff surface is exactly four paths (after this report commit):

```
$ git diff origin/main --name-only
.lane/reports/fix-lane1-sitemap-homepage-lastmod-guard-20260822.md
package.json
public/sitemap.xml
scripts/test-public-sitemap-lastmod.mjs
```

Untracked leftover `.lane/reports/lane1-self-directed-retire-pr204-20260822.md` was not staged.

6. Full gate:

```
$ npm run ci
```

exit 0, elapsed_ms 113267. Tail including the new guard:

```
test-public-sitemap-lastmod: every sitemap lastmod matches the backing page's last change date on origin/main
  ok https://tinystudio.in/ lastmod=2026-08-22
  ok https://tinystudio.in/support/ lastmod=2026-08-14
  ok https://tinystudio.in/contact/ lastmod=2026-08-14
  ok https://tinystudio.in/privacy/ lastmod=2026-08-17
  ok https://tinystudio.in/privacy-choices/ lastmod=2026-08-14
  ok https://tinystudio.in/terms/ lastmod=2026-08-17
  ok https://tinystudio.in/promptly/ lastmod=2026-08-14
  ok https://tinystudio.in/promptly/support/ lastmod=2026-08-14
  ok https://tinystudio.in/promptly/privacy/ lastmod=2026-08-17
  ok https://tinystudio.in/drishti/ lastmod=2026-08-14
  ok https://tinystudio.in/drishti/support/ lastmod=2026-08-14
  ok https://tinystudio.in/drishti/privacy/ lastmod=2026-08-17
sitemap lastmod freshness: 12 checked, 0 skipped, 0 failures
```

7. PR exists and is open (filled after `gh pr create`):

```
$ gh pr view --json state,headRefName
```

8. Claims published atomically:

```
$ jq -r '.claims|join(",")' /home/nish/workspaces/agent-state/lanes/tinystudio-in/lane-1.json
public/sitemap.xml,scripts/test-public-sitemap-lastmod.mjs,package.json,.lane/reports/fix-lane1-sitemap-homepage-lastmod-guard-20260822.md
```

# Files touched

- `public/sitemap.xml` — restamp homepage lastmod to 2026-08-22
- `scripts/test-public-sitemap-lastmod.mjs` — new lastmod freshness guard
- `package.json` — wire the guard into `ci` and `test`
- `.lane/reports/fix-lane1-sitemap-homepage-lastmod-guard-20260822.md` — this evidence file
