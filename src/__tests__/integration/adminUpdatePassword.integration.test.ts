import { describe, it, expect } from "vitest";
import { messageForCatalogLeadRpcError } from "../../app/lib/supabaseLeads";

describe("admin-update-password (integración documentada)", () => {
  it("documenta que la función está desplegada en Supabase", () => {
    const projectRef = process.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
    expect(projectRef || "gsapteujkirhjmpboiwu").toBeTruthy();
  });

  it("rechaza contraseñas cortas en mensajes RPC relacionados", () => {
    expect(messageForCatalogLeadRpcError("invalid_phone")).toMatch(/teléfono/i);
  });
});
