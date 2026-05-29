#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const file = process.argv[2];

if (!file) {
  console.error("Usage: npm run prospect:import -- prospects.txt");
  process.exit(1);
}

if (!existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const rows = readFileSync(file, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const results = [];

for (const row of rows) {
  const [name, website = "", vertical = "", city = "", contact = "", notes = ""] = row.includes("|")
    ? row.split("|").map((part) => part.trim())
    : [row];

  try {
    const args = ["scripts/create-prospect-audit.mjs", name];
    if (website) args.push("--website", website);
    if (vertical) args.push("--vertical", vertical);
    if (city) args.push("--city", city);
    if (contact) args.push("--contact", contact);
    if (notes) args.push("--notes", notes);

    const output = execFileSync("node", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    results.push(JSON.parse(output));
  } catch (error) {
    results.push({
      status: "skipped",
      prospect: name,
      reason: error.stderr?.toString().trim() || error.message
    });
  }
}

console.log(JSON.stringify({
  status: "done",
  count: results.length,
  created: results.filter((result) => result.status === "created").length,
  skipped: results.filter((result) => result.status === "skipped").length,
  results
}, null, 2));
