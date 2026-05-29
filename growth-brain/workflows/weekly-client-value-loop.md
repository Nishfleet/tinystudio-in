# Weekly Client Value Loop

Run this every week for every onboarded client.

## Goal

Every client should see a visible weekly delta:

- what changed
- why it mattered
- proof source
- what we learned
- what happens next
- why continuing is worth it

## Command

```bash
npm run client:weekly-loop
```

For one client:

```bash
npm run client:weekly-loop -- --client=clients/client-slug
```

## Folder Isolation

Each client keeps its own source of truth:

```text
clients/client-slug/
  brain/
  deliverables/
  ops/
    weekly-runs/
      YYYY-MM-DD.md
  quality/
  reports/
  research/
  client-dashboard.md
  client-dashboard.html
```

The weekly loop may write a global summary to:

```text
growth-brain/ops/weekly-client-value-loop.md
```

That global summary is only a command center. It is not the source of truth for any client.

## Weekly Order

1. Export the weekly report from that client's folder.
2. Check that the report has shipped work, a learning, next test, measurement, revenue leak loop, search trust review, and retention signal.
3. Refresh and check the channel-readiness scorecard so SEO, paid, lifecycle, content, social, reputation, analytics, creative, and automation only expand when ready.
4. Refresh the client dashboard.
5. Refresh the monthly renewal review.
6. Refresh the delivery cockpit.
7. Check client readiness.
8. Run proof review and acceptance dry-runs.
9. Write a client-specific run log.
10. Write the global summary.

## Retention Bar

Do not consider a client retention-ready unless the weekly loop shows:

- a concrete conversion or trust improvement
- a channel-readiness decision before any expanded scope
- a filled revenue leak loop
- a filled search trust review
- proof-backed claims
- a next test or next action
- client confirmation that they saw the delta, understood the value, approved the next action, and want to continue

## Guardrails

- Do not send client messages automatically.
- Do not approve claims automatically.
- Do not pitch renewal automatically.
- Do not copy proof, metrics, dashboards, claims, or reports between client folders.
- Do not count owned-startup proof as external paid-client proof.
- Do not use bought backlinks, fake reviews, fake citations, spam directories, doorway pages, hidden text, keyword stuffing, or ranking guarantees.

## Automation

The Friday retention automation should run:

```bash
npm run client:weekly-loop
npm run retention:checkups
npm run growth:dashboard
npm run value:stress
```

It should report only:

- clients needing attention
- the single next owner action
- proof or claim blockers
- monthly reviews due
- any client folder with missing weekly value proof
