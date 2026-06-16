import { ChevronDown, Filter, LayoutGrid, Plus, Search, Table2, TextSearch } from "lucide-react";
import type { LeadsFiltersState } from "../../pages/admin/useLeadsFilters";

type Props = {
  filters: LeadsFiltersState;
  onNew: () => void;
  activePipelineGroupId: string;
  setActivePipelineGroupId: (id: string) => void;
  allowedPipelineGroupIds: string[];
  pipelineGroupLabel: (id: string) => string;
  statusSelectOptions: { value: string; label: string }[];
};

/** Cabecera de la pestana Leads: titulo, toggle Kanban/tabla, "Nuevo Lead", busqueda y filtros. */
export function AdminLeadsToolbar({
  filters,
  onNew,
  activePipelineGroupId,
  setActivePipelineGroupId,
  allowedPipelineGroupIds,
  pipelineGroupLabel,
  statusSelectOptions,
}: Props) {
  const {
    searchQuery,
    setSearchQuery,
    leadSearchNameScope,
    setLeadSearchNameScope,
    statusFilter,
    setStatusFilter,
    createdRangeFilter,
    setCreatedRangeFilter,
    createdFrom,
    setCreatedFrom,
    createdTo,
    setCreatedTo,
    leadsView,
    setLeadsView,
  } = filters;

  return (
    <div className="relative border-b border-slate-200 bg-transparent mb-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-3xl font-light tracking-tight text-slate-900 mb-2">Gestión de Leads</h2>
                    <p className="text-sm text-slate-500 max-w-xl">
                      Administra y da seguimiento a tus clientes potenciales con vista Kanban o tabla.
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center lg:w-auto">
                    <div
                      className="inline-flex w-full rounded border border-slate-200 bg-white p-0.5 sm:w-auto"
                      role="group"
                      aria-label="Vista de leads"
                    >
                      <button
                        type="button"
                        aria-label="Vista Kanban"
                        onClick={() => setLeadsView("kanban")}
                        className={`inline-flex h-9 flex-1 items-center justify-center rounded-sm transition-colors sm:flex-none sm:w-10 ${leadsView === "kanban"
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-900"
                          }`}
                      >
                        <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        aria-label="Vista tabla"
                        onClick={() => setLeadsView("table")}
                        className={`inline-flex h-9 flex-1 items-center justify-center rounded-sm transition-colors sm:flex-none sm:w-10 ${leadsView === "table"
                          ? "bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-900"
                          }`}
                      >
                        <Table2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={onNew}
                      className="flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-black sm:w-auto"
                    >
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                      Nuevo Lead
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col sm:flex-row sm:items-center p-1.5 gap-2">
                    <div className="relative flex-1">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                        strokeWidth={1.5}
                      />
                      <input
                        type="search"
                        placeholder={
                          leadSearchNameScope === "client"
                            ? "Buscar por nombre del cliente…"
                            : leadSearchNameScope === "advisor"
                              ? "Buscar por nombre del asesor…"
                              : "Buscar por contacto, teléfono o asesor…"
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border-none bg-transparent py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 font-medium"
                        autoComplete="off"
                      />
                    </div>
                    <div className="hidden sm:block h-8 w-px bg-slate-100" />
                    <div className="relative sm:w-72">
                      <TextSearch
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        strokeWidth={1.5}
                      />
                      <select
                        aria-label="Ámbito de búsqueda por nombre"
                        value={leadSearchNameScope}
                        onChange={(e) => setLeadSearchNameScope(e.target.value as "all" | "client" | "advisor")}
                        className="appearance-none w-full border-none bg-transparent py-3 pl-9 pr-8 text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="all">Buscar en todo</option>
                        <option value="client">Solo en cliente</option>
                        <option value="advisor">Solo en asesor</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50 px-4 py-2.5 rounded-b-2xl overflow-x-auto">
                    <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-2">
                      <Filter className="h-3.5 w-3.5" strokeWidth={2} />
                      Filtros
                    </span>

                    <div className="relative shrink-0">
                      <select
                        id="crm-pipeline-group"
                        value={activePipelineGroupId}
                        onChange={(e) => setActivePipelineGroupId(e.target.value)}
                        className="appearance-none border-none bg-transparent py-1 pl-2 pr-7 text-sm font-medium text-slate-600 hover:text-slate-900 focus:ring-0 cursor-pointer"
                      >
                        {allowedPipelineGroupIds.map((id) => (
                          <option key={id} value={id}>Grupo: {pipelineGroupLabel(id)}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                    </div>

                    <div className="h-5 w-px bg-slate-300 shrink-0" />

                    <div className="relative shrink-0">
                      <select
                        value={createdRangeFilter}
                        onChange={(e) => setCreatedRangeFilter(e.target.value as "all" | "1m" | "3m" | "6m" | "1y" | "custom")}
                        className="appearance-none border-none bg-transparent py-1 pl-2 pr-7 text-sm font-medium text-slate-600 hover:text-slate-900 focus:ring-0 cursor-pointer"
                      >
                        <option value="all">Cualquier fecha</option>
                        <option value="1m">Último mes</option>
                        <option value="3m">Últimos 3 meses</option>
                        <option value="6m">Últimos 6 meses</option>
                        <option value="1y">Último año</option>
                        <option value="custom">Personalizada...</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                    </div>

                    <div className="h-5 w-px bg-slate-300 shrink-0" />

                    <div className="relative shrink-0">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none border-none bg-transparent py-1 pl-2 pr-7 text-sm font-medium text-slate-600 hover:text-slate-900 focus:ring-0 cursor-pointer"
                      >
                        <option value="all">Todos los estados</option>
                        {statusSelectOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" strokeWidth={2} />
                    </div>
                  </div>

                  {createdRangeFilter === "custom" && (
                    <div className="border-t border-slate-100 bg-white p-4 rounded-b-2xl">
                      <div className="grid gap-4 sm:max-w-[460px] sm:grid-cols-2">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1 block">Desde</label>
                          <input
                            type="date"
                            value={createdFrom}
                            onChange={(e) => setCreatedFrom(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1 block">Hasta</label>
                          <input
                            type="date"
                            value={createdTo}
                            onChange={(e) => setCreatedTo(e.target.value)}
                            className="w-full rounded-md border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-0"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
  );
}
