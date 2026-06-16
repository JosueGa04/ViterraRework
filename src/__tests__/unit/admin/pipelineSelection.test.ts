/**
 * @file pipelineSelection.test.ts
 * Tests de computeVisiblePipelineGroupIds y resolveActivePipeline.
 */
import { describe, it, expect } from "vitest";
import {
  computeVisiblePipelineGroupIds,
  resolveActivePipeline,
} from "../../../app/pages/admin/pipelineSelection";
import {
  createDefaultBuiltinPipelineSnapshot,
  DEFAULT_PIPELINE_GROUP_ID,
  type GroupPipelineSnapshot,
} from "../../../app/lib/pipelineByGroup";
import type { User } from "../../../app/contexts/AuthContext";

function makeUser(role: User["role"] = "asesor"): User {
  return {
    id: "u1",
    email: "u@viterra.com",
    name: "U",
    role,
    permissions: [],
    profile: { phone: "", address: "", birthDate: "", workHistory: [], picture: "" },
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    history: [],
  } as User;
}

const DEF = DEFAULT_PIPELINE_GROUP_ID;

describe("computeVisiblePipelineGroupIds", () => {
  it("sin usuario devuelve solo el grupo General", () => {
    expect(
      computeVisiblePipelineGroupIds({
        user: null,
        isRealAdmin: false,
        adminViewAs: "admin",
        isGroupLeader: false,
        userGroups: [],
        allowedPipelineGroupIds: ["g1"],
      }),
    ).toEqual([DEF]);
  });

  it("para un líder oculta el grupo General", () => {
    const out = computeVisiblePipelineGroupIds({
      user: makeUser("lider_grupo"),
      isRealAdmin: false,
      adminViewAs: "admin",
      isGroupLeader: true,
      userGroups: [],
      allowedPipelineGroupIds: [DEF, "g1", "g2"],
    });
    expect(out).toEqual(["g1", "g2"]);
  });

  it("para un asesor devuelve los grupos permitidos tal cual", () => {
    const out = computeVisiblePipelineGroupIds({
      user: makeUser("asesor"),
      isRealAdmin: false,
      adminViewAs: "admin",
      isGroupLeader: false,
      userGroups: [],
      allowedPipelineGroupIds: [DEF, "g1"],
    });
    expect(out).toEqual([DEF, "g1"]);
  });
});

describe("resolveActivePipeline", () => {
  it("devuelve el snapshot existente del grupo activo", () => {
    const snap = createDefaultBuiltinPipelineSnapshot();
    const map: Record<string, GroupPipelineSnapshot> = { g1: snap };
    expect(resolveActivePipeline(map, "g1")).toBe(snap);
  });

  it("para 'General' sin snapshot devuelve el builtin por defecto", () => {
    const out = resolveActivePipeline({}, DEF);
    expect(out.stageOrder.length).toBeGreaterThan(0);
  });

  it("para un grupo sin snapshot clona el de 'General' si existe", () => {
    const general = createDefaultBuiltinPipelineSnapshot();
    const out = resolveActivePipeline({ [DEF]: general }, "g9");
    expect(out).not.toBe(general); // es un clon
    expect(out.stageOrder).toEqual(general.stageOrder);
  });
});
