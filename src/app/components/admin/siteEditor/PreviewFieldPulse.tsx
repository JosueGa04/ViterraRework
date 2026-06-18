import { useEffect, useState, type ReactNode } from "react";
import { useVisualSiteEditorOptional } from "../../../../contexts/VisualSiteEditorContext";
import { blockBelongsToEditorTab } from "./editorBlocks";
import { cn } from "../../ui/utils";

/**
 * En modo editor visual, breve contorno alrededor del fragmento que corresponde al campo enfocado en el formulario.
 */
export function PreviewFieldPulse({
  blockId,
  fieldKey,
  children,
  className,
  layout = "block",
}: {
  blockId: string;
  fieldKey: string;
  children: ReactNode;
  className?: string;
  /** `block` (defecto): títulos y párrafos. `inline`: enlaces en línea. `cover`: fondo a pantalla completa. */
  layout?: "inline" | "block" | "cover";
}) {
  const v = useVisualSiteEditorOptional();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const match =
      !!v?.enabled && v.previewNavigateTargetId === blockId && v.previewNavigateFieldKey === fieldKey;
    if (!match) {
      setFlash(false);
      return;
    }
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 2400);
    return () => window.clearTimeout(t);
  }, [v?.enabled, v?.previewNavigateSeq, v?.previewNavigateTargetId, v?.previewNavigateFieldKey, blockId, fieldKey]);

  if (!v?.enabled) return <>{children}</>;

  if (v.editorTab && !blockBelongsToEditorTab(blockId, v.editorTab)) {
    return <>{children}</>;
  }

  const fieldAttr = { "data-viterra-editor-field": fieldKey } as const;

  const ring = flash ? (
    <span
      className={cn(
        "pointer-events-none z-[25] rounded-md border-[3px] border-amber-300 shadow-[0_0_0_2px_rgba(0,0,0,0.45),0_0_26px_rgba(251,191,36,0.65)]",
        layout === "cover" ? "absolute inset-0" : "absolute inset-[-4px] sm:inset-[-6px]"
      )}
      aria-hidden
    />
  ) : null;

  if (layout === "cover") {
    return (
      <div {...fieldAttr} className={cn("relative h-full w-full min-h-0 overflow-hidden", className)}>
        {children}
        {ring}
      </div>
    );
  }

  if (layout === "inline") {
    return (
      <span
        {...fieldAttr}
        className={cn(
          flash ? "relative inline-block max-w-full align-middle" : "inline max-w-full align-middle",
          className
        )}
      >
        {children}
        {ring}
      </span>
    );
  }

  if (!flash) {
    return (
      <span {...fieldAttr} className={cn("block min-w-0 max-w-full", className)}>
        {children}
      </span>
    );
  }

  return (
    <div {...fieldAttr} className={cn("relative block w-full min-w-0", className)}>
      {children}
      {ring}
    </div>
  );
}
