# tinystudio.in verification map

This directory is the maintained source for verifying the user-facing
behaviour of the `tinystudio-in` public site. Read the index below before
driving, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch the harness at `http://127.0.0.1:<port>` with
  `node scripts/verify-tinystudio-in-serve.mjs` (default port 4178, or
  the first free port above it).
- Capture the bound port to `/tmp/verify-tinystudio-in/server.port`.
- Run the three `DOCTOR` checks from the parent `SKILL.md` and require
  all three to pass before any feature drive.
- Never drive an instance that was not started by this verification run.

## Driving conventions

- Start every recipe from the harness URL recorded by the LAUNCH step.
- Prefer ARIA roles, `aria-label`s, semantic heading order, and the
  exact H1 copy in the recipe over CSS selectors and DOM position.
- Treat every `curl` URL and every `expected` string as literal. The
  site copy is the source of truth; if the copy changed, the recipe
  changed with it (this is the maintenance rule).
- The site has no per-request state, no auth, and no query-string
  behaviour. Every drive is a plain `GET /<route>/`.
- Restore nothing after a drive — the harness serves the on-disk tree
  and the next drive reads the same files.

## Proof and skip reporting

- Capture the served HTML, not just the HTTP status. A 200 with an
  empty body is not a green drive.
- UI proof includes the H1 text and the route, plus the CSS class
  fingerprints the recipe names.
- Drive-time proof: write the HTML to `/tmp/verify-tinystudio-in/html/`
  and grep for the exact strings the recipe lists.
- Report an unreachable path with the route, the harness port, the
  `lsof`/log line, and the unmet precondition. Do not report a skipped
  drive as verified through a different route.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing
the user-visible behaviour. It then uses four H2 sections in order:

1. `How users reach it` lists every user entry point (links in
   `public/`, social share, in-page anchor).
2. `How to drive it` starts with `Preconditions:` and uses labeled
   bullets that pair each user action with an exact `curl`/Playwright
   command and observable result.
3. `What proves success` lists the minimum set of strings, selectors,
   and counts that must be present.
4. `Gotchas` lists traps that can waste or invalidate a verification
   run (CSS path escape, canonical mismatch, the `public/` vs
   `tinystudio.in` host distinction).

## Features

- [Home ` / `](./home.md) — portfolio home, hero, product strip, and
  the Website Correction section.
- [Promptly product page `/promptly/`](./promptly.md) — booking and
  no-show-prevention product page.
- [Drishti product page `/drishti/`](./drishti.md) — mindful screen
  time product page.
- [Compare page `/compare/`](./compare.md) — the Website Correction
  one-page sprint explanation.
- [Contact page `/contact/`](./contact.md) — direct support, privacy,
  and 0509 contact paths.
- [Support page `/support/`](./support.md) — first-line support page.
