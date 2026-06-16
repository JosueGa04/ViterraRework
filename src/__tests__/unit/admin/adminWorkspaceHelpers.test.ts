/**
 * @file adminWorkspaceHelpers.test.ts
 * Tests de los helpers puros extraídos de AdminWorkspace (Fase 1 de la descomposición).
 */
import { describe, it, expect } from "vitest";
import {
  dashboardTimeGreetingEs,
  leadAssignedToCrmUser,
  teamMemberMatchesFoldedQuery,
  teamMemberNameMatchesFoldedQuery,
} from "../../../app/pages/admin/adminWorkspaceHelpers";
import type { Lead } from "../../../app/data/leads";
import type { User } from "../../../app/contexts/AuthContext";

function makeUser(over: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "ana.lopez@viterra.com",
    name: "Ana López",
    role: "asesor",
    permissions: [],
    profile: { phone: "", address: "", birthDate: "", workHistory: [], picture: "" },
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    history: [],
    ...over,
  } as User;
}

function makeLead(over: Partial<Lead> = {}): Lead {
  return {
    id: "l1",
    name: "Cliente",
    email: "",
    phone: "",
    interest: "compra",
    propertyType: "",
    budget: 0,
    location: "",
    status: "nuevo",
    priorityStars: 3,
    source: "",
    assignedTo: "",
    assignedToUserId: "",
    lastContact: "2024-01-01",
    ...over,
  } as Lead;
}

describe("dashboardTimeGreetingEs", () => {
  it("saluda según la hora", () => {
    expect(dashboardTimeGreetingEs(new Date("2024-01-01T08:00:00"))).toBe("Buenos días");
    expect(dashboardTimeGreetingEs(new Date("2024-01-01T15:00:00"))).toBe("Buenas tardes");
    expect(dashboardTimeGreetingEs(new Date("2024-01-01T23:00:00"))).toBe("Buenas noches");
    expect(dashboardTimeGreetingEs(new Date("2024-01-01T05:00:00"))).toBe("Buenas noches");
  });
});

describe("leadAssignedToCrmUser", () => {
  it("coincide por id de Auth (case/space-insensitive)", () => {
    const u = makeUser({ id: "ABC-123" });
    expect(leadAssignedToCrmUser(makeLead({ assignedToUserId: " abc-123 " }), u)).toBe(true);
  });

  it("coincide por nombre mostrado cuando no hay id", () => {
    const u = makeUser({ id: "u1", name: "Ana López" });
    expect(leadAssignedToCrmUser(makeLead({ assignedTo: "Ana Lopez" }), u)).toBe(true);
  });

  it("no coincide con otro asesor", () => {
    const u = makeUser({ id: "u1", name: "Ana López" });
    expect(
      leadAssignedToCrmUser(makeLead({ assignedToUserId: "u2", assignedTo: "Carlos Ruiz" }), u),
    ).toBe(false);
  });
});

describe("teamMemberMatchesFoldedQuery", () => {
  it("encuentra por nombre o correo (sin acentos)", () => {
    const u = makeUser({ name: "Ana López", email: "ana.lopez@viterra.com" });
    expect(teamMemberMatchesFoldedQuery(u, "lopez")).toBe(true);
    expect(teamMemberMatchesFoldedQuery(u, "ana.lopez")).toBe(true);
  });

  it("excluye admins, inactivos y query vacío", () => {
    expect(teamMemberMatchesFoldedQuery(makeUser({ role: "admin" }), "ana")).toBe(false);
    expect(teamMemberMatchesFoldedQuery(makeUser({ isActive: false }), "ana")).toBe(false);
    expect(teamMemberMatchesFoldedQuery(makeUser(), "")).toBe(false);
  });
});

describe("teamMemberNameMatchesFoldedQuery", () => {
  it("solo busca por nombre, no por correo", () => {
    const u = makeUser({ name: "Ana López", email: "ana.lopez@viterra.com" });
    expect(teamMemberNameMatchesFoldedQuery(u, "lopez")).toBe(true);
    expect(teamMemberNameMatchesFoldedQuery(u, "viterra")).toBe(false);
  });
});
