import { parseStructuredDescription, sanitizeRichHtml } from "../lib/propertyDescription";
import { cn } from "./ui/utils";

type Props = {
  source: string;
  bodyColor?: string;
  headerColor?: string;
  className?: string;
};

/**
 * Descripción pública con soporte para HTML enriquecido (TipTap) y formato
 * estructurado (párrafos, títulos por palabra clave y viñetas para texto Tokko/plano).
 */
export function StructuredDescription({
  source,
  bodyColor = "rgba(20,28,46,0.72)",
  headerColor = "#141c2e",
  className,
}: Props) {
  if (!source?.trim()) return null;

  // Procesamos SIEMPRE la descripción para extraer títulos y viñetas y asegurar el estilo uniforme.

  const blocks = parseStructuredDescription(source);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === "header") {
          return (
            <h3
              key={`h-${i}`}
              className="mt-6 mb-3 text-[14px] font-bold uppercase tracking-[0.16em] first:mt-0"
              style={{ color: headerColor }}
            >
              {block.text}
            </h3>
          );
        }
        if (block.type === "bullet") {
          return (
            <div key={`b-${i}`} className="flex items-start gap-3 py-1 pl-1">
              <span
                className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "#9a7b4f" }}
                aria-hidden
              />
              <p className="text-[15px] font-medium leading-relaxed" style={{ color: bodyColor, lineHeight: 1.75 }}>
                {block.text}
              </p>
            </div>
          );
        }
        return (
          <p
            key={`p-${i}`}
            className="mb-4 text-[15px] font-normal last:mb-0"
            style={{ color: bodyColor, lineHeight: 1.8 }}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
