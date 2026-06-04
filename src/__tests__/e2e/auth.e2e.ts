/**
 * @file auth.e2e.ts
 * @module E2E Tests – Autenticación (Playwright)
 *
 * Pruebas End-to-End del flujo completo de autenticación en Viterra.
 * Simula las acciones reales del usuario en el navegador:
 * - Login exitoso y fallido
 * - Redirección al panel de administrador
 * - Protección de rutas /admin/*
 * - Cierre de sesión
 *
 * Prerequisitos:
 *   npx playwright install
 *   npm run dev (en otra terminal)
 *
 * Ejecutar: npx playwright test src/__tests__/e2e/auth.e2e.ts
 */

import { test, expect, type Page } from "@playwright/test";

// ─── Constantes y configuración ───────────────────────────────────────────────

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const LOGIN_URL = `${BASE_URL}/login`;
const ADMIN_DASHBOARD_URL = `${BASE_URL}/admin/dashboard`;

/** Credenciales de prueba — configurar en .env.test */
const TEST_CREDENTIALS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "admin@viterra.com",
    password: process.env.TEST_ADMIN_PASSWORD || "TestAdmin123!",
  },
  asesor: {
    email: process.env.TEST_ASESOR_EMAIL || "asesor@viterra.com",
    password: process.env.TEST_ASESOR_PASSWORD || "TestAsesor123!",
  },
  invalid: {
    email: "noexiste@viterra.com",
    password: "WrongPassword999",
  },
};

// ─── Helpers de navegación ────────────────────────────────────────────────────

async function fillLoginForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
}

async function submitLoginForm(page: Page): Promise<void> {
  await page.locator('button[type="submit"]').click();
}

async function performLogin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto(LOGIN_URL);
  await fillLoginForm(page, email, password);
  await submitLoginForm(page);
}

// ─── Suite 1: Página de Login ─────────────────────────────────────────────────

test.describe("Login Page – Elementos y Accesibilidad", () => {
  /**
   * TC-E2E-AUTH-001: La página de login debe cargar correctamente.
   */
  test("TC-E2E-AUTH-001: la página de login carga con los elementos requeridos", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);

    // Verificar elementos clave del formulario
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verificar el título de la página
    await expect(page).toHaveTitle(/VITERRA|Viterra/i);

    // Verificar la marca corporativa
    await expect(page.getByText("VITERRA")).toBeVisible();
  });

  /**
   * TC-E2E-AUTH-002: El toggle de mostrar/ocultar contraseña debe funcionar.
   */
  test("TC-E2E-AUTH-002: toggle de visibilidad de contraseña funciona correctamente", async ({
    page,
  }) => {
    await page.goto(LOGIN_URL);
    const passwordInput = page.locator("#password");

    // Estado inicial: contraseña oculta
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click en el toggle (botón adyacente al campo de contraseña)
    await page.locator("#password ~ button").click();

    // Estado tras toggle: contraseña visible
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click de nuevo: ocultar
    await page.locator("#password ~ button").click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});

// ─── Suite 2: Login Exitoso ───────────────────────────────────────────────────

test.describe("Login – Casos Exitosos", () => {
  /**
   * TC-E2E-AUTH-003: Login exitoso como admin → redirige a /admin/dashboard.
   * NOTA: Este test requiere credenciales reales de Supabase.
   */
  test("TC-E2E-AUTH-003: login exitoso como admin redirige al dashboard", async ({
    page,
  }) => {
    await performLogin(
      page,
      TEST_CREDENTIALS.admin.email,
      TEST_CREDENTIALS.admin.password
    );

    // Esperar redirección al dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10_000 });

    // Verificar que el dashboard está renderizado
    await expect(page.locator("text=Dashboard").first()).toBeVisible();
  });

  /**
   * TC-E2E-AUTH-004: Después de un login exitoso, el botón de login no debe ser visible.
   */
  test("TC-E2E-AUTH-004: tras login exitoso, la interfaz de admin está visible", async ({
    page,
  }) => {
    await performLogin(
      page,
      TEST_CREDENTIALS.admin.email,
      TEST_CREDENTIALS.admin.password
    );

    await page.waitForURL(/\/admin/);

    // El formulario de login no debe estar presente en el admin
    await expect(page.locator("#email")).not.toBeVisible();
    await expect(page.locator("#password")).not.toBeVisible();
  });
});

// ─── Suite 3: Login Fallido ───────────────────────────────────────────────────

