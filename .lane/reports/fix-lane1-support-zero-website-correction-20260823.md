# Lane 1 evidence — support page zero Website Correction mention

**Branch:** `fix/lane1-support-zero-website-correction-20260823`
**Item ID:** `0aa30a45ac`
**Commit:** `a894189`

## Goal

`public/support/index.html` contains zero occurrences of "Website Correction" (body, title, meta, JS/JSON-LD), while deploy-bundle filtering and all other public pages remain unchanged.

## Changes

1. **`public/support/index.html`** — Removed the managed-service sentence from the Organization JSON-LD `description` field (source-live parity with v3 filter output).
2. **`scripts/test-public-structured-data.mjs`** — Added `SUPPORT_ORG_DESCRIPTION`, removed support from `NON_HOME_ORG_PAGES`, added B3 section pinning support-specific description.
3. **`scripts/prepare-public-deploy-bundle.mjs`** — Bumped `SNOOZE_FILTER_VERSION` to 4; excluded `support/index.html` from JSON-LD managed-service regex ops.

## Acceptance

| Check | Result |
|---|---|
| `grep -i "website correction" public/support/index.html` | exit 1, zero lines |
| `node scripts/test-public-structured-data.mjs` | 154 checks, 0 failures; B3 section present |
| `node scripts/test-public-support-contact-voice.mjs` | 42 checks, 0 failures |
| `node scripts/test-public-deploy-bundle.mjs` | 108 checks, 0 failures; `ok bundle prepared in a temp directory`; no `snooze filter drifted for support/index.html` |
| `npm test` | exit 0 |
