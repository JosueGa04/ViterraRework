/**
 * @file AdminLeadsTable.test.tsx
 * @module Smoke/Integration Tests – AdminLeadsTable (vista tabla de Leads)
 *
 * Red de seguridad (Fase 4) para la vista de tabla de la pestaña Leads: estado vacío,
 * render de secciones por estado, colapsado de sección y acciones por lead
 * (ver / editar / eliminar con confirmación / cambio de estado).
 *
 * Ejecutar: npx vitest run src/__tests__/unit/admin/AdminLeadsTable.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Lead } from "../../../app/data/leads";
import type { LeadTableSection } from "../../../app/pages/admin/leadsGrouping";
import { AdminLeadsTable } from "../../../app/components/admin/AdminLeadsTable";

type TableProps = Parameters<typeof AdminLeadsTable>[0];

function makeLead(id: string, status: string): Lead {
  return {
    id,
    name: `Lead ${id}`,
    email: "a@b.com",
    phone: "555",
    interest: "compra",
    propertyType: "casa",
    budget: 1000,
    location: "MTY",
    status,
    priorityStars: 3,
    source: "web",
    assignedTo: "",
    assignedToUserId: "",
    pipelineGroupId: "__default__",
    lastContact: "2024-01-01",
  } as Lead;
}

function makeProps(overrides: Partial<TableProps> = {}): TableProps {
  const leadA = makeLead("a", "nuevo");
  const sections: LeadTableSection[] = [
    { statusId: "nuevo", label: "Nuevo", leads: [leadA] },
  ];
  return {
    filteredLeads: [leadA],
    leadsTableGroupedByStatus: sections,
    leadsTableSectionCollapsed: {},
    toggleLeadsTableSection: vi.fn(),
    resolveStageHex: () => "#112233",
    statusSelectOptions: [
      { value: "nuevo", label: "Nuevo" },
      { value: "cerrado", label: "Cerrado" },
    ],
    openLeadDetail: vi.fn(),
    handleUpdateLeadStatus: vi.fn(),
    handleDeleteLead: vi.fn(),
    ...overrides,
  };
}

describe("AdminLeadsTable", () => {
  it("muestra el estado vacío cuando no hay leads", () => {
    render(<AdminLeadsTable {...makeProps({ filteredLeads: [], leadsTableGroupedByStatus: [] })} />);
    expect(screen.getByText("No se encontraron leads")).toBeInTheDocument();
  });

  it("renderiza una sección por estado con su etiqueta y conteo", () => {
    render(<AdminLeadsTable {...makeProps()} />);
    expect(screen.getByRole("heading", { name: "Nuevo" })).toBeInTheDocument();
    expect(screen.getAllByText("Lead a").length).toBeGreaterThan(0);
  });

  it("clic en la cabecera de sección llama toggleLeadsTableSection", async () => {
    const toggleLeadsTableSection = vi.fn();
    render(<AdminLeadsTable {...makeProps({ toggleLeadsTableSection })} />);
    await userEvent.click(screen.getByRole("button", { name: /Contraer sección Nuevo/i }));
    expect(toggleLeadsTableSection).toHaveBeenCalledWith("nuevo");
  });

  it("cambiar el estado de un lead llama handleUpdateLeadStatus", async () => {
    const handleUpdateLeadStatus = vi.fn();
    render(<AdminLeadsTable {...makeProps({ handleUpdateLeadStatus })} />);
    // Puede haber select duplicado (móvil/escritorio); usamos el primero.
    const select = screen.getAllByLabelText(/Cambiar estado de Lead a/i)[0];
    await userEvent.selectOptions(select, "cerrado");
    expect(handleUpdateLeadStatus).toHaveBeenCalledWith("a", "cerrado");
  });

  it("ver un lead llama openLeadDetail en modo view", async () => {
    const openLeadDetail = vi.fn();
    render(<AdminLeadsTable {...makeProps({ openLeadDetail })} />);
    await userEvent.click(screen.getAllByTitle("Ver")[0]);
    expect(openLeadDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }), "view");
  });

  describe("eliminar con confirmación", () => {
    beforeEach(() => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("eliminar confirmado llama handleDeleteLead", async () => {
      const handleDeleteLead = vi.fn();
      render(<AdminLeadsTable {...makeProps({ handleDeleteLead })} />);
      await userEvent.click(screen.getAllByTitle("Eliminar")[0]);
      expect(handleDeleteLead).toHaveBeenCalledWith("a");
    });
  });

  it("no elimina si el usuario cancela la confirmación", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const handleDeleteLead = vi.fn();
    render(<AdminLeadsTable {...makeProps({ handleDeleteLead })} />);
    await userEvent.click(screen.getAllByTitle("Eliminar")[0]);
    expect(handleDeleteLead).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
