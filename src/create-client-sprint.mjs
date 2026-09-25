#!/usr/bin/env node
import { relative } from "node:path";
import { acquireLock, assertCliArguments } from "./lib/service-contract.mjs";
import { createClientScaffold } from "./lib/client-scaffold.mjs";
import { buildQueue, findApplicationFolder, queuePaths } from "./lib/review-queue.mjs";

const args = process.argv.slice(2);
assertCliArguments(args, { positionalCount: 1 });
const applicationId = args.find((arg) => !arg.startsWith("--")) || "";
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd();

if (!applicationId) {
  console.error("Usage: npm run client:new -- APPLICATION_ID");
  process.exit(1);
}

try {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
    throw new Error("client scaffold requires a canonical application ID");
  }
  const preflightFolder = findApplicationFolder(repoRoot, applicationId);
  if (relative(repoRoot, preflightFolder) !== `clients/${applicationId}`) {
    throw new Error("client scaffold requires a paid canonical Day 0 record under clients/");
  }
  const release = acquireLock(queuePaths(repoRoot).lockDir);
  try {
    const clientFolder = findApplicationFolder(repoRoot, applicationId);
    if (relative(repoRoot, clientFolder) !== `clients/${applicationId}`) {
      throw new Error("client scaffold requires a paid canonical Day 0 record under clients/");
    }
    const item = buildQueue({ repoRoot, scope: "clients" }).items.find((candidate) => candidate.applicationId === applicationId);
    if (!item || item.status === "blocked") {
      throw new Error(`client scaffold requires a valid paid canonical service record${item?.blocked?.length ? `: ${item.blocked.join("; ")}` : ""}`);
    }
    const result = createClientScaffold({ repoRoot, clientFolder });
    console.log(JSON.stringify({ status: result.created.length ? "created" : "ready", ...result }, null, 2));
  } finally {
    release();
  }
} catch (error) {
  console.error(`client:new failed: ${error.message}`);
  process.exit(1);
}
