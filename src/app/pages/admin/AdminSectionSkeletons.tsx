import type { ComponentProps } from "react";
import { cn } from "../../components/ui/utils";

function ShimmerBlock({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg bg-slate-200/90 viterra-admin-skeleton-shimmer", className)}
      {...props}
    />
  );
}

/** Solo la fila de gráficas (lazy Recharts en dashboard). */
export function AdminChartsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy aria-label="Cargando gráficas">
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <ShimmerBlock className="mb-6 h-5 w-40" />
        <ShimmerBlock className="h-[280px] w-full rounded-xl" />
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <ShimmerBlock className="mb-6 h-5 w-44" />
        <ShimmerBlock className="h-[280px] w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Tarjetas de métricas + zona de gráficas (dashboard admin). */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Cargando panel">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-sm ring-1 ring-black/[0.02]"
          >
            <ShimmerBlock className="mb-3 h-3 w-24" />
            <ShimmerBlock className="h-8 w-20" />
            <ShimmerBlock className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <AdminChartsRowSkeleton />
    </div>
  );
}

/** Vista tipo embudo / columnas (asesor o líder en dashboard). */
export function AdminPipelineDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Cargando resumen">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-sm">
            <ShimmerBlock className="mb-2 h-3 w-20" />
            <ShimmerBlock className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[min(100%,220px)] shrink-0 space-y-2">
            <ShimmerBlock className="h-9 w-full rounded-xl" />
            <ShimmerBlock className="h-28 w-full rounded-xl" />
            <ShimmerBlock className="h-28 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tarjeta de métrica al estilo {@link KpiStatGrid} StatCard. */
function KpiStatCardSkeleton({ withHint }: { withHint?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <ShimmerBlock className="h-3 w-[7.5rem]" />
        <ShimmerBlock className="h-9 w-9 shrink-0 rounded-xl" />
      </div>
      <ShimmerBlock className="mt-3 h-8 w-28 max-w-[85%]" />
      <div className="mt-2 flex flex-wrap gap-2">
        <ShimmerBlock className="h-6 w-20 rounded-full" />
        <ShimmerBlock className="h-6 w-24 rounded-full" />
      </div>
      {withHint ? <ShimmerBlock className="mt-2 h-3 w-full max-w-[14rem]" /> : null}
    </div>
  );
}

