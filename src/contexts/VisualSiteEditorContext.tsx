import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SiteKey } from "../app/components/admin/siteEditor/editorBlocks";

export type VisualSiteEditorContextValue = {
  enabled: boolean;
  /** Pestaña activa del editor de sitio; acota resaltados en la vista previa. */
  editorTab: SiteKey | null;
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  /** Contador que sube al centrar/resaltar un bloque (formulario o pestañas). */
  previewNavigateSeq: number;
  /** Bloque al que apunta el último `requestPreviewNavigate` (animación de resalte). */
  previewNavigateTargetId: string | null;
  /** Subcampo opcional (p. ej. `home-hero-devLink`) para resaltar en la vista previa. */
  previewNavigateFieldKey: string | null;
  /** Activa bloque, opcionalmente un subcampo, dispara resalte y scroll en el panel de vista previa. */
  requestPreviewNavigate: (blockId: string, fieldKey?: string | null) => void;
  /** Etiquetas flotantes de bloque en la vista previa (desactivadas en el iframe del editor). */
  showBlockLabels?: boolean;
};

const VisualSiteEditorContext = createContext<VisualSiteEditorContextValue | null>(null);

export function VisualSiteEditorProvider({
  enabled,
  editorTab = null,
  activeBlockId,
  setActiveBlockId,
  previewNavigateSeq,
  previewNavigateTargetId,
  previewNavigateFieldKey,
  requestPreviewNavigate,
  showBlockLabels = true,
  children,
}: {
  enabled: boolean;
  editorTab?: SiteKey | null;
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  previewNavigateSeq: number;
  previewNavigateTargetId: string | null;
  previewNavigateFieldKey: string | null;
  requestPreviewNavigate: (blockId: string, fieldKey?: string | null) => void;
  showBlockLabels?: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      enabled,
      editorTab,
      activeBlockId,
      setActiveBlockId,
      previewNavigateSeq,
      previewNavigateTargetId,
      previewNavigateFieldKey,
      requestPreviewNavigate,
      showBlockLabels,
    }),
    [
      enabled,
      editorTab,
      activeBlockId,
      setActiveBlockId,
      previewNavigateSeq,
      previewNavigateTargetId,
      previewNavigateFieldKey,
      requestPreviewNavigate,
      showBlockLabels,
    ]
  );
  return <VisualSiteEditorContext.Provider value={value}>{children}</VisualSiteEditorContext.Provider>;
}

export function useVisualSiteEditorOptional() {
  return useContext(VisualSiteEditorContext);
}
