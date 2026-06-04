import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Lead, CustomKanbanStage } from "../../../data/leads";
import type { Property } from "../../PropertyCard";
import type { AgendaAppointment } from "../../../data/agenda";
import type { User } from "../../../contexts/AuthContext";
import type { UserGroup } from "../../../lib/userGroups";
import {
  KPI_FILTERS_DEFAULT,
  useKpiData,
  type KpiFiltersState,
} from "../../../hooks/useKpiData";
import { getKpiScope } from "../../../lib/kpiAccess";
import {
  buildDateRange,
  formatMoney,
  type DateRange,
} from "../../../lib/kpiCompute";
import type { KpiTargetMetric } from "../../../lib/supabaseKpis";
import { recomputeMonthlySnapshotsRange } from "../../../lib/supabaseKpis";
import { getSupabaseClient } from "../../../lib/supabaseClient";
import { KpiFilters } from "./KpiFilters";
import { KpiStatGrid, type StatCardClickContext } from "./KpiStatGrid";
import { KpiTrendChart } from "./KpiTrendChart";
import { KpiFunnelStages } from "./KpiFunnelStages";
import { KpiSourceBreakdown } from "./KpiSourceBreakdown";
import { KpiAdvisorRanking } from "./KpiAdvisorRanking";
import { KpiAppointmentsBlock } from "./KpiAppointmentsBlock";
import { KpiInventoryBlock } from "./KpiInventoryBlock";
import { KpiTargetsDialog } from "./KpiTargetsDialog";
import { KpiDrilldownDialog } from "./KpiDrilldownDialog";
import { KpiExportButtons } from "./KpiExportButtons";

interface Props {
  user: User | null;
  users: User[];
  groups: UserGroup[];
  leads: Lead[];
  properties: Property[];
  appointments: AgendaAppointment[];
  customStages: CustomKanbanStage[];
  stageOrder: string[];
}

const FILTERS_STORAGE_PREFIX = "viterra_kpi_filters_";

function rangeLabel(range: DateRange, key: KpiFiltersState["rangeKey"]): string {
  const fromIso = new Date(range.start).toISOString().slice(0, 10);
  const toIso = new Date(range.end - 1).toISOString().slice(0, 10);
  const labelByKey: Record<KpiFiltersState["rangeKey"], string> = {
    month: "Mes actual",
    "3m": "Últimos 3 meses",
    "6m": "Últimos 6 meses",
    "12m": "Últimos 12 meses",
    ytd: "Año en curso",
    custom: `${fromIso} → ${toIso}`,
  };
  return labelByKey[key];
}

