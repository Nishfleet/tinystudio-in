import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve("public");
const cssPath = path.join(root, "styles.css");
const iconPath = path.join(root, "favicon.svg");
const appleIconPath = path.join(root, "apple-touch-icon.svg");

const htmlFiles = [
  "index.html",
  "404.html",
  "support/index.html",
  "contact/index.html",
  "privacy/index.html",
  "privacy-choices/index.html",
  "terms/index.html",
  "promptly/index.html",
  "promptly/support/index.html",
  "promptly/privacy/index.html",
  "drishti/index.html",
  "drishti/support/index.html",
  "drishti/privacy/index.html"
];

const supportSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tinystudio.in/#organization",
      name: "Tiny Studio",
      url: "https://tinystudio.in/",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: "https://tinystudio.in/support/"
      }
    },
    {
      "@type": "ContactPage",
      "@id": "https://tinystudio.in/support/#webpage",
      url: "https://tinystudio.in/support/",
      name: "Support - Tiny Studio",
      isPartOf: {
        "@id": "https://tinystudio.in/#website"
      },
      about: {
        "@id": "https://tinystudio.in/#organization"
      },
      description:
        "Support for Tiny Studio products, including Promptly for bookings, Drishti for mindful screen time, and 0509 for growth teams."
    }
  ]
};

const llmsTxt = `# Tiny Studio

Tiny Studio is a small product company behind Promptly, Drishti, and 0509.

## Public pages

- Home: https://tinystudio.in/
- Support: https://tinystudio.in/support/
- Contact: https://tinystudio.in/contact/
- Privacy: https://tinystudio.in/privacy/
- Terms: https://tinystudio.in/terms/
- Promptly: https://tinystudio.in/promptly/
- Drishti: https://tinystudio.in/drishti/

## Product boundaries

- Promptly is presented as an app for bookings, reminders, payment proof, and day-of clarity for solo professionals.
- Drishti is presented as a mindful screen-time app built around pauses, intention checks, and less guilt-heavy friction.
- 0509 is presented as a sharper operational product lane for growth teams.
- This file describes public site context only. It does not include private user data, internal roadmaps, or support tickets.
`;

async function main() {
  let css = await fs.readFile(cssPath, "utf8");
  css = css
    .replace(
      /--sans:\s*"Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;/,
      '--sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;'
    )
    .replace(
      /--mono:\s*"IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace;/,
      '--mono: "SFMono-Regular", ui-monospace, monospace;'
    );
  await fs.writeFile(cssPath, css);
  await fs.copyFile(iconPath, appleIconPath);
  await fs.writeFile(path.join(root, "llms.txt"), llmsTxt);

  for (const relativeFile of htmlFiles) {
    const filePath = path.join(root, relativeFile);
    let html = await fs.readFile(filePath, "utf8");
    html = removeGeneratedHeadAssets(html);
    html = replaceCloudflareEmailProtection(html);
    html = html.replace(
      /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/,
      `<link rel="apple-touch-icon" href="/apple-touch-icon.svg">\n    <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">\n    <noscript><link rel="stylesheet" href="/styles.css"></noscript>\n    <link rel="icon" href="/favicon.svg" type="image/svg+xml">`
    );

    if (relativeFile === "support/index.html") {
      html = addSupportSchema(fixSupportHeadingOrder(html));
    }

    await fs.writeFile(filePath, html);
  }

  await assertLocalAssetsExist();
}

function removeGeneratedHeadAssets(html) {
  return html
    .replace(/\n\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/g, "")
    .replace(/\n\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/g, "")
    .replace(/\n\s*<link\s+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]+"\s+rel="stylesheet"\s*>/g, "")
    .replace(/\n\s*<link rel="stylesheet" href="\/styles\.css">/g, "")
    .replace(/\n\s*<link rel="apple-touch-icon" href="\/apple-touch-icon\.svg">/g, "")
    .replace(/\n\s*<link rel="preload" href="\/styles\.css" as="style" onload="this\.onload=null;this\.rel='stylesheet'">/g, "")
    .replace(/\n\s*<noscript><link rel="stylesheet" href="\/styles\.css"><\/noscript>/g, "")
    .replace(/\n\s*<style data-static-critical-css>[\s\S]*?<\/style>/g, "")
    .replace(/\n\s*<script type="application\/ld\+json" data-page-schema="support">[\s\S]*?<\/script>/g, "")
    .replace(/\n\s*<script data-cfasync="false" src="\/cdn-cgi\/scripts\/5c5dd728\/cloudflare-static\/email-decode\.min\.js"><\/script>/g, "");
}

function replaceCloudflareEmailProtection(html) {
  return html
    .replace(/href="\/cdn-cgi\/l\/email-protection#[^"]+"/g, 'href="mailto:support@tinystudio.in"')
    .replace(/<span class="__cf_email__" data-cfemail="[^"]+">\[email&#160;protected\]<\/span>/g, "support@tinystudio.in");
}

function fixSupportHeadingOrder(html) {
  return html
    .replace("<h3>One support address, clearly documented.</h3>", "<h2>One support address, clearly documented.</h2>")
    .replace("<h3>Each app has its own support destination.</h3>", "<h2>Each app has its own support destination.</h2>")
    .replace("<h3>The support copy matches the real workflows.</h3>", "<h2>The support copy matches the real workflows.</h2>");
}

function addSupportSchema(html) {
  const schema = JSON.stringify(supportSchema, null, 6);
  const script = `    <script type="application/ld+json" data-page-schema="support">\n      ${schema.replace(/\n/g, "\n      ")}\n    </script>\n`;
  return html.replace(/(\s*<link rel="apple-touch-icon")/, `\n${script}$1`);
}

async function assertLocalAssetsExist() {
  const referenced = new Set();
  for (const relativeFile of htmlFiles) {
    const html = await fs.readFile(path.join(root, relativeFile), "utf8");
    for (const match of html.matchAll(/(?:href|src|content)="(?:https:\/\/tinystudio\.in)?(\/[^"#?]+)(?:[#?][^"]*)?"/g)) {
      const assetPath = match[1];
      if (!/\.[a-z0-9]+$/i.test(assetPath)) continue;
      if (assetPath.startsWith("/cdn-cgi/")) continue;
      referenced.add(assetPath);
    }
  }

  const missing = [];
  for (const assetPath of [...referenced].sort()) {
    try {
      await fs.access(path.join(root, assetPath.slice(1)));
    } catch {
      missing.push(assetPath);
    }
  }

  if (missing.length) {
    throw new Error(`Missing static assets referenced by HTML: ${missing.join(", ")}`);
  }
}

await main();
