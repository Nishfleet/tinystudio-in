import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const read = (p) => readFileSync(join(ROOT, p), "utf8")

let failures = 0
let checks = 0
const ok = (cond, msg) => {
	checks++
	if (cond) console.log(`  ok ${msg}`)
	else {
		failures++
		console.error(`  FAIL ${msg}`)
	}
}

// Pages whose three content-card headings must sit directly beneath the page
// H1 at H2, before the footer headings are allowed to nest.
const PAGES = [
	{ path: "public/drishti/support/index.html", cards: 3 },
	{ path: "public/privacy-choices/index.html", cards: 3 },
]
const headingsOf = (html) => [...html.matchAll(/<h([1-3])\b/gi)].map((match) => Number(match[1]))

console.log("test-public-heading-hierarchy: public pages keep an H1-to-H2 content-card outline")

console.log("A. heading outline")
for (const { path, cards } of PAGES) {
	const levels = headingsOf(read(path))
	const h1 = levels.indexOf(1)
	ok(h1 === 0, `${path} starts with an H1`)
	ok(levels.filter((level) => level === 1).length === 1, `${path} has exactly one H1`)
	const belowH1 = levels.slice(h1 + 1)
	ok(belowH1.length >= cards + 1, `${path} has content-card and footer headings below the H1`)
	ok(
		belowH1.slice(0, cards).every((level) => level === 2),
		`${path} renders its ${cards} content-card headings as H2 directly beneath the H1`
	)
	ok(
		belowH1.every((level, index) => index === 0 || level <= belowH1[index - 1] + 1),
		`${path} never skips a heading level below the H1`
	)
	ok(belowH1.some((level) => level === 3), `${path} still nests footer H3 links below H2 groups`)
}

console.log("B. npm test/ci wiring")
const pkg = JSON.parse(read("package.json"))
ok(
	pkg.scripts.test.includes("test-public-heading-hierarchy.mjs"),
	"npm test runs the public heading hierarchy test"
)
ok(
	pkg.scripts.ci.includes("test-public-heading-hierarchy.mjs"),
	"npm run ci runs the public heading hierarchy test"
)

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
