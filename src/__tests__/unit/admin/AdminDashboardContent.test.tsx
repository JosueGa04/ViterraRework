/**
 * @file AdminDashboardContent.test.tsx
 * @module Smoke Tests – AdminDashboardContent (router de panel por rol)
 *
 * Red de seguridad (Fase 4) para el contenedor de la pestaña Dashboard: verifica que en
 * estado de carga elige el skeleton correcto según el rol (asesor/líder → resumen de
 * pipeline; admin → panel completo). El render de los paneles reales (con gráficas) se
 * cubre en sus propios módulos.
 *
 * Ejecutar: npx vitest run src/__tests__/unit/admin/AdminDashboardContent.test.tsx
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminDashboardContent } from "../../../app/components/admin/AdminDashboardContent";

type DashProps = Parameters<typeof AdminDashboardContent>[0];

function makeProps(overrides: Partial<DashProps> = {}): DashProps {
  return {
    loading: true,
    isAdvisor: false,
    isGroupLeader: false,
    leadsForUser: [],
    leadsInActivePipeline: [],
    properties: [],
    appointments: [],
    users: [],
    customStages: [],
    onNavigate: vi.fn(),
    onNewLead: vi.fn(),
    onOpenUsers: vi.fn(),
    ...overrides,
  };
}

describe("AdminDashboardContent (estado de carga)", () => {
  it("asesor en carga muestra el skeleton de resumen de pipeline", () => {
    render(<AdminDashboardContent {...makeProps({ loading: true, isAdvisor: true })} />);
    expect(screen.getByLabelText("Cargando resumen")).toBeInTheDocument();
  });

  it("líder de grupo en carga muestra el skeleton de resumen de pipeline", () => {
    render(<AdminDashboardContent {...makeProps({ loading: true, isGroupLeader: true })} />);
    expect(screen.getByLabelText("Cargando resumen")).toBeInTheDocument();
  });

  it("admin en carga muestra el skeleton de panel completo", () => {
    render(<AdminDashboardContent {...makeProps({ loading: true })} />);
    expect(screen.getByLabelText("Cargando panel")).toBeInTheDocument();
  });
});
