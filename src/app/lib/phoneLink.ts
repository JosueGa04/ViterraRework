/** `tel:` para la ficha pública; null si no hay número usable. */
export function resolveTelHref(phone: string | undefined | null): string | null {
  const raw = phone?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.startsWith("52") ? `tel:+${digits}` : `tel:+52${digits}`;
  }
  if (digits.length >= 3) return `tel:+${digits}`;
  return null;
}
