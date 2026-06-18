import { describe, it, expect } from "vitest";
import { messageForCatalogLeadRpcError } from "../../../app/lib/supabaseLeads";

describe("messageForCatalogLeadRpcError", () => {
  it("traduce rate_limit_exceeded", () => {
    expect(messageForCatalogLeadRpcError("rate_limit_exceeded")).toMatch(/Demasiados intentos/i);
  });

  it("traduce invalid_email", () => {
    expect(messageForCatalogLeadRpcError("invalid_email")).toMatch(/correo/i);
  });
});

describe("RLS helpers (documentación)", () => {
  it("documenta funciones SQL esperadas tras migración 20260618120000", () => {
    const expectedHelpers = [
      "viterra_is_admin",
      "viterra_can_access_lead",
      "viterra_can_manage_inventory",
      "viterra_can_edit_pipeline",
      "viterra_can_read_kpi_scope",
    ];
    expect(expectedHelpers.length).toBeGreaterThan(0);
  });
});
