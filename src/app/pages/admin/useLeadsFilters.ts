import { useState, type Dispatch, type SetStateAction } from "react";

type Setter<T> = Dispatch<SetStateAction<T>>;

export type LeadsCreatedRange = "all" | "1m" | "3m" | "6m" | "1y" | "custom";

export type LeadsFiltersState = {
  /** Texto de búsqueda en leads (cliente/asesor según `leadSearchNameScope`). */
  searchQuery: string;
  setSearchQuery: Setter<string>;
  /** Ámbito del texto de búsqueda por nombre. */
  leadSearchNameScope: "all" | "client" | "advisor";
  setLeadSearchNameScope: Setter<"all" | "client" | "advisor">;
  statusFilter: string;
  setStatusFilter: Setter<string>;
  createdRangeFilter: LeadsCreatedRange;
  setCreatedRangeFilter: Setter<LeadsCreatedRange>;
  createdFrom: string;
  setCreatedFrom: Setter<string>;
  createdTo: string;
  setCreatedTo: Setter<string>;
  /** Kanban o tabla. */
  leadsView: "kanban" | "table";
  setLeadsView: Setter<"kanban" | "table">;
  /** Vista lista: secciones por estado; true = colapsada. */
  leadsTableSectionCollapsed: Record<string, boolean>;
  setLeadsTableSectionCollapsed: Setter<Record<string, boolean>>;
};

/**
 * Estado de búsqueda/filtros/vista del módulo de Leads (solo UI, sin datos ni efectos).
 * Agrupa estos useState dispersos para reducir la superficie de estado de AdminWorkspace.
 */
export function useLeadsFilters(): LeadsFiltersState {
  const [searchQuery, setSearchQuery] = useState("");
  const [leadSearchNameScope, setLeadSearchNameScope] = useState<"all" | "client" | "advisor">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createdRangeFilter, setCreatedRangeFilter] = useState<LeadsCreatedRange>("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [leadsView, setLeadsView] = useState<"kanban" | "table">("kanban");
  const [leadsTableSectionCollapsed, setLeadsTableSectionCollapsed] = useState<Record<string, boolean>>({});

  return {
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
    leadsTableSectionCollapsed,
    setLeadsTableSectionCollapsed,
  };
}
