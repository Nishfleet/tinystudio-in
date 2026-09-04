#!/usr/bin/env node
import assert from "node:assert/strict"
import {readFileSync as rf} from "node:fs"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

const {equal: eq, deepEqual: deq, match: mat, ok, doesNotMatch: nmat} = assert

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (path) => rf(join(ROOT, path), "utf8")

const INDEX = read("public/index.html")
const CONTACT = read("public/contact/index.html")
const CHOICES = read("public/privacy-choices/index.html")
const DOC = read("docs/measurement/public-conversion-signal.md")
const PKG = read("package.json")

const ENDPOINT = "/contact/"
const FRAGMENT = "#website-correction"
const INBOX = "support@tinystudio.in"

// --- 1. Signal definitions -------------------------------------------------
// Stable, explicit source names; every defined source is documented and every
// used source is defined (no orphans, no undocumented markers).
const DEFINED_SOURCES = ["homepage-hero", "homepage-footer"]
for (const source of DEFINED_SOURCES) {
	mat(source, /^homepage-[a-z0-9-]+$/, `source name must be stable: ${source}`)
	mat(DOC, new RegExp(source), `docs must define source: ${source}`)
}
deq(DEFINED_SOURCES, [...new Set(DEFINED_SOURCES)], "source names must not repeat")

// --- 2. Homepage reviewed-service CTA markers ------------------------------
// Every reviewed-service CTA carries an explicit stable marker and routes to
// the reviewed application endpoint with source context.
const usedSources = [...INDEX.matchAll(/data-signal-source="([^"]+)"/g)].map((m) => m[1])
ok(usedSources.length >= 1, "homepage must expose at least one reviewed-service CTA")
for (const source of usedSources) {
	ok(DEFINED_SOURCES.includes(source), `CTA uses undefined source: ${source}`)
	mat(
		INDEX,
		new RegExp(`href="${ENDPOINT}\\?source=${source}${FRAGMENT}"[^>]*data-signal-source="${source}"`),
		`homepage CTA for ${source} must route to ${ENDPOINT}?source=${source}${FRAGMENT} with its marker`
	)
}
deq([...usedSources].sort(), [...DEFINED_SOURCES].sort(), "every defined source must be used by a real homepage CTA")

// --- 3. Contact/application source propagation -----------------------------
ok(CONTACT.includes(`id="website-correction"`), "contact page must host the application endpoint section")
mat(
	CONTACT,
	new RegExp(`class="[^"]*button[^"]*"[^>]*href="mailto:${INBOX}\\?subject=Website%20Correction"`),
	"contact page must expose a no-JS mailto fallback with the application subject"
)
const scriptBlock = (CONTACT.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || ""
mat(scriptBlock, /location\.search/, "propagation script must read the first-party ?source= parameter")
for (const source of DEFINED_SOURCES) {
	ok(scriptBlock.includes(JSON.stringify(source)), `propagation script must allowlist source: ${source}`)
}
mat(scriptBlock, /link\.href\s*=/, "propagation script must fill the mailto link")
mat(scriptBlock, /Source%3A/, "propagation script must put the source into the prefilled email body")
mat(scriptBlock, /internal measurement/, "propagation script copy must state internal measurement")
nmat(scriptBlock, /\.submit\(|fetch\(|sendBeacon|XMLHttpRequest/, "propagation script must never auto-send or auto-submit")
mat(CONTACT, /internal measurement only/, "contact page must state the signal is internal measurement only")

// --- 4. No analytics provider / cookie / fingerprint APIs ------------------
const BANNED = [
	"googletagmanager.com", "gtag(", "analytics.min.js", "posthog", "mixpanel",
	"amplitude", "matomo", "plausible.io", "dataLayer",
	"document.cookie", "localStorage", "sessionStorage",
	"navigator.userAgent", "navigator.plugins", "canvas.toDataURL",
	"sendBeacon", "XMLHttpRequest", "<script src="
]
for (const [name, content] of [["homepage", INDEX], ["contact", CONTACT], ["privacy-choices", CHOICES]]) {
	for (const banned of BANNED) {
		nmat(content, new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${name} page must not use ${banned}`)
	}
}

// --- 5. Documentation contract ---------------------------------------------
mat(DOC, /signal source|Source/i)
mat(DOC, /owner/i)
mat(DOC, /retention/i)
mat(DOC, /privacy boundary/i)
mat(DOC, /falsifiable/i)
mat(DOC, /decision rule/i)
mat(DOC, /not proof of completed applications/i, "docs must be honest that tagging is not completion evidence")
mat(DOC, /received human (application )?(messages|emails)/i, "docs must bind completion evidence to received human messages")
mat(DOC, /60/i, "docs must state a falsifiable counting window")
mat(DOC, new RegExp(ENDPOINT.replace("/", "\\/") + "\\?source="), "docs must name the source-carrying route")
mat(DOC, new RegExp(INBOX), "docs must name the measured inbox")

// --- 6. Privacy boundary on the public site --------------------------------
mat(CHOICES, /internal\s+measurement/i, "privacy-choices must mention the internal-only signal")
mat(CHOICES, /no analytics providers,\s*no cookies,\s*no fingerprinting/i, "privacy-choices must state the privacy boundary")

// --- 7. Test wiring ---------------------------------------------------------
mat(PKG, /test-public-conversion-signal\.mjs/, "package.json test chain must wire the conversion signal test")
mat(PKG, /"ci"/, "package.json ci chain must exist")

eq(process.argv.slice(2).length, 0, "this test takes no arguments")
console.log(JSON.stringify({status: "passed", contract: "public-conversion-signal", sources: DEFINED_SOURCES}, null, 2))
