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

const css = read("public/styles.css")
const pkg = JSON.parse(read("package.json"))

console.log("test-public-reduced-motion: public CSS respects prefers-reduced-motion")

console.log("A. public/styles.css declares a reduced-motion media query")
const startMatch = css.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/i)
ok(startMatch !== null, "public/styles.css has @media (prefers-reduced-motion: reduce) block")

let block = null
if (startMatch) {
  let depth = 1
  let i = startMatch.index + startMatch[0].length
  while (i < css.length && depth > 0) {
    if (css[i] === "{") depth++
    else if (css[i] === "}") depth--
    i++
  }
  block = css.slice(startMatch.index + startMatch[0].length, i - 1)
}

console.log("B. the reduced-motion block cancels smooth scroll")
ok(block !== null && /scroll-behavior\s*:\s*auto/i.test(block), "reduced-motion block sets html scroll-behavior: auto")

console.log("C. the reduced-motion block makes .reveal visible and animation-free")
ok(block !== null && /\.reveal/i.test(block), "reduced-motion block styles .reveal")
ok(block !== null && /opacity\s*:\s*1/i.test(block), "reduced-motion block sets .reveal opacity: 1")
ok(block !== null && /transform\s*:\s*none/i.test(block), "reduced-motion block sets .reveal transform: none")
ok(block !== null && /animation\s*:\s*none/i.test(block), "reduced-motion block sets .reveal animation: none")

console.log("D. npm test/ci wiring")
ok(pkg.scripts.test.includes("test-public-reduced-motion.mjs"), "npm test runs the reduced-motion test")
ok(pkg.scripts.ci.includes("test-public-reduced-motion.mjs"), "npm run ci runs the reduced-motion test")

console.log(`\n${checks} checks, ${failures} failures`)
process.exit(failures === 0 ? 0 : 1)