/** Tab leads: mismo patrón que el tab real (cabecera, filtros, Kanban por columnas). */
export function AdminLeadsTabSkeleton() {
  const columnAccents = ["#C8102E", "#2563eb", "#16a34a", "#ea580c", "#64748b"];
  return (
    <div className="space-y-6" aria-busy aria-label="Cargando leads">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy" aria-hidden />
        <div className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] to-transparent blur-3xl" aria-hidden />
        <div className="relative px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 max-w-xl space-y-3">
              <ShimmerBlock className="h-3 w-32" />
              <ShimmerBlock className="h-9 w-72 max-w-full" />
              <ShimmerBlock className="h-4 w-full max-w-lg" />
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
              <div className="inline-flex h-11 w-full rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 sm:w-auto">
                <ShimmerBlock className="h-9 flex-1 rounded-xl sm:w-10 sm:flex-none" />
                <ShimmerBlock className="h-9 flex-1 rounded-xl sm:w-10 sm:flex-none" />
              </div>
              <ShimmerBlock className="h-11 w-full rounded-2xl sm:w-40" />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <ShimmerBlock className="h-11 min-h-[2.75rem] w-full flex-1 rounded-2xl" />
              <ShimmerBlock className="h-11 min-h-[2.75rem] w-full rounded-2xl lg:max-w-[19rem] lg:shrink-0" />
            </div>
            <div className="flex flex-row flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5 sm:gap-3">
              <ShimmerBlock className="h-11 min-h-[2.75rem] min-w-[12rem] flex-[2] rounded-2xl" />
              <ShimmerBlock className="h-11 min-h-[2.75rem] min-w-[10.5rem] flex-1 rounded-2xl" />
              <ShimmerBlock className="h-11 min-h-[2.75rem] min-w-[10.5rem] flex-1 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center" aria-hidden>
        <ShimmerBlock className="h-3 w-80 max-w-full rounded" />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {columnAccents.map((hex, col) => (
          <div
            key={col}
            className="flex w-[min(100%,268px)] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/40 shadow-[inset_0_1px_2px_rgba(20,28,46,0.04)]"
          >
            <div
              className="rounded-t-2xl border-b px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
              style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${hex} 12%, white) 0%, color-mix(in srgb, ${hex} 6%, #f8fafc) 100%)` }}
            >
              <div className="flex items-center justify-center gap-2">
                <ShimmerBlock className="h-3 w-24 rounded" />
                <ShimmerBlock className="h-6 w-8 shrink-0 rounded-full" />
              </div>
            </div>
            <div className="flex min-h-[240px] flex-col gap-2.5 p-2.5">
              {Array.from({ length: col % 2 === 0 ? 3 : 2 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-[#182236] to-brand-navy px-3.5 pb-3 pt-3">
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy" aria-hidden />
                    <ShimmerBlock className="h-4 w-[88%] bg-white/20 viterra-admin-skeleton-shimmer" />
                    <ShimmerBlock className="mt-2 h-3 w-[50%] bg-white/15 viterra-admin-skeleton-shimmer" />
                  </div>
                  <div className="space-y-2 border-t border-slate-100/90 bg-white px-3.5 py-2.5">
                    <ShimmerBlock className="h-4 w-24" />
                    <ShimmerBlock className="h-3 w-full" />
                    <ShimmerBlock className="h-3 w-[75%]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cabecera + rejilla de fichas (inventario propiedades o desarrollos). */
function AdminInventoryCardsSkeleton({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div className="space-y-6" aria-busy aria-label={ariaLabel}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 p-6 shadow-md ring-1 ring-slate-900/[0.04]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <ShimmerBlock className="h-8 w-56" />
            <ShimmerBlock className="h-4 w-96 max-w-full" />
            <ShimmerBlock className="h-3 w-72 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ShimmerBlock className="h-10 w-28 rounded-xl" />
            <ShimmerBlock className="h-10 w-28 rounded-xl" />
            <ShimmerBlock className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <ShimmerBlock className="h-48 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <ShimmerBlock className="h-4 w-[88%] max-w-[90%]" />
              <ShimmerBlock className="h-3 w-[50%]" />
              <ShimmerBlock className="h-8 w-full rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPropertiesSkeleton() {
  return <AdminInventoryCardsSkeleton ariaLabel="Cargando propiedades" />;
}

export function AdminDevelopmentsSkeleton() {
  return <AdminInventoryCardsSkeleton ariaLabel="Cargando desarrollos" />;
}

/** KPI's: encabezado + filtros ({@link KpiFilters}) + rejilla 4×3 ({@link KpiStatGrid}) + bloques inferiores. */
export function AdminKpisSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Cargando indicadores">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy" aria-hidden />
        <div className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] to-transparent blur-3xl" aria-hidden />
        <div className="relative px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="min-w-0 max-w-2xl space-y-3">
              <ShimmerBlock className="h-3 w-36" />
              <ShimmerBlock className="h-9 w-48 max-w-full" />
              <ShimmerBlock className="h-4 w-full max-w-xl" />
              <ShimmerBlock className="h-4 w-full max-w-lg" />
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 lg:w-auto">
              <ShimmerBlock className="h-10 w-36 rounded-xl" />
              <ShimmerBlock className="h-10 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1 space-y-1">
            <ShimmerBlock className="h-3 w-16" />
            <ShimmerBlock className="h-10 w-full rounded-xl" />
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <ShimmerBlock className="h-3 w-14" />
            <ShimmerBlock className="h-10 w-full rounded-xl" />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1">
            <ShimmerBlock className="h-3 w-16" />
            <ShimmerBlock className="h-10 w-full rounded-xl" />
          </div>
          <ShimmerBlock className="h-10 w-44 rounded-xl" />
          <ShimmerBlock className="h-10 w-48 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <KpiStatCardSkeleton key={i} withHint={i === 8 || i === 10} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <ShimmerBlock className="mb-4 h-5 w-40" />
          <ShimmerBlock className="h-[220px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <ShimmerBlock className="mb-4 h-5 w-36" />
          <ShimmerBlock className="h-[220px] w-full rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <ShimmerBlock className="mb-2 h-5 w-44" />
          <ShimmerBlock className="mb-4 h-3 w-64 max-w-full" />
          <ShimmerBlock className="h-40 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
          <ShimmerBlock className="mb-2 h-5 w-40" />
          <ShimmerBlock className="mb-4 h-3 w-56 max-w-full" />
          <ShimmerBlock className="h-40 w-full rounded-xl" />
        </div>
      </div>

      <ShimmerBlock className="h-36 w-full rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm" />
    </div>
  );
}

/** Mi empresa: cabecera + subnave + panel. */
export function AdminCompanySkeleton() {
  return (
    <div className="space-y-5" aria-busy aria-label="Cargando administración">
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 p-6 shadow-md ring-1 ring-slate-900/[0.04]">
        <ShimmerBlock className="mb-2 h-3 w-40" />
        <ShimmerBlock className="h-8 w-64 max-w-full" />
        <ShimmerBlock className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <ShimmerBlock className="min-h-[320px] w-full rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm" />
    </div>
  );
}

/** Clientes: tabla / lista. */
export function AdminClientsSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Cargando clientes">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy" aria-hidden />
        <div
          className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <ShimmerBlock className="h-7 w-56 max-w-full" />
              <ShimmerBlock className="h-4 w-full max-w-xl" />
              <ShimmerBlock className="h-4 w-full max-w-lg" />
            </div>
            <ShimmerBlock className="h-10 w-full rounded-lg sm:w-40" />
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-6">
            <ShimmerBlock className="h-11 min-h-[2.75rem] w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ShimmerBlock className="h-11 min-h-[2.75rem] w-full rounded-2xl" />
              <ShimmerBlock className="h-11 min-h-[2.75rem] w-full rounded-2xl" />
              <ShimmerBlock className="h-11 min-h-[2.75rem] w-full rounded-2xl lg:col-span-1 sm:col-span-2" />
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <ShimmerBlock className="h-3 w-28" />
                <ShimmerBlock className="h-4 w-14" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <ShimmerBlock className="h-3 w-24" />
                    <ShimmerBlock className="h-8 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <section className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ShimmerBlock className="h-3 w-40" />
            <ShimmerBlock className="h-9 w-24 rounded-lg" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <ShimmerBlock className="h-4 w-[65%] max-w-[22rem]" />
                  <ShimmerBlock className="h-3 w-[45%] max-w-[18rem]" />
                </div>
                <ShimmerBlock className="h-8 w-8 shrink-0 rounded-lg" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ShimmerBlock className="h-6 w-24 rounded-full" />
                <ShimmerBlock className="h-6 w-28 rounded-full" />
                <ShimmerBlock className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </section>

        <aside className="lg:col-span-5 lg:sticky lg:top-2 lg:self-start">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <ShimmerBlock className="h-4 w-48" />
            <ShimmerBlock className="mt-2 h-3 w-64 max-w-full" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
                <div className="flex items-start gap-4">
                  <ShimmerBlock className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <ShimmerBlock className="h-3 w-20" />
                    <ShimmerBlock className="h-4 w-full max-w-[14rem]" />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
                <div className="flex items-start gap-4">
                  <ShimmerBlock className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <ShimmerBlock className="h-3 w-24" />
                    <ShimmerBlock className="h-4 w-full max-w-[12rem]" />
                  </div>
                </div>
              </div>
            </div>
            <ShimmerBlock className="mt-5 h-40 w-full rounded-xl" />
            <ShimmerBlock className="mt-4 h-10 w-44 rounded-lg" />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Timeline de actividades (lista con “días”). */
export function AdminActivitiesSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Cargando actividades">
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerBlock key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <ShimmerBlock className="h-10 w-full max-w-xl rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, d) => (
        <div key={d} className="space-y-3">
          <ShimmerBlock className="h-4 w-32" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <ShimmerBlock className="h-24 w-36 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <ShimmerBlock className="h-4 w-[75%]" />
                <ShimmerBlock className="h-3 w-full" />
                <ShimmerBlock className="h-3 w-[50%]" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Perfil de usuario (tarjetas y filas). */
export function AdminProfileSkeleton() {
  return (
    <div className="space-y-6 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/90 p-6 shadow-md" aria-busy aria-label="Cargando perfil">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <ShimmerBlock className="mx-auto h-28 w-28 shrink-0 rounded-full sm:mx-0" />
        <div className="min-w-0 flex-1 space-y-3">
          <ShimmerBlock className="h-8 w-48 max-w-full" />
          <ShimmerBlock className="h-4 w-full max-w-md" />
          <ShimmerBlock className="h-4 w-[66%] max-w-sm" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <ShimmerBlock className="h-40 w-full rounded-xl" />
    </div>
  );
}

/**
 * Misma cromática que {@link AdminWorkspace} mientras no hay `user` (sesión aún no lista tras refrescar).
 * Evita pantalla en blanco durante `getSession` + refuerzo `tokko_users`.
 */
export function AdminWorkspaceAuthLoadingShell() {
  return (
    <div
      className="viterra-page viterra-crm min-h-screen bg-gradient-to-b from-[#f7f5f2] via-slate-50 to-slate-100"
      aria-busy
      aria-label="Cargando panel"
    >
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[14.5rem] lg:flex-col lg:border-r lg:border-brand-gold/20 lg:bg-brand-navy lg:text-white">
        <div className="border-b border-white/15 px-5 py-5">
          <a
            href="/"
            className="group block rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
            aria-label="Ir al inicio del sitio público"
          >
            <span className="font-heading block font-light leading-tight tracking-[0.22em] text-white sm:text-lg">
              VITERRA
            </span>
            <span className="relative my-2 block h-px w-[11rem] overflow-hidden rounded-full" aria-hidden>
              <span className="absolute inset-0 bg-white/50" />
              <span
                className="absolute inset-0 origin-left bg-[#C8102E]"
                style={{ transform: "scaleX(0.55)" }}
              />
            </span>
            <p
              className="text-[10px] font-normal uppercase tracking-[0.26em] text-white/72"
              style={{
                fontFamily: 'Perpetua, "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
              }}
            >
              CRM System
            </p>
          </a>
        </div>
        <div className="flex-1 overflow-hidden px-4 py-5">
          <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.14em] text-white/55" style={{ fontWeight: 600 }}>
            Módulos admin
          </p>
          <nav className="space-y-1.5" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full rounded-lg bg-white/10 viterra-admin-skeleton-shimmer"
              />
            ))}
          </nav>
        </div>
      </aside>
      <div className="lg:pl-[14.5rem]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <ShimmerBlock className="h-9 w-48 max-w-[55vw]" />
            <ShimmerBlock className="h-9 w-32 shrink-0" />
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">
          <AdminDashboardSkeleton />
        </main>
      </div>
    </div>
  );
}
