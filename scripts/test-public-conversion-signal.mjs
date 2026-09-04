import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

const SIGNAL_DOC = join(ROOT, "docs", "measurement", "public-conversion-signal.md")
const HOMEPAGE = join(ROOT, "public", "index.html")
const CONTACT = join(ROOT, "public", "contact", "index.html")
const PRIVACY_CHOICES = join(ROOT, "public", "privacy-choices", "index.html")
const PACKAGE_JSON = join(ROOT, "package.json")

const REGISTRY = ["homepage-hero", "homepage-service", "homepage-footer"]
const ATTR_SOURCE = "data-signal-source"
const ATTR_EVENT = "data-signal-event"
const EVENT_APPLY = "reviewed-service-apply"
const ENDPOINT_PREFIX = "/contact/?source="
const APPLY_ID = "signal-apply"
const NOTE_ID = "signal-note"
const SCRIPT_ID = "signal-script"
const SOURCE_NAME_ID = "signal-source-name"
const SOURCE_GUARD = /^[a-z0-9-]{1,40}$/
const DISCLOSURE = "internal measurement only"
const AUTO_SEND_DISCLOSURE = "nothing is sent automatically"

const FORBIDDEN_SCRIPT_APIS = [
	"fetch(",
	"XMLHttpRequest",
	"sendBeacon",
	"document.cookie",
	"localStorage",
	"sessionStorage",
	"navigator.userAgent",
	"canvas",
	"getContext(",
	"window.open(",
	"location.href =",
	"location.replace(",
	".submit(",
]

const FORBIDDEN_PROVIDER_TOKENS = [
	"googletagmanager",
	"google-analytics",
	"analytics.js",
	"plausible",
	"fathom",
	"segment.io",
	"segment.com",
	"amplitude",
	"mixpanel",
	"hotjar",
	"clarity.ms",
	"posthog",
	"doubleclick",
	"connect.facebook.net",
]

const {ok, equal, deepEqual, match, doesNotMatch} = assert

function read(path) {
	return readFileSync(path, "utf8")
}

