# Lane 1 report: Promptly and Drishti marketplace presence — re-verified 2026-08-20

Lane: tinystudio-in lane 1 (worktree tinystudio-in-lane1-20260820-191532)
Date: 2026-08-20
Outcome: **Truth re-verified live on 2026-08-20 and recorded in the canonical truth document — the claim still holds.**

## The one item

> [unreviewed-by-opus] Promptly and Drishti have zero indexed Product Hunt or AlternativeTo presence - prepare truth

## What was done

The canonical truth document `docs/research/app-marketplace-presence-truth-2026-08-09.md` (merged on main via PR #33, re-verified 2026-08-11/12/14 via PRs #58/#100/#139) was last checked 2026-08-14. This lane re-ran its documented re-verification procedure live on 2026-08-20 and appended a dated verdict entry. The claim still holds: **True as checked on 2026-08-20.**

## Verification performed (2026-08-20, all live)

### AlternativeTo (direct fetches, HTTP 200)

- On-platform search `?q=promptly` — 17 results, all unrelated third parties (Promptly AI chatbot builder, open-source Promptly blog tool, VK, Meeting On Time, PDFtoExcel.com, Interview Answers Generator, Prmptly.xyz, PromptYourJob, Promptzy, Promptless, PromptLock, PromptlessPress, PromptZyo, PromptLabHub, Windows Command Prompt, ...). Zero `tinystudio`/`tinystudio.in` occurrences. None is Tiny Studio's booking/no-show app.
- On-platform search `?q=drishti` — open-source scientific visualisation software "Drishti" plus fuzzy matches (Now&Me, Pollscape). None is Tiny Studio's mindful screen-time app.
- On-platform search `?q=tinystudio` — one fuzzy match (JPEG Lossless Rotator). No Tiny Studio listing.
- `https://alternativeto.net/software/tinystudio/about/` — HTTP 404, `404 - Page not found`, robots `noindex`. No listing exists.
- Wayback availability API for the software page — `{"archived_snapshots": {}}`, no archived capture ever.

### Product Hunt (search pages remain Cloudflare CAPTCHA-gated)

- Wayback capture 2025-01-25 of `producthunt.com/products/tinystudio` (direct fetch, HTTP 200) — still the unrelated Tinyfool Mac subtitle app ("Using AI to generate subtitles on Mac", launched 2023, App Store id 6448954288); zero `tinystudio.in` mentions. Not a Tiny Studio asset.
- Index check `site:producthunt.com "tinystudio.in"` (DuckDuckGo html endpoint) — "No results found".
- Brand-level `site:producthunt.com tinystudio` — only the Tinyfool app's forum/makers subpages plus irrelevant fuzzy leaderboard matches; zero `tinystudio.in` mentions.

### Index checks (DuckDuckGo html endpoint, direct fetches)

- `site:alternativeto.net "tinystudio.in"` — "No results found".
- `site:alternativeto.net "promptly" booking` — "No results found".
- `site:alternativeto.net tinystudio OR "tiny studio" promptly OR drishti` — hit a DuckDuckGo bot challenge; redundant with the three clean queries plus on-platform searches, so the verdict does not depend on it (documented in the doc).

### Live app pages

- `https://tinystudio.in/promptly/` — HTTP 200; zero occurrences of "Product Hunt" or "AlternativeTo"; no noindex/nofollow.
- `https://tinystudio.in/drishti/` — HTTP 200; zero occurrences of "Product Hunt" or "AlternativeTo"; no noindex/nofollow.
- `https://tinystudio.in/robots.txt` — `User-agent: *` / `Allow: /` / `Sitemap: https://tinystudio.in/sitemap.xml`.

All independent evidence lines agree: no Tiny Studio listing, page, or indexed mention of Promptly or Drishti on Product Hunt or AlternativeTo as of 2026-08-20.

## Files touched

- `docs/research/app-marketplace-presence-truth-2026-08-09.md` — appended the 2026-08-20 re-verification entry and updated the header's re-verified list.
- `.lane/reports/docs-lane1-marketplace-presence-reverify-20260820.md` — this report.
