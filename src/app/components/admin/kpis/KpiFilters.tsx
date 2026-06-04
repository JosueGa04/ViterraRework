import { useMemo } from "react";
import { Calendar as CalendarIcon, Users as UsersIcon, RefreshCw, Filter } from "lucide-react";
import type { User } from "../../../contexts/AuthContext";
import type { UserGroup } from "../../../lib/userGroups";
import type { KpiFiltersState } from "../../../hooks/useKpiData";
import type { KpiScope } from "../../../lib/kpiAccess";
import { KpiAdvisorSearchPicker } from "./KpiAdvisorSearchPicker";
import { cn } from "../../ui/utils";

interface Props {
  filters: KpiFiltersState;
  onChange: (next: KpiFiltersState) => void;
  scope: KpiScope;
  users: User[];
  groups: UserGroup[];
  onRecompute?: () => void;
  recomputing?: boolean;
  showRecompute?: boolean;
}

const RANGE_OPTIONS: Array<{ value: KpiFiltersState["rangeKey"]; label: string }> = [
  { value: "month", label: "Mes actual" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "ytd", label: "Año en curso" },
  { value: "custom", label: "Personalizado" },
];

export function KpiFilters({
  filters,
  onChange,
  scope,
  users,
  groups,
  onRecompute,
  recomputing,
  showRecompute,
}: Props) {
  const visibleGroups = groups.filter((g) => scope.allowedGroupIds.has(g.id));

  const advisorPool = useMemo(() => {
    let pool =
      scope.kind === "admin"
        ? users.filter((u) => u.isActive !== false)
        : users.filter((u) => scope.allowedUserIds.has(u.id) && u.id !== scope.selfUserId);

    if (filters.selectedGroupId) {
      const group = groups.find((g) => g.id === filters.selectedGroupId);
      if (group) {
        const memberIds = new Set(group.memberIds);
        pool = pool.filter((u) => memberIds.has(u.id));
      }
    }

    return pool.sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  }, [scope, users, groups, filters.selectedGroupId]);

  const handleGroupChange = (groupId: string | null) => {
    const next: KpiFiltersState = { ...filters, selectedGroupId: groupId };
    if (filters.selectedAdvisorId && groupId) {
      const group = groups.find((g) => g.id === groupId);
      if (group && !group.memberIds.includes(filters.selectedAdvisorId)) {
        next.selectedAdvisorId = null;
      }
    }
    onChange(next);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] sm:p-5">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Filter className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        Filtros
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Rango
          </label>
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
            <select
              value={filters.rangeKey}
              onChange={(e) =>
                onChange({ ...filters, rangeKey: e.target.value as KpiFiltersState["rangeKey"] })
              }
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-brand-navy shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filters.rangeKey === "custom" ? (
          <>
            <div className="min-w-[150px] flex-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Desde
              </label>
              <input
                type="date"
                value={filters.customFrom ?? ""}
                onChange={(e) => onChange({ ...filters, customFrom: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand-navy shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Hasta
              </label>
              <input
                type="date"
                value={filters.customTo ?? ""}
                onChange={(e) => onChange({ ...filters, customTo: e.target.value })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand-navy shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </>
        ) : null}

        {scope.kind !== "advisor" && visibleGroups.length > 0 ? (
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Grupo
            </label>
            <div className="relative">
              <UsersIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <select
                value={filters.selectedGroupId ?? ""}
                onChange={(e) => handleGroupChange(e.target.value || null)}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-brand-navy shadow-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                <option value="">Todos los grupos visibles</option>
                {visibleGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {scope.kind !== "advisor" && advisorPool.length > 0 ? (
          <div className="min-w-[240px] flex-[1.2]">
            <KpiAdvisorSearchPicker
              advisors={advisorPool}
              value={filters.selectedAdvisorId}
              onChange={(selectedAdvisorId) => onChange({ ...filters, selectedAdvisorId })}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onChange({ ...filters, compareYearOverYear: !filters.compareYearOverYear })}
          className={cn(
            "h-10 rounded-xl border px-4 text-sm font-semibold shadow-sm transition",
            filters.compareYearOverYear
              ? "border-brand-navy bg-brand-navy text-white"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
          )}
          title="Cambia el comparativo entre período anterior y mismo período del año pasado"
        >
          {filters.compareYearOverYear ? "vs año anterior" : "vs período anterior"}
        </button>

        {showRecompute && onRecompute ? (
          <button
            type="button"
            disabled={recomputing}
            onClick={onRecompute}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 disabled:opacity-60"
            title="Recalcula los snapshots mensuales en Supabase (12 meses)"
          >
            <RefreshCw className={cn("h-4 w-4", recomputing && "animate-spin")} strokeWidth={1.75} />
            Recalcular histórico
          </button>
        ) : null}
      </div>
    </div>
  );
}
