# App marketplace presence truth: Promptly and Drishti

First checked: 2026-08-09 (baseline below). Re-verified: 2026-08-11, 2026-08-12, 2026-08-14 (see re-verification log).

## Claim

Promptly and Drishti (Tiny Studio's two public apps) have zero indexed Product Hunt or AlternativeTo presence.

## Verdict

**True as checked on 2026-08-09.** Neither app has a listing, page, or indexed mention owned by Tiny Studio on Product Hunt or AlternativeTo. All name-matching results belong to unrelated third parties. This document records the exact checks so the claim can be re-verified.

## What was checked

- On-platform search on Product Hunt (`https://www.producthunt.com/search`) for `promptly`, `drishti`, and `tiny studio`.
- On-platform search on AlternativeTo (`https://alternativeto.net/browse/search/`) for `promptly` and `drishti`.
- Web index checks via DuckDuckGo site-restricted queries for any `tinystudio.in` or Tiny Studio reference on either platform.
- The live app pages (`https://tinystudio.in/promptly/`, `https://tinystudio.in/drishti/`) for links to either platform and for crawl blocking.

## Findings

### Product Hunt

| Query | Result |
|---|---|
| `promptly` | 5+ unrelated products named "Promptly": a no-code generative AI app builder, a ChatGPT master plugin, an AI-prompt saver, a no-code web page editor, and a customer-support email autopilot. None is Tiny Studio's booking/no-show app; none links to tinystudio.in. |
| `drishti` | "No products found for 'drishti'." Zero results. |
| `tiny studio` | Fuzzy matches only (Supernotes, PicSo, Kapwing, etc.). The exact-name product page `producthunt.com/products/tinystudio` is an unrelated Mac app ("Using AI to generate subtitles on Mac", launched 2023, maker handle `tinyfool`, App Store id 6448954288). It is a different brand, not this Tiny Studio; its site is an Apple App Store listing, not tinystudio.in. |
| `site:producthunt.com "tinystudio.in"` | No results. |

### AlternativeTo

| Query | Result |
|---|---|
| `promptly` | "Promptly AI" (chatbot builder) and "Promptly" (open-source blog publishing tool) plus fuzzy matches (Prmptly.xyz, Promptless, etc.). None is Tiny Studio's booking/no-show app; none links to tinystudio.in. |
| `drishti` | "Drishti" (open-source scientific visualization software for volumetric/tomography data) plus fuzzy matches (Now&Me, Pollscape). None is Tiny Studio's mindful screen-time app. |
| `site:alternativeto.net "tinystudio.in"` | No results. |
| `site:alternativeto.net tinystudio OR "tiny studio" promptly OR drishti` | No results. |
| `site:alternativeto.net "promptly" booking` | No results. |

### Live app pages

- `https://tinystudio.in/promptly/` returns HTTP 200.
- `https://tinystudio.in/drishti/` returns HTTP 200.
- Neither page contains the words "Product Hunt" or "AlternativeTo" (zero matches in page HTML).
- Neither page carries a `noindex`/`nofollow` robots meta; `robots.txt` allows crawling of all paths and lists the sitemap.
- The pages are pre-launch product pages with an early-access mailto CTA; they are not listed on either marketplace.

## Interpretation boundary

- "Zero indexed presence" means no marketplace listing, profile, review page, or mention owned by or attributable to Tiny Studio's Promptly and Drishti on Product Hunt or AlternativeTo. It does not claim anything about the unrelated third parties that share the names.
- The generic names "Promptly" and "Drishti" collide with unrelated products on both platforms. That collision is a naming/positioning risk to manage, not a Tiny Studio presence.
- Product Hunt's exact-name "TinyStudio" page belongs to a different company's Mac subtitle app. It is not a Tiny Studio asset and must not be claimed or treated as one.
- Absence of indexed results is evidence of absence on these platforms as of the check date; it is not a claim that no listing can ever exist later. Re-check before any launch or before any "listed on Product Hunt/AlternativeTo" claim.

## Re-verification

To re-verify, repeat the on-platform searches and the two site-restricted queries above. The claim is falsified iff a Product Hunt or AlternativeTo page owned by or attributable to Tiny Studio's Promptly or Drishti (linking to tinystudio.in or named as Tiny Studio's app) appears in any of them. Each re-check is recorded in the re-verification log below with its date and verdict.

