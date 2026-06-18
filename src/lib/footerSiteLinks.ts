import { VITERRA_NAV_ITEMS } from "../app/config/siteNav";
import type { FooterNavLink, ServiceCardContent } from "../data/siteContent";
import { resolveServiceCardPrimaryHref } from "./serviceCardPrimaryHref";

/** Valor del `<select>` cuando el destino no es una ruta interna predefinida. */
export const FOOTER_QUICK_LINK_CUSTOM = "__custom__" as const;

const FOOTER_QUICK_LABEL_HINTS: Record<string, string> = {
  "/": "Inicio",
  "/renta": "Propiedades",
  "/venta": "Propiedades en venta",
  "/desarrollos": "Desarrollos",
  "/servicios": "Servicios",
  "/nosotros": "Nosotros",
  "/contacto": "Contacto",
};

/** Rutas internas del sitio para el selector de enlaces rápidos del pie. */
export const FOOTER_INTERNAL_LINK_OPTIONS = VITERRA_NAV_ITEMS.map(([href, navLabel]) => ({
  href,
  navLabel,
  suggestedLabel: FOOTER_QUICK_LABEL_HINTS[href] ?? navLabel,
}));

export function footerQuickLinkSelectValue(href: string): string {
  const h = href.trim();
  return FOOTER_INTERNAL_LINK_OPTIONS.some((o) => o.href === h) ? h : FOOTER_QUICK_LINK_CUSTOM;
}

/** Enlaces de la columna Servicios a partir de las tarjetas de `/servicios`. */
export function footerServiceLinksFromCards(cards: ServiceCardContent[]): FooterNavLink[] {
  const out: FooterNavLink[] = [];
  for (const card of cards) {
    const href = resolveServiceCardPrimaryHref(card);
    if (!href) continue;
    const label = card.title.trim();
    if (!label) continue;
    out.push({ label, href });
  }
  return out;
}
