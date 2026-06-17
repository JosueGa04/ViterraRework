/**
 * @file AdminPropertyStatsCards.test.tsx
 * @module Smoke Tests – AdminPropertyStatsCards (tarjetas resumen del catálogo)
 *
 * Red de seguridad (Fase 4) para la tarjeta presentacional de stats de Propiedades:
 * verifica el render de cada métrica y el formato de moneda del valor promedio.
 *
 * Ejecutar: npx vitest run src/__tests__/unit/admin/AdminPropertyStatsCards.test.tsx
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPropertyStatsCards } from "../../../app/components/admin/AdminPropertyStatsCards";

describe("AdminPropertyStatsCards", () => {
  it("renderiza las cuatro métricas con sus etiquetas y valores", () => {
    render(
      <AdminPropertyStatsCards
        totalProperties={42}
        propertiesForSale={30}
        propertiesForRent={12}
        avgPropertyPrice={1234567.8}
      />,
    );
    expect(screen.getByText("Inventario")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("En venta")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("En alquiler")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    // Valor promedio redondeado y con separadores de miles (es-MX).
    expect(screen.getByText(`$${(1234568).toLocaleString("es-MX")}`)).toBeInTheDocument();
  });

  it("muestra ceros sin romper el formato", () => {
    render(
      <AdminPropertyStatsCards
        totalProperties={0}
        propertiesForSale={0}
        propertiesForRent={0}
        avgPropertyPrice={0}
      />,
    );
    // Tres tarjetas con "0" + ninguna excepción al formatear $0.
    expect(screen.getAllByText("0").length).toBe(3);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });
});
