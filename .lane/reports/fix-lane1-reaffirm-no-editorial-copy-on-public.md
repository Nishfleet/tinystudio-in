# Lane 1 report — reaffirm: internal editorial / submission-prep notes no longer visible on any public tinystudio.in page

- Item: `[unreviewed-by-opus] Internal editorial and submission-prep notes are live as visible copy on four public app pages`
- Item ID: `de469a3800`
- Branch: `fix/lane1-reaffirm-no-editorial-copy-on-public`
- Worktree: `/home/nish/workspaces/agent-worktrees/tinystudio-in-lane1-20260820-203031`
- Date: 2026-08-20

## Verification on `e18c176` (origin/main)

The four named app pages — `public/drishti/index.html`,
`public/drishti/privacy/index.html`, `public/promptly/index.html`,
`public/promptly/privacy/index.html` — carry only visitor-facing copy on
both the local main branch (HEAD `e18c1763`) and on
`https://tinystudio.in/...`.

- `git grep -in 'launch\|app store\|submission\|reviewer\|staging\|not publicly released\|current release scope\|planned launch\|where to go next\|current build\|in the meantime\|should stay aligned\|should be updated before\|before that version is submitted\|getting ready' public/`
  → 0 matches across all `public/*.html` files.
- `node scripts/test-public-app-copy-voice.mjs` → 62 checks, 0 failures.
- `node scripts/test-public-support-contact-voice.mjs` → 42 checks, 0 failures.
- Live site sweep (case-insensitive) over `https://tinystudio.in/{,promptly/,drishti/,promptly/privacy/,drishti/privacy/,promptly/support/,drishti/support/,privacy/,privacy-choices/,terms/,support/,contact/,404.html}`
  → 0 matches for any editorial / submission-prep fragment.

The earlier lane report `.lane/reports/fix-lane1-submission-prep-notes-visible-copy.md`
documents the same fix landing on `fix/lane1-submission-prep-notes-visible-copy`
via commit `2dc939f4` and being merged into main in PR #186
(`cc7ce142`). No later commit in `git log` reintroduces any of the
tracked editorial phrases on the four named app pages or anywhere else
in `public/`. The deploy path report chain (PRs #198 / #199 / #200)
shows Cloudflare Pages deploys are healthy again, so the live site is
no longer stuck on stale content for this finding.

## Strengthening: whole-tree regression guard

To make a reintroduction impossible to silently miss, this branch adds
`scripts/test-public-no-editorial-or-submission-prep-copy.mjs` and wires
it into `npm test` and `npm run ci`. The new test:

- Walks `public/` and lists every `*.html` page (13 today).
- Asserts none of them contain, case-insensitively, any of 34 forbidden
  fragments spanning the full editorial / submission-prep voice that
  has ever leaked into the public site: launch / release / submission /
  reviewer / staging / "where to go next" / "current build" /
  "in the meantime" / "should be updated before" /
  "before that version is submitted" / "getting ready" /
  "app store connect" / "appstoreconnect" / "app store metadata" / etc.
- Asserts the test is wired into both `npm test` and `npm run ci`.

The two pre-existing narrower guards
(`test-public-app-copy-voice.mjs`, 4 pages / 13 fragments) and
(`test-public-support-contact-voice.mjs`, 2 pages / 13 fragments) stay
in place as explicit per-area coverage; this new test extends the same
constraint to every other public page (home, 404, terms, privacy hub,
privacy-choices, support, contact, per-app support pages).

## Files touched

- `scripts/test-public-no-editorial-or-submission-prep-copy.mjs` — new.
  Walks `public/`, forbids 34 fragments everywhere, asserts the page
  set includes all expected entries, asserts `package.json` wires the
  test into `npm test` and `npm run ci`.
- `package.json` — adds the new test to both `scripts.test` and
  `scripts.ci` (placed right after `test-public-brand-tagline.mjs` to
  match the existing chain).

## Validation

- `node scripts/test-public-no-editorial-or-submission-prep-copy.mjs`
  → 458 checks, 0 failures.
- `node scripts/test-public-app-copy-voice.mjs` → 62 checks, 0 failures.
- `node scripts/test-public-support-contact-voice.mjs`
  → 42 checks, 0 failures.
- `node scripts/test-public-meta-descriptions.mjs`
  → 98 checks, 0 failures.
- `node scripts/test-public-footer-copy.mjs`
  → 146 checks, 0 failures.
- `git diff --check` → clean.
- Live `https://tinystudio.in/` family → 0 hits for any tracked
  editorial / submission-prep fragment.

## Notes

- The item's text originally read "...four public app page" (singular
  "page" at the end). All interpretations — the four named
  Promptly/Drishti product + privacy pages, plus any four-of-the-other
  public pages — resolve to a clean state on `e18c176`; the only
  meaningful contribution this branch makes is to lock that clean
  state in with a broader regression guard so the same regression
  cannot reappear on the home, terms, privacy hub, privacy-choices, or
  app support pages without failing CI.
