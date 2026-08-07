import {FOUNDER_PILOT} from "./client-scaffold.mjs"
import {NO_GUARANTEE_CLIENT_SENTENCE} from "./service-contract.mjs"

export const CANONICAL_PROSPECT_ASK = `If useful, I can run a human-reviewed ${FOUNDER_PILOT.offerName} on this one highest-leverage page: a prioritized fault map, rewrite or redesign, one implementation pass or dev-ready handoff, search-trust basics, before/after proof, a Loom, a measurement plan, one revision, and 14-day implementation tracking. ${NO_GUARANTEE_CLIENT_SENTENCE}`

export function canonicalProspectAsk() {
	return CANONICAL_PROSPECT_ASK
}
