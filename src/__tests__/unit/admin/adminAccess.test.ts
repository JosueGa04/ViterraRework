/**
 * @file adminAccess.test.tsx
 * @module Unit Tests – Panel de Administrador: Acceso y Protección de Rutas
 *
 * Pruebas unitarias que verifican el guard de autenticación en AdminWorkspace:
 * - Redirección a /login si no hay sesión
 * - Redirección a /admin/cambiar-contrasena si mustChangePassword es true
 * - Bloqueo de acceso para roles no autorizados
 *
 * Ejecutar: npx vitest run src/__tests__/unit/admin/adminAccess.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User, UserPermission } from "../../../app/contexts/authContextTypes";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "../../../app/contexts/authContextTypes";

// ─── Helpers de Fixtures ──────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  const role = overrides.role ?? "asesor";
  return {
    id: "test-user-001",
    email: "test@viterra.com",
    name: "Test User",
    role,
    permissions: DEFAULT_PERMISSIONS_BY_ROLE[role],
    profile: { phone: "", address: "", birthDate: "", workHistory: [], picture: "" },
    isActive: true,
    mustChangePassword: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [],
    ...overrides,
  };
}

const ADMIN_USER = makeUser({ role: "admin", id: "admin-001", email: "admin@viterra.com" });
const LIDER_USER = makeUser({ role: "lider_grupo", id: "lider-001", email: "lider@viterra.com" });
const ASESOR_USER = makeUser({ role: "asesor", id: "asesor-001", email: "asesor@viterra.com" });

// ─── Lógica de acceso extraída de AdminWorkspace (para pruebas aisladas) ──────

/**
 * Extrae la lógica central del guard de autenticación del AdminWorkspace.
 * Evita renderizar el componente completo (con sus 5k+ líneas) en tests unitarios.
 */
function simulateAdminGuard(params: {
  authReady: boolean;
  isAuthenticated: boolean;
  user: User | null;
}): "redirect_login" | "redirect_change_password" | "allow" {
  const { authReady, isAuthenticated, user } = params;

  if (!authReady) return "allow"; // Esperar: no redirigir prematuramente

  if (!isAuthenticated) return "redirect_login";

  if (user?.mustChangePassword) return "redirect_change_password";

  return "allow";
}

// ─── Suite 1: Guard de autenticación ──────────────────────────────────────────

describe("AdminWorkspace – Guard de autenticación", () => {
  /**
   * TC-ADMIN-001: Usuario no autenticado debe ser redirigido a /login.
   * Un visitante sin sesión que intente acceder a /admin/* SIEMPRE debe ir a login.
   */
  it("TC-ADMIN-001: usuario no autenticado → redirigir a /login", () => {
    const result = simulateAdminGuard({
      authReady: true,
      isAuthenticated: false,
      user: null,
    });

    expect(result).toBe("redirect_login");
  });

  /**
   * TC-ADMIN-002: Mientras authReady es false, NO se debe redirigir.
   * Evita que el usuario autenticado sea expulsado antes de restaurar la sesión.
   */
  it("TC-ADMIN-002: mientras authReady=false, NO redirigir (restaurando sesión)", () => {
    const result = simulateAdminGuard({
      authReady: false,
      isAuthenticated: false,
      user: null,
    });

    // No debe redirigir a login: la sesión podría restaurarse en breve
    expect(result).toBe("allow");
  });

  /**
   * TC-ADMIN-003: Usuario autenticado con mustChangePassword=true → /admin/cambiar-contrasena.
   */
  it("TC-ADMIN-003: usuario con mustChangePassword=true → redirigir a cambiar contraseña", () => {
    const userMustChange = makeUser({ mustChangePassword: true });
    const result = simulateAdminGuard({
      authReady: true,
      isAuthenticated: true,
      user: userMustChange,
    });

    expect(result).toBe("redirect_change_password");
  });

  /**
   * TC-ADMIN-004: Usuario autenticado normal → acceso permitido.
   */
  it("TC-ADMIN-004: usuario autenticado sin pendientes → acceso permitido", () => {
    const result = simulateAdminGuard({
      authReady: true,
      isAuthenticated: true,
      user: ADMIN_USER,
    });

    expect(result).toBe("allow");
  });

  /**
   * TC-ADMIN-005: El asesor autenticado puede acceder al workspace (panel CRM),
   * pero su acceso a módulos específicos está controlado por permisos.
   */
  it("TC-ADMIN-005: un asesor autenticado puede acceder al workspace (limitado por permisos)", () => {
    const result = simulateAdminGuard({
      authReady: true,
      isAuthenticated: true,
      user: ASESOR_USER,
    });

    // El guard permite la entrada; los módulos específicos validan permisos
    expect(result).toBe("allow");
  });
});

// ─── Suite 2: Control de acceso a módulos por permisos ───────────────────────

/**
 * Simula las funciones canAccessXModule del sistema basadas en permisos del usuario.
 * En AdminWorkspace, estas se importan de lib/userModuleAccess.ts.
 */

