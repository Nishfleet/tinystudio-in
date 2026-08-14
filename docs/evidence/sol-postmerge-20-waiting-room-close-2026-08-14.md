# sol-postmerge-20 waiting-room close — 2026-08-14

## Report path

/home/nish/workspaces/agent-state/tinystudio-in-improvement-loop/sol/postmerge-20.md

## Verdict

Finding HOLDS. PR #20 (`1536cc88`) repaired three Promptly support card
titles H3 → H2 in source; live tinystudio.in/promptly/support/ still
serves H1 → H3 with the June-20 copy. This packet does not deploy (red
line; `CLOUDFLARE_API_TOKEN` missing; sibling `4603d44a5e` owns the
token).

## Named default honored

Post-merge defect is machine-ownable work. The machine-ownable remainder
is the missing hermetic page lock and the missing nightly live alarm for
this URL.

## What this packet did

- New hermetic source test wired into npm test/ci
  (`scripts/test-public-promptly-support-heading-hierarchy.mjs`)
- New live heading script
  (`scripts/test-public-live-promptly-support-heading-hierarchy.mjs`)
- New nightly workflow
  (`.github/workflows/live-site-check-promptly-support.yml`)
- This close-out doc

## What was NOT done

No `public/**` HTML rewrite, no production deploy, no Cloudflare token
mint/set/use, no payment, no auth-flow, no migration, no secret use, no
merge. Did not edit sibling-owned heading files listed in the packet
(`scripts/test-public-heading-hierarchy.mjs`,
`scripts/test-public-live-contact-heading-hierarchy.mjs`,
`scripts/check-public-live-deploy.mjs`,
`scripts/prepare-public-deploy-bundle.mjs`,
`scripts/test-public-deploy-bundle.mjs`,
`.github/workflows/live-site-check.yml`,
`.github/workflows/deploy-public-site.yml`,
`scripts/test-active-operator-surfaces.mjs`, `growth-brain/**`, wrangler
config, migrations).

## Files changed (worktree)

- `scripts/test-public-promptly-support-heading-hierarchy.mjs` (new)
- `scripts/test-public-live-promptly-support-heading-hierarchy.mjs` (new)
- `package.json` (one script added; hermetic test wired into `test` and `ci`)
- `.github/workflows/live-site-check-promptly-support.yml` (new)
- `docs/evidence/sol-postmerge-20-waiting-room-close-2026-08-14.md` (this file)

Note: the workflow file's header comment says "NOT triggered on pull
requests" instead of the packet's literal "NOT on pull_request." because
the packet's own hermetic test asserts the literal token `pull_request`
is absent from the workflow file (to prove there is no `on: pull_request`
trigger); a comment containing that token tripped the guard. The
functional spec is identical.

## Focused hermetic test output (GREEN)

```
$ node scripts/test-public-promptly-support-heading-hierarchy.mjs
test-public-promptly-support-heading-hierarchy: PR #20 Promptly support H2 cards
A. source public/promptly/support/index.html keeps the PR #20 outline
  ok page contains at least one heading
  ok page has exactly one H1
  ok the H1 is the first heading in the outline
  ok the three card headings are H2s inside .info-card articles
  ok card H2s plus the footer H2 keep a flat H2 band before the footer H3s
  ok no heading-level jump greater than one (no H1 -> H3 skip)
  ok H2 follows the first H1 before any H3
  ok repaired H2 title present: A single, clear support route.
  ok repaired H2 title present: Support, privacy, and contact stay connected.
  ok repaired H2 title present: A lasting support destination.
  ok stale live H3 title is absent from source
  ok stale live H3 title is absent from source
B. stale H1->H3 snippet fails the H2-before-H3 predicate
  ok stale H1 then H3 snippet is rejected
  ok repaired H1 then H2 snippet is accepted
C. live alarm + nightly workflow exist and stay out of npm test/ci
  ok live script fetches /promptly/support/
  ok live script names the source file
  ok live script honors SKIP_LIVE_CHECKS
  ok package.json has site:check-live-promptly-support-heading-hierarchy
  ok npm test does not run the live promptly-support heading script
  ok npm run ci does not run the live promptly-support heading script
  ok npm test runs this hermetic promptly-support heading test
  ok npm run ci runs this hermetic promptly-support heading test
  ok nightly workflow runs the live script
  ok nightly workflow is not on pull_request
  ok nightly workflow uses the offset 03:33 UTC cron
D. existing post-deploy / bundle proofs for /promptly/support/ still named (do not edit those files)
  ok check-public-live-deploy still fetches /promptly/support/
  ok NEUTRAL_PROOFS region still names promptly/support/index.html
  ok bundle proof still names PR #20

28 checks, 0 failures
```

## Live heading check (expected FAIL — HOLDS proof)

```
$ node scripts/test-public-live-promptly-support-heading-hierarchy.mjs
test-public-live-promptly-support-heading-hierarchy: the deployed tinystudio.in /promptly/support/ page keeps the PR #20 repaired heading outline (no skipped levels)
A. live /promptly/support/ carries the repaired heading hierarchy
  ok live Promptly support page contains at least one heading
  ok live Promptly support page has exactly one H1
  ok live Promptly support page has the H1 as the first heading in the outline

Live /promptly/support/ heading-hierarchy guard result: the finding stays open against tinystudio.in until a refresh of the live deployment lands on origin/main.

9 checks, 6 failures
LIVE_PROMPTLY_SUPPORT_HEADING_EXIT:1

  FAIL live Promptly support page has the three card headings as H2s inside .info-card articles
  FAIL live Promptly support page keeps the flat H2 band (card H2s plus the footer H2) before the footer H3s
    bad transition H1 -> H3 on Promptly support
  FAIL live Promptly support page has no heading-level jump greater than one (no H1 -> H3 skip)
  FAIL live Promptly support page has repaired H2 title: A single, clear support route.
  FAIL live Promptly support page has repaired H2 title: Support, privacy, and contact stay connected.
  FAIL live Promptly support page has repaired H2 title: A lasting support destination.
    the deployed public/promptly/support/index.html is stale: it misses the heading-hierarchy repair that the worktree copy of public/promptly/support/index.html already has. Refresh the live deployment from origin/main.
```

The failure is proof the finding still holds, not a reason to weaken the
assertions.

## Rollback

Revert the product change (remove the two scripts, the workflow, the
package.json wiring, and this doc) to undo this packet. Triage
Disposition stays QUEUED.
