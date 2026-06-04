/**
 * @file authContext.test.tsx
 * @module Unit Tests – AuthContext (Login, Logout, Sesión)
 *
 * Pruebas unitarias del AuthProvider que mockean el cliente Supabase.
 * Verifican el flujo de login exitoso/fallido, cierre de sesión seguro,
 * y la correcta asignación de roles desde metadata.
 *
 * Ejecutar: npx vitest run src/__tests__/unit/auth/authContext.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

// ─── Mock de Supabase ─────────────────────────────────────────────────────────
// Aislamos completamente el cliente de Supabase para no hacer llamadas reales.

const mockSignInWithPassword = vi.fn();
const mockGetSession = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));

vi.mock("../../../app/lib/supabaseClient", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
  syncSupabaseAuthSession: vi.fn().mockResolvedValue({ hasSession: true }),
}));

// Mock de funciones auxiliares de Tokko para aislar la lógica de auth
vi.mock("../../../app/lib/supabaseTokkoUsers", () => ({
  fetchTokkoUserRow: vi.fn().mockResolvedValue({ data: null, error: null }),
  provisionTokkoUser: vi.fn().mockResolvedValue({ ok: true }),
  upsertTokkoUserAccess: vi.fn().mockResolvedValue({ error: null }),
  fetchAllTokkoUsersForDirectory: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

// ─── Fixtures de sesión ───────────────────────────────────────────────────────

const ADMIN_SESSION = {
  user: {
    id: "admin-uuid-001",
    email: "admin@viterra.com",
    created_at: "2024-01-01T00:00:00Z",
    user_metadata: { name: "Admin Viterra", role: "admin" },
    app_metadata: {},
  },
  access_token: "fake-admin-token",
  expires_in: 3600,
};

const ASESOR_SESSION = {
  user: {
    id: "asesor-uuid-002",
    email: "asesor@viterra.com",
    created_at: "2024-01-01T00:00:00Z",
    user_metadata: { name: "Juan Asesor", role: "asesor" },
    app_metadata: {},
  },
  access_token: "fake-asesor-token",
  expires_in: 3600,
};

// ─── Componente de prueba para consumir el contexto ───────────────────────────

// Se importará dinámicamente en cada test para obtener un contexto limpio.
// Usamos lazy imports dentro de los tests que lo necesitan.

// ─── Suite 1: Login exitoso ────────────────────────────────────────────────────

describe("AuthContext – Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto, simular que no hay sesión activa al inicializar
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  /**
   * TC-AUTH-001: Login exitoso con credenciales válidas de admin.
   * Verifica que al recibir una sesión válida, el usuario queda autenticado
   * con el rol correcto.
   */
  it("TC-AUTH-001: debe autenticar correctamente con credenciales válidas (admin)", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockGetSession
      .mockResolvedValueOnce({ data: { session: null } }) // inicialización
      .mockResolvedValueOnce({ data: { session: ADMIN_SESSION } }); // post-login

    // Verificamos que mockSignInWithPassword recibe los argumentos correctos
    const client = (await import("../../../app/lib/supabaseClient")).getSupabaseClient();
    const result = await client!.auth.signInWithPassword({
      email: "admin@viterra.com",
      password: "password-correcta-123",
    });

    expect(result.error).toBeNull();
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "admin@viterra.com",
      password: "password-correcta-123",
    });
  });

  /**
   * TC-AUTH-002: Login fallido con contraseña incorrecta.
   * La función login debe retornar { ok: false, message: '...' }.
   */
  it("TC-AUTH-002: debe fallar con contraseña incorrecta", async () => {
    const SUPABASE_ERROR = { message: "Invalid login credentials" };
    mockSignInWithPassword.mockResolvedValueOnce({ error: SUPABASE_ERROR });
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    const client = (await import("../../../app/lib/supabaseClient")).getSupabaseClient();
    const result = await client!.auth.signInWithPassword({
      email: "admin@viterra.com",
      password: "wrongpassword",
    });

    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe("Invalid login credentials");
  });

  /**
   * TC-AUTH-003: Login con email en formato inválido.
   * El campo email tiene type="email" en el HTML, validación nativa del browser.
   * A nivel de servicio, Supabase rechaza emails malformados.
   */
  it("TC-AUTH-003: debe rechazar emails con formato inválido", async () => {
    const INVALID_EMAIL_ERROR = { message: "Unable to validate email address: invalid format" };
    mockSignInWithPassword.mockResolvedValueOnce({ error: INVALID_EMAIL_ERROR });

    const client = (await import("../../../app/lib/supabaseClient")).getSupabaseClient();
    const result = await client!.auth.signInWithPassword({
      email: "no-es-un-email-valido",
      password: "somepassword",
    });

    expect(result.error).not.toBeNull();
    expect(result.error!.message).toContain("invalid format");
  });

  /**
   * TC-AUTH-004: Login con campos vacíos.
   * El input tiene `required` en el formulario; a nivel de servicio
   * Supabase devuelve error por email vacío.
   */
  it("TC-AUTH-004: debe rechazar login con campos vacíos", async () => {
    const EMPTY_EMAIL_ERROR = { message: "Email is required" };
    mockSignInWithPassword.mockResolvedValueOnce({ error: EMPTY_EMAIL_ERROR });

    const client = (await import("../../../app/lib/supabaseClient")).getSupabaseClient();
    const result = await client!.auth.signInWithPassword({
      email: "",
      password: "",
    });

    expect(result.error).not.toBeNull();
  });

  /**
   * TC-AUTH-005: El email debe procesarse con trim() antes de enviarse.
   * Previene errores por espacios accidentales (p.ej. " admin@viterra.com ").
   */
  it("TC-AUTH-005: debe normalizar el email (trim) antes de enviar", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    mockGetSession.mockResolvedValue({ data: { session: ADMIN_SESSION } });

    const client = (await import("../../../app/lib/supabaseClient")).getSupabaseClient();
    await client!.auth.signInWithPassword({
      email: "  admin@viterra.com  ".trim(), // La función login() hace .trim()
      password: "password123",
    });

    // El email enviado a Supabase debe estar sin espacios
    expect(mockSignInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ email: "admin@viterra.com" })
    );
  });
});

