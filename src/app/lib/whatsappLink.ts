/** Normaliza enlace WhatsApp para guardar en BD (URL completa preferida). */
export function normalizeWhatsappLinkForStorage(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10) return `https://wa.me/${digits}`;
  return null;
}

/** Href para botón en ficha pública: usa liga guardada, dígitos legacy o fallback del sitio. */
export function resolveWhatsappHref(
  stored: string | undefined,
  fallbackHref: string,
  message?: string,
): string {
  const t = stored?.trim();
  if (t && /^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      if (message && !u.searchParams.has("text")) {
        u.searchParams.set("text", message);
        return u.toString();
      }
      return t;
    } catch {
      return t;
    }
  }
  if (t) {
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 10) {
      const base = `https://wa.me/${digits}`;
      return message ? `${base}?text=${encodeURIComponent(message)}` : base;
    }
  }
  if (fallbackHref && message && fallbackHref.includes("wa.me")) {
    try {
      const u = new URL(fallbackHref);
      if (!u.searchParams.has("text")) {
        u.searchParams.set("text", message);
        return u.toString();
      }
    } catch {
      /* mantener fallback */
    }
  }
  return fallbackHref || "#";
}

export function isValidWhatsappLinkInput(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  if (/^https?:\/\//i.test(t)) return true;
  return t.replace(/\D/g, "").length >= 10;
}
