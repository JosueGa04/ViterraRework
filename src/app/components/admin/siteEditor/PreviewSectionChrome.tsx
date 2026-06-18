import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useVisualSiteEditorOptional } from "../../../../contexts/VisualSiteEditorContext";
import { blockBelongsToEditorTab } from "./editorBlocks";
import { cn } from "../../ui/utils";

/**
 * En modo editor visual: borde al seleccionar, franja izquierda para elegir bloque
 * (sin cubrir todo el contenido para no bloquear scroll ni enlaces).
 */
export function PreviewSectionChrome({
  blockId,
  label,
  children,
  /** Nodos pequeños (grafo servicios): sin franja izquierda ni etiqueta que tape el nodo. */
  compact = false,
  /** Sin cartel de texto (p. ej. pie de página estrecho). */
  hideLabel = false,
  /** Sin franja lateral de selección (columnas estrechas del footer). */
  hideStripe = false,
  /** Ajusta el halo del resaltado al fondo claro u oscuro del bloque. */
  surface = "light",
}: {
  blockId: string;
  label: string;
  children: ReactNode;
  compact?: boolean;
  hideLabel?: boolean;
  hideStripe?: boolean;
  surface?: "light" | "dark";
}) {
  const v = useVisualSiteEditorOptional();
  const [flashHighlight, setFlashHighlight] = useState(false);
  const stripeHidden = compact || hideStripe || hideLabel;
  const ringOffset = surface === "dark" ? "ring-offset-brand-navy" : "ring-offset-white";
  const blockShadow =
    surface === "dark"
      ? "shadow-[0_0_0_2px_#C8102E,0_0_0_4px_rgba(20,28,46,0.92)]"
      : "shadow-[0_0_0_2px_#C8102E,0_0_0_4px_rgba(255,255,255,0.95)]";

  useEffect(() => {
    const match =
      !!v?.enabled &&
      v.previewNavigateTargetId === blockId &&
      !v.previewNavigateFieldKey;
    if (!match) {
      setFlashHighlight(false);
      return;
    }
    setFlashHighlight(true);
    const t = window.setTimeout(() => setFlashHighlight(false), 2600);
    return () => window.clearTimeout(t);
  }, [v?.enabled, v?.previewNavigateSeq, v?.previewNavigateTargetId, v?.previewNavigateFieldKey, blockId]);

  if (!v?.enabled) return <>{children}</>;

  if (v.editorTab && !blockBelongsToEditorTab(blockId, v.editorTab)) {
    return <>{children}</>;
  }

  const selected = v.activeBlockId === blockId;
  const fieldInBlock = Boolean(v.previewNavigateFieldKey?.startsWith(`${blockId}-`));
  const showFullBlockRing = selected && !fieldInBlock && !compact;
  const showBlockLabel = v.showBlockLabels !== false && !hideLabel;

  return (
    <div
      id={`viterra-block-${blockId}`}
      className={cn(
        "relative min-h-0",
        compact ? "inline-block w-auto scroll-mt-20" : "w-full scroll-mt-32 md:scroll-mt-36",
      )}
    >
      {selected && !compact && showBlockLabel ? (
        <span
          className="pointer-events-none absolute left-6 top-2 z-[20] max-w-[min(100%,12rem)] truncate rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm"
          aria-hidden
        >
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          "relative min-h-0 rounded-sm transition-[box-shadow,ring] duration-200",
          compact ? "w-auto" : "w-full",
          showFullBlockRing && `z-[1] ${blockShadow}`,
          flashHighlight &&
            cn("z-[2] ring-4 ring-amber-300/95 ring-offset-2", ringOffset, "shadow-[0_0_0_2px_rgba(251,191,36,0.95)]")
        )}
      >
        {children}
        {flashHighlight ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-[4] rounded-sm border-[3px] border-amber-200/95 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]",
              surface === "dark" ? "bg-amber-300/10" : "bg-amber-300/12"
            )}
            aria-hidden
          />
        ) : null}
      </div>
      {!stripeHidden ? (
        <button
          type="button"
          className="absolute left-0 top-0 z-[5] h-full w-2.5 cursor-pointer border-0 bg-[#C8102E]/0 p-0 transition-colors hover:bg-[#C8102E]/25"
          title={label}
          aria-label={`Editar ${label}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            v.setActiveBlockId(blockId);
          }}
        />
      ) : null}
    </div>
  );
}
