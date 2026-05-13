import { createContext, useContext, useMemo, type ReactNode } from "react";

export type VisualSiteEditorContextValue = {
  enabled: boolean;
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
};

const VisualSiteEditorContext = createContext<VisualSiteEditorContextValue | null>(null);

export function VisualSiteEditorProvider({
  enabled,
  activeBlockId,
  setActiveBlockId,
  previewNavigateSeq,
  previewNavigateTargetId,
  previewNavigateFieldKey,
  requestPreviewNavigate,
  children,
}: {
  enabled: boolean;
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  previewNavigateSeq: number;
  previewNavigateTargetId: string | null;
  previewNavigateFieldKey: string | null;
  requestPreviewNavigate: (blockId: string, fieldKey?: string | null) => void;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      enabled,
      activeBlockId,
      setActiveBlockId,
      previewNavigateSeq,
      previewNavigateTargetId,
      previewNavigateFieldKey,
      requestPreviewNavigate,
    }),
    [
      enabled,
      activeBlockId,
      setActiveBlockId,
      previewNavigateSeq,
      previewNavigateTargetId,
      previewNavigateFieldKey,
      requestPreviewNavigate,
    ]
  );
  return <VisualSiteEditorContext.Provider value={value}>{children}</VisualSiteEditorContext.Provider>;
}

export function useVisualSiteEditorOptional() {
  return useContext(VisualSiteEditorContext);
}
