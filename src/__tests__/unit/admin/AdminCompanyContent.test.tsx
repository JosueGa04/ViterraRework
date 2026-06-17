/**
 * @file AdminCompanyContent.test.tsx
 * @module Smoke/Integration Tests – AdminCompanyContent (contenedor de la pestaña Empresa)
 *
 * Red de seguridad (Fase 4) para el wrapper de la pestaña Empresa: verifica el skeleton de carga,
 * la cabecera según rol, el selector de subtab (que llama goTab) y que los paneles inyectados como
 * slots se montan SIEMPRE (patrón hidden-CSS) para no perder estado al cambiar de subtab.
 *
 * Ejecutar: npx vitest run src/__tests__/unit/admin/AdminCompanyContent.test.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminCompanyContent } from "../../../app/components/admin/AdminCompanyContent";

type ContentProps = Parameters<typeof AdminCompanyContent>[0];

function makeProps(overrides: Partial<ContentProps> = {}): ContentProps {
  return {
    isAdmin: true,
    isGroupLeader: false,
    companySubtab: "users",
    companyModuleLoading: false,
    canEditSite: false,
    goTab: vi.fn(),
    adminModuleFallback: () => <div data-testid="fallback" />,
    usersPanel: <div data-testid="users-panel">USERS</div>,
    settingsPanel: <div data-testid="settings-panel">SETTINGS</div>,
    pipelinePanel: <div data-testid="pipeline-panel">PIPELINE</div>,
    ...overrides,
  };
}

describe("AdminCompanyContent", () => {
  it("muestra el skeleton mientras el módulo carga", () => {
    render(<AdminCompanyContent {...makeProps({ companyModuleLoading: true })} />);
    // En carga no se renderizan los paneles ni la cabecera.
    expect(screen.queryByTestId("users-panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Mi Empresa")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Cargando administración")).toBeInTheDocument();
  });

  it("monta SIEMPRE los tres paneles (users/settings/pipeline) aunque el subtab activo sea uno", () => {
    render(<AdminCompanyContent {...makeProps({ companySubtab: "users" })} />);
    expect(screen.getByTestId("users-panel")).toBeInTheDocument();
    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
    expect(screen.getByTestId("pipeline-panel")).toBeInTheDocument();
  });

  it("oculta vía CSS los paneles que no son el subtab activo", () => {
    render(<AdminCompanyContent {...makeProps({ companySubtab: "leadStages" })} />);
    // El panel pipeline (leadStages) NO debe estar dentro de un contenedor .hidden.
    expect(screen.getByTestId("pipeline-panel").closest(".hidden")).toBeNull();
    // Users y settings sí.
    expect(screen.getByTestId("users-panel").closest(".hidden")).not.toBeNull();
    expect(screen.getByTestId("settings-panel").closest(".hidden")).not.toBeNull();
  });

  it("cabecera de admin dice «Mi Empresa» y muestra el selector de subtab", () => {
    render(<AdminCompanyContent {...makeProps()} />);
    expect(screen.getByText("Mi Empresa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Equipo y accesos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pipeline de ventas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Configuración/i })).toBeInTheDocument();
  });

  it("el líder de grupo ve título de pipeline y SIN selector de subtab", () => {
    render(<AdminCompanyContent {...makeProps({ isAdmin: false, isGroupLeader: true })} />);
    expect(screen.getByText("Pipeline de ventas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Equipo y accesos/i })).not.toBeInTheDocument();
  });

  it("hacer clic en un subtab llama goTab('company', id)", async () => {
    const goTab = vi.fn();
    render(<AdminCompanyContent {...makeProps({ goTab })} />);
    await userEvent.click(screen.getByRole("button", { name: /Pipeline de ventas/i }));
    expect(goTab).toHaveBeenCalledWith("company", "leadStages");
  });
});
