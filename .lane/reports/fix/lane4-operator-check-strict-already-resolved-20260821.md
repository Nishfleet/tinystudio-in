# Lane 4 — operator check `--strict` item: already resolved on main

Item: `[unreviewed-by-opus] Operator check-*.mjs scripts only exit 1 on --strict, and no automated caller passes it`

## Verdict

**Already resolved on main.** No PR opened (per packet: a PR whose diff touches only evidence for an already-resolved item must not be opened; the item is retired instead).

## Evidence

1. **The fix landed via PR #133** (commit `c617364`, merged 2026-08-13, "make named operator checks fail on blocked readiness with advisory aliases explicitly named"). `c617364` is an ancestor of current `origin/main` (`38bdae5845250265ac77927a22a3d6a98ddb18b1`).
2. **The named operator/readiness commands are wired `--strict` in `package.json`** so blocked readiness fails loudly with no hidden flag:
   - `client:check` → `node scripts/check-client-readiness.mjs --strict`
   - `prospect:check` → `node scripts/check-prospect-readiness.mjs --strict`
   - `prospect:site-check` → `node scripts/check-recording-sites.mjs --strict`
   - `send:setup` → `node scripts/check-outbound-sender-setup.mjs --strict`
   - `market:parity` → `node scripts/check-market-parity-readiness.mjs --strict`
   - `market:proof-check` → `node scripts/check-market-proof-run.mjs --strict`
   - Report-only behavior is preserved only under explicitly named `:advisory` aliases (`client:check:advisory`, `prospect:check:advisory`, `prospect:site-check:advisory`, `send:setup:advisory`, `market:parity:advisory`, `market:proof-check:advisory`), which the required gates do not call.
3. **The required gates call the strict paths**: `npm run ci` / `npm run test` run `scripts/test-operator-check-strictness.mjs` (a fixture-driven detector that asserts blocked fixtures make every named command exit nonzero, advisory aliases exit 0, green fixtures pass, and the gates never use advisory aliases), plus `check-product-truth`, `check-human-service-kit`, `check-retention-automation`, `check-agency-defaults`, `check-outbound-claim-safety`, `check-outbound-send-readiness`. The live-site and deploy workflows call the public live check scripts directly, which fail on live failures (they exit nonzero on soft-404s, stale deployments, etc.).
4. **Live verification on this worktree at HEAD** (`d2d96a5`):
   - `node scripts/test-operator-check-strictness.mjs` → **"Operator check strictness checks passed."**, exit 0.
5. **Recorded in the repo**: `docs/backlog-aug13-16-resolution-2026-08-19.md` documents `operator-checks-strict` as landed via PR #133 (`c617364`).

## Outcome

Item `8caeed8581` is resolved on main by PR #133 (commit `c617364`); retired via `fleet-resolve-item`, no PR opened.
