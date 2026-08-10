#!/usr/bin/env node
// Privacy-safe, fail-closed preflight observables for the retention automation check.
//
// Everything here reports only root-level metadata: checkout SHAs (public repo
// metadata) and per-root existence/count aggregates for the four canonical
// private state roots. Record names are used only to compute counts and are
// never emitted; record contents are never read.
//
// Every observation fails closed: if a source or state root cannot be observed
// deterministically, the observer throws and the caller treats it as fatal.

import {lstatSync, readdirSync} from "node:fs";
import {join} from "node:path";
import {execFileSync} from "node:child_process";

export const STATE_ROOTS = ["clients", "prospects", "service-decisions", "runs/service-engine"];

const COUNT_KIND = {
  "clients": "directories",
  "prospects": "directories",
  "service-decisions": "files",
  "runs/service-engine": "entries",
};

const SHA = /^[0-9a-f]{40}$/;

function git(root, args) {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error(`git ${args[0]} failed: ${error.message}`);
  }
}

// Read-only observation of checkout freshness: HEAD from the local repository
// and the CURRENT origin/main directly from the remote (ls-remote performs no
// fetch, updates no refs, and touches no worktree files). Any mismatch between
// the two is fatal; so is any inability to observe either side.
export function observeSourceFreshness(root) {
  let head = "";
  try {
    head = git(root, ["rev-parse", "HEAD"]);
  } catch (error) {
    throw new Error(`cannot observe source HEAD: ${error.message}`);
  }
  if (!SHA.test(head)) throw new Error("cannot observe source HEAD: unexpected value");

  let originMain = "";
  try {
    const refs = git(root, ["ls-remote", "origin", "refs/heads/main"]);
    const line = refs.split("\n").map(line => line.trim()).find(line => line.endsWith("refs/heads/main"));
    if (line) originMain = line.split(/\s+/)[0];
  } catch (error) {
    throw new Error(`cannot observe current origin/main: ${error.message}`);
  }
  if (!SHA.test(originMain)) throw new Error("cannot observe current origin/main: no main ref on the origin remote");

  return {head, originMain, fresh: head === originMain};
}

function observeRoot(path, kind) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return {exists: false, count: 0};
    throw new Error(`state root is inaccessible: ${path}: ${error.message}`);
  }
  if (stat.isSymbolicLink()) throw new Error(`state root must not be a symbolic link: ${path}`);
  if (!stat.isDirectory()) throw new Error(`state root is not a directory: ${path}`);
  let entries;
  try {
    entries = readdirSync(path);
  } catch (error) {
    throw new Error(`state root is inaccessible: ${path}: ${error.message}`);
  }
  let count = 0;
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    let entryStat;
    try {
      entryStat = lstatSync(join(path, name));
    } catch {
      continue; // entry vanished mid-walk; counting is best-effort metadata
    }
    if (kind === "directories" && !entryStat.isDirectory()) continue;
    if (kind === "files" && !entryStat.isFile()) continue;
    count += 1;
  }
  return {exists: true, count};
}

// Aggregate manifest over the four canonical private state roots. Only
// existence booleans and top-level counts are reported.
export function observeStateManifest(root) {
  const manifest = {};
  for (const name of STATE_ROOTS) {
    manifest[name] = observeRoot(join(root, name), COUNT_KIND[name]);
  }
  return manifest;
}
