# Lane 1 — pin support page title/meta/body Website Correction absence

**Branch:** `fix-lane1-support-website-correction-title-meta-body-20260823`
**PR:** [#266](https://github.com/nish3451/tinystudio-in/pull/266)
**Item ID:** `2f897c3a97`
**Commit:** `50a46d8`

## Support page confirmation

`public/support/index.html` was inspected and not edited.

It currently contains no `Website Correction` string and no `managed service` string in:

- `<title>`
- meta description
- og/twitter meta
- visible body

The same two phrases are also absent from the JSON-LD block. JSON-LD absence remains pinned by existing B3 (PR #260). This PR pins title, meta, og/twitter, and body.

Python check against the file:

```text
full file Website Correction: False
full file managed service: False
without jsonld Website Correction: False
without jsonld managed service: False
```

## B5 assertion added to `scripts/test-public-structured-data.mjs`

Helper inserted after `jsonLdBlocksOf`:

```js
const htmlWithoutJsonLd = (html) =>
  html.replace(/<script\s+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, "")
```

B5 block inserted after B3 and before B4:

```js
console.log("B5. the support page title, meta, and body carry no Website Correction or managed-service phrase")
{
  const html = read("public/support/index.html")
  const sourceWithoutJsonLd = htmlWithoutJsonLd(html)
  ok(
    !sourceWithoutJsonLd.includes("Website Correction") && !/managed\s+service/i.test(sourceWithoutJsonLd),
    "support page title, meta description, og/twitter meta, and visible body contain no Website Correction or managed-service phrase"
  )
}
```

B3 was not changed.

## `node scripts/test-public-structured-data.mjs`

Exit code 0.

Tail of output:

```text
B3. the support page carries its own Organization description without the snoozed managed-service sentence
  ok support page Organization description matches the support-specific description with no The Website Correction sentence
B5. the support page title, meta, and body carry no Website Correction or managed-service phrase
  ok support page title, meta description, og/twitter meta, and visible body contain no Website Correction or managed-service phrase
B4. the studio privacy hub carries its own Organization description without the snoozed managed-service sentence
  ok studio privacy hub Organization description matches the privacy-hub description with no The Website Correction sentence
C. npm test/ci wiring
  ok npm test runs the public structured data test
  ok npm run check delegates to npm test
  ok npm run ci runs the public structured data test

155 checks, 0 failures
```

## `node scripts/test-public-deploy-bundle.mjs`

Exit code 0.

No `support/index.html` forbidden-marker failure.

Final line:

```text
108 checks, 0 failures
```

Relevant support-page lines from that run:

```text
  ok support page JSON-LD (07acd07 baseline)
  ok support/index.html exists in the bundle
  ok support/index.html has no plaintext email outside script blocks
  ok support/index.html serves the email entity-encoded
```

## `npm test`

Exit code 0. No `FAIL` lines on the passing run.

A first `npm test` hit a pre-existing Playwright flake in `scripts/test-public-heading-hierarchy.mjs` (`Promptly heading overflow-wrap is a wrapping value at 280 (got normal)`). That check is outside this packet's owned files. Re-running the heading-hierarchy script alone passed (`166 checks, 0 failures`, wrap at 280 got `anywhere`). Full `npm test` then passed:

```text
exit_code: 0
```
