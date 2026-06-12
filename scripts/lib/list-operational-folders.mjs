import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export function isTransientWorkspaceName(name) {
  return /^(kit|import)[-_]/i.test(String(name || "")) || String(name || "").startsWith(".");
}

export function listOperationalFolders(root, { requiredFiles = [] } = {}) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !isTransientWorkspaceName(entry.name))
    .map((entry) => join(root, entry.name))
    .filter((folderPath) => requiredFiles.every((file) => existsSync(join(folderPath, file))))
    .sort();
}

export function listClientFolders(root = "clients") {
  return listOperationalFolders(root, { requiredFiles: ["intake.md"] });
}

export function listProspectFolders(root = "prospects") {
  return listOperationalFolders(root, { requiredFiles: ["metadata.json"] });
}