test.describe("Login – Casos Fallidos y Validaciones", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  /**
   * TC-E2E-AUTH-005: Credenciales incorrectas → mensaje de error visible.
   */
  test("TC-E2E-AUTH-005: credenciales incorrectas muestran mensaje de error", async ({
    page,
  }) => {
    await fillLoginForm(
      page,
      TEST_CREDENTIALS.invalid.email,
      TEST_CREDENTIALS.invalid.password
    );
    await submitLoginForm(page);

    // Esperar el mensaje de error (el div rojo con el error)
    const errorMessage = page.locator(".bg-red-50, [style*='background'][style*='fef2f2']");
    await expect(errorMessage).toBeVisible({ timeout: 5_000 });

    // Verificar que NO redirigió al admin
    await expect(page).toHaveURL(LOGIN_URL);
  });

  /**
   * TC-E2E-AUTH-006: Email con formato inválido → validación HTML5 nativa.
   * El input type="email" previene el envío del formulario.
   */
  test("TC-E2E-AUTH-006: email con formato inválido → form no se envía", async ({
    page,
  }) => {
    // Forzar valor inválido (ignorar la validación del teclado)
    await page.locator("#email").fill("esto-no-es-un-email");
    await page.locator("#password").fill("password123");

    // Intentar submit
    await submitLoginForm(page);

    // El navegador debe prevenir el submit por la validación de type="email"
    // Seguir en la misma URL
    await expect(page).toHaveURL(LOGIN_URL);
  });

  /**
   * TC-E2E-AUTH-007: Campos vacíos → el botón submit muestra loading o el formulario no avanza.
   */
  test("TC-E2E-AUTH-007: campos vacíos → formulario no se envía (required)", async ({
    page,
  }) => {
    // No llenar nada, solo hacer click en submit
    await submitLoginForm(page);

    // El HTML5 required previene el submit
    await expect(page).toHaveURL(LOGIN_URL);
  });

  /**
   * TC-E2E-AUTH-008: Solo contraseña vacía → formulario bloqueado.
   */
  test("TC-E2E-AUTH-008: contraseña vacía → formulario no se envía", async ({
    page,
  }) => {
    await page.locator("#email").fill("admin@viterra.com");
    // Dejar contraseña vacía
    await submitLoginForm(page);

    await expect(page).toHaveURL(LOGIN_URL);
  });
});

// ─── Suite 4: Protección de rutas /admin/* ────────────────────────────────────

test.describe("Route Protection – Acceso no autenticado a /admin", () => {
  /**
   * TC-E2E-AUTH-009: Acceso directo a /admin sin sesión → redirige a /login.
   * Este es el test de seguridad más crítico del sistema.
   */
  test("TC-E2E-AUTH-009: acceso a /admin sin sesión → redirección a /login", async ({
    page,
  }) => {
    // Limpiar cualquier sesión existente
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/admin/dashboard`);

    // Debe redirigir al login
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  /**
   * TC-E2E-AUTH-010: Acceso a subrutas del admin sin sesión → redirige a /login.
   */
  test("TC-E2E-AUTH-010: subruta /admin/company sin sesión → redirección a /login", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/admin/company/users`);

    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  /**
   * TC-E2E-AUTH-011: La página de login no debe estar accesible para usuarios autenticados.
   * Si un usuario ya tiene sesión, ir a /login lo debe redirigir al admin.
   */
  test("TC-E2E-AUTH-011: usuario autenticado que visita /login → redirigido a /admin", async ({
    page,
  }) => {
    // Primero hacer login
    await performLogin(
      page,
      TEST_CREDENTIALS.admin.email,
      TEST_CREDENTIALS.admin.password
    );
    await page.waitForURL(/\/admin/);

    // Intentar visitar /login estando autenticado
    await page.goto(LOGIN_URL);

    // Debe redirigir al admin
    await expect(page).toHaveURL(/\/admin/, { timeout: 5_000 });
  });
});

// ─── Suite 5: Logout y limpieza de sesión ────────────────────────────────────

test.describe("Logout – Cierre de sesión seguro", () => {
  test.beforeEach(async ({ page }) => {
    // Iniciar sesión antes de cada test
    await performLogin(
      page,
      TEST_CREDENTIALS.admin.email,
      TEST_CREDENTIALS.admin.password
    );
    await page.waitForURL(/\/admin/);
  });

  /**
   * TC-E2E-AUTH-012: Hacer logout → redirigir a /login y limpiar sesión.
   */
  test("TC-E2E-AUTH-012: logout limpia la sesión y redirige a /login", async ({
    page,
  }) => {
    // Hacer click en el botón de logout (buscar por icono LogOut o texto)
    const logoutButton = page.locator('[aria-label="Cerrar sesión"], text=Cerrar sesión').first();
    await logoutButton.click();

    // Debe redirigir al login
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  /**
   * TC-E2E-AUTH-013: Tras logout, acceder a /admin → redirige a /login.
   * La sesión no debe persistir después del logout.
   */
  test("TC-E2E-AUTH-013: tras logout, acceso a /admin → bloqueado", async ({
    page,
  }) => {
    // Hacer logout
    const logoutButton = page.locator('[aria-label="Cerrar sesión"], text=Cerrar sesión').first();
    await logoutButton.click();
    await page.waitForURL(/\/login/);

    // Intentar volver al admin
    await page.goto(ADMIN_DASHBOARD_URL);

    // Debe redirigir al login (sesión eliminada)
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});
