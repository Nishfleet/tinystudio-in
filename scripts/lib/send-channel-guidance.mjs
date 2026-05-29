import { agencyConfig } from "./agency-config.mjs";

export function sendChannelGuidance() {
  const config = agencyConfig();
  const warnings = [];

  if (!config.senderEmail) warnings.push("sender email is not configured");
  if (!config.senderPhysicalAddress) warnings.push("missing physical postal address");
  if (!config.dkimSelector) warnings.push("DKIM selector not configured");
  if (Number(config.manualDailySendCap) > 20) warnings.push("manual daily send cap is above 20");

  const emailReady = warnings.length === 0;

  return {
    emailReady,
    recommendedChannel: emailReady ? "email, contact form, or DM" : "contact form or DM",
    rule: emailReady
      ? `Email setup is locally configured for ${config.senderEmail}. Use the prospect's best route and keep the manual send cap.`
      : "Email setup is not clean yet. Prefer contact forms or DMs until send:setup is clean.",
    warnings,
    senderEmail: config.senderEmail,
    manualDailySendCap: config.manualDailySendCap
  };
}

export function formatChannelGuidanceMarkdown(contactRoute = "") {
  const guidance = sendChannelGuidance();
  const lines = [
    `- Recommended: ${guidance.recommendedChannel}`,
    `- Rule: ${guidance.rule}`
  ];

  if (contactRoute) lines.push(`- Contact-plan route: ${contactRoute}`);
  if (guidance.warnings.length) lines.push(`- Sender warnings: ${guidance.warnings.join("; ")}`);
  lines.push("- Before cold email: run `npm run send:setup`; if it warns, use `npm run send:configure -- --physical-address=\"...\" --dkim-selector=... --dry-run` with real values, then rerun setup.");

  return lines.join("\n");
}
