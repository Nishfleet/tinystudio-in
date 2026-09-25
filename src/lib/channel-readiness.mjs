export const CHANNELS = [
  "CRO / conversion",
  "SEO / search trust",
  "Content / authority",
  "Paid search",
  "Paid social",
  "Email/SMS/lifecycle",
  "Social / distribution",
  "Local/reputation",
  "Analytics / attribution",
  "Creative / design",
  "Marketing automation"
];

export function normalizeChannel(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function meaningful(value, minLength = 3) {
  const normalized = String(value || "").trim();
  return normalized.length >= minLength && !/^(todo|tbd|n\/a|none|placeholder|add|replace|-|\[.*\])$/i.test(normalized);
}

export function tableRows(markdown) {
  return String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.some(Boolean) && !cells.every((cell) => /^:?-+:?$/.test(cell)));
}

export function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

export function isReadyValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!meaningful(normalized)) return false;
  if (/\b(no|not ready|blocked|missing|pending|unknown|needs|cannot|unavailable|unconfirmed)\b/i.test(normalized)) {
    return false;
  }
  return /\b(ready|yes|pass|approved|confirmed|available|active|clean|filled)\b/i.test(normalized);
}

export function isBlockedValue(value) {
  return /\b(no|not ready|blocked|missing|pending|unknown|needs|cannot|unavailable|unconfirmed)\b/i.test(String(value || ""));
}

export function parseChannelReadiness(markdown) {
  const rows = tableRows(section(markdown, "Scorecard"));
  const byChannel = new Map();

  for (const row of rows) {
    const [channel] = row;
    if (!channel || /^Channel$/i.test(channel)) continue;
    byChannel.set(normalizeChannel(channel), row);
  }

  const channels = CHANNELS.map((channel) => {
    const row = byChannel.get(normalizeChannel(channel)) || [channel, "", "", "", "", ""];
    const access = row[1] || "";
    const economics = row[2] || "";
    const measurement = row[3] || "";
    const approval = row[4] || "";
    const decision = row[5] || "";
    const gateValues = [access, economics, measurement, approval];
    const gatesReady = gateValues.every(isReadyValue);
    const decisionReady = isReadyValue(decision);
    const filled = gateValues.every((value) => meaningful(value)) && meaningful(decision);
    const blocked = [...gateValues, decision].some(isBlockedValue);
    const status = gatesReady && decisionReady
      ? "ready"
      : blocked
        ? "blocked"
        : filled
          ? "watch"
          : "draft";
    return { channel, access, economics, measurement, approval, decision, status };
  });

  const readyChannels = channels.filter((row) => row.status === "ready").map((row) => row.channel);
  const readySet = new Set(readyChannels);
  const growthChannels = [
    "SEO / search trust",
    "Content / authority",
    "Paid search",
    "Paid social",
    "Email/SMS/lifecycle",
    "Social / distribution",
    "Local/reputation"
  ];
  const weeklyExpansionChannels = [
    "Content / authority",
    "Paid search",
    "Paid social",
    "Email/SMS/lifecycle",
    "Local/reputation",
    "Analytics / attribution"
  ];
  const paidReady = readySet.has("Paid search") || readySet.has("Paid social");
  const proofSprintReady = readySet.has("CRO / conversion") && readySet.has("SEO / search trust");
  const weeklyGrowthDeskReady = proofSprintReady && weeklyExpansionChannels.some((channel) => readySet.has(channel));
  const fullStackGrowthDeskReady = readySet.has("CRO / conversion")
    && readySet.has("Analytics / attribution")
    && growthChannels.filter((channel) => readySet.has(channel)).length >= 2;
  const operatorPodReady = fullStackGrowthDeskReady
    && readySet.has("Email/SMS/lifecycle")
    && (paidReady || readySet.has("SEO / search trust"))
    && readySet.has("Marketing automation");

  const status = operatorPodReady
    ? "operator-pod-ready"
    : fullStackGrowthDeskReady
      ? "full-stack-growth-desk-ready"
      : weeklyGrowthDeskReady
        ? "weekly-growth-desk-ready"
        : proofSprintReady
          ? "proof-sprint-ready"
          : readyChannels.length
            ? "partial"
            : "draft";

  return {
    status,
    channels,
    readyChannels,
    blockedChannels: channels.filter((row) => row.status === "blocked").map((row) => row.channel),
    watchChannels: channels.filter((row) => row.status === "watch").map((row) => row.channel),
    draftChannels: channels.filter((row) => row.status === "draft").map((row) => row.channel),
    proofSprintReady,
    weeklyGrowthDeskReady,
    fullStackGrowthDeskReady,
    operatorPodReady
  };
}
