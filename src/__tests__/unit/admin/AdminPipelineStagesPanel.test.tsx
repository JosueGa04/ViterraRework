/**
 * @file AdminPipelineStagesPanel.test.tsx
 * @module Smoke/Integration Tests – AdminPipelineStagesPanel (subtab "Pipeline de ventas")
 *
 * Red de seguridad (Fase 4 del refactor de AdminWorkspace) para la pieza más sensible de la
 * pestaña Empresa: el CRUD de etapas del pipeline. El estado y los handlers viven en
 * AdminWorkspace; aquí verificamos que el componente monta y que cada acción principal
 * (cambiar grupo, agregar/editar/eliminar columna, cambiar color) dispara el handler correcto.
 *
 * Ejecutar: npx vitest run src/__tests__/unit/admin/AdminPipelineStagesPanel.test.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminPipelineStagesPanel } from "../../../app/components/admin/AdminPipelineStagesPanel";
import { createEmptyGroupPipelineSnapshot } from "../../../app/lib/pipelineByGroup";

type PanelProps = Parameters<typeof AdminPipelineStagesPanel>[0];

/** Props mínimas con handlers espía; sobre-escribibles por test. */
function makeProps(overrides: Partial<PanelProps> = {}): PanelProps {
  return {
    isAdmin: true,
    isGroupLeader: false,
    activePipelineGroupId: "g1",
    setActivePipelineGroupId: vi.fn(),
    allowedPipelineGroupIds: ["g1", "g2"],
    pipelineGroupLabel: (id: string) => `Grupo ${id}`,
    pipelineCopyDestOptions: [],
    pipelineCopyFrom: "",
    setPipelineCopyFrom: vi.fn(),
    pipelineCopySourceOptions: [],
    pipelineCopyTo: "",
    setPipelineCopyTo: vi.fn(),
    handleDuplicatePipelineToTeam: vi.fn(),
    canSubmitPipelineCopy: false,
    pipelineGroupsVisibleToLeader: [],
    advisorsByGroupId: {},
    expandedLeaderGroupId: null,
    setExpandedLeaderGroupId: vi.fn(),
    handleViewTeamMember: vi.fn(),
    stageDraftLabel: "",
    setStageDraftLabel: vi.fn(),
    handleAddKanbanStage: vi.fn(),
    canConfigureActivePipeline: true,
    leadColumnStatuses: ["nuevo", "contactado"],
    resolveStatusLabel: (s: string) => (s === "nuevo" ? "Nuevo" : "Contactado"),
    editingStageId: null,
    setEditingStageId: vi.fn(),
    leads: [],
    handleReorderPipelineRows: vi.fn(),
    resolveStageHex: () => "#112233",
    setPipelineByGroup: vi.fn(),
    handleUpdateKanbanStage: vi.fn(),
    requestDeletePipelineStage: vi.fn(),
    pipelineByGroup: { g1: createEmptyGroupPipelineSnapshot() },
    ...overrides,
  };
}

describe("AdminPipelineStagesPanel", () => {
  it("monta y renderiza una fila por cada columna del pipeline", () => {
    render(<AdminPipelineStagesPanel {...makeProps()} />);
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
    expect(screen.getByText("Contactado")).toBeInTheDocument();
    // El selector de contexto de grupo (solo admin) está presente.
    expect(screen.getByLabelText(/Equipo \/ contexto del embudo/i)).toBeInTheDocument();
  });

  it("cambiar el grupo de contexto llama setActivePipelineGroupId", () => {
    const setActivePipelineGroupId = vi.fn();
    render(<AdminPipelineStagesPanel {...makeProps({ setActivePipelineGroupId })} />);
    fireEvent.change(screen.getByLabelText(/Equipo \/ contexto del embudo/i), {
      target: { value: "g2" },
    });
    expect(setActivePipelineGroupId).toHaveBeenCalledWith("g2");
  });

  it("«Agregar columna» con borrador no vacío llama handleAddKanbanStage", async () => {
    const handleAddKanbanStage = vi.fn();
    render(
      <AdminPipelineStagesPanel {...makeProps({ stageDraftLabel: "Visita", handleAddKanbanStage })} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Agregar columna/i }));
    expect(handleAddKanbanStage).toHaveBeenCalledWith("Visita");
  });

  it("«Eliminar» en una columna llama requestDeletePipelineStage con (id, label)", async () => {
    const requestDeletePipelineStage = vi.fn();
    render(
      <AdminPipelineStagesPanel
        {...makeProps({ leadColumnStatuses: ["nuevo"], requestDeletePipelineStage })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Eliminar/i }));
    expect(requestDeletePipelineStage).toHaveBeenCalledWith("nuevo", "Nuevo");
  });

  it("«Editar» en una columna entra en modo edición (setEditingStageId)", async () => {
    const setEditingStageId = vi.fn();
    const setStageDraftLabel = vi.fn();
    render(
      <AdminPipelineStagesPanel
        {...makeProps({ leadColumnStatuses: ["nuevo"], setEditingStageId, setStageDraftLabel })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Editar/i }));
    expect(setEditingStageId).toHaveBeenCalledWith("nuevo");
    expect(setStageDraftLabel).toHaveBeenCalledWith("Nuevo");
  });

  it("cambiar el color de una columna llama setPipelineByGroup", () => {
    const setPipelineByGroup = vi.fn();
    render(
      <AdminPipelineStagesPanel
        {...makeProps({ leadColumnStatuses: ["nuevo"], setPipelineByGroup })}
      />,
    );
    const colorInput = screen.getByLabelText(/Color de columna para Nuevo/i);
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    expect(setPipelineByGroup).toHaveBeenCalledTimes(1);
  });

  it("sin permiso de configuración, deshabilita editar/eliminar/agregar y oculta el color", () => {
    render(
      <AdminPipelineStagesPanel
        {...makeProps({ canConfigureActivePipeline: false, leadColumnStatuses: ["nuevo"] })}
      />,
    );
    // Editar/Eliminar siguen montados pero deshabilitados (no se ocultan).
    expect(screen.getByRole("button", { name: /Eliminar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Editar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Agregar columna/i })).toBeDisabled();
    // El selector de color sí se oculta sin permiso.
    expect(screen.queryByLabelText(/Color de columna para Nuevo/i)).not.toBeInTheDocument();
  });
});