## Re-verification log

### 2026-08-11 — re-checked, claim still holds

**Verdict: True as checked on 2026-08-11.** No Tiny Studio listing, page, or indexed mention of Promptly or Drishti on Product Hunt or AlternativeTo. The 2026-08-09 baseline was re-run live; every name-matching result still belongs to an unrelated third party.

Re-checked live on 2026-08-11:

- Product Hunt on-platform search (`https://www.producthunt.com/search`) for `promptly` — same 5+ unrelated products as 2026-08-09 (no-code GenAI app builder, ChatGPT plugin, AI-prompt saver, no-code web page editor, support email autopilot); none links to tinystudio.in.
- Product Hunt search for `drishti` — "No products found for 'drishti'." Zero results.
- Product Hunt search for `tiny studio` — fuzzy matches only (Supernotes, PicSo, Kapwing, HockeyStack, etc.).
- Product Hunt exact-name page `producthunt.com/products/tinystudio` — still the unrelated Mac subtitle app (maker handle `tinyfool`, launched 2023, App Store id 6448954288); its site is the App Store listing, not tinystudio.in.
- AlternativeTo on-platform search (`https://alternativeto.net/browse/search/`) for `promptly` — 17 results, all unrelated (generative-AI chatbot builder, open-source blog tool, VK, meeting reminders, PDF converters, prompt libraries, etc.); none is Tiny Studio's booking/no-show app and none links to tinystudio.in.
- AlternativeTo search for `drishti` — the open-source scientific visualisation software "Drishti" plus fuzzy matches (Now&Me, etc.); none is Tiny Studio's mindful screen-time app.
- AlternativeTo search for `tinystudio` — one fuzzy match (JPEG Lossless Rotator); no Tiny Studio listing.
- AlternativeTo software page `https://alternativeto.net/software/tinystudio/about/` — HTTP 404, no listing exists. The Wayback CDX index holds zero archived `alternativeto.net/software/tinystudio*` URLs.
- Index checks (DuckDuckGo site-restricted): `site:producthunt.com "tinystudio.in"` — no results; `site:alternativeto.net "tinystudio.in"` — no results; `site:alternativeto.net tinystudio OR "tiny studio" promptly OR drishti` — no results; `site:alternativeto.net "promptly" booking` — no results. Brave returns only fuzzy word matches for the cleaned query "tinystudio.in" on both domains (Tiiny Host, TinyMCE, TinyLaunch, Tiny11, TinyPod, Tight Studio, etc.); none references tinystudio.in or Tiny Studio's apps.
- Live app pages: `https://tinystudio.in/promptly/` and `https://tinystudio.in/drishti/` — both HTTP 200; neither contains "Product Hunt" or "AlternativeTo" (zero matches in page HTML); neither carries a `noindex`/`nofollow` robots meta; `robots.txt` allows crawling of all paths and lists the sitemap.

Method note for re-runs: as of 2026-08-11, direct AlternativeTo fetches and several general indexes (DuckDuckGo, Bing, Brave, Startpage, Ecosia, Mojeek) bot-gate direct requests from datacenter egress. The on-platform AlternativeTo searches and the DuckDuckGo site-restricted queries above were re-run through the r.jina.ai reader proxy (live page fetch of the same URLs). The verdict does not depend on any single index: the on-platform searches, the 404 software page, the empty Wayback CDX history, and all four DuckDuckGo site-restricted queries agree.

### 2026-08-12 — re-checked, claim still holds

**Verdict: True as checked on 2026-08-12.** No Tiny Studio listing, page, or indexed mention of Promptly or Drishti on Product Hunt or AlternativeTo. The 2026-08-11 re-check was re-run live; every name-matching result still belongs to an unrelated third party.

Re-checked live on 2026-08-12:

