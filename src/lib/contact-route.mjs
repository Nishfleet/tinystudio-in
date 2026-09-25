function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(markdown || "").match(new RegExp(`## ${escaped}\\n+([\\s\\S]*?)(?:\\n## |$)`));
  return match ? match[1].trim() : "";
}

function firstLine(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .find(Boolean) || "";
}

function listLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
    .filter((line) => !/^none found$/i.test(line));
}

function urlFromLine(line) {
  return String(line || "").match(/https?:\/\/[^\s)]+/i)?.[0]?.replace(/[.,;]+$/, "") || "";
}

function isEmailRoute(value) {
  return /^email\b/i.test(String(value || "").trim()) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(String(value || ""));
}

function cleanRoute(value) {
  return String(value || "").trim().replace(/[.]+$/g, "");
}

function isHandlerEndpoint(value) {
  const url = urlFromLine(value) || value;
  try {
    const parsed = new URL(url);
    const target = `${parsed.hostname} ${parsed.pathname} ${parsed.search}`.toLowerCase();
    return /(handler|submit|webhook|api\.web3forms|formsubmit|formspree)/i.test(target);
  } catch {
    return /(handler|submit|webhook|api\.web3forms|formsubmit|formspree)/i.test(String(value || ""));
  }
}

function formScore(line) {
  const url = urlFromLine(line) || line;
  let score = 0;
  let routeText = url;
  try {
    const parsed = new URL(url);
    routeText = `${parsed.pathname} ${parsed.search} ${parsed.hash}`;
    if (parsed.pathname === "/" && !parsed.hash) score -= 8;
    if (parsed.hash) score += 2;
  } catch {
    score -= 4;
  }
  if (isHandlerEndpoint(line)) score -= 20;
  if (/contact/i.test(routeText)) score += 10;
  if (/(book|schedule|consult|demo|sales|get-started|get%20started|assessment|support)/i.test(routeText)) score += 6;
  return score;
}

function socialScore(line) {
  const url = urlFromLine(line);
  if (/linkedin\.com/i.test(url)) return 10;
  if (/(x\.com|twitter\.com)/i.test(url)) return 8;
  if (/facebook\.com/i.test(url)) return 5;
  return 1;
}

export function safeNonEmailRoute(contactPlanMarkdown) {
  const explicitSafeRoute = firstLine(section(contactPlanMarkdown, "Safe Route While Email Blocked"));
  if (explicitSafeRoute && !isEmailRoute(explicitSafeRoute) && !isHandlerEndpoint(explicitSafeRoute)) {
    return cleanRoute(explicitSafeRoute);
  }

  const forms = listLines(section(contactPlanMarkdown, "Forms And Contact Pages"))
    .filter((line) => !/^mailto:/i.test(line))
    .filter((line) => urlFromLine(line) || /^https?:\/\//i.test(line))
    .map((line) => ({ line, score: formScore(line) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.line);

  if (forms.length) {
    const target = urlFromLine(forms[0]) || forms[0];
    return `Use contact form/page: ${target}`;
  }

  const socials = listLines(section(contactPlanMarkdown, "Social Profiles"))
    .filter((line) => urlFromLine(line))
    .sort((a, b) => socialScore(b) - socialScore(a));

  if (socials.length) {
    const target = urlFromLine(socials[0]);
    if (/linkedin\.com/i.test(target)) return `Use LinkedIn DM/profile: ${target}`;
    if (/(x\.com|twitter\.com)/i.test(target)) return `Use X/Twitter DM/profile: ${target}`;
    return `Use social profile: ${target}`;
  }

  return "Use contact form or DM; contact-plan needs a non-email route.";
}

export function routedContactPlan(contactPlanMarkdown, { emailReady = false } = {}) {
  const bestRoute = firstLine(section(contactPlanMarkdown, "Best Route")) || "Open contact plan";
  if (emailReady) return bestRoute;
  const safeRoute = safeNonEmailRoute(contactPlanMarkdown);
  const hasConcreteSafeRoute = safeRoute && !/needs a non-email route/i.test(safeRoute) && !isHandlerEndpoint(safeRoute);
  if (hasConcreteSafeRoute) return safeRoute;
  if (!isEmailRoute(bestRoute)) {
    return isHandlerEndpoint(bestRoute) ? safeRoute : cleanRoute(bestRoute);
  }
  return `${safeRoute}. Email route after sender setup: ${bestRoute}`;
}

export function routeToChannel(route, { emailReady = false } = {}) {
  const normalized = String(route || "").toLowerCase();
  if (emailReady && isEmailRoute(normalized)) return "email";
  if (normalized.includes("linkedin")) return "linkedin";
  if (normalized.includes("twitter") || /\bx\b/.test(normalized)) return "x";
  if (normalized.includes("phone") || normalized.includes("call")) return "phone";
  if (normalized.includes("dm") || normalized.includes("social")) return "dm";
  if (normalized.includes("contact form") || normalized.includes("contact page") || normalized.includes("form/page")) return "contact-form";
  return emailReady ? "email" : "contact-form";
}