function anchors(html) {
	const out = []
	for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
		const attrs = {}
		for (const a of m[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[a[1]] = a[2]
		out.push({attrs, text: m[2].replace(/<[^>]*>/g, "").trim()})
	}
	return out
}

function scriptBlocks(html) {
	const out = []
	for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
		const attrs = {}
		for (const a of m[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[a[1]] = a[2]
		out.push({attrs, source: m[2]})
	}
	return out
}

let checks = 0
function check(condition, message) {
	ok(condition, message)
	checks++
}

console.log("test-public-conversion-signal: signal contract checks")

const doc = read(SIGNAL_DOC)
const homepage = read(HOMEPAGE)
const contact = read(CONTACT)
const privacyChoices = read(PRIVACY_CHOICES)
const packageJson = read(PACKAGE_JSON)

console.log("  - signal definitions (registry, markers, endpoint)")
check(REGISTRY.length === 3, `registry must have exactly 3 stable source names, got ${REGISTRY.length}`)
for (const name of REGISTRY) {
	check(SOURCE_GUARD.test(name), `registry name passes the page-side guard: ${name}`)
	check(doc.includes(name), `docs must define registry source: ${name}`)
}
check(doc.includes(ATTR_SOURCE), "docs must document the source marker attribute")
check(doc.includes(ATTR_EVENT), "docs must document the event marker attribute")
check(doc.includes(EVENT_APPLY), "docs must document the reviewed-service apply event")
check(doc.includes("/contact/?source="), "docs must document the source-parameter endpoint form")

console.log("  - documentation contract")
check(/##\s+Owner/.test(doc) && doc.includes("Tiny Studio"), "docs must name the signal owner")
check(/##\s+Retention/.test(doc), "docs must state retention")
check(/##\s+Privacy boundary/.test(doc), "docs must state the privacy boundary")
check(/##\s+Falsifiable decision rule/.test(doc), "docs must contain a falsifiable decision rule")
check(/falsif/i.test(doc), "docs decision rule must be explicitly falsifiable")
check(/\d+/.test(doc), "docs decision rule must carry a numeric threshold")
check(doc.includes("not proof of completed applications"), "docs must honestly bound static source tagging")
check(doc.includes("received human messages"), "docs must define completion evidence as received human messages")

console.log("  - reviewed-service CTA source tags (homepage)")
const markedHomepageCtas = anchors(homepage).filter(a => ATTR_SOURCE in a.attrs)
check(markedHomepageCtas.length >= 1, "homepage must contain at least one reviewed-service CTA with a source marker")
for (const a of markedHomepageCtas) {
	check(a.attrs[ATTR_EVENT] === EVENT_APPLY, `every marked CTA carries the apply event: ${a.attrs[ATTR_SOURCE]}`)
	check(REGISTRY.includes(a.attrs[ATTR_SOURCE]), `marked CTA source must be in the registry: ${a.attrs[ATTR_SOURCE]}`)
	check(a.attrs.href === ENDPOINT_PREFIX + a.attrs[ATTR_SOURCE], `marked CTA routes to the endpoint with matching source: ${a.attrs.href}`)
}
const sourceRouted = anchors(homepage).filter(a => a.attrs.href && a.attrs.href.startsWith(ENDPOINT_PREFIX))
check(sourceRouted.length === markedHomepageCtas.length, "every homepage source-routed CTA is marked and vice versa")
for (const a of sourceRouted) {
	check(ATTR_SOURCE in a.attrs, `every /contact/?source= link carries the source marker: ${a.attrs.href}`)
	check(ATTR_EVENT in a.attrs, `every /contact/?source= link carries the event marker: ${a.attrs.href}`)
	check(a.attrs.href === ENDPOINT_PREFIX + a.attrs[ATTR_SOURCE], `routed source equals marker source: ${a.attrs.href}`)
}
for (const a of anchors(homepage)) {
	if (ATTR_SOURCE in a.attrs || ATTR_EVENT in a.attrs) {
		doesNotMatch(a.attrs.href || "", /^mailto:/, "signal-marked CTAs must never be bare mailto links")
	}
	if (a.text.includes("0509")) {
		check(!(ATTR_SOURCE in a.attrs), "portfolio 0509 CTAs must not carry the reviewed-service signal marker")
	}
}

console.log("  - source propagation (contact/application path)")
check(doc.includes("mailto:support@tinystudio.in"), "docs must name the reviewed-service application mailbox")
const applyAnchor = anchors(contact).find(a => a.attrs.id === APPLY_ID)
check(applyAnchor !== undefined, "contact page must contain the signal-apply application anchor")
match(applyAnchor.attrs.href, /^mailto:support@tinystudio\.in\?subject=Website%20Correction$/, "application anchor is a manual mailto with the reviewed-service subject")
match(applyAnchor.text, /Apply/i, "application anchor reads as an application action")
check(contact.includes(NOTE_ID), "contact page must contain the signal-note element")
check(contact.includes(DISCLOSURE), "contact page must state the signal is for internal measurement only")
check(contact.includes(AUTO_SEND_DISCLOSURE), "contact page must state nothing is sent automatically")
check(contact.includes(`?source=`) && contact.includes("source marker"), "contact page must document the source URL parameter")
const script = scriptBlocks(contact).find(b => b.attrs.id === SCRIPT_ID)
check(script !== undefined, "contact page must contain the signal-script propagation script")
check(script.source.includes("URLSearchParams"), "propagation script must read the source URL parameter")
check(script.source.includes(APPLY_ID), "propagation script must wire the application anchor")
check(script.source.includes(NOTE_ID), "propagation script must wire the disclosure note")
check(script.source.includes(SOURCE_NAME_ID), "propagation script must render the source name")
check(script.source.includes("mailto:support@tinystudio.in"), "propagation script must prefill the application mailbox")
check(script.source.includes(SOURCE_GUARD.source), "propagation script must validate the source value against the documented guard")
check(doc.includes(SOURCE_GUARD.source), "docs must document the page-side source guard regex")

console.log("  - privacy boundary (no analytics, cookies, fingerprinting, message collection)")
const allPages = [homepage, contact, privacyChoices]
for (const html of allPages) {
	for (const token of FORBIDDEN_PROVIDER_TOKENS) {
		doesNotMatch(html, new RegExp(token, "i"), `no analytics provider token allowed: ${token}`)
	}
	for (const block of scriptBlocks(html)) {
		check(!("src" in block.attrs), "no external scripts allowed on public pages")
		const executable = !block.attrs.type || /javascript|module/i.test(block.attrs.type)
		if (executable) {
			for (const api of FORBIDDEN_SCRIPT_APIS) {
				doesNotMatch(block.source, new RegExp(api.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `no tracking/cookie/fingerprint API allowed: ${api}`)
			}
		}
	}
}
check(privacyChoices.toLowerCase().includes("cookie"), "privacy-choices page must address cookies")
check(privacyChoices.toLowerCase().includes("analyt"), "privacy-choices page must address analytics")
check(privacyChoices.toLowerCase().includes("fingerprint"), "privacy-choices page must address fingerprinting")
check(privacyChoices.includes("?source="), "privacy-choices page must disclose the source URL parameter")

console.log("  - package.json wiring")
check(packageJson.includes(`"test:signal": "node scripts/test-public-conversion-signal.mjs"`), "package.json must wire test:signal to this test")

console.log(`test-public-conversion-signal: ${checks} checks passed`)
