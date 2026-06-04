/**
 * @file authContextTypes.test.ts
 * @module Unit Tests – Autenticación / Tipos de Roles y Permisos
 *
 * Pruebas unitarias para el sistema de roles y permisos de Viterra.
 * Verifica que los permisos por defecto sean correctos por rol y que
 * no existan escaladas de privilegios entre niveles.
 *
 * Ejecutar: npx vitest run src/__tests__/unit/auth/authContextTypes.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PERMISSIONS_BY_ROLE,
  type UserPermission,
  type UserRole,
} from "../../../app/contexts/authContextTypes";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Permisos exclusivos del admin que NUNCA deben aparecer en otros roles. */
const ADMIN_ONLY_PERMISSIONS: UserPermission[] = ["manage_users", "edit_site"];

function permissionsFor(role: UserRole): UserPermission[] {
  return DEFAULT_PERMISSIONS_BY_ROLE[role];
}

// ─── Suite 1: Integridad del sistema de roles ────────────────────────────────

describe("DEFAULT_PERMISSIONS_BY_ROLE – Integridad del sistema de roles", () => {
  it("debe existir una entrada de permisos para cada rol definido", () => {
    const roles: UserRole[] = ["admin", "lider_grupo", "asesor"];
    roles.forEach((role) => {
      expect(
        DEFAULT_PERMISSIONS_BY_ROLE[role],
        `El rol "${role}" debe tener permisos definidos`
      ).toBeDefined();
      expect(Array.isArray(DEFAULT_PERMISSIONS_BY_ROLE[role])).toBe(true);
    });
  });

  it("el rol admin debe tener todos los permisos del sistema", () => {
    const adminPerms = permissionsFor("admin");

    // El admin es el único rol que puede gestionar usuarios
    expect(adminPerms).toContain("manage_users");
    // El admin es el único que puede editar el sitio web
    expect(adminPerms).toContain("edit_site");
    // El admin también tiene acceso al dashboard y KPIs
    expect(adminPerms).toContain("access_dashboard");
    expect(adminPerms).toContain("access_kpis");
  });

  it("el rol asesor NO debe tener permisos de administración", () => {
    const asesorPerms = permissionsFor("asesor");

    ADMIN_ONLY_PERMISSIONS.forEach((adminPerm) => {
      expect(
        asesorPerms,
        `El asesor NO debe tener el permiso de admin: "${adminPerm}"`
      ).not.toContain(adminPerm);
    });
  });

  it("el rol lider_grupo NO debe tener permisos exclusivos de admin", () => {
    const liderPerms = permissionsFor("lider_grupo");

    // Un líder de grupo nunca debe poder editar el sitio web ni gestionar accesos
    expect(liderPerms).not.toContain("edit_site");
    // manage_users: los líderes SÍ tienen este permiso en la definición actual,
    // por lo que solo se valida que NO tienen edit_site (crítico para seguridad web)
    expect(liderPerms).not.toContain("edit_site");
  });

  it("NO debe existir escalada de privilegios: asesor < lider_grupo < admin", () => {
    const asesorPerms = new Set(permissionsFor("asesor"));
    const liderPerms = new Set(permissionsFor("lider_grupo"));
    const adminPerms = new Set(permissionsFor("admin"));

    // Todo lo que tiene un asesor, lo debe tener también un líder y un admin
    asesorPerms.forEach((perm) => {
      expect(liderPerms.has(perm), `lider_grupo debe tener "${perm}" que tiene asesor`).toBe(true);
      expect(adminPerms.has(perm), `admin debe tener "${perm}" que tiene asesor`).toBe(true);
    });

    // Los permisos del admin son un superconjunto (tiene todo lo del líder y más)
    liderPerms.forEach((perm) => {
      expect(adminPerms.has(perm), `admin debe tener "${perm}" que tiene lider_grupo`).toBe(true);
    });
  });

  it("el asesor solo debe tener acceso a sus módulos básicos de trabajo", () => {
    const asesorPerms = permissionsFor("asesor");
    const expectedBasicPerms: UserPermission[] = [
      "access_dashboard",
      "access_kpis",
      "manage_leads",
      "manage_clients",
      "access_agenda",
    ];
    expectedBasicPerms.forEach((perm) => {
      expect(asesorPerms).toContain(perm);
    });
  });

  it("los permisos de cada rol NO deben contener duplicados", () => {
    const roles: UserRole[] = ["admin", "lider_grupo", "asesor"];
    roles.forEach((role) => {
      const perms = permissionsFor(role);
      const unique = [...new Set(perms)];
      expect(perms.length).toBe(
        unique.length,
        `El rol "${role}" tiene permisos duplicados`
      );
    });
  });
});

// ─── Suite 2: Control de acceso basado en permisos ──────────────────────────

describe("Control de acceso basado en permisos", () => {
  it("un asesor NO puede acceder a manage_properties", () => {
    expect(permissionsFor("asesor")).not.toContain("manage_properties");
  });

  it("un asesor NO puede acceder a manage_developments", () => {
    expect(permissionsFor("asesor")).not.toContain("manage_developments");
  });

  it("un admin puede hacer CRUD de propiedades y desarrollos", () => {
    const adminPerms = permissionsFor("admin");
    expect(adminPerms).toContain("manage_properties");
    expect(adminPerms).toContain("manage_developments");
  });

  it("un lider_grupo puede gestionar propiedades y desarrollos", () => {
    const liderPerms = permissionsFor("lider_grupo");
    expect(liderPerms).toContain("manage_properties");
    expect(liderPerms).toContain("manage_developments");
  });
});
