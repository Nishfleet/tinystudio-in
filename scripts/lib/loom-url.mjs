export function isValidLoomUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;
    if (host !== "loom.com" && !host.endsWith(".loom.com")) return false;
    return /^\/(share|embed)\/[^/?#]+/.test(url.pathname);
  } catch {
    return false;
  }
}

export function loomUrlError(value = "Loom URL") {
  return `${value} must be a Loom share or embed link like https://www.loom.com/share/...`;
}
