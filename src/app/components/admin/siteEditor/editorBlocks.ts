import type { SiteContent } from "../../../../data/siteContent";

export type SiteKey = keyof SiteContent;

/** Bloques del editor de la página Servicios en función del número de tarjetas. */
export function getServicesEditorPageBlocks(cardCount: number): { id: string; label: string }[] {
  const n = Math.max(0, Math.floor(cardCount));
  return [
    { id: "services-hero", label: "Cabecera" },
    ...Array.from({ length: n }, (_, i) => ({
      id: `services-card-${i}`,
      label: `Tarjeta ${i + 1}`,
    })),
    { id: "services-cta", label: "Llamado a la acción" },
  ];
}

/** Bloques alineados con `sectionId` en formularios y `PreviewSectionChrome` en páginas */
export const EDITOR_PAGE_BLOCKS: Record<SiteKey, { id: string; label: string }[]> = {
  home: [
    { id: "home-hero", label: "Portada principal" },
    { id: "home-search", label: "Búsqueda" },
    { id: "home-selection", label: "Selección de propiedades" },
    { id: "home-experience", label: "Experiencia" },
    { id: "home-closing", label: "Cierre" },
  ],
  contact: [
    { id: "contact-hero", label: "Cabecera" },
    { id: "contact-visit", label: "Visítanos y mapa" },
    { id: "contact-whatsapp", label: "WhatsApp (CTA rápido)" },
    { id: "contact-form", label: "Formulario" },
    { id: "contact-faq", label: "Preguntas frecuentes" },
    { id: "contact-social", label: "Redes y enlaces" },
    { id: "contact-closing", label: "Cierre" },
  ],
  services: getServicesEditorPageBlocks(6),
  about: [
    { id: "about-hero", label: "Cabecera" },
    { id: "about-story", label: "Historia" },
    { id: "about-mission", label: "Misión y visión" },
    { id: "about-values", label: "Valores" },
    { id: "about-stats", label: "Cifras" },
    { id: "about-timeline", label: "Línea de tiempo" },
    { id: "about-team", label: "Equipo" },
  ],
  developments: [
    { id: "dev-hero", label: "Cabecera" },
    { id: "dev-featured", label: "Proyectos destacados (títulos)" },
  ],
  rent: [{ id: "rent-hero", label: "Cabecera" }],
  sale: [{ id: "sale-hero", label: "Cabecera" }],
  header: [{ id: "header-social", label: "Redes del encabezado" }],
};
