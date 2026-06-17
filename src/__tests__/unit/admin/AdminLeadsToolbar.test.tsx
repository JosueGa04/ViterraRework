/**
 * @file AdminLeadsToolbar.test.tsx
 * @module Smoke/Integration Tests – AdminLeadsToolbar (cabecera de la pestaña Leads)
 *
 * Red de seguridad (Fase 4): toggle Kanban/tabla, botón "Nuevo Lead", búsqueda, selector
 * de grupo de pipeline y filtros (estado, rango de fechas con modo personalizado).
 *
 * Ejecutar: npx vitest run src/__tests__/unit/admin/AdminLeadsToolbar.test.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LeadsFiltersState } from "../../../app/pages/admin/useLeadsFilters";
import { AdminLeadsToolbar } from "../../../app/components/admin/AdminLeadsToolbar";

type ToolbarProps = Parameters<typeof AdminLeadsToolbar>[0];

function makeFilters(overrides: Partial<LeadsFiltersState> = {}): LeadsFiltersState {
  return {
    searchQuery: "",
    setSearchQuery: vi.fn(),
    leadSearchNameScope: "all",
    setLeadSearchNameScope: vi.fn(),
    statusFilter: "all",
    setStatusFilter: vi.fn(),
    createdRangeFilter: "all",
    setCreatedRangeFilter: vi.fn(),
    createdFrom: "",
    setCreatedFrom: vi.fn(),
    createdTo: "",
    setCreatedTo: vi.fn(),
    leadsView: "kanban",
    setLeadsView: vi.fn(),
    leadsTableSectionCollapsed: {},
    setLeadsTableSectionCollapsed: vi.fn(),
    ...overrides,
  };
}

function makeProps(filtersOverrides: Partial<LeadsFiltersState> = {}, overrides: Partial<ToolbarProps> = {}): ToolbarProps {
  return {
    filters: makeFilters(filtersOverrides),
    onNew: vi.fn(),
    activePipelineGroupId: "g1",
    setActivePipelineGroupId: vi.fn(),
    allowedPipelineGroupIds: ["g1", "g2"],
    pipelineGroupLabel: (id: string) => `Grupo ${id}`,
    statusSelectOptions: [
      { value: "nuevo", label: "Nuevo" },
      { value: "cerrado", label: "Cerrado" },
    ],
    ...overrides,
  };
}

describe("AdminLeadsToolbar", () => {
  it("monta con el título de la sección", () => {
    render(<AdminLeadsToolbar {...makeProps()} />);
    expect(screen.getByText("Gestión de Leads")).toBeInTheDocument();
  });

  it("el toggle de vista tabla llama setLeadsView('table')", async () => {
    const setLeadsView = vi.fn();
    render(<AdminLeadsToolbar {...makeProps({ setLeadsView })} />);
    await userEvent.click(screen.getByRole("button", { name: /Vista tabla/i }));
    expect(setLeadsView).toHaveBeenCalledWith("table");
  });

  it("«Nuevo Lead» llama onNew", async () => {
    const onNew = vi.fn();
    render(<AdminLeadsToolbar {...makeProps({}, { onNew })} />);
    await userEvent.click(screen.getByRole("button", { name: /Nuevo Lead/i }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("escribir en la búsqueda llama setSearchQuery", async () => {
    const setSearchQuery = vi.fn();
    render(<AdminLeadsToolbar {...makeProps({ setSearchQuery })} />);
    await userEvent.type(screen.getByPlaceholderText(/Buscar por contacto/i), "x");
    expect(setSearchQuery).toHaveBeenCalled();
  });

  it("cambiar el grupo de pipeline llama setActivePipelineGroupId", async () => {
    const setActivePipelineGroupId = vi.fn();
    const { container } = render(<AdminLeadsToolbar {...makeProps({}, { setActivePipelineGroupId })} />);
    const groupSelect = container.querySelector<HTMLSelectElement>("#crm-pipeline-group")!;
    await userEvent.selectOptions(groupSelect, "g2");
    expect(setActivePipelineGroupId).toHaveBeenCalledWith("g2");
  });

  it("el rango de fechas personalizado muestra los inputs Desde/Hasta", () => {
    render(<AdminLeadsToolbar {...makeProps({ createdRangeFilter: "custom" })} />);
    expect(screen.getByText("Desde")).toBeInTheDocument();
    expect(screen.getByText("Hasta")).toBeInTheDocument();
  });
});
