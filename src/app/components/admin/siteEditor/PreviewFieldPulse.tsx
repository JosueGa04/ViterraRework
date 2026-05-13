import { useEffect, useState, type ReactNode } from "react";
import { useVisualSiteEditorOptional } from "../../../../contexts/VisualSiteEditorContext";
import { cn } from "../../ui/utils";

/**
 * En modo editor visual, breve contorno alrededor del fragmento que corresponde al campo enfocado en el formulario.
 */
export function PreviewFieldPulse({
  blockId,
  fieldKey,
  children,
  className,
  layout = "inline",
}: {
  blockId: string;
  fieldKey: string;
  children: ReactNode;
  /** p. ej. `block` / `inline-flex` para encajar con el layout del hero. */
  className?: string;
  /** `cover`: contenedor a pantalla completo (p. ej. imagen de fondo del hero). */
  layout?: "inline" | "cover";
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

  const fieldAttr = { "data-viterra-editor-field": fieldKey } as const;

  const ring = flash ? (
    <span
      className={cn(
        "pointer-events-none z-[25] rounded-md border-[3px] border-amber-300 shadow-[0_0_0_2px_rgba(0,0,0,0.45),0_0_26px_rgba(251,191,36,0.65)]",
        layout === "cover" ? "absolute inset-0 sm:inset-0" : "absolute inset-[-5px] sm:inset-[-7px]"
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

  return (
    <span {...fieldAttr} className={cn("relative align-middle", className)}>
      {children}
      {ring}
    </span>
  );
}