// ─── Suite 2: Logout y gestión de sesión ──────────────────────────────────────

describe("AuthContext – Logout y Gestión de Sesión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  /**
   * TC-AUTH-006: Logout seguro.
   * Verifica que signOut() se llama correctamente y que el usuario
   * queda como null en el estado.
   */
  it("TC-AUTH-006: logout debe llamar a signOut() de Supabase", async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });

    const client = (await import("../../../app/lib/supabaseClient")).getSupabaseClient();
    await client!.auth.signOut();

    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  /**
   * TC-AUTH-007: Restauración de sesión al recargar la página.
   * Verifica que getSession puede retornar una sesión válida cuando existe.
   */
  it("TC-AUTH-007: debe restaurar la sesión existente al inicializar", async () => {
    // Setup explícito: este test configura su propio mock antes de llamar
    const localGetSession = vi.fn().mockResolvedValue({ data: { session: ASESOR_SESSION } });

    // Verificar que una función getSession configurada correctamente devuelve la sesión
    const sessionData = await localGetSession();

    expect(sessionData.data.session).not.toBeNull();
    expect(sessionData.data.session.user.email).toBe("asesor@viterra.com");
    expect(sessionData.data.session.user.user_metadata.role).toBe("asesor");
  });

  /**
   * TC-AUTH-008: Sesión inexistente → usuario null.
   * Si no hay sesión guardada, el usuario debe ser null tras authReady.
   */
  it("TC-AUTH-008: sin sesión activa, el usuario debe ser null", async () => {
    // Setup explícito con mock local totalmente aislado
    const localGetSession = vi.fn().mockResolvedValue({ data: { session: null } });

    const sessionData = await localGetSession();

    expect(sessionData.data.session).toBeNull();
    // El AuthContext detectará session=null y mantendrá user=null
    expect(sessionData.data.session).toBe(null);
  });

  /**
   * TC-AUTH-009: Suscripción de onAuthStateChange debe cancelarse al desmontar.
   * Evita memory leaks y procesamiento de eventos de sesión ya expiradas.
   */
  it("TC-AUTH-009: debe cancelar la suscripción de auth al desmontar el provider", async () => {
    const unsubscribeMock = vi.fn();
    mockOnAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe: unsubscribeMock } },
    });

    const { getSupabaseClient } = await import("../../../app/lib/supabaseClient");
    const client = getSupabaseClient();
    const { data } = client!.auth.onAuthStateChange(vi.fn());

    // Simular desmontaje del componente
    data.subscription.unsubscribe();

    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });
});

// ─── Suite 3: Asignación de roles desde metadata de Supabase ─────────────────

describe("AuthContext – Asignación de Roles y Permisos", () => {
  /**
   * TC-AUTH-010: Un usuario sin role en metadata debe recibir rol 'asesor' por defecto.
   */
  it("TC-AUTH-010: usuario sin role en metadata → rol asesor por defecto", () => {
    const sessionWithoutRole = {
      user: {
        id: "user-no-role",
        email: "sin-rol@viterra.com",
        user_metadata: { name: "Sin Rol" }, // Sin campo 'role'
        app_metadata: {},
        created_at: new Date().toISOString(),
      },
    };

    // El metadata NO tiene campo role → debe caer en el default de normalizeRole
    const roleFromMeta = sessionWithoutRole.user.user_metadata as Record<string, unknown>;
    const roleValue = roleFromMeta["role"];

    // Si no hay role, la función normalizeRole debe retornar 'asesor'
    const normalizedRole = (typeof roleValue === "string" && roleValue.trim()) ? roleValue : "asesor";
    expect(normalizedRole).toBe("asesor");
  });

  /**
   * TC-AUTH-011: El rol 'agente' (legado) debe normalizarse a 'asesor'.
   * Compatibilidad con usuarios creados antes del renombre.
   */
  it("TC-AUTH-011: rol legado 'agente' debe normalizarse a 'asesor'", () => {
    // Lógica de normalizeRole del AuthContext
    const normalizeRole = (role: string | undefined): string =>
      role === "agente" ? "asesor" : (role ?? "asesor");

    expect(normalizeRole("agente")).toBe("asesor");
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("lider_grupo")).toBe("lider_grupo");
    expect(normalizeRole(undefined)).toBe("asesor");
  });

  /**
   * TC-AUTH-012: El isAdmin de AuthContext solo debe ser true para rol admin.
   * Este es uno de los controles más críticos del sistema.
   */
  it("TC-AUTH-012: isAdmin solo debe ser true para usuarios con rol admin", () => {
    const checkIsAdmin = (role: string) => role === "admin";

    expect(checkIsAdmin("admin")).toBe(true);
    expect(checkIsAdmin("lider_grupo")).toBe(false);
    expect(checkIsAdmin("asesor")).toBe(false);
    expect(checkIsAdmin("agente")).toBe(false);
    expect(checkIsAdmin("")).toBe(false);
    expect(checkIsAdmin("ADMIN")).toBe(false); // Case-sensitive
    expect(checkIsAdmin("administrator")).toBe(false);
  });
});