export function KPIsModule({
  user,
  users,
  groups,
  leads,
  properties,
  appointments,
  customStages,
  stageOrder,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scope = useMemo(() => getKpiScope(user, users, groups), [user, users, groups]);

  const [filters, setFilters] = useState<KpiFiltersState>(KPI_FILTERS_DEFAULT);

  // Hidratación de filtros desde localStorage por usuario.
  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(`${FILTERS_STORAGE_PREFIX}${user.id}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<KpiFiltersState>;
      setFilters({ ...KPI_FILTERS_DEFAULT, ...parsed });
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`${FILTERS_STORAGE_PREFIX}${user.id}`, JSON.stringify(filters));
  }, [user, filters]);

  const data = useKpiData({
    user,
    users,
    groups,
    leads,
    properties,
    appointments,
    customStages,
    stageOrder,
    scope,
    filters,
  });

  // Scope de "metas" (para targetBadge y diálogo): selección actual del usuario.
  const targetScope: "user" | "group" | "company" = filters.selectedAdvisorId
    ? "user"
    : filters.selectedGroupId
      ? "group"
      : scope.kind === "advisor"
        ? "user"
        : scope.kind === "leader"
          ? "group"
          : "company";

  const targetScopeId: string | null = filters.selectedAdvisorId
    ? filters.selectedAdvisorId
    : filters.selectedGroupId
      ? filters.selectedGroupId
      : scope.kind === "advisor"
        ? scope.selfUserId
        : scope.kind === "leader"
          ? [...scope.ledGroupIds][0] ?? null
          : null;

  const targetScopeLabel = useMemo(() => {
    if (targetScope === "user" && targetScopeId) {
      const u = users.find((x) => x.id === targetScopeId);
      return `Asesor: ${u?.name ?? targetScopeId}`;
    }
    if (targetScope === "group" && targetScopeId) {
      const g = groups.find((x) => x.id === targetScopeId);
      return `Grupo: ${g?.name ?? targetScopeId}`;
    }
    return "Toda la empresa";
  }, [targetScope, targetScopeId, users, groups]);

  const rangeStartIso = new Date(data.range.start).toISOString().slice(0, 10);

  // Edición de metas inline.
  const [editingMetric, setEditingMetric] = useState<KpiTargetMetric | null>(null);
  const canEditTargets =
    targetScope !== "company"
      ? // user / group
        scope.kind === "admin" ||
        (scope.kind === "leader" &&
          ((targetScope === "group" && scope.ledGroupIds.has(targetScopeId ?? "")) ||
            (targetScope === "user" &&
              !!targetScopeId &&
              users.some((u) => u.id === targetScopeId && scope.allowedUserIds.has(u.id))))) ||
        (scope.kind === "advisor" && targetScope === "user" && targetScopeId === scope.selfUserId)
      : scope.kind === "admin";

  // Drill-down (clic en card / fila de ranking).
  const [drilldown, setDrilldown] = useState<{ title: string; description?: string; leads: Lead[] } | null>(
    null
  );

  const handleCardClick = (ctx: StatCardClickContext) => {
    let filtered: Lead[] = [];
    if (ctx.metric === "new_leads") {
      filtered = data.scopedLeads.filter((l) => {
        const t = Date.parse(l.createdAt.includes("T") ? l.createdAt : `${l.createdAt}T12:00:00`);
        return t >= data.range.start && t < data.range.end;
      });
    } else if (ctx.metric === "sales_count" || ctx.metric === "sales_volume") {
      filtered = data.scopedLeads.filter((l) => {
        const closed = l.status === "cerrado" || l.status?.toLowerCase().includes("cerrad");
        if (!closed) return false;
        const raw = l.updatedAt ?? l.lastContact ?? l.createdAt;
        if (!raw) return false;
        const t = Date.parse(raw.includes("T") ? raw : `${raw}T12:00:00`);
        return t >= data.range.start && t < data.range.end;
      });
    } else if (ctx.metric === "stale_leads") {
      const cutoff = Date.now() - 7 * 86400000;
      filtered = data.scopedLeads.filter((l) => {
        const raw = l.lastContact ?? l.updatedAt ?? l.createdAt;
        if (!raw) return false;
        const t = Date.parse(raw.includes("T") ? raw : `${raw}T12:00:00`);
        const closed = l.status === "cerrado" || l.status?.toLowerCase().includes("cerrad");
        const lost = l.status?.toLowerCase().includes("perdid");
        if (closed || lost) return false;
        return t < cutoff;
      });
    } else if (ctx.metric === "conversion_rate") {
      filtered = data.scopedLeads;
    } else {
      filtered = data.scopedLeads;
    }
    setDrilldown({ title: ctx.label, description: targetScopeLabel, leads: filtered });
  };

  const handleAdvisorRowSelect = (userId: string) => {
    const advisor = users.find((u) => u.id === userId);
    const tokko = advisor?.tokkoUserId?.trim() ?? "";
    const filtered = data.scopedLeads.filter((l) => {
      const aid = l.assignedToUserId?.trim() ?? "";
      return aid === userId || (!!tokko && aid === tokko);
    });
    setDrilldown({
      title: `Leads de ${advisor?.name ?? userId}`,
      description: rangeLabel(data.range, filters.rangeKey),
      leads: filtered,
    });
  };

  // Recalcular histórico (solo admin).
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMessage, setRecomputeMessage] = useState<string | null>(null);

  const handleRecompute = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setRecomputeMessage("Falta configurar Supabase (.env).");
      return;
    }
    setRecomputing(true);
    setRecomputeMessage(null);
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
    }
    const res = await recomputeMonthlySnapshotsRange(client, months);
    setRecomputing(false);
    if (res.error) {
      setRecomputeMessage(`Error: ${res.error.message}`);
    } else {
      setRecomputeMessage(`Snapshots recalculados (${res.rowsWritten} filas).`);
      await data.reloadSnapshots();
    }
  };

  const showRanking = scope.kind !== "advisor";
  const showStaleProperties = scope.kind === "admin" || scope.kind === "leader";

  const headerDescription =
    scope.kind === "admin"
      ? "Indicadores profundos, comparativos y metas de toda la empresa. Para tu día a día, usa Dashboard. Exporta resultados y recalcula el histórico en Supabase cuando lo necesites."
      : scope.kind === "leader"
        ? "Métricas agregadas de los equipos que lideras: embudo, ranking y metas por grupo o asesor según tus permisos."
        : "Tus números personales en el rango seleccionado: embudo, tendencias y origen de leads.";

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Header plano, mismo patrón que Leads / Propiedades / Desarrollos */}
      <div className="relative border-b border-slate-200 bg-transparent pb-8 mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-3xl font-light tracking-tight text-slate-900 mb-2">Reportes</h2>
            <p className="text-sm text-slate-500 max-w-xl">{headerDescription}</p>
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            <KpiExportButtons
              containerRef={containerRef}
              current={data.current}
              advisorRanking={data.advisorRanking}
              appointments={data.appointments}
              scopeLabel={targetScopeLabel}
              rangeLabel={rangeLabel(data.range, filters.rangeKey)}
            />
          </div>
        </div>
      </div>

      <KpiFilters
        filters={filters}
        onChange={setFilters}
        scope={scope}
        users={users}
        groups={groups}
        onRecompute={handleRecompute}
        recomputing={recomputing}
        showRecompute={scope.kind === "admin"}
      />

      {recomputeMessage ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
          {recomputeMessage}
        </div>
      ) : null}

      <KpiStatGrid
        current={data.current}
        previous={data.previous}
        yearAgo={data.yearAgo}
        appointments={data.appointments}
        appointmentsPrev={data.appointmentsPrev}
        compareYearOverYear={filters.compareYearOverYear}
        targets={data.targets}
        targetScope={targetScope}
        targetScopeId={targetScopeId}
        rangeStartIso={rangeStartIso}
        canEditTargets={canEditTargets}
        onEditTarget={(metric) => setEditingMetric(metric)}
        onDrilldown={handleCardClick}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <KpiTrendChart
          trend={data.trend}
          snapshots={data.snapshots}
          scope={targetScope}
          scopeId={targetScopeId}
        />
        <KpiFunnelStages funnel={data.funnel} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <KpiSourceBreakdown
          data={data.sources}
          title="Origen de leads"
          description="Distribución por canal de captación."
        />
        <KpiAppointmentsBlock current={data.appointments} previous={data.appointmentsPrev} />
      </div>

      {showRanking ? (
        <KpiAdvisorRanking rows={data.advisorRanking} users={users} onSelect={handleAdvisorRowSelect} />
      ) : null}

      <KpiInventoryBlock
        propertyTypes={data.propertyTypes}
        operations={data.operations}
        staleProperties={data.staleProperties}
        showStale={showStaleProperties}
      />

      {data.snapshotsLoading ? (
        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando snapshots históricos…
        </div>
      ) : null}

      {/* Diálogos */}
      {editingMetric ? (
        <KpiTargetsDialog
          open
          metric={editingMetric}
          scope={targetScope}
          scopeId={targetScopeId}
          scopeLabel={targetScopeLabel}
          rangeStartIso={rangeStartIso}
          user={user}
          groups={groups}
          targets={data.targets}
          onClose={() => setEditingMetric(null)}
          onSaved={() => data.reloadTargets()}
        />
      ) : null}

      {drilldown ? (
        <KpiDrilldownDialog
          open
          title={drilldown.title}
          description={drilldown.description}
          leads={drilldown.leads}
          onClose={() => setDrilldown(null)}
        />
      ) : null}

      {/* Pie informativo: comparativa actual */}
      <p className="pt-2 text-[11px] text-slate-400">
        Comparando contra:&nbsp;
        <span className="font-semibold text-slate-600">
          {filters.compareYearOverYear ? "mismo período del año anterior" : "período inmediatamente anterior"}
        </span>
        . Volumen de leads del rango actual:{" "}
        <span className="font-semibold text-slate-600">{data.current.totalLeads}</span> · monto:{" "}
        <span className="font-semibold text-slate-600">${formatMoney(data.current.salesVolume)}</span>.
      </p>

      {/* Para evitar warning de buildDateRange si se usa en modo dev */}
      <span className="hidden">{buildDateRange("month").start}</span>
    </div>
  );
}
