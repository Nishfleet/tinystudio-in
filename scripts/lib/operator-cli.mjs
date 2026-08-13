#!/usr/bin/env node
// Shared operator CLI safety helpers for the active export surface.
//
// Every operator export script must:
//   1. Honor --help / -h before doing any work: print usage and exit 0.
//   2. Resolve every output path against the service repository root and
//      refuse paths that escape it (absolute paths outside the root, ".."
//      traversal, or symlink escapes). This prevents an export from writing
//      or overwriting cockpits, missions, or any other file "anywhere".
import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { serviceRoot } from "./runtime-roots.mjs";

export function handleHelp(args, usage) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage.trim());
    process.exit(0);
  }
}

function refuse(flag, value, reason) {
  console.error(`Refusing ${flag}=${value}: ${reason}. Output paths must stay inside the repository (${serviceRoot}).`);
  process.exit(1);
}

// Resolve an operator-supplied output path to an absolute path inside the
// service repository root. Falls back to `fallback` when no value was given.
// Mirrors resolveRepoPath() in service-contract.mjs, but with a clean operator
// error message instead of an assertion.
export function resolveOutputPath(value, { flag = "--output", fallback } = {}) {
  const raw = value === undefined || value === null || value === "" ? fallback : value;
  if (typeof raw !== "string" || raw === "") {
    refuse(flag, value ?? "", "an output path is required");
  }
  const root = resolve(serviceRoot);
  const resolved = resolve(root, raw);
  const rel = relative(root, resolved);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    refuse(flag, raw, "the path escapes the repository");
  }
  // Symlink-escape guard: the nearest existing ancestor must stay inside the
  // real repository root.
  let existing = resolved;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) break;
    existing = parent;
  }
  const realRoot = realpathSync(root);
  const realRel = relative(realRoot, realpathSync(existing));
  if (realRel === ".." || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) {
    refuse(flag, raw, "the path escapes the repository through a symlink");
  }
  return resolved;
}
