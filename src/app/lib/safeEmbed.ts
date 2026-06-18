const ALLOWED_EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
  "my.matterport.com",
  "matterport.com",
  "kuula.co",
  "www.kuula.co",
  "roundme.com",
  "www.roundme.com",
  "storage.net-fs.com",
  "www.google.com",
  "maps.google.com",
]);

/** Hostnames permitidos para iframes de tours 3D y video embed. */
export function isAllowedEmbedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (ALLOWED_EMBED_HOSTS.has(host)) return true;
  return host.endsWith(".matterport.com") || host.endsWith(".kuula.co");
}

export function isAllowedEmbedUrl(raw: string): boolean {
  const u = raw.trim();
  if (!u) return false;
  try {
    const parsed = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    return isAllowedEmbedHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function normalizeAllowedEmbedUrl(raw: string): string | null {
  if (!isAllowedEmbedUrl(raw)) return null;
  const u = raw.trim();
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export const IFRAME_SANDBOX_ATTR =
  "allow-scripts allow-same-origin allow-presentation allow-popups";
