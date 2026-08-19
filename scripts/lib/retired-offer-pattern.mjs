// Canonical retired broad-agency offer pattern. Every runtime record/send
// surface that feeds an outbound package must refuse this copy so a stale
// sheet can never sell a retired offer (7-day sprint / 30-day action plan /
// founder sprint / $500 price / growth desk / three pages).
export const RETIRED_OFFER_PATTERN = /7[-\s]day (?:site|website) revenue (?:leak|fault) (?:fix )?sprint|7[-\s]day sprint|tangible revenue (?:leak|fault) sprint|30[-\s]day action plan|growth desk|three pages|founder sprint|\$\s?500\b/i;
