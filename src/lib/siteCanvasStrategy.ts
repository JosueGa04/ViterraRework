import type { SiteKey } from "../app/components/admin/siteEditor/editorBlocks";

/**
 * Estrategia híbrida canvas + contenido legacy (Fase 3 del plan editor).
 *
 * - Hoy `home`, `contact`, `about`, `developments` son campos fijos en `SiteContent`; no existe `canvas` por página.
 * - Los bloques composables con posición opcional viven en `ServiceCardContent.detailBlocks` (`ServiceDetailCanvasLayout`).
 *
 * Extensión recomendada cuando se migre otra ruta:
 * 1. Añadir en `SiteContent[pageKey]` un campo opcional `canvas?: { version: 1; items: CanvasItem[] }`.
 * 2. En la página React correspondiente: si `canvas` tiene ítems, montar un motor de render; si no, layout actual.
 * 3. Normalizar en `siteContentMerge` igual que `detailBlocks` (ids, tipos, límites de layout %).
 *
 * `pilotOrder` sugiere orden de pilotos de menor a mayor riesgo.
 */
export const SITE_CANVAS_PILOT_ORDER: SiteKey[] = ["services", "about", "developments", "contact", "home", "rent", "sale", "header"];

export type SiteCanvasPhase = "detailBlocks_only" | "optional_page_canvas" | "full_migration";

export const SITE_CANVAS_CURRENT_PHASE: SiteCanvasPhase = "detailBlocks_only";
