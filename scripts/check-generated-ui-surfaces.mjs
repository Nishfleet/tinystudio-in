#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const checkName = "Generated UI Surface Check";

const surfaces = [
  {
    path: "growth-brain/ops/market-proof-cockpit.html",
    name: "Market proof cockpit",
    required: [
      "TinyStudio Market Proof Cockpit",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
      "<link rel=\"icon\" href=\"data:,\">",
      "Tangible Improvement Queue",
      "Missing / Route Review",
      "class=\"mobile-list\"",
      "class=\"desktop-table\"",
      "proof-card",
      "route-card",
      "@media (max-width:860px)"
    ]
  },
  {
    path: "prospects/recording-teleprompter.html",
    name: "Recording teleprompter",
    required: [
      "TinyStudio Recording Teleprompter",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"",
      "<link rel=\"icon\" href=\"data:,\"",
      "qualityBar",
      "qualityNotes",
      "timerRow",
      "copyFilledSheet",
      "localStorage",
      "isValidLoomUrl",
      "document.execCommand(\"copy\")",
      "window.prompt(\"Copy this:\"",
      ".toast {",
      "opacity: 0",
      ".toast.show",
      "@media (max-width: 860px)"
    ]
  },
  {
    path: "growth-brain/ops/internal-dashboard.html",
    name: "Internal dashboard",
    required: [
      "Internal Dashboard",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"",
      "Next / Pending Actions",
      "11/10 Blockers",
      "@media (max-width: 760px)",
      "overflow-x: auto"
    ]
  },
  {
    path: "growth-brain/ops/growth-cockpit.html",
    name: "Growth cockpit",
    required: [
      "TinyStudio Growth Cockpit",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"",
      "Today",
      "Record",
      "@media (max-width: 860px)"
    ]
  },
  {
    path: "growth-brain/ops/owned-product-case-studies.html",
    name: "Owned-product case studies",
    required: [
      "Owned-Product Case Studies",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"",
      "Business Metric Capture Sheet",
      "need business metric",
      "LAST_REAL_VALUE",
      "0 business metric(s)",
      "white-space:pre-wrap"
    ]
  },
  {
    path: "growth-brain/ops/daily-money-mission.html",
    name: "Daily money mission",
    required: [
      "Daily Money Mission",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"",
      "Loom Link Sheet",
      "copyText",
      "document.execCommand(\"copy\")",
      "window.prompt(\"Copy this:\""
    ]
  },
  {
    path: "prospects/outbox.html",
    name: "Prospect outbox",
    required: [
      "TinyStudio Prospect Outbox",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"",
      "Workflow",
      "copyText",
      "document.execCommand(\"copy\")",
      "window.prompt(\"Copy this:\"",
      ".toast.show"
    ]
  }
];

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function hasBalancedMobileTables(html, path) {
  if (path !== "growth-brain/ops/market-proof-cockpit.html") return true;
  const mobileLists = (html.match(/class="mobile-list"/g) || []).length;
  const desktopTables = (html.match(/class="desktop-table"/g) || []).length;
  return mobileLists >= 2 && desktopTables >= 2;
}

const failures = [];
const checked = [];

for (const surface of surfaces) {
  const html = read(surface.path);
  if (!html) {
    failures.push(`${surface.name}: missing ${surface.path}`);
    continue;
  }

  checked.push(surface.path);
  for (const phrase of surface.required) {
    if (!html.includes(phrase)) failures.push(`${surface.name}: missing ${phrase}`);
  }

  if (!hasBalancedMobileTables(html, surface.path)) {
    failures.push(`${surface.name}: mobile card fallback must pair with desktop tables`);
  }
}

const result = {
  check: checkName,
  status: failures.length ? "fail" : "pass",
  checked: checked.length,
  surfaces: checked,
  failures
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exit(1);
