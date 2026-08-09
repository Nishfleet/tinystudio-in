#!/usr/bin/env node
import { resolveTxt } from "node:dns/promises";
import { agencyConfig } from "./lib/agency-config.mjs";

const strict = process.argv.includes("--strict");
const config = agencyConfig();
const warnings = [];
const checks = [];
const dkimSelectorCandidates = [
  "google",
  "selector1",
  "selector2",
  "s1",
  "s2",
  "k1",
  "mail",
  "default",
  "smtp",
  "email",
  "sendgrid",
  "mailgun",
  "mandrill",
  "protonmail",
  "zoho",
  "zmail",
  "dkim",
  "m1",
  "m2",
  "pm",
  "mx",
  "sig1",
  "sig2",
  // Cloudflare Email Service: when Email Routing or Email Sending signs mail for the
  // domain, Cloudflare provides DKIM records under these selectors (current docs:
  // https://developers.cloudflare.com/email-service/concepts/email-authentication/).
  // The sender domain proves Cloudflare is in the mail path via SPF include
  // _spf.mx.cloudflare.net and MX route*.mx.cloudflare.net.
  "cf2024-1",
  "cf2022_cloudflare_email",
  "c2022_cloudflare_email",
  "cf-bounce"
];

function senderDomain() {
  if (config.senderDomain) return config.senderDomain;
  const match = String(config.senderEmail || "").match(/@([^@\s]+)$/);
  return match ? match[1].toLowerCase() : "";
}

async function txtRecords(domain) {
  try {
    const records = await resolveTxt(domain);
    return records.map((record) => record.join(""));
  } catch {
    return [];
  }
}

function warn(rule, detail) {
  warnings.push({ rule, detail });
}

async function discoverDkimCandidates(domain) {
  const found = [];
  for (const selector of dkimSelectorCandidates) {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    const records = await txtRecords(dkimDomain);
    const dkim = records.find((record) => /^v=DKIM1\b/i.test(record) || /\bp=/.test(record));
    if (dkim) found.push({ selector, domain: dkimDomain });
  }
  return found;
}

if (!config.senderEmail) {
  warn("missing sender email", "Set senderEmail in growth-brain/ops/agency-config.json.");
}

if (!config.senderPhysicalAddress) {
  warn("missing physical postal address", "Commercial email needs a valid physical postal address. Use a business address, PO box, or private mailbox before cold email.");
}

if (!Number.isFinite(Number(config.manualDailySendCap)) || Number(config.manualDailySendCap) <= 0) {
  warn("missing manual daily send cap", "Set manualDailySendCap so outbound stays intentionally low-volume.");
}

const domain = senderDomain();
let dkimCandidates = [];

if (!domain) {
  warn("missing sender domain", "Set senderEmail or senderDomain before email sending.");
} else {
  const rootTxt = await txtRecords(domain);
  const spf = rootTxt.find((record) => /^v=spf1\b/i.test(record));
  checks.push({ name: "SPF", status: spf ? "found" : "missing", domain });
  if (!spf) warn("missing SPF", `No SPF TXT record found for ${domain}.`);

  const dmarcDomain = `_dmarc.${domain}`;
  const dmarcTxt = await txtRecords(dmarcDomain);
  const dmarc = dmarcTxt.find((record) => /^v=DMARC1\b/i.test(record));
  checks.push({ name: "DMARC", status: dmarc ? "found" : "missing", domain: dmarcDomain });
  if (!dmarc) warn("missing DMARC", `No DMARC TXT record found for ${dmarcDomain}.`);

  if (config.dkimSelector) {
    const dkimDomain = `${config.dkimSelector}._domainkey.${domain}`;
    const dkimTxt = await txtRecords(dkimDomain);
    const dkim = dkimTxt.find((record) => /^v=DKIM1\b/i.test(record) || /\bp=/.test(record));
    checks.push({ name: "DKIM", status: dkim ? "found" : "missing", domain: dkimDomain });
    if (!dkim) warn("missing DKIM", `No DKIM TXT record found for ${dkimDomain}.`);
  } else {
    dkimCandidates = await discoverDkimCandidates(domain);
    checks.push({
      name: "DKIM discovery",
      status: dkimCandidates.length ? "found" : "missing",
      domain: dkimCandidates.length
        ? dkimCandidates.map((candidate) => candidate.domain).join(", ")
        : `common selectors at _domainkey.${domain}`
    });
    warn(
      "DKIM selector not configured",
      dkimCandidates.length
        ? `Possible DKIM selector(s) found: ${dkimCandidates.map((candidate) => candidate.selector).join(", ")}. Save one exact selector after confirming it in the mail provider.`
        : "Set dkimSelector after enabling DKIM in the mail provider. No common DKIM selectors were found in DNS."
    );
  }
}

const result = {
  status: warnings.length ? "warn" : "pass",
  senderEmail: config.senderEmail || "",
  senderDomain: domain,
  manualDailySendCap: Number(config.manualDailySendCap) || 0,
  dkimCandidates,
  checks,
  warnings
};

if (strict && warnings.length) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
