#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { safeNonEmailRoute } from "./lib/contact-route.mjs";

const args = process.argv.slice(2);
const prospectPath = args[0];
const htmlArg = args.find((arg) => arg.startsWith("--html="));
const timeoutArg = args.find((arg) => arg.startsWith("--timeout="));
const offline = args.includes("--offline");
const timeoutMs = timeoutArg ? Number(timeoutArg.split("=")[1]) : 8000;

if (!prospectPath) {
  console.error("Usage: npm run prospect:contact-plan -- prospects/prospect-slug [--html=fixture.html] [--offline]");
  process.exit(1);
}

if (!existsSync(prospectPath)) {
  console.error(`Prospect folder not found: ${prospectPath}`);
  process.exit(1);
}

function read(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function json(relativePath) {
  const path = join(prospectPath, relativePath);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function sameOrigin(url, base) {
  try {
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

function isAssetUrl(url) {
  return /\.(?:png|jpe?g|gif|svg|webp|ico|css|js|pdf|zip)(?:[?#].*)?$/i.test(url)
    || /\/(?:wp-content|hubfs|uploads)\//i.test(url)
    || /xmlrpc\.php/i.test(url);
}

function isSocialUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    return host === "x.com"
      || host.endsWith(".x.com")
      || host === "twitter.com"
      || host.endsWith(".twitter.com")
      || host === "linkedin.com"
      || host.endsWith(".linkedin.com")
      || host === "facebook.com"
      || host.endsWith(".facebook.com")
      || host === "instagram.com"
      || host.endsWith(".instagram.com")
      || host === "youtube.com"
      || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

function isUsableEmail(email) {
  const domain = String(email).split("@")[1]?.toLowerCase() || "";
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)
    && !/%/.test(email)
    && !["company.com", "yourcompany.com"].includes(domain)
    && !/\.(?:png|jpe?g|gif|svg|webp|ico|css|js|pdf|zip)$/i.test(email);
}

function parseHtml(html, baseUrl) {
  const decodedHtml = decodeHtml(html);
  const links = [];
  const emails = [];
  const phones = [];
  const forms = [];
  const socials = [];

  for (const match of html.matchAll(/href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const rawHref = decodeHtml(match[1]).trim();
    const label = cleanText(decodeHtml(match[2]));
    if (!rawHref || rawHref.startsWith("#") || rawHref.toLowerCase().startsWith("javascript:")) continue;
    if (rawHref.toLowerCase().startsWith("mailto:")) {
      emails.push(rawHref.replace(/^mailto:/i, "").split("?")[0].trim());
      continue;
    }
    if (rawHref.toLowerCase().startsWith("tel:")) {
      phones.push(rawHref.replace(/^tel:/i, "").trim());
      continue;
    }
    const url = absoluteUrl(rawHref, baseUrl);
    if (!url) continue;
    if (isAssetUrl(url)) continue;
    const safeLabel = label.length > 90 ? new URL(url).hostname : label;
    if (isSocialUrl(url)) {
      socials.push({ label: safeLabel || url, url });
    }
    links.push({ label: safeLabel || url, url });
  }

  for (const match of decodedHtml.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    emails.push(match[0]);
  }

  for (const match of html.matchAll(/<form\b[^>]*>/gi)) {
    const action = match[0].match(/action\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    forms.push(action ? absoluteUrl(decodeHtml(action), baseUrl) : baseUrl);
  }

  return {
    emails: unique(emails.map((email) => email.toLowerCase()).filter(isUsableEmail)),
    phones: unique(phones),
    forms: unique(forms),
    links,
    socials: [...new Map(socials.map((item) => [item.url, item])).values()]
  };
}

function contactCandidates(parsed, baseUrl) {
  return parsed.links
    .filter((link) => sameOrigin(link.url, baseUrl))
    .filter((link) => !isAssetUrl(link.url))
    .filter((link) => /(contact|book|schedule|consult|demo|sales|support|get-started|get started|talk)/i.test(`${link.label} ${link.url}`))
    .slice(0, 6);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "TinyStudio contact route audit"
      }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, url: response.url, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadSource(website) {
  try {
    if (htmlArg) {
      const source = htmlArg.split("=")[1];
      if (existsSync(source)) {
        return { ok: true, status: 200, url: website || "https://example.com/", text: readFileSync(source, "utf8"), source: "html-file" };
      }
      return { ...(await fetchText(source)), source: "html-url" };
    }
    if (offline || !website) {
      return { ok: false, status: 0, url: website || "", text: "", source: "offline" };
    }
    return { ...(await fetchText(website)), source: "website" };
  } catch (error) {
    return { ok: false, status: 0, url: website || "", text: "", source: `fetch-error: ${error.message}` };
  }
}

function formatList(items, empty = "- none found") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

const metadata = json("metadata.json");
const name = metadata.name || prospectPath.split("/").at(-1);
const website = metadata.website || "";
const existingContact = metadata.contact || "";
const metadataEmails = unique((existingContact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
  .map((email) => email.toLowerCase())
  .filter(isUsableEmail));
const source = await loadSource(website);
const parsed = source.text ? parseHtml(source.text, source.url || website) : { emails: [], phones: [], forms: [], links: [], socials: [] };
const candidates = contactCandidates(parsed, source.url || website);
const followed = [];

if (!htmlArg && !offline && candidates.length) {
  for (const candidate of candidates.slice(0, 3)) {
    try {
      const fetched = await fetchText(candidate.url);
      const childParsed = fetched.text ? parseHtml(fetched.text, fetched.url || candidate.url) : { emails: [], phones: [], forms: [], socials: [] };
      followed.push({ candidate, fetched, parsed: childParsed });
    } catch (error) {
      followed.push({ candidate, error: error.message, parsed: { emails: [], phones: [], forms: [], socials: [] } });
    }
  }
}

const allEmails = unique([...metadataEmails, ...parsed.emails, ...followed.flatMap((item) => item.parsed.emails)]);
const allPhones = unique([...parsed.phones, ...followed.flatMap((item) => item.parsed.phones)]);
const allForms = unique([...parsed.forms, ...followed.flatMap((item) => item.parsed.forms)]);
const allSocials = unique([...parsed.socials, ...followed.flatMap((item) => item.parsed.socials || []).map((item) => `${item.label}|${item.url}`)])
  .map((item) => {
    if (typeof item !== "string") return item;
    const [label, url] = item.split("|");
    return { label, url };
  });
const displaySocials = [...new Map(allSocials.map((item) => [item.url, item])).values()].slice(0, 10);

let bestRoute = "Use the website contact form or contact page.";
if (allEmails.length) bestRoute = `Email ${allEmails[0]}.`;
else if (allForms.length) bestRoute = `Use form ${allForms[0]}.`;
else if (candidates.length) bestRoute = `Use contact page ${candidates[0].url}.`;
else if (allSocials.length) bestRoute = `Use social profile ${allSocials[0].url}.`;

const routePreview = `## Forms And Contact Pages

${formatList(unique([...allForms, ...candidates.map((candidate) => candidate.url)]))}

## Social Profiles

${displaySocials.length ? displaySocials.map((item) => `- ${item.label}: ${item.url}`).join("\n") : "- none found"}
`;
const safeRoute = safeNonEmailRoute(routePreview);

const contactPlan = `# ${name} Contact Plan

## Best Route

${bestRoute}

## Safe Route While Email Blocked

${safeRoute}

## Source

- Prospect folder: ${prospectPath}
- Website: ${website || "missing"}
- Existing contact note: ${existingContact || "missing"}
- Fetch source: ${source.source}
- Fetch status: ${source.status || "not fetched"}

## Emails

${formatList(allEmails)}

## Forms And Contact Pages

${formatList(unique([...allForms, ...candidates.map((candidate) => candidate.url)]))}

## Phones

${formatList(allPhones)}

## Social Profiles

${displaySocials.length ? displaySocials.map((item) => `- ${item.label}: ${item.url}`).join("\n") : "- none found"}

## Send Rule

- Prefer a direct email if one is clearly listed on the site.
- If there is no direct email, use the contact form version from \`next-message.md\`.
- If using LinkedIn/X, use the DM version.
- Do not guess emails.
- Do not use scraped-looking addresses unless they appear on the business website.
`;

const outputPath = join(prospectPath, "contact-plan.md");
writeFileSync(outputPath, contactPlan);

console.log(JSON.stringify({
  status: "created",
  prospectPath,
  path: outputPath,
  bestRoute,
  emails: allEmails.length,
  forms: allForms.length,
  candidatePages: candidates.length,
  socials: displaySocials.length,
  sourceStatus: source.status || 0
}, null, 2));
