**No glue: kept scripts (#287)**

Rule from #287: delete a script only where a stock replacement already exists. Deleted: `scripts/check-pr-duplicates.mjs` and `scripts/test-pr-duplicates.mjs` (#298), and the vendored Spec Kit trees `.specify/scripts/bash/*.sh` and `.agents/skills/speckit-*` (#300). The fleet queue (agent-dispatch), GitHub rulesets and auto-merge replaced the PR duplicate guard. Everything below stays, for the reason given.

**After #296**: the kept scripts moved from `scripts/` to `src/` (one `git mv`); paths below are written against the new location. Deleted paths keep their historical spelling.

**Not present**
- `.github/scripts/`, `tools/`, `bin/`: these directories do not exist in this repo.

**Kept: the product itself**
- `src/*.mjs` wired to `package.json` commands (`client:*`, `prospect:*`, `growth:*`, `market:*`, `service:*`, `send:*`, `retention:*`, `claims:check`, `config:check`, `product:truth`, `sales:one-pager`, `ops:refresh`, `mobbin:*`, `growth-brain:check`): these are the growth-brain operator engine. They are product logic, not glue around a tool, and no stock replacement exists.
- `src/lib/*.mjs`: shared modules imported by those commands. No stock replacement.

**Kept: the test suite**
- `test/*.mjs` and the `check-*` scripts chained in `npm test`: they are the tests. Moving them into a framework would mean rewriting them, and #287 rules that out.

**Kept: release lane**
- `src/publish-public-site.mjs`, `src/prepare-public-deploy-bundle.mjs`, `src/prepare-static-site-bundle.mjs`, `test/check-public-live-deploy.mjs`: `wrangler pages deploy` only uploads a bundle. It does not filter the bundle, capture a rollback target, prove the upload became production, run the live acceptance or roll back on failure. Deleting these scripts would drop those guarantees.

**Kept: live-site checks**
- `test/check-public-live-*.mjs`, `test/test-public-live-*.mjs`: run by the live-site-check workflows. No GitHub built-in or stock action checks soft-404s, tap targets, heading hierarchy or social previews.

**Kept: retired generators**
- `src/retired/*.mjs`: `src/check-human-service-kit.mjs` names these in its retired-generator guard. Removing them is dead-code cleanup, not a stock-replacement cut, so it is out of scope for #287.
