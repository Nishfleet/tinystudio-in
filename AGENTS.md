# TinyStudio.in — agent context

## Meta CI moved off GitHub Actions (2026-08-24)

The two nightly live-site-check workflows were removed from GitHub Actions
and now run as a single systemd user timer on the fleet VPS, outside Actions
minutes. The repo's included Actions minutes are exhausted; private-repo
scheduled CI was burning real money for work the VPS does for free.
Verification is unchanged — the same six check scripts, the same live target
(https://tinystudio.in), the same fail-loud behaviour — only the runner
changed.

| Removed workflow | Now runs as | What it checks |
|---|---|---|
| `live-site-check.yml` (nightly, 4 jobs) | `tinystudio-live-site-check.timer` (nightly, 03:23 UTC) | soft-404s, heading hierarchy, contact heading hierarchy, tap targets (SC 2.5.8), social preview. |
| `live-site-check-promptly-support.yml` (nightly, 1 job) | `tinystudio-live-site-check.timer` (same pass) | promptly support heading hierarchy. The two no longer need a 10-minute offset because there is no shared Actions runner to contend with. |

Script: `~/.local/bin/tinystudio-live-site-check`. Worktree:
`~/workspaces/agent-state/meta-ci-offload/ops/tinystudio-in`.

Inspect on the VPS:
```sh
systemctl --user list-timers 'tinystudio-live-site-check*'
journalctl --user -u tinystudio-live-site-check.service -n 50
```

A red timer is a real production regression (soft-404, sub-24px tap target,
regressed heading hierarchy, stale bundle). It is never a reason to disable
the timer; fix the underlying issue. The deploy lane (`deploy-public-site.yml`)
verifies the live site after every publish; this timer is the nightly net
that catches a stale or misconfigured deployment within a day even when
nothing merges.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
