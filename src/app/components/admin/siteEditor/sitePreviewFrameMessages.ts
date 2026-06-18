import type { SiteContent } from "../../../../data/siteContent";
import type { SiteKey } from "./editorBlocks";

/** Padre → iframe: estado completo del borrador y del editor visual. */
export const VITERRA_SITE_PREVIEW_SYNC = "viterra-site-preview-sync" as const;

/** Iframe → padre: el documento embebido ya escucha y pide el estado inicial. */
export const VITERRA_SITE_PREVIEW_READY = "viterra-site-preview-ready" as const;

/** Iframe → padre: acciones desde la vista previa (p. ej. barra de bloque). */
export const VITERRA_SITE_PREVIEW_CHILD = "viterra-site-preview-child" as const;

export type SitePreviewSyncPayload = {
  mergedContent: SiteContent;
  previewPath: string;
  serviceDetailPreviewSlug: string | null;
  /** Si es true, la vista previa del iframe muestra el `<Header />`. */
  showSiteHeaderInPreview?: boolean;
  /** Pestaña del editor (Inicio, Header, Footer…): acota resaltados a bloques de esa página. */
  editorTab: SiteKey;
  /** Etiquetas flotantes de bloque dentro del iframe (desactivadas por defecto). */
  showBlockLabels?: boolean;
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
