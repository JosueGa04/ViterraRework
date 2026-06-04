import { ArrowRight } from "lucide-react";

type Props = {
  onOpenKpis: () => void;
};

export function DashboardKpisCta({ onOpenKpis }: Props) {
  return (
    <button
      type="button"
      onClick={onOpenKpis}
      className="group flex w-full flex-col rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md"
    >
      <p className="font-heading text-sm font-semibold text-brand-navy">Análisis y metas en KPI&apos;s</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Embudo completo, tendencias, origen y comparativas vs período anterior.
      </p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
        Ir a reportes
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </button>
  );
}