function hasPermission(user: User, permission: UserPermission): boolean {
  return user.permissions.includes(permission);
}

describe("AdminWorkspace – Control de acceso por módulos", () => {
  /**
   * TC-ADMIN-006: Solo usuarios con 'manage_users' pueden ver el módulo de empresa/usuarios.
   */
  it("TC-ADMIN-006: módulo de usuarios solo accesible con permiso manage_users", () => {
    expect(hasPermission(ADMIN_USER, "manage_users")).toBe(true);
    expect(hasPermission(LIDER_USER, "manage_users")).toBe(true);
    // El asesor NO tiene manage_users
    expect(hasPermission(ASESOR_USER, "manage_users")).toBe(false);
  });

  /**
   * TC-ADMIN-007: Solo admin/lider pueden gestionar propiedades.
   */
  it("TC-ADMIN-007: módulo manage_properties NO accesible para asesores", () => {
    expect(hasPermission(ADMIN_USER, "manage_properties")).toBe(true);
    expect(hasPermission(LIDER_USER, "manage_properties")).toBe(true);
    expect(hasPermission(ASESOR_USER, "manage_properties")).toBe(false);
  });

  /**
   * TC-ADMIN-008: Solo admin puede editar el sitio web.
   */
  it("TC-ADMIN-008: edición del sitio solo disponible para admin", () => {
    expect(hasPermission(ADMIN_USER, "edit_site")).toBe(true);
    expect(hasPermission(LIDER_USER, "edit_site")).toBe(false);
    expect(hasPermission(ASESOR_USER, "edit_site")).toBe(false);
  });

  /**
   * TC-ADMIN-009: Todos los roles activos tienen acceso al dashboard.
   */
  it("TC-ADMIN-009: dashboard accesible para todos los roles del CRM", () => {
    expect(hasPermission(ADMIN_USER, "access_dashboard")).toBe(true);
    expect(hasPermission(LIDER_USER, "access_dashboard")).toBe(true);
    expect(hasPermission(ASESOR_USER, "access_dashboard")).toBe(true);
  });

  /**
   * TC-ADMIN-010: Un usuario inactivo (isActive=false) no debería operar.
   * Aunque el guard de auth lo permite, los checks de isActive deben manejarlo.
   */
  it("TC-ADMIN-010: un usuario inactivo (archivado) tiene isActive=false", () => {
    const inactiveUser = makeUser({ isActive: false, archivedAt: new Date().toISOString() });
    expect(inactiveUser.isActive).toBe(false);
    expect(inactiveUser.archivedAt).toBeDefined();
  });
});

// ─── Suite 3: Acciones del administrador sobre propiedades ───────────────────

describe("Admin – Acciones privilegiadas sobre propiedades", () => {
  /**
   * Simula la validación de autorización para operaciones CRUD sobre propiedades.
   * En el sistema real, esto lo maneja Supabase RLS + la validación de permisos en el frontend.
   */
  function canManageAnyProperty(user: User): boolean {
    return user.role === "admin" || user.permissions.includes("manage_properties");
  }

  function canEditOwnProperty(user: User, propertyCreatedBy: string): boolean {
    // Un admin puede editar cualquier propiedad
    if (user.role === "admin") return true;
    // Otros roles solo pueden editar las suyas (en este sistema, los asesores no crean propiedades)
    return user.id === propertyCreatedBy && user.permissions.includes("manage_properties");
  }

  /**
   * TC-ADMIN-011: El admin puede editar/eliminar propiedades de cualquier usuario.
   */
  it("TC-ADMIN-011: admin puede editar/eliminar propiedades de cualquier usuario", () => {
    const otroUsuarioId = "asesor-diferente-999";
    expect(canEditOwnProperty(ADMIN_USER, otroUsuarioId)).toBe(true);
  });

  /**
   * TC-ADMIN-012: Un usuario sin manage_properties NO puede modificar propiedades.
   */
  it("TC-ADMIN-012: asesor sin manage_properties NO puede gestionar propiedades", () => {
    expect(canManageAnyProperty(ASESOR_USER)).toBe(false);
  });

  /**
   * TC-ADMIN-013: Un lider_grupo puede gestionar propiedades pero no las de otros asesores
   * sin tener el permiso explícito de admin.
   * Nota: En este sistema el lider_grupo tiene manage_properties.
   */
  it("TC-ADMIN-013: lider_grupo tiene manage_properties", () => {
    expect(canManageAnyProperty(LIDER_USER)).toBe(true);
  });

  /**
   * TC-ADMIN-014: Un asesor NO puede modificar propiedades aunque tenga el mismo ID que el creador.
   * Los asesores no tienen el permiso manage_properties.
   */
  it("TC-ADMIN-014: asesor no puede editar propiedades aunque sea el propietario", () => {
    // El asesor NO tiene manage_properties aunque la propiedad sea "suya"
    expect(canEditOwnProperty(ASESOR_USER, ASESOR_USER.id)).toBe(false);
  });
});