- AlternativeTo on-platform search (`https://alternativeto.net/browse/search/?q=promptly`, via the r.jina.ai reader proxy) — ~12 results, all unrelated: a no-code generative-AI chatbot builder, an open-source blog tool, VK, Meeting On Time (Outlook meeting reminder), a PDF-to-Excel converter, an AI interview answers generator, Prmptly (AI-prompt community), PromptYourJob, a cross-AI prompt/skill manager, and Promptless (docs automation). None is Tiny Studio's booking/no-show app; none links to tinystudio.in.
- AlternativeTo search for `drishti` — "Drishti" (open-source scientific visualisation software for volumetric/tomography data) plus fuzzy matches (Now&Me, Pollscape). None is Tiny Studio's mindful screen-time app.
- AlternativeTo search for `tinystudio` — one fuzzy match (JPEG Lossless Rotator); no Tiny Studio listing.
- AlternativeTo software page `https://alternativeto.net/software/tinystudio/about/` — HTTP 404 "Page not found", no listing exists. The Wayback CDX index holds zero archived `alternativeto.net/software/tinystudio*` URLs (empty result set).
- Product Hunt exact-name page `producthunt.com/products/tinystudio` — direct fetch and r.jina.ai fetch are Cloudflare CAPTCHA-gated today (stronger than on 2026-08-11, when the proxy could read search results). Wayback holds exactly one capture of the page (2023-05-30); it is still the unrelated Mac subtitle app: Product Hunt title "TinyStudio - Product Information, Latest Updates, and Reviews 2023", maker handle `Tinyfool`, tagline "Using AI to generate subtitles on Mac". Not a Tiny Studio asset.
- Index checks (DuckDuckGo site-restricted, via the r.jina.ai reader proxy): `site:producthunt.com "tinystudio.in"` — no results; `site:alternativeto.net "tinystudio.in"` — no results; `site:alternativeto.net tinystudio OR "tiny studio" promptly OR drishti` — no results; `site:alternativeto.net "promptly" booking` — no results.
- Brand-level check: `site:producthunt.com tinystudio` — the only Product Hunt pages are subpages of the unrelated Tinyfool app (`producthunt.com/p/tinystudio` forum, `producthunt.com/products/tinystudio/makers`) plus irrelevant fuzzy leaderboard matches; none references tinystudio.in or Tiny Studio's apps.
- Live app pages: `https://tinystudio.in/promptly/` and `https://tinystudio.in/drishti/` — both HTTP 200; neither contains "Product Hunt" or "AlternativeTo" (zero matches in page HTML); neither carries a `noindex`/`nofollow` robots meta; `robots.txt` still allows crawling of all paths and lists the sitemap.

Method note: on 2026-08-12 Product Hunt hard-blocks direct fetches, r.jina.ai proxy fetches, and Wayback-forwarded fetches of its search pages behind Cloudflare CAPTCHA, so the on-platform PH search could not be re-run live. The PH side of the verdict rests on the empty `site:producthunt.com "tinystudio.in"` index query (the falsifier for "owned page linking to tinystudio.in"), the brand-level `site:producthunt.com tinystudio` query (all results belong to the unrelated Tinyfool app), and the Wayback capture of the exact-name page. One additional proxy query (`site:producthunt.com "tiny studio" promptly OR drishti`) hit a DuckDuckGo anomaly challenge even through the proxy; it is redundant with the two clean queries above, so the verdict does not depend on it. All independent evidence lines agree.

### 2026-08-14 — re-checked, claim still holds

**Verdict: True as checked on 2026-08-14.** No Tiny Studio listing, page, or indexed mention of Promptly or Drishti on Product Hunt or AlternativeTo. The 2026-08-12 re-check was re-run live; every name-matching result still belongs to an unrelated third party.

Re-checked live on 2026-08-14:

