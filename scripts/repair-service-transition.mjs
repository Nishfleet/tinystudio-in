#!/usr/bin/env node
import {existsSync} from "node:fs"
import {acquireLock, assertCliArguments} from "./lib/service-contract.mjs"
import {findApplicationFolder, pendingReviewCapJournalApplicationId, queuePaths, repairReviewCapJournal} from "./lib/review-queue.mjs"
import {promotionMarkerPath, repairPromotionJournal} from "./lib/service-promotion-journal.mjs"
import {repairTransitionJournal} from "./lib/service-transition-journal.mjs"

const args = process.argv.slice(2)
assertCliArguments(args, {positionalCount: 1})
const id = args.find(arg => !arg.startsWith("--")) || ""
const repoRoot = process.env.SERVICE_REPO_ROOT || process.cwd()

if (!id) {
	console.error("Usage: npm run service:repair -- APPLICATION_ID")
	process.exit(1)
}

try {
	const release = acquireLock(queuePaths(repoRoot).lockDir)
	try {
		const markerPath = promotionMarkerPath(repoRoot, id)
		const result = pendingReviewCapJournalApplicationId(repoRoot) ? repairReviewCapJournal(repoRoot, id) : existsSync(markerPath) ? repairPromotionJournal({repoRoot, applicationId: id}) : repairTransitionJournal({repoRoot, folder: findApplicationFolder(repoRoot, id), applicationId: id})
		console.log(JSON.stringify(result, null, 2))
	} finally {
		release()
	}
} catch (error) {
	console.error(`service:repair failed: ${error.message}`)
	process.exit(1)
}
