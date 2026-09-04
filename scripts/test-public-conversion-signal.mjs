#!/usr/bin/env node
import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = (path) => readFileSync(join(root, path), "utf8")

const HOMEPAGE = read("public/index.html")
const CONTACT = read("public/contact/index.html")
const PRIVACY_CHOICES = read("public/privacy-choices/index.html")
const DOC = read("docs/measurement/public-conversion-signal.md")
const OWNED_HTML = [HOMEPAGE, CONTACT, PRIVACY_CHOICES]

const CONTACT_ENDPOINT = "/contact/"

const registry = [
	{source: "homepage-service", label: "Ask about 0509", href: "/contact/?src=homepage-service"},
	{source: "homepage-footer", label: "0509", href: "/contact/?src=homepage-footer"},
]

function extractAnchors(html) {
	const anchors = []
	const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/g
	let match
	while ((match = re.exec(html))) {
		anchors.push({attrs: match[1], text: match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()})
	}
	return anchors
}

function attr(attrs, name) {
	const prefix = `${name}=`
	const start = attrs.indexOf(prefix)
	if (start === -1) return null
	const quote = attrs[start + prefix.length]
	if (quote !== "\"" && quote !== "'") return null
	const end = attrs.indexOf(quote, start + prefix.length + 1)
	if (end === -1) return null
	return attrs.slice(start + prefix.length + 1, end)
}

function hrefOf(anchor) {
	return attr(anchor.attrs, "href")
}

const ANALYTICS_HOSTS = [
	"googletagmanager.com",
	"google-analytics.com",
	"plausible.io",
	"plausible",
	"usefathom.com",
	"segment.com",
	"segment.io",
	"mixpanel.com",
	"hotjar.com",
	"clarity.ms",
	"posthog.com",
	"heapanalytics.com",
	"amplitude.com",
	"gtag",
]

const TRACKING_APIS = [
	"document.cookie",
	"localStorage",
	"sessionStorage",
	"sendBeacon",
	"navigator.",
	"canvas.toDataURL",
	".fingerprint",
]

function scripts(html) {
	const found = []
	const re = /<script\b[^>]*>[\s\S]*?<\/script>/g
	let match
	while ((match = re.exec(html))) found.push(match[0])
	return found
}

function normalize(html) {
	return html.replace(/\s+/g, " ")
}

const homepageAnchors = extractAnchors(HOMEPAGE)

// 1. Signal definitions: the registry is exactly the reviewed-service CTA set,
//    each entry is a stable, lowercase source slug.
	for (const entry of registry) {
		assert.match(entry.source, /^[a-z0-9-]+$/, `source slug must be stable and lowercase: ${entry.source}`)
		assert.equal(entry.href, `${CONTACT_ENDPOINT}?src=${entry.source}`, `href must route to the contact endpoint with source context: ${entry.source}`)
	}

// 2. Every reviewed-service CTA on the homepage carries the marker and routes
//    to the contact endpoint with source context; no orphan markers exist.
const marked = homepageAnchors.filter((anchor) => attr(anchor.attrs, "data-measure-source"))
assert.equal(marked.length, registry.length, "homepage must mark exactly the reviewed-service CTAs in the registry")

for (const anchor of marked) {
	const source = attr(anchor.attrs, "data-measure-source")
	const entry = registry.find((item) => item.source === source)
	assert.ok(entry, `unregistered data-measure-source marker: ${source}`)
	assert.equal(hrefOf(anchor), entry.href, `marker ${source} must route to ${entry.href}`)
	assert.ok(anchor.text.includes(entry.label), `marker ${source} must be on the ${entry.label} CTA, found: ${anchor.text}`)
}

for (const entry of registry) {
	const withSource = homepageAnchors.filter((anchor) => hrefOf(anchor) === entry.href)
	assert.equal(withSource.length, 1, `exactly one homepage CTA must route to ${entry.href}`)
	assert.ok(withSource[0].attrs.includes(`data-measure-source="${entry.source}"`), `${entry.href} must carry data-measure-source="${entry.source}"`)
}

// 3. No third-party tracking parameters or providers, no cookie/fingerprint
//    APIs, no executable scripts, no hidden fields, no auto-submit, anywhere in
//    the owned public HTML.
assert.ok(!HOMEPAGE.includes("utm_"), "homepage must not use third-party tracking parameters")
for (const [name, html] of [["index", HOMEPAGE], ["contact", CONTACT], ["privacy-choices", PRIVACY_CHOICES]]) {
	for (const host of ANALYTICS_HOSTS) {
		assert.ok(!html.includes(host), `${name}: analytics provider reference found: ${host}`)
	}
	for (const api of TRACKING_APIS) {
		assert.ok(!html.includes(api), `${name}: tracking/cookie/fingerprint API found: ${api}`)
	}
	assert.ok(!html.includes("type=\"hidden\""), `${name}: hidden form fields are not allowed`)
	for (const script of scripts(html)) {
		assert.ok(script.includes("type=\"application/ld+json\""), `${name}: only JSON-LD scripts are allowed`)
		assert.ok(!/<script\b[^>]*\bsrc=/.test(script), `${name}: external scripts are not allowed`)
	}
}
assert.ok(!CONTACT.includes("<form"), "contact page must not contain forms (nothing can auto-submit)")
assert.ok(!/<form/.test(CONTACT) && !CONTACT.includes("auto-submit") && !CONTACT.includes("submit()"), "contact page must not auto-send or auto-submit")

// 4. The contact path preserves source context as a human-readable, manual
//    measurement signal and states that it is for internal measurement only.
const contactText = normalize(CONTACT)
assert.ok(contactText.includes("src="), "contact page must explain the src parameter that preserves source context")
assert.ok(contactText.includes("internal measurement only"), "contact page must state the signal is for internal measurement only")

// 5. The documentation contract names the registry, owner, retention, privacy
//    boundary, and a falsifiable decision rule, and is honest about evidence.
for (const heading of ["## Owner", "## Retention", "## Privacy boundary", "## Falsifiable decision rule"]) {
	assert.ok(DOC.includes(heading), `docs/measurement/public-conversion-signal.md must contain: ${heading}`)
}
for (const entry of registry) {
	assert.ok(DOC.includes(entry.source), `docs must name source: ${entry.source}`)
	assert.ok(DOC.includes(entry.href), `docs must name route: ${entry.href}`)
}
assert.ok(DOC.includes("data-measure-source"), "docs must name the marker attribute")
assert.ok(DOC.includes("not proof of completed applications"), "docs must be honest: static tagging is not proof of completion")
assert.ok(DOC.includes("received human messages"), "docs must define completion evidence as received human messages")
assert.ok(DOC.includes("reworked or removed"), "docs must carry a falsifiable decision rule")

console.log(`Public conversion signal checks passed (${registry.length} sources).`)
