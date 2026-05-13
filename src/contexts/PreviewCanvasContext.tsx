import { createContext, useContext, type ReactNode } from "react";
import { viterraHeroTitleClass } from "../app/config/heroLayout";

const PreviewCanvasContext = createContext(false);

/** Activo dentro de la vista previa del admin (el ancho real es estrecho; no usar breakpoints de viewport). */
export function PreviewCanvasProvider({ children }: { children: ReactNode }) {
  return <PreviewCanvasContext.Provider value={true}>{children}</PreviewCanvasContext.Provider>;
}

export function usePreviewCanvas() {
  return useContext(PreviewCanvasContext);
}

/**
 * Los breakpoints `md:`/`lg:` de Tailwind miran el viewport del navegador, no el panel de la vista previa.
 * Con ventana ancha, las grillas multi-columna se activan dentro de un iframe/columna estrecha y se solapan.
 * Usar estas clases solo dentro de páginas renderizadas en `SitePreviewCanvas`.
 *
 * No mezclar en `cn()` la misma utilidad responsive dos veces (p. ej. `lg:grid-cols-12` en el primer
 * argumento y `pl.gridCols("…lg:grid-cols-12")` en el segundo): el primer bloque seguiría activo en escritorio.
 */
export function usePreviewLayout() {
  const preview = usePreviewCanvas();
  return {
    preview,
    /** Grillas: en preview siempre una columna. `responsiveCols` p. ej. `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` */
    gridCols: (responsiveCols: string) => (preview ? "grid-cols-1" : responsiveCols),
    /** `lg:col-span-*` en preview debe ser una sola columna */
    colSpan: (responsive: string) => (preview ? "col-span-1" : responsive),
    /** Flex: en preview apilar (evita filas comprimidas) */
    flexStack: (responsive: string) => (preview ? "flex-col" : responsive),
    /** Mismo rol que `viterraHeroTitleClass`; en preview el tamaño sigue el ancho del lienzo (`cqw`), no `md:` del viewport. */
    heroTitleClass: () =>
      preview
        ? "font-heading max-w-full text-balance break-words px-1 text-[clamp(1.75rem,min(9cqw,14vw),2.85rem)] font-light tracking-[-0.02em] text-white not-italic"
        : viterraHeroTitleClass,
    /** H1 de la portada Home (wordmark); sin `md:text-6xl` etc. en preview. */
    homePortadaTitleClass: () =>
      preview
        ? "max-w-full px-2 text-balance break-words font-[family-name:var(--font-hero-display)] text-[clamp(1.65rem,min(10.5cqw,15vw),3rem)] font-light leading-[1.06] tracking-tight text-white not-italic sm:px-3"
        : "px-2 text-[2.35rem] font-light leading-[1.05] tracking-tight text-white not-italic sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl",
  };
}
