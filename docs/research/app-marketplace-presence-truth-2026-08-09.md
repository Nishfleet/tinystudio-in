# App marketplace presence truth: Promptly and Drishti

First checked: 2026-08-09 (baseline below). Re-verified: 2026-08-11 (see re-verification log).

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
