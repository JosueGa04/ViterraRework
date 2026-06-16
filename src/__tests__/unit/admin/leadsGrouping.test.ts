/**
 * @file leadsGrouping.test.ts
 * Tests de computeLeadStatusesForRendering y groupLeadsByStatus.
 */
import { describe, it, expect } from "vitest";
import {
  computeLeadStatusesForRendering,
  filterLeadsByActiveGroup,
  groupLeadsByStatus,
} from "../../../app/pages/admin/leadsGrouping";
import type { Lead } from "../../../app/data/leads";

function makeLead(id: string, status: string, pipelineGroupId = "__default__"): Lead {
  return {
    id,
    name: id,
    email: "",
    phone: "",
    interest: "compra",
    propertyType: "",
    budget: 0,
    location: "",
    status,
    priorityStars: 3,
    source: "",
    assignedTo: "",
    assignedToUserId: "",
    pipelineGroupId,
    lastContact: "2024-01-01",
  } as Lead;
}

const label = (id: string) => `L:${id}`;

describe("computeLeadStatusesForRendering", () => {
  it("devuelve las columnas configuradas tal cual si los leads no traen estados extra", () => {
    const leads = [makeLead("a", "nuevo"), makeLead("b", "cerrado")];
    expect(computeLeadStatusesForRendering(["nuevo", "cerrado"], leads)).toEqual(["nuevo", "cerrado"]);
  });

  it("agrega estados extra presentes en leads (dedup + ordenados) al final", () => {
    const leads = [makeLead("a", "nuevo"), makeLead("b", "zeta"), makeLead("c", "alfa"), makeLead("d", "zeta")];
    expect(computeLeadStatusesForRendering(["nuevo"], leads)).toEqual(["nuevo", "alfa", "zeta"]);
  });

  it("ignora estados vacíos", () => {
    const leads = [makeLead("a", ""), makeLead("b", "extra")];
    expect(computeLeadStatusesForRendering(["nuevo"], leads)).toEqual(["nuevo", "extra"]);
  });
});

describe("groupLeadsByStatus", () => {
  it("agrupa por estado en el orden dado y omite secciones vacías", () => {
    const leads = [makeLead("a", "nuevo"), makeLead("b", "cerrado"), makeLead("c", "nuevo")];
    const sections = groupLeadsByStatus(leads, ["nuevo", "perdido", "cerrado"], label);
    expect(sections.map((s) => s.statusId)).toEqual(["nuevo", "cerrado"]); // "perdido" vacío se omite
    expect(sections[0].leads.map((l) => l.id)).toEqual(["a", "c"]);
    expect(sections[0].label).toBe("L:nuevo");
  });

  it("devuelve vacío si no hay leads", () => {
    expect(groupLeadsByStatus([], ["nuevo"], label)).toEqual([]);
  });
});

describe("filterLeadsByActiveGroup", () => {
  const DEF = "__default__";
  const leads = [
    makeLead("a", "nuevo", "g1"),
    makeLead("b", "nuevo", "g2"),
    makeLead("c", "nuevo", "g3"),
  ];

  it("'General' (default) agrega solo los grupos permitidos", () => {
    const out = filterLeadsByActiveGroup(leads, DEF, ["g1", "g2"], DEF);
    expect(out.map((l) => l.id)).toEqual(["a", "b"]); // g3 no permitido
  });

  it("un grupo concreto devuelve solo sus leads", () => {
    const out = filterLeadsByActiveGroup(leads, "g3", ["g1", "g2", "g3"], DEF);
    expect(out.map((l) => l.id)).toEqual(["c"]);
  });
});
