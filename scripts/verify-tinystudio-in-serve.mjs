#!/usr/bin/env node
// verify-tinystudio-in-serve.mjs — loopback static server for the
// .claude/skills/verify-tinystudio-in/ harness. Binds 127.0.0.1 only,
// serves the repo's public/ directory with the production MIME map,
// refuses to serve a file that escapes the root.
//
// Usage:
//   node scripts/verify-tinystudio-in-serve.mjs [port]
//   PORT=4178 node scripts/verify-tinystudio-in-serve.mjs
//
// Default port: 4178. If the requested port is taken, the script walks
// upward through 4179, 4180, ... and binds the first free port it
// finds. The bound address is printed as a single JSON line for the
// harness to parse.

import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)), "public")
const REQUESTED_PORT = Number.parseInt(process.env.PORT ?? process.argv[2] ?? "4178", 10)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
}

const fail = (msg, code = 1) => {
  process.stderr.write(`verify-tinystudio-in: ${msg}\n`)
  process.exit(code)
}

try {
  const rootStat = await stat(ROOT)
  if (!rootStat.isDirectory()) fail(`public/ is not a directory: ${ROOT}`)
} catch (error) {
  fail(`public/ is missing (${ROOT}): ${error.message}`)
}

const resolvePath = (urlPath) => {
  const decoded = decodeURIComponent(urlPath.split("?")[0])
  const relative = decoded === "/" || decoded.endsWith("/") ? `${decoded}index.html` : decoded
  const candidate = normalize(join(ROOT, relative))
  // Block path-escape. A safe file either equals ROOT (impossible here,
  // the join above would never return the root itself) or is a strict
  // descendant of ROOT.
  if (candidate !== ROOT && !candidate.startsWith(`${ROOT}${sep}`)) {
    return { kind: "escape", candidate }
  }
  return { kind: "ok", candidate }
}

const listen = (port, attempt = 0) =>
  new Promise((resolveServer, reject) => {
    if (attempt > 50) reject(new Error("no free port above 4178"))
    const server = createServer(async (req, res) => {
      const url = req.url || "/"
      const target = resolvePath(url)
      if (target.kind === "escape") {
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" })
        res.end("forbidden")
        return
      }
      try {
        const body = await readFile(target.candidate)
        res.writeHead(200, {
          "content-type": MIME[extname(target.candidate)] || "application/octet-stream",
          "cache-control": "no-store"
        })
        res.end(body)
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "EISDIR") {
          // 404.html body, served with a real 404 status — the live
          // Cloudflare Pages deploy returns 404.html with 404 when
          // the route file is missing, and a redirect/rewrite on the
          // host makes that work for clean URLs. The harness, with
          // no rewrite layer, serves the same body so the rendered
          // page is identical to what a user would see.
          try {
            const notFound = await readFile(join(ROOT, "404.html"))
            res.writeHead(404, {
              "content-type": MIME[".html"],
              "cache-control": "no-store"
            })
            res.end(notFound)
          } catch {
            res.writeHead(404, { "content-type": MIME[".html"] })
            res.end("Not Found\n")
          }
        } else {
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
          res.end(`server error: ${error.message}`)
        }
      }
    })
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        resolveServer(listen(port + 1, attempt + 1))
      } else {
        reject(error)
      }
    })
    server.listen(port, "127.0.0.1", () => {
      const { address, port: boundPort } = server.address()
      const payload = JSON.stringify({
        kind: "verify-tinystudio-in",
        bound: `http://${address}:${boundPort}`,
        publicRoot: ROOT
      })
      process.stdout.write(`verify-tinystudio-in: serving public/ at http://${address}:${boundPort}\n`)
      process.stdout.write(`${payload}\n`)
      resolveServer({ server, address, port: boundPort })
    })
  })

const handleSignal = (server) => {
  const shutdown = (signal) => {
    process.stdout.write(`verify-tinystudio-in: ${signal} received, closing\n`)
    server.close(() => process.exit(0))
  }
  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
}

listen(REQUESTED_PORT).then(({ server }) => handleSignal(server)).catch((error) => fail(error.message))
