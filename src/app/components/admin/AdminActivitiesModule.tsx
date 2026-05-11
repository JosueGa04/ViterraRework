import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Check, Home, Loader2, UserCircle2 } from "lucide-react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  fetchCatalogActivities,
  type CatalogActivityRow,
} from "../../lib/supabaseCatalogActivities";
import type { CatalogActivityAction, CatalogEntityType } from "../../lib/catalogActivityPayload";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import { AdminActivitiesSkeleton } from "../../pages/admin/AdminSectionSkeletons";

const PAGE_SIZE = 30;

function formatMoney(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function actionLabel(action: CatalogActivityRow["action"]): string {
  switch (action) {
    case "created":
      return "Alta";
    case "deleted":
      return "Baja";
    case "price_changed":
      return "Cambio de precio";
    case "updated":
    default:
      return "Actualización";
  }
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

type Props = {
  onOpenInModule: (entityType: CatalogEntityType, entityId: string) => void;
};

export function AdminActivitiesModule({ onOpenInModule }: Props) {
  const [rows, setRows] = useState<CatalogActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<"all" | CatalogEntityType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actorNameSearch, setActorNameSearch] = useState("");
  const [debouncedActorName, setDebouncedActorName] = useState("");
  const [typeAlta, setTypeAlta] = useState(true);
  const [typePrecio, setTypePrecio] = useState(true);
  const [typeBaja, setTypeBaja] = useState(true);

  const selectedActions = useMemo((): CatalogActivityAction[] => {
    const a: CatalogActivityAction[] = [];
    if (typeAlta) a.push("created");
    if (typePrecio) a.push("price_changed");
    if (typeBaja) a.push("deleted");
    return a;
  }, [typeAlta, typeBaja, typePrecio]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedActorName(actorNameSearch.trim()), 320);
    return () => clearTimeout(t);
  }, [actorNameSearch]);

  const loadInitial = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase no está configurado.");
      setLoading(false);
      setRows([]);
      setHasMore(false);
      return;
    }
    if (selectedActions.length === 0) {
      setLoading(false);
      setError(null);
      setRows([]);
      setHasMore(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchCatalogActivities(client, {
      limit: PAGE_SIZE,
      entityType: entityFilter,
      actions: selectedActions,
      dateFrom: dateFrom.trim() || undefined,
      dateTo: dateTo.trim() || undefined,
      actorNameContains: debouncedActorName || undefined,
    });
    if (err) {
      setError(err.message);
      setRows([]);
      setHasMore(false);
    } else {
      const list = data ?? [];
      setRows(list);
      setHasMore(list.length >= PAGE_SIZE);
    }
    setLoading(false);
  }, [dateFrom, dateTo, debouncedActorName, entityFilter, selectedActions]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const grouped = useMemo(() => {
    const m = new Map<string, CatalogActivityRow[]>();
    for (const r of rows) {
      const k = dayKey(r.created_at);
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    }
    return Array.from(m.entries());
  }, [rows]);

  const loadMore = async () => {
    const last = rows[rows.length - 1];
    if (!last || selectedActions.length === 0) return;
    const client = getSupabaseClient();
    if (!client) return;
    setLoadingMore(true);
    const { data, error: err } = await fetchCatalogActivities(client, {
      limit: PAGE_SIZE,
      beforeCreatedAt: last.created_at,
      entityType: entityFilter,
      actions: selectedActions,
      dateFrom: dateFrom.trim() || undefined,
      dateTo: dateTo.trim() || undefined,
      actorNameContains: debouncedActorName || undefined,
    });
    if (!err && data?.length) {
      setRows((prev) => [...prev, ...data]);
      setHasMore(data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const titleFor = (r: CatalogActivityRow): string => {
    const s = r.snapshot;
    if (r.entity_type === "property") {
      return String(s?.title ?? s?.id ?? "Propiedad");
    }
    return String(s?.name ?? s?.id ?? "Desarrollo");
  };

  const subtitleLine = (r: CatalogActivityRow): string | null => {
    const s = r.snapshot;
    const loc = String(s?.location ?? "").trim();
    if (r.entity_type === "property") {
      const price = typeof s?.price === "number" ? formatMoney(s.price) : "";
      return [loc, price].filter(Boolean).join(" · ") || null;
    }
    const pr = String(s?.priceRange ?? "").trim();
    return [loc, pr].filter(Boolean).join(" · ") || null;
  };

  const diffLine = (r: CatalogActivityRow): string | null => {
    const d = r.diff;
    if (!d || typeof d !== "object") return null;
    if ("price" in d && d.price && typeof d.price === "object") {
      const p = d.price as { from?: number; to?: number };
      if (typeof p.from === "number" && typeof p.to === "number") {
        return `${formatMoney(p.from)} → ${formatMoney(p.to)}`;
      }
    }
    if ("priceRange" in d && d.priceRange && typeof d.priceRange === "object") {
      const p = d.priceRange as { from?: string; to?: string };
      return `"${p.from ?? ""}" → "${p.to ?? ""}"`;
    }
    return null;
  };

  const imageUrl = (r: CatalogActivityRow): string | undefined => {
    const s = r.snapshot;
    const u = s?.image;
    return typeof u === "string" && u.trim() ? u.trim() : undefined;
  };

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy" aria-hidden />
        <div className="relative px-5 pb-6 pt-6 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary" style={{ fontWeight: 600 }}>
                Catálogo
              </p>
              <h2 className="mt-1.5 text-xl font-semibold text-slate-900" style={{ fontWeight: 600 }}>
                Actividades del inventario
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-slate-600" style={{ fontWeight: 500 }}>
                Altas, bajas y cambios de precio en propiedades y desarrollos.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm text-slate-700">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha desde</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-700">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha hasta</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-700 sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Buscar asesor por nombre
              </span>
              <input
                type="search"
                value={actorNameSearch}
                onChange={(e) => setActorNameSearch(e.target.value)}
                placeholder="Nombre o apellido…"
                autoComplete="off"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-400"
                aria-label="Filtrar actividades por nombre del asesor"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-700">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Ítem</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value as typeof entityFilter)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="all">Propiedades y desarrollos</option>
                <option value="property">Solo propiedades</option>
                <option value="development">Solo desarrollos</option>
              </select>
            </label>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tipo de actividad</p>
            <div
              className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 p-1.5 sm:inline-flex sm:flex-nowrap"
              role="group"
              aria-label="Filtrar por tipo de actividad"
            >
              {(
                [
                  { on: typeAlta, set: setTypeAlta, label: "Nueva propiedad o desarrollo" },
                  { on: typePrecio, set: setTypePrecio, label: "Cambio de precio" },
                  { on: typeBaja, set: setTypeBaja, label: "Baja de propiedad o desarrollo" },
                ] as const
              ).map(({ on, set, label }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set(!on)}
                  className={cn(
                    "inline-flex min-h-[2.375rem] min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors sm:flex-initial sm:px-3.5",
                    on
                      ? "bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/90"
                      : "font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-white transition-colors",
                      on ? "border-slate-700 bg-slate-800" : "border-slate-300 bg-white",
                    )}
                    aria-hidden
                  >
                    {on ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                  </span>
                  <span className="min-w-0 max-w-[16rem] leading-snug sm:max-w-none">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      ) : null}

      {selectedActions.length === 0 ? (
        <p className="rounded-xl border border-amber-200/90 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950">
          Activa al menos un tipo de actividad arriba para ver resultados.
        </p>
      ) : loading ? (
        <AdminActivitiesSkeleton />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          No hay actividades con estos filtros. Ajusta fechas, asesor o tipo — o registra cambios desde Propiedades y
          Desarrollos.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, items]) => (
            <section key={day} className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{day}</p>
              <ul className="space-y-4">
                {items.map((r) => (
                  <li key={r.id}>
                    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
                      <div className="flex flex-col gap-3 p-4 sm:flex-row">
                        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-40">
                          {imageUrl(r) ? (
                            <img src={imageUrl(r)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              {r.entity_type === "property" ? (
                                <Home className="h-8 w-8" strokeWidth={1.25} />
                              ) : (
                                <Building2 className="h-8 w-8" strokeWidth={1.25} />
                              )}
                            </div>
                          )}
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm">
                            {r.entity_type === "property" ? "Propiedad" : "Desarrollo"}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                                {actionLabel(r.action)}
                              </p>
                              <h3 className="truncate text-base font-semibold text-brand-navy" title={titleFor(r)}>
                                {titleFor(r)}
                              </h3>
                              {subtitleLine(r) ? (
                                <p className="mt-0.5 text-sm text-slate-600">{subtitleLine(r)}</p>
                              ) : null}
                              {diffLine(r) ? (
                                <p className="mt-1 text-sm font-medium text-amber-900">{diffLine(r)}</p>
                              ) : null}
                            </div>
                            <time className="shrink-0 text-xs text-slate-500" dateTime={r.created_at}>
                              {new Date(r.created_at).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                            <UserCircle2 className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                            <span className="text-sm text-slate-700">
                              {r.actor_name?.trim() || "Usuario"}
                              {r.source === "tokko_sync" ? (
                                <span className="ml-1 text-xs text-slate-500">· sincronización</span>
                              ) : null}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="ml-auto h-8 gap-1"
                              onClick={() => onOpenInModule(r.entity_type, r.entity_id)}
                            >
                              Abrir en módulo
                              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {hasMore ? (
            <div className="flex justify-center pb-4">
              <Button type="button" variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando…
                  </>
                ) : (
                  "Cargar más"
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
