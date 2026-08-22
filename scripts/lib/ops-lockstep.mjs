import {existsSync, readFileSync} from "node:fs"
import {resolve} from "node:path"
import {ACTIVE_OPERATOR_ARTIFACTS} from "./service-contract.mjs"
import {serviceRoot} from "./runtime-roots.mjs"

export const OPS_REFRESH_ENV = "TINYSTUDIO_OPS_REFRESH"

export function generatedStamp(content) {
  return String(content || "").match(/\bGenerated:?\s*(\d{4}-\d{2}-\d{2})/m)?.[1] || null
}

export function assertTrackedLockstepWrite(outputPath, generatedDate, root = serviceRoot) {
  if (process.env[OPS_REFRESH_ENV] === "1") return
  const resolvedOutput = resolve(outputPath)
  const tracked = ACTIVE_OPERATOR_ARTIFACTS.map(rel => [rel, resolve(root, rel)])
  const self = tracked.find(([, abs]) => abs === resolvedOutput)
  if (!self) return
  const conflicts = []
  for (const [rel, abs] of tracked) {
    if (abs === resolvedOutput || !existsSync(abs)) continue
    const stamp = generatedStamp(readFileSync(abs, "utf8"))
    if (typeof stamp === "string" && stamp !== generatedDate) conflicts.push(`${rel} (${stamp})`)
  }
  if (conflicts.length === 0) return
  console.error(`Refusing to regenerate ${self[0]} with Generated: ${generatedDate} because other ACTIVE_OPERATOR_ARTIFACTS are not dated ${generatedDate}: ${conflicts.join(", ")}. Run \`npm run ops:refresh\` to regenerate all tracked operator artifacts in lockstep.`)
  process.exit(1)
}
