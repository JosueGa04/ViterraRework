import type { SiteContent } from "../../../../data/siteContent";

/** Padre → iframe: estado completo del borrador y del editor visual. */
export const VITERRA_SITE_PREVIEW_SYNC = "viterra-site-preview-sync" as const;

/** Iframe → padre: acciones desde la vista previa (p. ej. barra de bloque). */
export const VITERRA_SITE_PREVIEW_CHILD = "viterra-site-preview-child" as const;

export type SitePreviewSyncPayload = {
  mergedContent: SiteContent;
  previewPath: string;
  serviceDetailPreviewSlug: string | null;
  /** Si es true, la vista previa del iframe muestra el `<Header />` (p. ej. al editar redes del encabezado). */
  showSiteHeaderInPreview?: boolean;
  activeBlockId: string | null;
  previewNavigateSeq: number;
  previewNavigateTargetId: string | null;
  previewNavigateFieldKey: string | null;
};

export type SitePreviewChildMessage =
  | {
      type: typeof VITERRA_SITE_PREVIEW_CHILD;
      action: "setActiveBlock";
      blockId: string | null;
    }
  | {
      type: typeof VITERRA_SITE_PREVIEW_CHILD;
      action: "servicesPreviewNavigate";
      surface: "main" | "detail";
      /** Slug de `/servicios/d/:slug` al pasar a vista dedicada (cambio de tarjeta o grafo → detalle). */
      slug?: string;
    };

export function isSameOriginMessage(origin: string): boolean {
  return origin === window.location.origin;
}
