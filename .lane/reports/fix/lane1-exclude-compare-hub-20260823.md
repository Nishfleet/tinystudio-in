# Lane 1 evidence: exclude snoozed /compare/ hub from publishable surfaces

- Item: `e3eeb95230` — merged `/compare/` hub deadlocks the public release lane and would leak the snoozed Website Correction buyer path
- Branch: `fix/lane1-exclude-compare-hub-20260823`
- Base: `origin/main` (`36ff5123943a2b67594225ef2999392dc7104972`)
- Shape: **(a) exclude** `compare/` from every publishable/crawlable surface. Not shape (b) body-stripping.
- Source page `public/compare/index.html` is untouched (byte-identical to main) for a future un-snooze.

## Why

PR #256 merged the MSP compare hub onto main. The snooze filter then tried to strip buyer-path JSON-LD from that page and still ship it. That keeps a crawlable `/compare/` URL in the deploy bundle, sitemap, and `llms.txt`. The 2026-08-08 Nish snooze forbids publishing Website Correction buyer-path content. Exclusion closes the leak; the source page stays on main.

## Changed files

- `scripts/prepare-public-deploy-bundle.mjs` — filter version 3; drop `compare/index.html` from `FILTERED_PAGES`; `fs.rm` the copied `compare/` directory after `fs.cp`; header and manifest note name both deliberate changes.
- `scripts/test-public-deploy-bundle.mjs` — section B2 asserts the bundle has no `compare/` directory; `requiredFiles` no longer lists `compare/index.html`. Source-side section A (including the compare JSON-LD marker) is unchanged.
- `scripts/check-public-live-deploy.mjs` — new section K: live `/compare/` must 404 and carry no "Website Correction" body. Not added to `PUBLIC_PATHS`. Unskipped live runs stay red on K until the release lane deploys; that is expected.
- `scripts/lib/public-pages.mjs` — drop `compare/index.html` from `PUBLIC_HTML_FILES`. Canonical URL count is **12**, not 11: PR #256 added compare without updating the stale "The 12" comment, so 13 − 1 = 12. The comment stays "The 12" to match `PUBLIC_PAGE_URLS.length`.
- `scripts/prepare-static-site-bundle.mjs` — drop the Compare line from the `llms.txt` template so `npm run site:prepare` cannot resurrect it.
- `public/sitemap.xml` — delete the `/compare/` `<url>` block. Other lastmod dates unchanged.
- `public/llms.txt` — delete the Compare bullet.

Untouched on purpose: `public/compare/index.html`, `scripts/test-public-compare-page.mjs`, `package.json`, homepage/contact snooze ops, `FORBIDDEN_MARKERS`, `NEUTRAL_PROOFS`.

## Spec note on URL count

Acceptance step 5 asked the URL list to print `11` then `false`. Live result after the specified list edit is `12` then `false`. The judge subtracted 1 from the stale "12" comment. The array on main already had 13 public URLs (12 plus compare). Removing compare restores the pre-#256 set of 12. No extra page was dropped to force 11.

## Proof

### 1. Source contract intact

```
node scripts/test-public-compare-page.mjs
```

Exit 0. Final line: `24 checks, 0 failures`.

### 2. Bundle test green with the new exclusion

```
node scripts/test-public-deploy-bundle.mjs
```

Exit 0. Contains:

```
B2. the snoozed /compare/ hub is excluded from the publishable bundle
  ok no compare/ directory in the bundle
  ok no compare/index.html in the bundle
```

Final line: `108 checks, 0 failures`.

### 3. Direct bundle proof

```
OUT=$(mktemp -d)
node scripts/prepare-public-deploy-bundle.mjs --source public --output "$OUT"
```

Prepare exit 0. Printed `filter_version: 3`.

```
ls "$OUT/compare"
# ls: cannot access '.../compare': No such file or directory (exit 2)

grep -R "Website Correction" "$OUT"; echo "exit=$?"
# no matches, exit=1

grep -R "website-correction" "$OUT"; echo "exit=$?"
# no matches, exit=1
```

### 4. Listing surfaces are clean

```
grep -n "tinystudio.in/compare/" public/sitemap.xml public/llms.txt scripts/prepare-static-site-bundle.mjs scripts/lib/public-pages.mjs
```

No matches (exit 1).

### 5. Source-of-truth dropped compare

```
node -e 'import("./scripts/lib/public-pages.mjs").then(m=>{console.log(m.PUBLIC_PAGE_URLS.length);console.log(m.PUBLIC_PAGE_URLS.includes("https://tinystudio.in/compare/"))})'
```

Prints `12` then `false` (see spec note above). Compare is absent. Length is the restored 12-URL public set.

### 6. Full suite

```
npm test
```

Exit 0. Includes `test-public-compare-page.mjs` (`24 checks, 0 failures`) and `test-public-deploy-bundle.mjs` (`108 checks, 0 failures`).

### 7. Local live-check gate

```
SKIP_LIVE_CHECKS=1 node scripts/check-public-live-deploy.mjs
```

Exit 0. Prints `SKIP_LIVE_CHECKS=1 - live checks skipped`.

Unskipped `node scripts/check-public-live-deploy.mjs` will fail section K until the release lane deploys a compare-free bundle. That failure is expected. This packet does not deploy.

## Blast radius

Headline promise, exercised: a prepared publishable bundle has no `compare/` directory and no "Website Correction" / "website-correction" bytes. Proven by steps 2 and 3 (script-ran).

Load-bearing fact: `preparePublicDeployBundle` copies `public/`, then deletes `output/compare`, and `FILTERED_PAGES` no longer rewrites `compare/index.html` back into the bundle. Source tests that read `public/compare/index.html` keep passing because the source file was not edited.

Live `/compare/` 404 is release-lane work, not this packet.
