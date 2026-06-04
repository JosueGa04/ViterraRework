import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { endOfDay, format, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Eye,
  Filter,
  Home,
  ImageOff,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import type { Lead } from "../../data/leads";
import { labelForLeadStatus, type CustomKanbanStage } from "../../data/leads";
import type { User } from "../../contexts/AuthContext";
import type { UserGroup } from "../../lib/userGroups";
import type { Property } from "../PropertyCard";
import type { Development } from "../../data/developments";
import { foldSearchText } from "../../lib/searchText";
import { resolveAssigneeName } from "../../data/crmAssignees";
import { DEFAULT_PIPELINE_GROUP_ID } from "../../lib/pipelineByGroup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { LeadPriorityBadge } from "./LeadPriorityBadge";
import { cn } from "../ui/utils";

type ConsultasTab = "todos" | "asignados" | "descartados";

/** Filtro por tipo de vínculo al catálogo (no por propiedad/desarrollo concreto). */
type InventoryKindFilter = "all" | "property" | "development";

type Props = {
  leads: Lead[];
  users: User[];
  groups: UserGroup[];
  properties: Property[];
  developments: Development[];
  customStages: CustomKanbanStage[];
  loading: boolean;
  errorMessage: string | null;
  /** Reasignar un lead a otro asesor (UUID auth o id legacy). Devuelve true si la operación tuvo éxito. */
  onReassign: (lead: Lead, newAssigneeUserId: string, newAssigneeName: string) => Promise<boolean>;
  /** Abrir el detalle completo del lead (reusa `LeadDetailDialog`). */
  onOpenDetail: (lead: Lead) => void;
  /** Refrescar la lista (re-fetch de Supabase). */
  onRefresh?: () => void;
  /** Nombre de quien ejecuta la reasignación (para registrar en historial). */
  currentUserName: string;
};

/** Archivado explícito desde el panel (payload `crmSoftDeletedAt`). No usar `deleted_at` de Tokko aquí. */
function isCrmArchivedLead(lead: Lead): boolean {
  return lead.crmSoftDeletedAt != null && String(lead.crmSoftDeletedAt).trim() !== "";
}

function isLeadDiscarded(lead: Lead): boolean {
  return isCrmArchivedLead(lead) || lead.status === "perdido";
}

function isLeadAssigned(lead: Lead): boolean {
  return Boolean(lead.assignedToUserId && lead.assignedToUserId.trim().length > 0);
}

function formatCreatedAt(lead: Lead): string {
  const iso = lead.createdAtIso ?? lead.createdAt;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatBudget(value: number): string {
  if (!value || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function interestLabel(interest: Lead["interest"]): string {
  switch (interest) {
    case "compra":
      return "Compra";
    case "venta":
      return "Venta";
    case "alquiler":
      return "Renta";
    case "asesoria":
      return "Asesoría";
    default:
      return interest;
  }
}

/** Compara `assigned_to_user_id` aceptando UUID auth o `tokkoUserId` legacy. */
function userMatchesAssignee(u: User, assignedId: string): boolean {
  const a = assignedId.trim().toLowerCase();
  if (!a) return false;
  if (u.id.trim().toLowerCase() === a) return true;
  const t = u.tokkoUserId?.trim().toLowerCase();
  return Boolean(t && t === a);
}

/** Devuelve los ids de equipo a los que pertenece el asesor (vía `user_groups.memberIds`). */
function groupIdsForUser(userId: string, groups: UserGroup[]): string[] {
  return groups.filter((g) => g.memberIds.includes(userId)).map((g) => g.id);
}

const FIELD_CLASS =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-brand-navy shadow-sm placeholder:text-slate-400 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15";

/** Fecha local (yyyy-MM-dd) en que se creó el lead para comparar con “hoy”. */
function leadCreationLocalDateKey(lead: Lead): string | null {
  const iso = lead.createdAtIso?.trim();
  if (iso) {
    const t = Date.parse(iso);
    if (!Number.isNaN(t)) return format(new Date(t), "yyyy-MM-dd");
  }
  const d = lead.createdAt?.trim();
  if (d) {
    const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  return null;
}

/** Texto del botón tipo Airbnb: un solo control para rango inicio–fin. */
function formatCreationDateRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Selecciona fechas";
  if (!range.to) {
    return `${format(range.from, "d MMM yyyy", { locale: es })} – …`;
  }
  if (isSameDay(range.from, range.to)) {
    return format(range.from, "d MMM yyyy", { locale: es });
  }
  const sameYear = range.from.getFullYear() === range.to.getFullYear();
  const left = format(range.from, sameYear ? "d MMM" : "d MMM yyyy", { locale: es });
  const right = format(range.to, "d MMM yyyy", { locale: es });
  return `${left} – ${right}`;
}

/** Popover + calendario con estado local: abrir o cambiar fechas no re-renderiza la lista masiva del padre. */
function ConsultasCreationDateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (next: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() =>
    value ? { from: value.from, to: value.to } : undefined
  );
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (!open) setDraft(value ? { from: value.from, to: value.to } : undefined);
  }, [value, open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        const nextDraft = value ? { from: value.from, to: value.to } : undefined;
        setDraft(nextDraft);
        draftRef.current = nextDraft;
        setOpen(true);
        return;
      }
      setOpen(false);
      onChange(draftRef.current);
    },
    [onChange, value]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            FIELD_CLASS,
            "inline-flex items-center justify-between gap-2 text-left outline-none transition hover:border-slate-300",
            !value?.from && "text-slate-400"
          )}
          aria-label="Elegir rango de fechas de creación"
        >
          <span className="min-w-0 truncate" style={{ fontWeight: 500 }}>
            {formatCreationDateRangeLabel(value)}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[calc(100vw-1.5rem)] border-slate-200 p-0 shadow-lg duration-0 animate-none data-[state=open]:animate-none data-[state=closed]:animate-none"
        align="start"
      >
        <Calendar
          mode="range"
          locale={es}
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={2}
          showOutsideDays={false}
          classNames={{
            day_today: "font-normal aria-selected:opacity-100",
          }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-2">
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 text-xs text-slate-600 transition hover:bg-slate-100 hover:text-brand-navy"
            style={{ fontWeight: 600 }}
            onClick={() => {
              setDraft(undefined);
              onChange(undefined);
            }}
          >
            Borrar fechas
          </button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-slate-200 bg-white text-xs text-brand-navy"
            style={{ fontWeight: 600 }}
            onClick={() => handleOpenChange(false)}
          >
            Listo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AdminConsultasModule({
  leads,
  users,
  groups,
  properties,
  developments,
  customStages,
  loading,
  errorMessage,
  onReassign,
  onOpenDetail,
  onRefresh,
  currentUserName,
}: Props) {
  const [tab, setTab] = useState<ConsultasTab>("todos");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [creationDateRange, setCreationDateRange] = useState<DateRange | undefined>();
  const [inventoryFilter, setInventoryFilter] = useState<InventoryKindFilter>("all");
  const [reassignTarget, setReassignTarget] = useState<Lead | null>(null);

  const tabFilteredAll = useMemo(() => leads.filter((l) => !isCrmArchivedLead(l)), [leads]);
  const tabFilteredAsignados = useMemo(
    () => leads.filter((l) => !isCrmArchivedLead(l) && isLeadAssigned(l)),
    [leads]
  );
  const tabFilteredDescartados = useMemo(
    () => leads.filter((l) => isLeadDiscarded(l)),
    [leads]
  );

  const tabSourceLeads = useMemo(() => {
    if (tab === "asignados") return tabFilteredAsignados;
    if (tab === "descartados") return tabFilteredDescartados;
    return tabFilteredAll;
  }, [tab, tabFilteredAll, tabFilteredAsignados, tabFilteredDescartados]);

  /** Asesores y líderes que pueden recibir leads. */
  const advisorOptions = useMemo(() => {
    return users
      .filter((u) => u.isActive && (u.role === "asesor" || u.role === "lider_grupo"))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [users]);

  /** Aplica restricción de equipo (cuando se eligió uno) sobre los asesores del filtro. */
  const filteredAdvisorOptions = useMemo(() => {
    if (groupFilter === "all") return advisorOptions;
    if (groupFilter === DEFAULT_PIPELINE_GROUP_ID) return advisorOptions;
    const grp = groups.find((g) => g.id === groupFilter);
    if (!grp) return advisorOptions;
    const memberSet = new Set(grp.memberIds);
    return advisorOptions.filter((u) => memberSet.has(u.id));
  }, [groupFilter, advisorOptions, groups]);

  const propertyById = useMemo(() => {
    const map = new Map<string, Property>();
    for (const p of properties) map.set(p.id, p);
    return map;
  }, [properties]);

  const developmentById = useMemo(() => {
    const map = new Map<string, Development>();
    for (const d of developments) map.set(d.id, d);
    return map;
  }, [developments]);

  const userByLead = useMemo(() => {
    const map = new Map<string, User>();
    for (const lead of leads) {
      const aid = lead.assignedToUserId?.trim();
      if (!aid) continue;
      const u = users.find((x) => userMatchesAssignee(x, aid));
      if (u) map.set(lead.id, u);
    }
    return map;
  }, [leads, users]);

  /** Intenta resolver el nombre del equipo del lead a partir del `pipelineGroupId` o del asesor. */
  const groupNameForLead = useMemo(
    () => (lead: Lead): string => {
      const pipelineId = lead.pipelineGroupId;
      if (pipelineId && pipelineId !== DEFAULT_PIPELINE_GROUP_ID) {
        const g = groups.find((x) => x.id === pipelineId);
        if (g) return g.name;
      }
      const u = userByLead.get(lead.id);
      if (u) {
        const ids = groupIdsForUser(u.id, groups);
        if (ids.length > 0) {
          const g = groups.find((x) => x.id === ids[0]);
          if (g) return g.name;
        }
      }
      return pipelineId === DEFAULT_PIPELINE_GROUP_ID ? "General" : "—";
    },
    [groups, userByLead]
  );

  const filteredLeads = useMemo(() => {
    const q = foldSearchText(searchQuery);
    const rangeFrom = creationDateRange?.from;
    const rangeTo = creationDateRange?.to;
    const fromTs = rangeFrom ? startOfDay(rangeFrom).getTime() : null;
    const toTs = rangeTo ? endOfDay(rangeTo).getTime() : null;

    return tabSourceLeads.filter((lead) => {
      // Equipo
      if (groupFilter !== "all") {
        if (groupFilter === DEFAULT_PIPELINE_GROUP_ID) {
          if (lead.pipelineGroupId !== DEFAULT_PIPELINE_GROUP_ID) return false;
        } else {
          // El lead pertenece al equipo si su pipelineGroupId coincide o si su asesor es miembro.
          const matchesByPipeline = lead.pipelineGroupId === groupFilter;
          let matchesByAdvisor = false;
          const u = userByLead.get(lead.id);
          if (u) {
            const grp = groups.find((g) => g.id === groupFilter);
            matchesByAdvisor = !!grp && grp.memberIds.includes(u.id);
          }
          if (!matchesByPipeline && !matchesByAdvisor) return false;
        }
      }

      // Asesor
      if (advisorFilter !== "all") {
        if (advisorFilter === "__unassigned__") {
          if (isLeadAssigned(lead)) return false;
        } else {
          const u = users.find((x) => x.id === advisorFilter);
          if (!u) return false;
          if (!userMatchesAssignee(u, lead.assignedToUserId)) return false;
        }
      }

      // Búsqueda global: cliente, asesor, propiedad o desarrollo vinculado
      if (q) {
        const advisorUser = userByLead.get(lead.id);
        const linkedProperty = lead.relatedPropertyId ? propertyById.get(lead.relatedPropertyId) : undefined;
        const linkedDevelopment = lead.relatedDevelopmentId
          ? developmentById.get(lead.relatedDevelopmentId)
          : undefined;
        const inventoryLabels = [
          linkedProperty?.title ?? "",
          linkedDevelopment?.name ?? "",
          lead.relatedPropertyId && !linkedProperty ? "Propiedad eliminada" : "",
          lead.relatedDevelopmentId && !linkedDevelopment ? "Desarrollo eliminado" : "",
        ];
        const haystack = [
          lead.name,
          lead.email,
          lead.phone,
          lead.assignedTo,
          advisorUser?.name ?? "",
          advisorUser?.email ?? "",
          resolveAssigneeName(lead.assignedToUserId ?? "", users),
          ...inventoryLabels,
        ]
          .map(foldSearchText)
          .join(" ");
        if (!haystack.includes(q)) return false;
      }

      // Fecha (sobre createdAtIso o createdAt)
      if (fromTs != null || toTs != null) {
        const iso = lead.createdAtIso ?? lead.createdAt;
        const ts = Date.parse(iso);
        if (Number.isNaN(ts)) return false;
        if (fromTs != null && ts < fromTs) return false;
        if (toTs != null && ts > toTs) return false;
      }

      // Tipo de vínculo: propiedad vs desarrollo (no filtra por inmueble concreto)
      if (inventoryFilter === "property") {
        if (!lead.relatedPropertyId?.trim()) return false;
      } else if (inventoryFilter === "development") {
        if (!lead.relatedDevelopmentId?.trim()) return false;
      }

      return true;
    });
  }, [
    tabSourceLeads,
    groupFilter,
    advisorFilter,
    searchQuery,
    creationDateRange,
    inventoryFilter,
    users,
    groups,
    userByLead,
    propertyById,
    developmentById,
  ]);

  const tabCounts = useMemo(
    () => ({
      todos: tabFilteredAll.length,
      asignados: tabFilteredAsignados.length,
      descartados: tabFilteredDescartados.length,
    }),
    [tabFilteredAll, tabFilteredAsignados, tabFilteredDescartados]
  );

  const leadsCreatedTodayCount = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    let n = 0;
    for (const l of leads) {
      if (leadCreationLocalDateKey(l) === todayKey) n += 1;
    }
    return n;
  }, [leads]);

  const filtersActive =
    groupFilter !== "all" ||
    advisorFilter !== "all" ||
    searchQuery.trim() !== "" ||
    creationDateRange?.from != null ||
    inventoryFilter !== "all";

  const clearFilters = () => {
    setGroupFilter("all");
    setAdvisorFilter("all");
    setSearchQuery("");
    setCreationDateRange(undefined);
    setInventoryFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="relative border-b border-slate-200 bg-transparent pb-8 mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-3xl font-light tracking-tight text-slate-900 mb-2">Bandeja de leads</h2>
            <p className="text-sm text-slate-500 max-w-xl">
              Revisa los leads creados, asignados y descartados. Filtra por equipo, asesor o tipo de inventario,
              busca por cliente, asesor, propiedad o desarrollo y reasigna cuando lo necesites.
            </p>
          </div>
          {onRefresh && (
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center lg:w-auto">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                Refrescar
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="inline-flex w-fit max-w-full shrink-0 self-start items-stretch overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100/70 p-1 sm:self-auto">
              {(["todos", "asignados", "descartados"] as const).map((id) => {
              const active = tab === id;
              const label =
                id === "todos" ? "Todos" : id === "asignados" ? "Asignados" : "Descartados";
              const count = tabCounts[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "inline-flex h-10 min-w-[8.5rem] items-center justify-center gap-2 rounded-xl px-4 text-sm transition",
                    active
                      ? "bg-white text-brand-navy shadow-sm"
                      : "text-slate-600 hover:bg-white/70 hover:text-brand-navy"
                  )}
                  style={{ fontWeight: 600 }}
                  aria-pressed={active}
                >
                  {label}
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-[1.6rem] items-center justify-center rounded-full px-2 text-[11px]",
                      active ? "bg-primary/10 text-primary" : "bg-slate-200/80 text-slate-600"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            </div>
            <p
              className="inline-flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1 self-end rounded-xl border border-slate-200/90 bg-white/85 px-3 py-2 text-xs text-slate-600 shadow-sm ring-1 ring-slate-900/[0.03] sm:ml-3 sm:shrink-0"
              style={{ fontWeight: 500 }}
            >
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
              <span className="text-right">
                <span className="font-semibold tabular-nums text-brand-navy">{leadsCreatedTodayCount}</span>{" "}
                {leadsCreatedTodayCount === 1 ? "consulta creada hoy" : "consultas creadas hoy"}
                <span className="text-slate-400"> · </span>
                <span className="text-slate-500">{format(new Date(), "d MMM yyyy", { locale: es })}</span>
              </span>
            </p>
          </div>
        </div>

      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center p-1.5 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cliente, asesor, propiedad o desarrollo…"
              className="w-full border-none bg-transparent py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-medium"
              aria-label="Buscar por cliente, asesor, propiedad o desarrollo"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2.5 rounded-b-2xl overflow-x-auto">
          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Filtros
          </span>

          <div className="relative shrink-0">
            <select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setAdvisorFilter("all");
              }}
              className="appearance-none border-none bg-transparent py-1 pl-2 pr-7 text-sm font-medium text-slate-600 hover:text-slate-900 focus:ring-0 cursor-pointer"
              aria-label="Equipo"
            >
              <option value="all">Todos los equipos</option>
              <option value={DEFAULT_PIPELINE_GROUP_ID}>General (sin equipo)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          </div>

          <div className="h-5 w-px bg-slate-300 shrink-0" />

          <div className="relative shrink-0">
            <select
              value={advisorFilter}
              onChange={(e) => setAdvisorFilter(e.target.value)}
              className="appearance-none border-none bg-transparent py-1 pl-2 pr-7 text-sm font-medium text-slate-600 hover:text-slate-900 focus:ring-0 cursor-pointer"
              aria-label="Asesor"
            >
              <option value="all">Todos los asesores</option>
              <option value="__unassigned__">Sin asignar</option>
              {filteredAdvisorOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          </div>

          <div className="h-5 w-px bg-slate-300 shrink-0" />

          <div className="relative shrink-0">
            <select
              value={inventoryFilter}
              onChange={(e) => setInventoryFilter(e.target.value as InventoryKindFilter)}
              className="appearance-none border-none bg-transparent py-1 pl-2 pr-7 text-sm font-medium text-slate-600 hover:text-slate-900 focus:ring-0 cursor-pointer"
              aria-label="Filtrar por tipo: propiedad o desarrollo"
            >
              <option value="all">Propiedades y desarrollos</option>
              <option value="property">Solo propiedades</option>
              <option value="development">Solo desarrollos</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          </div>

          <div className="h-5 w-px bg-slate-300 shrink-0" />

          <label className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fecha</span>
            <ConsultasCreationDateRangeFilter value={creationDateRange} onChange={setCreationDateRange} />
          </label>

          {filtersActive && (
            <>
              <div className="h-5 w-px bg-slate-300 shrink-0 ml-auto" />
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                Limpiar
              </button>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700" role="alert">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center px-6 py-16 text-sm text-slate-500">
            Cargando leads…
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-slate-500">
            <ClipboardList className="h-8 w-8 text-slate-400" strokeWidth={1.5} aria-hidden />
            <p className="text-sm" style={{ fontWeight: 500 }}>
              {tabSourceLeads.length === 0
                ? tab === "descartados"
                  ? "No hay leads descartados todavía."
                  : tab === "asignados"
                    ? "Aún no hay leads asignados."
                    : "Aún no se han creado leads."
                : "No hay leads que coincidan con los filtros."}
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-brand-navy"
                style={{ fontWeight: 600 }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredLeads.map((lead) => {
              const advisor = userByLead.get(lead.id);
              const advisorDisplay = advisor?.name
                ? advisor.name
                : lead.assignedTo && lead.assignedTo !== "Sin asignar"
                  ? lead.assignedTo
                  : resolveAssigneeName(lead.assignedToUserId, []);
              const stageLabel = labelForLeadStatus(lead.status, customStages);
              const linkedProperty = lead.relatedPropertyId
                ? propertyById.get(lead.relatedPropertyId)
                : undefined;
              const linkedDevelopment = lead.relatedDevelopmentId
                ? developmentById.get(lead.relatedDevelopmentId)
                : undefined;
              const inventoryKind: "property" | "development" | null = lead.relatedPropertyId
                ? "property"
                : lead.relatedDevelopmentId
                  ? "development"
                  : null;
              const inventoryName =
                linkedProperty?.title ??
                linkedDevelopment?.name ??
                (lead.relatedPropertyId
                  ? "Propiedad eliminada"
                  : lead.relatedDevelopmentId
                    ? "Desarrollo eliminado"
                    : "Sin inventario vinculado");
              const inventoryImage = linkedProperty?.image ?? linkedDevelopment?.image ?? "";
              const teamLabel = groupNameForLead(lead);
              const isArchived = isCrmArchivedLead(lead);
              const isLost = lead.status === "perdido";

              return (
                <li key={lead.id} className="px-4 py-4 transition hover:bg-slate-50/60 sm:px-5">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {/* Imagen de la propiedad / desarrollo (o placeholder) */}
                    <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-24 sm:w-32 lg:h-24 lg:w-36">
                      {inventoryImage ? (
                        <img
                          src={inventoryImage}
                          alt={inventoryName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                          {inventoryKind === "development" ? (
                            <Building2 className="h-8 w-8" strokeWidth={1.4} aria-hidden />
                          ) : inventoryKind === "property" ? (
                            <Home className="h-8 w-8" strokeWidth={1.4} aria-hidden />
                          ) : (
                            <ImageOff className="h-8 w-8" strokeWidth={1.4} aria-hidden />
                          )}
                        </div>
                      )}
                      {inventoryKind && (
                        <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-white" style={{ fontWeight: 600 }}>
                          {inventoryKind === "property" ? (
                            <>
                              <Home className="h-2.5 w-2.5" strokeWidth={2} />
                              Propiedad
                            </>
                          ) : (
                            <>
                              <Building2 className="h-2.5 w-2.5" strokeWidth={2} />
                              Desarrollo
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Contenido principal */}
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base text-brand-navy" style={{ fontWeight: 700 }}>
                              {lead.name || "Cliente sin nombre"}
                            </h3>
                            {isArchived && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-red-700" style={{ fontWeight: 600 }}>
                                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                                Eliminado
                              </span>
                            )}
                            {!isArchived && isLost && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-amber-700" style={{ fontWeight: 600 }}>
                                Perdido
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {lead.email && (
                              <span className="inline-flex max-w-full items-center gap-1 truncate">
                                <Mail className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                                <span className="truncate">{lead.email}</span>
                              </span>
                            )}
                            {lead.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                                {lead.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenDetail(lead)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-brand-navy"
                            style={{ fontWeight: 600 }}
                            title="Ver todos los detalles"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                            Detalle
                          </button>
                          <button
                            type="button"
                            onClick={() => setReassignTarget(lead)}
                            disabled={isArchived}
                            className={cn(
                              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs shadow-sm transition",
                              isArchived
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                            )}
                            style={{ fontWeight: 600 }}
                            title={isArchived ? "El lead fue archivado en el CRM y no se puede reasignar" : "Reasignar a otro asesor"}
                          >
                            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                            Reasignar
                          </button>
                        </div>
                      </div>

                      {/* Detalles de interés */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700" style={{ fontWeight: 600 }}>
                          {interestLabel(lead.interest)}
                        </span>
                        {lead.propertyType && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span>{lead.propertyType}</span>
                          </>
                        )}
                        {lead.location && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="truncate">{lead.location}</span>
                          </>
                        )}
                        {lead.budget > 0 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span style={{ fontWeight: 600 }}>{formatBudget(lead.budget)}</span>
                          </>
                        )}
                      </div>

                      {/* Asignación, etapa y prioridad */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 px-2.5 py-1 text-slate-700" style={{ fontWeight: 600 }}>
                          <Users className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                          {teamLabel}
                        </span>
                        {isLeadAssigned(lead) ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-primary" style={{ fontWeight: 600 }}>
                            <UserCheck className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                            {advisorDisplay}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-slate-500">
                            Sin asignar
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-slate-700" style={{ fontWeight: 600 }}>
                          {stageLabel}
                        </span>
                        <LeadPriorityBadge stars={lead.priorityStars} />
                      </div>

                      {/* Inventario, origen y creación */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {inventoryKind && (
                          <span
                            className="inline-flex max-w-full items-center gap-1.5 truncate"
                            title={inventoryName}
                          >
                            {inventoryKind === "property" ? (
                              <Home className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                            ) : (
                              <Building2 className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                            )}
                            <span className="truncate text-slate-600" style={{ fontWeight: 600 }}>
                              {inventoryName}
                            </span>
                          </span>
                        )}
                        {lead.source && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                            {lead.source}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                          {formatCreatedAt(lead)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ReassignLeadDialog
        lead={reassignTarget}
        users={users}
        groups={groups}
        currentUserName={currentUserName}
        onOpenChange={(o) => {
          if (!o) setReassignTarget(null);
        }}
        onConfirm={async (lead, newId, newName) => {
          const ok = await onReassign(lead, newId, newName);
          if (ok) setReassignTarget(null);
          return ok;
        }}
      />
    </div>
  );
}

type ReassignProps = {
  lead: Lead | null;
  users: User[];
  groups: UserGroup[];
  currentUserName: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (lead: Lead, newAssigneeUserId: string, newAssigneeName: string) => Promise<boolean>;
};

function ReassignLeadDialog({
  lead,
  users,
  groups,
  currentUserName,
  onOpenChange,
  onConfirm,
}: ReassignProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (lead) {
      const u = users.find((x) => userMatchesAssignee(x, lead.assignedToUserId));
      setSelectedId(u?.id ?? "");
      setSubmitting(false);
      setSearchQuery("");
    }
  }, [lead, users]);

  const advisorOptions = useMemo(() => {
    return users
      .filter((u) => u.isActive && (u.role === "asesor" || u.role === "lider_grupo"))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [users]);

  /** Mapa userId → ids de equipos a los que pertenece, para mostrar el equipo junto al asesor. */
  const groupNamesByUser = useMemo(() => {
    const out = new Map<string, string>();
    for (const u of advisorOptions) {
      const ids = groupIdsForUser(u.id, groups);
      if (ids.length > 0) {
        const names = ids
          .map((id) => groups.find((g) => g.id === id)?.name)
          .filter((x): x is string => Boolean(x));
        if (names.length > 0) out.set(u.id, names.join(", "));
      }
    }
    return out;
  }, [advisorOptions, groups]);

  const filteredAdvisors = useMemo(() => {
    const q = foldSearchText(searchQuery);
    if (!q) return advisorOptions;
    return advisorOptions.filter((u) => {
      const team = groupNamesByUser.get(u.id) ?? "";
      const haystack = foldSearchText(`${u.name} ${u.email} ${team}`);
      return haystack.includes(q);
    });
  }, [advisorOptions, groupNamesByUser, searchQuery]);

  const open = lead != null;
  const currentAssignee =
    lead && lead.assignedTo && lead.assignedTo !== "Sin asignar" ? lead.assignedTo : "Sin asignar";

  const handleConfirm = async () => {
    if (!lead || !selectedId) return;
    const u = users.find((x) => x.id === selectedId);
    if (!u) return;
    setSubmitting(true);
    try {
      await onConfirm(lead, u.id, u.name);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border border-stone-200/90 p-0 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.22)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy" aria-hidden />
        <div className="px-6 pb-2 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ fontWeight: 600 }}>
            Consultas · Reasignar lead
          </p>
          <DialogHeader className="mt-2 space-y-2 text-left">
            <DialogTitle className="font-heading text-xl text-brand-navy" style={{ fontWeight: 600 }}>
              Reasignar a otro asesor
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600" style={{ fontWeight: 500 }}>
              {lead ? (
                <>
                  Lead de <span className="font-semibold text-brand-navy">{lead.name || "Cliente sin nombre"}</span>.
                  Asignado actualmente a <span className="font-semibold text-brand-navy">{currentAssignee}</span>.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-3 px-6 pb-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="reassign-search" className="text-[11px] uppercase tracking-[0.12em] text-slate-500" style={{ fontWeight: 600 }}>
              Nuevo asesor
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                id="reassign-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, correo o equipo…"
                autoFocus
                className={cn(FIELD_CLASS, "pl-9 pr-9")}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                </button>
              )}
            </div>
          </div>

          {advisorOptions.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
              No hay asesores activos disponibles. Crea o reactiva uno desde Mi empresa → Usuarios.
            </p>
          ) : (
            <div
              role="listbox"
              aria-label="Asesores disponibles"
              className="max-h-[18rem] overflow-y-auto rounded-xl border border-slate-200 bg-white"
            >
              {filteredAdvisors.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 px-4 py-6 text-center text-xs text-slate-500">
                  <Search className="h-4 w-4 text-slate-400" strokeWidth={1.6} aria-hidden />
                  <p style={{ fontWeight: 500 }}>
                    No se encontraron asesores que coincidan con «{searchQuery}».
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredAdvisors.map((u) => {
                    const team = groupNamesByUser.get(u.id);
                    const isSelected = u.id === selectedId;
                    const initials = u.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? "")
                      .join("");
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => setSelectedId(u.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                            isSelected
                              ? "bg-primary/5 text-brand-navy"
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-slate-100 text-slate-600"
                            )}
                            style={{ fontWeight: 700 }}
                            aria-hidden
                          >
                            {initials || "?"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm" style={{ fontWeight: 600 }}>
                              {u.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                              {u.email && <span className="truncate">{u.email}</span>}
                              {team && (
                                <>
                                  {u.email && <span className="text-slate-300">·</span>}
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <Users className="h-3 w-3 shrink-0" strokeWidth={1.8} />
                                    <span className="truncate">{team}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-primary" style={{ fontWeight: 600 }}>
                              Seleccionado
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {lead && currentUserName && (
            <p className="text-[11px] text-slate-500" style={{ fontWeight: 500 }}>
              Quedará registrado en el historial del lead que <span className="font-semibold text-slate-700">{currentUserName}</span> realizó la reasignación.
            </p>
          )}
        </div>
        <DialogFooter className="flex-col-reverse gap-2 border-t border-stone-200/80 bg-stone-50/90 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-stone-300 bg-white text-slate-700 hover:bg-stone-50 hover:text-slate-800"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-brand-red-hover"
            style={{ fontWeight: 600 }}
            onClick={handleConfirm}
            disabled={!selectedId || submitting || !lead}
          >
            {submitting ? "Guardando…" : "Reasignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
