#!/usr/bin/env node
// Shared operator CLI safety helpers for the active export surface.
//
// Every operator export script must:
//   1. Honor --help / -h before doing any work: print usage and exit 0.
//   2. Resolve every output path against the service repository root and
//      refuse paths that escape it (absolute paths outside the root, ".."
//      traversal, or symlink escapes). This prevents an export from writing
//      or overwriting cockpits, missions, or any other file "anywhere".
import { lstatSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { serviceRoot } from "./runtime-roots.mjs";

export function handleHelp(args, usage) {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage.trim());
    process.exit(0);
  }
}

function refuse(flag, value, reason) {
  console.error(
    `Refusing ${flag}=${value}: ${reason}. Output paths must stay inside the repository (${serviceRoot}).`
  );
  process.exit(1);
}

function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

// Resolve an operator-supplied output path to an absolute path inside the
// service repository root. Falls back to `fallback` when no value was given.
// Refuses paths that escape the repository via an absolute target, ".."
// traversal, or a symlink. lstatSync (which does not follow links) is used so
// that a dangling symlink -- one whose target writeFileSync would silently
// create outside the repository -- is caught as well as a live one.
export function resolveOutputPath(value, { flag = "--output", fallback } = {}) {
  const raw = value === undefined || value === null || value === "" ? fallback : value;
  if (typeof raw !== "string" || raw === "") {
    refuse(flag, value ?? "", "an output path is required");
  }
  const root = resolve(serviceRoot);
  const resolved = resolve(root, raw);
  if (!isInside(root, resolved)) {
    refuse(flag, raw, "the path escapes the repository");
  }
  let current = root;
  for (const part of relative(root, resolved).split(sep).filter(Boolean)) {
    current = resolve(current, part);
    let stat;
    try {
      stat = lstatSync(current);
    } catch {
      break; // Component does not exist yet; nothing below it can be a symlink.
    }
    if (stat.isSymbolicLink()) {
      let target;
      try {
        target = realpathSync(current);
      } catch {
        target = resolve(dirname(current), readlinkSync(current));
      }
      if (!isInside(root, target)) {
        refuse(flag, raw, "the path escapes the repository through a symlink");
      }
    }
  }
  return resolved;
}
