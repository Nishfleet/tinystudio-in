# Lane 1 evidence: llms.txt Website Correction

**Branch:** `lane1-llms-txt-website-correction`
**Item:** `468890d980`
**Base:** `origin/main` @ `7104bb2e00ba6e11a4508e01598ea63642bb971f`

## Change

Updated the description paragraph in `public/llms.txt` and its generator template in `scripts/prepare-static-site-bundle.mjs` to byte-match `EXPECTED_ORG_DESCRIPTION` from `scripts/test-public-structured-data.mjs` — adds The Website Correction managed service mention without the founder-pilot pricing clause.

Added two `ok()` assertions in section C of `scripts/test-public-brand-disambiguation.mjs` to regression-guard the service mention in both files.

## Acceptance (all pass)

| Check | Result |
|-------|--------|
| `diff` line 3 vs line 46 sync | no output |
| `grep -c "The Website Correction"` each file | `1` |
| `node scripts/test-public-brand-disambiguation.mjs` | `101 checks, 0 failures` |
| `node scripts/test-public-structured-data.mjs` | `154 checks, 0 failures` |
| `git diff --name-only origin/main...HEAD` | exactly 3 paths |

## PR

Opened against `main` with only the three spec files.