- AlternativeTo on-platform search for `promptly` (`https://alternativeto.net/browse/search/?q=promptly`, via the r.jina.ai reader proxy) — 17 results across 8 result pages, all unrelated: Promptly AI (no-code generative-AI chatbot builder), Promptly (open-source blog publishing tool), VK, Meeting On Time, a PDF-to-Excel converter, an AI interview answers generator, Prmptly, PromptYourJob, a cross-AI prompt/skill manager, Promptless, PromptLabHub, Windows Command Prompt, and similar. None is Tiny Studio's booking/no-show app; none links to tinystudio.in (zero occurrences of `tinystudio` or `tinystudio.in` in the rendered Markdown outside the page's own URL path).
- AlternativeTo search for `drishti` — same single Drishti (open-source scientific visualisation software for volumetric/tomography data) plus fuzzy matches (Now&Me, Pollscape); zero mentions of tinystudio.in.
- AlternativeTo search for `tinystudio` — one fuzzy match (JPEG Lossless Rotator); no Tiny Studio listing. The only `tinystudio` tokens in the rendered Markdown are the page URL itself and the search-result heading.
- AlternativeTo software page `https://alternativeto.net/software/tinystudio/about/` (via the r.jina.ai reader proxy) — "404 - Page not found", no listing exists.
- Wayback CDX index for `alternativeto.net/software/tinystudio*` — empty result set (`[]`), confirming no historical archived page for a Tiny Studio listing.
- Product Hunt exact-name page `producthunt.com/products/tinystudio` — direct fetch, r.jina.ai proxy fetch, and the search-result page `producthunt.com/search?q=promptly` are all Cloudflare CAPTCHA-gated today (same hardening as 2026-08-12). The Wayback CDX now lists two captures of the page (2023-05-30 and 2025-01-25). The 2025-01-25 capture is fetched directly via `web.archive.org` and confirms the page is still the unrelated Mac subtitle app: title `TinyStudio - Product Information, Latest Updates, and Reviews 2025 | Product Hunt`, maker handle `Tinyfool`; zero occurrences of `tinystudio.in` in the page HTML. Not a Tiny Studio asset.
- Index checks (DuckDuckGo site-restricted, via the r.jina.ai reader proxy on `html.duckduckgo.com/html/`): `site:producthunt.com "tinystudio.in"` — "No results found"; `site:alternativeto.net "tinystudio.in"` — "No results found"; `site:alternativeto.net tinystudio OR "tiny studio" promptly OR drishti` — "No results found"; `site:alternativeto.net "promptly" booking` — "No results found".
- Brand-level check: `site:producthunt.com tinystudio` — the only Product Hunt pages are subpages of the unrelated Tinyfool app (`producthunt.com/p/tinystudio` forum, `producthunt.com/products/tinystudio/makers`); zero occurrences of `tinystudio.in` in any result snippet.
- Live app pages: `https://tinystudio.in/promptly/` — HTTP 200, page body 11509 bytes, zero occurrences of "Product Hunt" or "AlternativeTo", zero `noindex`/`nofollow` robots meta; `https://tinystudio.in/drishti/` — HTTP 200, page body 11431 bytes, zero occurrences of "Product Hunt" or "AlternativeTo", zero `noindex`/`nofollow` robots meta; `https://tinystudio.in/robots.txt` — `User-agent: *` / `Allow: /` / `Sitemap: https://tinystudio.in/sitemap.xml` (crawlable, sitemap exposed).

Method note: the bot-gating posture observed on 2026-08-12 still holds on 2026-08-14. Direct Product Hunt fetches return HTTP 403 with a Cloudflare interstitial; the r.jina.ai proxy fetches of both PH search pages (`/search?q=promptly` and `/search?q=drishti`) return the standard proxy CAPTCHA challenge page ("Just a moment... Performing security verification"); direct AlternativeTo fetches return HTTP 403; r.jina.ai proxy of Wayback's `web.archive.org/web/.../producthunt.com/...` returns an `AbuseAlleviationError` (anonymous access blocked until ~21:46 UTC). All of these are bypassed by the `web.archive.org` direct fetch (200, full HTML) and by the r.jina.ai proxy against AlternativeTo on-platform search URLs and DuckDuckGo `html.duckduckgo.com/html/` index URLs. The PH side of the verdict therefore rests, as on 2026-08-12, on (a) the empty `site:producthunt.com "tinystudio.in"` DuckDuckGo index query, (b) the brand-level `site:producthunt.com tinystudio` query (all results belong to the unrelated Tinyfool app, zero `tinystudio.in` mentions), and (c) the freshly fetched 2025-01-25 Wayback capture of the exact-name page (still the Mac subtitle app, zero `tinystudio.in` mentions). The AT side is verified by on-platform searches, the 404 software page, the empty Wayback CDX history, and all four DuckDuckGo site-restricted queries. All independent evidence lines agree.
