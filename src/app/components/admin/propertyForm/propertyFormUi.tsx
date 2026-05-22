import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../ui/utils";

export const propertyFieldClass =
  "h-11 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-sm text-brand-navy shadow-sm transition placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";

export const propertyTextareaClass =
  "min-h-[7rem] w-full resize-y rounded-xl border border-stone-200/90 bg-white px-3.5 py-3 text-sm text-brand-navy shadow-sm transition placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";

export const propertyLabelClass = "text-xs font-medium text-slate-600";

export function PropertyFormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_30px_-12px_rgba(20,28,46,0.12)]",
        className,
      )}
    >
      <div className="flex items-start gap-3 border-b border-stone-100 bg-gradient-to-r from-stone-50/90 to-white px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-navy/5 text-brand-navy ring-1 ring-brand-navy/10">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="font-heading text-base font-semibold tracking-tight text-brand-navy">{title}</h3>
          {description ? <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{description}</p> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function PropertyFieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 }) {
  return (
    <div className={cn("grid gap-4", cols === 2 && "sm:grid-cols-2")}>{children}</div>
  );
}

export function PropertyField({
  label,
  hint,
  error,
  children,
  span = 1,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  span?: 1 | 2;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", span === 2 && "sm:col-span-2", className)}>
      <label className={propertyLabelClass}>{label}</label>
      {children}
      {error ? (
        <p className="text-[11px] leading-relaxed text-red-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] leading-relaxed text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const PROPERTY_FORM_STEPS = [
  { id: "medios" as const, label: "Medios", short: "Fotos y video" },
  { id: "ficha" as const, label: "Ficha", short: "Título y precio" },
  { id: "ubicacion" as const, label: "Ubicación", short: "Mapa y dirección" },
  { id: "tecnica" as const, label: "Ficha técnica", short: "Tipo y superficies" },
  { id: "detalles" as const, label: "Detalles", short: "Recámaras y medidas" },
  { id: "amenidades" as const, label: "Amenidades", short: "Listas públicas" },
  { id: "contacto" as const, label: "Contacto", short: "Teléfono y WhatsApp" },
] as const;

export type PropertyFormStepId = (typeof PROPERTY_FORM_STEPS)[number]["id"];
