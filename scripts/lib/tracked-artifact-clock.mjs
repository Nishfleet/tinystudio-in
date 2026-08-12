import {isAbsolute, relative, resolve} from "node:path"
import {ACTIVE_OPERATOR_ARTIFACTS} from "./service-contract.mjs"

export const FIXED_CLOCK_ENV = "SERVICE_TEST_NOW"

// The active-operator-surface gate (scripts/test-active-operator-surfaces.mjs)
// regenerates every tracked operator artifact under a FIXED clock
// (SERVICE_TEST_NOW + the test-fixed-clock import) and byte-compares the
// result with the tracked files. A real-clock regeneration of a tracked path
// therefore always fails the gate the next time it runs ("Tracked generated
// artifact is stale"), because the Generated date (and any data-derived rows)
// can no longer match the fixed-clock regeneration.
//
// Refuse those writes up front: tracked artifacts may only be (re)generated
// while the fixed clock is active, i.e. SERVICE_TEST_NOW is set AND the
// test-fixed-clock shim has actually replaced Date (Date.now() then equals
// Date.parse(SERVICE_TEST_NOW)). Private real-clock reports keep working by
// writing under runs/ via --output/--html/--ops instead of a tracked path.
export function assertTrackedArtifactWritesUseFixedClock(paths, serviceRoot = process.env.SERVICE_REPO_ROOT || process.cwd()) {
  const fixedNow = process.env[FIXED_CLOCK_ENV]
  const fixedClockActive = Boolean(fixedNow) && !Number.isNaN(Date.parse(fixedNow)) && Date.now() === Date.parse(fixedNow)
  const tracked = paths
    .map(path => (isAbsolute(path) ? resolve(path) : resolve(serviceRoot, path)))
    .filter(path => ACTIVE_OPERATOR_ARTIFACTS.includes(relative(serviceRoot, path)))
    .map(path => relative(serviceRoot, path))
  if (!tracked.length || fixedClockActive) return
  console.error(`Refusing to overwrite the tracked operator artifact${tracked.length > 1 ? "s" : ""} with the real clock: ${tracked.join(", ")}. Tracked artifacts must stay byte-identical to the fixed-clock regeneration asserted by scripts/test-active-operator-surfaces.mjs, so they may only be written while the fixed clock is active (SERVICE_TEST_NOW set and the test-fixed-clock import loaded, e.g. SERVICE_TEST_NOW=<tracked Generated date>T12:00:00.000+05:30 node --import scripts/lib/test-fixed-clock.mjs ${process.argv[1]?.split("/").at(-1) || "script"}). For a private real-clock report, pass an explicit output path under runs/ instead.`)
  process.exit(1)
}
