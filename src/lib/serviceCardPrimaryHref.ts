import {
  SERVICE_PRIMARY_LISTING_HREFS,
  type ServiceCardContent,
  type ServicePrimaryListingHref,
} from "../data/siteContent";

const LISTING_SET = new Set<string>(SERVICE_PRIMARY_LISTING_HREFS);

/** Destino del CTA principal del nodo: listado (`/renta`, etc.) o página dedicada. */
export function resolveServiceCardPrimaryHref(
  card: Pick<ServiceCardContent, "slug" | "primaryListingHref">,
): string | null {
  const listing = card.primaryListingHref;
  if (listing && LISTING_SET.has(listing)) return listing;
  const slug = card.slug?.trim().toLowerCase();
  if (slug) return `/servicios/d/${slug}`;
  return null;
}

export function sanitizePrimaryListingHref(v: unknown): ServicePrimaryListingHref | undefined {
  return typeof v === "string" && LISTING_SET.has(v) ? (v as ServicePrimaryListingHref) : undefined;
}

/** Solo tarjetas sin listado como destino principal tienen página dedicada en `/servicios/d/:slug`. */
export function serviceCardUsesDedicatedPage(card: Pick<ServiceCardContent, "primaryListingHref">): boolean {
  return !sanitizePrimaryListingHref(card.primaryListingHref);
}
