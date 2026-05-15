/**
 * Enlaces a redes sociales. Sustituye `href` por las URLs reales cuando las tengas.
 */
export type SocialNetworkId = "facebook" | "instagram" | "linkedin" | "youtube";

/** Plataformas admitidas en el encabezado (CMS + icono en barra). */
export type HeaderSocialIconId =
  | SocialNetworkId
  | "tiktok"
  | "threads"
  | "whatsapp"
  | "website";

export const HEADER_SOCIAL_PLATFORM_OPTIONS: ReadonlyArray<{ id: HeaderSocialIconId; label: string }> = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "threads", label: "Threads" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "website", label: "Sitio web / otro" },
];

export function defaultLabelForHeaderSocialIcon(id: HeaderSocialIconId): string {
  return HEADER_SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export const SOCIAL_LINKS: ReadonlyArray<{
  id: SocialNetworkId;
  label: string;
  href: string;
}> = [
  { id: "facebook", label: "Facebook", href: "#" },
  { id: "instagram", label: "Instagram", href: "#" },
  { id: "linkedin", label: "LinkedIn", href: "#" },
  { id: "youtube", label: "YouTube", href: "#" },
];
