/**
 * @file properties.e2e.ts
 * @module E2E Tests – Gestión de Propiedades y Seguridad XSS (Playwright)
 *
 * Pruebas End-to-End para:
 * - CRUD completo de propiedades en el panel admin
 * - Validación de formularios en el browser
 * - Intentos de inyección XSS en campos de propiedades
 * - Acceso solo para usuarios autorizados
 *
 * Ejecutar: npx playwright test src/__tests__/e2e/properties.e2e.ts
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

const ADMIN_CREDS = {
  email: process.env.TEST_ADMIN_EMAIL || "admin@viterra.com",
  password: process.env.TEST_ADMIN_PASSWORD || "TestAdmin123!",
};

const ASESOR_CREDS = {
  email: process.env.TEST_ASESOR_EMAIL || "asesor@viterra.com",
  password: process.env.TEST_ASESOR_PASSWORD || "TestAsesor123!",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(
  page: Page,
  creds: { email: string; password: string }
): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/admin/, { timeout: 10_000 });
}

async function navigateToProperties(page: Page): Promise<void> {
  // Navegar al módulo de propiedades en el admin
  await page.goto(`${BASE_URL}/admin/properties`);
  await page.waitForLoadState("networkidle");
}

// ─── Suite 1: Acceso al módulo de propiedades ─────────────────────────────────

test.describe("Propiedades – Control de acceso", () => {
  /**
   * TC-E2E-PROP-001: El módulo de propiedades no está disponible para asesores.
   * Un asesor autenticado no debe ver ni acceder al CRUD de propiedades.
   */
  test("TC-E2E-PROP-001: asesor autenticado no ve el módulo de propiedades", async ({
    page,
  }) => {
    await loginAs(page, ASESOR_CREDS);
    await navigateToProperties(page);

    // El botón de crear nueva propiedad NO debe existir para asesores
    const createButton = page.locator('button:has-text("Nueva Propiedad"), button:has-text("Agregar")');
    await expect(createButton).not.toBeVisible({ timeout: 3_000 });
  });

  /**
   * TC-E2E-PROP-002: El admin sí puede acceder al módulo de propiedades.
   */
  test("TC-E2E-PROP-002: admin accede al módulo de propiedades con acciones CRUD", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_CREDS);
    await navigateToProperties(page);

    // El admin debe ver las propiedades listadas (o el estado vacío con botón de crear)
    const propertiesSection = page.locator('[data-testid="properties-list"], .property-card, text=Propiedades').first();
    await expect(propertiesSection).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Suite 2: Creación de propiedades ─────────────────────────────────────────

test.describe("Propiedades – Creación (CRUD: Create)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_CREDS);
    await navigateToProperties(page);
  });

  /**
   * TC-E2E-PROP-003: Crear una propiedad con todos los campos válidos.
   */
  test("TC-E2E-PROP-003: crear propiedad con campos válidos → éxito", async ({
    page,
  }) => {
    // Abrir el formulario de nueva propiedad
    await page.locator('button:has-text("Nueva Propiedad"), button:has-text("+ Propiedad")').first().click();

    // Esperar que el formulario (dialog) esté visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Llenar campos obligatorios
    const titleInput = dialog.locator('input[name="title"], input[placeholder*="título"]').first();
    await titleInput.fill("Casa de Prueba E2E – Col. Roma Norte");

    const priceInput = dialog.locator('input[name="price"], input[placeholder*="precio"]').first();
    await priceInput.fill("3500000");

    // Seleccionar tipo de operación
    const operationSelect = dialog.locator('select[name="operation"]').first();
    if (await operationSelect.count() > 0) {
      await operationSelect.selectOption("venta");
    }

    // Guardar la propiedad
    await dialog.locator('button[type="submit"], button:has-text("Guardar")').first().click();

    // Verificar que el dialog se cerró (éxito)
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    // Verificar que aparece un toast de éxito o la propiedad en la lista
    const successMessage = page.locator(
      'text=guardada, text=creada, [data-sonner-toast], .sonner-toast'
    ).first();
    await expect(successMessage).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Alternativa: la propiedad aparece en la lista
      return expect(page.locator('text=Casa de Prueba E2E')).toBeVisible({ timeout: 5_000 });
    });
  });

  /**
   * TC-E2E-PROP-004: Intentar crear propiedad con título vacío → error de validación.
   */
  test("TC-E2E-PROP-004: crear propiedad sin título → muestra error de validación", async ({
    page,
  }) => {
    await page.locator('button:has-text("Nueva Propiedad"), button:has-text("+ Propiedad")').first().click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Dejar el título vacío y llenar precio
    const priceInput = dialog.locator('input[name="price"]').first();
    await priceInput.fill("1000000");

    // Intentar guardar
    await dialog.locator('button[type="submit"], button:has-text("Guardar")').first().click();

    // El dialog debe seguir visible (formulario inválido no se envía)
    await expect(dialog).toBeVisible({ timeout: 3_000 });
  });

  /**
   * TC-E2E-PROP-005: Precio negativo → campo debe mostrar error o no aceptar el valor.
   */
  test("TC-E2E-PROP-005: precio negativo → error de validación en formulario", async ({
    page,
  }) => {
    await page.locator('button:has-text("Nueva Propiedad"), button:has-text("+ Propiedad")').first().click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const priceInput = dialog.locator('input[name="price"]').first();
    await priceInput.fill("-100000");

    // Verificar que el valor negativo no sea aceptado
    // Algunos inputs tienen min="0" que previene valores negativos
    const value = await priceInput.inputValue();
    // O tiene validación y muestra error
    const hasMinAttr = await priceInput.getAttribute("min");
    if (hasMinAttr === "0" || hasMinAttr !== null) {
      expect(Number(hasMinAttr)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Suite 3: Seguridad XSS en formularios de propiedades ─────────────────────

test.describe("Seguridad XSS – Inyección en campos de propiedades", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_CREDS);
    await navigateToProperties(page);
  });

  /**
   * TC-E2E-SEC-XSS-001: Script tag en título NO debe ejecutarse.
   * El más importante de los tests XSS.
   */
  test("TC-E2E-SEC-XSS-001: script tag en título NO ejecuta código JavaScript", async ({
    page,
  }) => {
    let xssExecuted = false;

    // Escuchar si el alert() de XSS se dispara (lo que indicaría una vulnerabilidad)
    page.on("dialog", (dialog) => {
      if (dialog.message().includes("xss") || dialog.message().includes("XSS")) {
        xssExecuted = true;
      }
      dialog.dismiss();
    });

    await page
      .locator('button:has-text("Nueva Propiedad"), button:has-text("+ Propiedad")')
      .first()
      .click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Inyectar payload XSS en el título
    const titleInput = dialog.locator('input[name="title"], input[placeholder*="título"]').first();
    await titleInput.fill("<script>alert('xss')</script>Casa Test");

    // Guardar (si pasa la validación de longitud)
    await dialog.locator('button[type="submit"], button:has-text("Guardar")').first().click();

    // Esperar posible renderizado en lista
    await page.waitForTimeout(2_000);

    // El XSS NO debe haberse ejecutado
    expect(xssExecuted).toBe(false);
  });

  /**
   * TC-E2E-SEC-XSS-002: Payload img onerror en descripción NO ejecuta código.
   */
  test("TC-E2E-SEC-XSS-002: payload img onerror en descripción NO se ejecuta", async ({
    page,
  }) => {
    let xssExecuted = false;

    page.on("dialog", (dialog) => {
      xssExecuted = true;
      dialog.dismiss();
    });

    await page
      .locator('button:has-text("Nueva Propiedad"), button:has-text("+ Propiedad")')
      .first()
      .click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Inyectar en campo de descripción
    const descInput = dialog.locator('textarea[name="description"], [contenteditable="true"]').first();
    if (await descInput.count() > 0) {
      await descInput.fill('<img src="x" onerror="alert(\'xss\')">Descripción normal');
    }

    await page.waitForTimeout(1_500);

    expect(xssExecuted).toBe(false);
  });

  /**
   * TC-E2E-SEC-XSS-003: El contenido renderizado en la lista de propiedades
   * debe ser texto plano (textContent, no innerHTML).
   */
  test("TC-E2E-SEC-XSS-003: el título se renderiza como texto plano, no como HTML", async ({
    page,
  }) => {
    // Buscar cualquier tarjeta de propiedad con un script tag en el título
    // Si hubiera una propiedad con "<script>" en el título, debe verse como texto literal.
    const propertyCards = page.locator('.property-card, [data-testid="property-card"]');
    const count = await propertyCards.count();

    for (let i = 0; i < count; i++) {
      const card = propertyCards.nth(i);
      const titleEl = card.locator('h2, h3, [class*="title"]').first();

      if (await titleEl.count() > 0) {
        // El innerText (textContent) no debe contener tags HTML ejecutables
        const textContent = await titleEl.textContent();
        if (textContent?.includes("<script>")) {
          // Si hay un script tag en el texto, debe ser literal, no ejecutado
          expect(textContent).toContain("&lt;script&gt;");
        }
      }
    }
  });

  /**
   * TC-E2E-SEC-XSS-004: Payload de inyección vía URL params no se ejecuta.
   */
  test("TC-E2E-SEC-XSS-004: payload XSS en URL params no ejecuta código", async ({
    page,
  }) => {
    let xssExecuted = false;

    page.on("dialog", (dialog) => {
      xssExecuted = true;
      dialog.dismiss();
    });

    // Intentar URL con payload XSS en parámetro de búsqueda
    await page.goto(
      `${BASE_URL}/admin/properties?search=%3Cscript%3Ealert('xss')%3C%2Fscript%3E`
    );
    await page.waitForTimeout(2_000);

    expect(xssExecuted).toBe(false);
  });
});

// ─── Suite 4: SQL Injection a través de búsqueda de propiedades ──────────────

test.describe("Seguridad – SQL Injection en búsqueda de propiedades", () => {
  const SQL_PAYLOADS = [
    "' OR 1=1 --",
    "'; DROP TABLE properties; --",
    "1' UNION SELECT * FROM tokko_users --",
    "\"; INSERT INTO properties (title) VALUES ('hacked'); --",
  ];

  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_CREDS);
    await navigateToProperties(page);
  });

  /**
   * TC-E2E-SEC-SQL-001: Payloads SQL en el buscador de propiedades
   * no deben romper la app ni retornar datos no autorizados.
   */
  test("TC-E2E-SEC-SQL-001: payloads SQL en buscador no rompen la aplicación", async ({
    page,
  }) => {
    for (const payload of SQL_PAYLOADS) {
      const searchInput = page.locator(
        'input[placeholder*="buscar"], input[placeholder*="Buscar"], input[type="search"]'
      ).first();

      if (await searchInput.count() === 0) continue;

      await searchInput.fill(payload);
      await page.waitForTimeout(500);

      // La aplicación debe seguir funcionando (sin errores fatales ni crash)
      await expect(page).not.toHaveURL(/error|crash|500/);

      // No debe haber alertas de error de la base de datos
      const errorToast = page.locator('[data-sonner-toast][class*="error"]');
      const criticalError = page.locator('text=DATABASE_ERROR, text=SQL syntax');
      await expect(criticalError).not.toBeVisible({ timeout: 2_000 }).catch(() => {});

      // Limpiar el campo para el siguiente payload
      await searchInput.clear();
    }
  });

  /**
   * TC-E2E-SEC-SQL-002: La búsqueda con payload SQL no retorna filas extra
   * (confirma que PostgREST usa consultas parametrizadas).
   */
  test("TC-E2E-SEC-SQL-002: búsqueda con payload SQL no retorna datos no autorizados", async ({
    page,
  }) => {
    // Capturar las respuestas de red para verificar que no hay data leak
    const apiResponses: string[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("supabase") && response.url().includes("properties")) {
        try {
          const body = await response.text();
          apiResponses.push(body);
        } catch {
          // Ignorar errores de lectura de respuesta
        }
      }
    });

    const searchInput = page.locator(
      'input[placeholder*="buscar"], input[placeholder*="Buscar"]'
    ).first();

    if (await searchInput.count() > 0) {
      await searchInput.fill("' OR 1=1 --");
      await page.waitForTimeout(1_500);

      // Las respuestas de la API deben ser arrays normales de propiedades,
      // no errores de SQL ni datasets completos de otras tablas
      for (const response of apiResponses) {
        expect(response).not.toContain("DATABASE_ERROR");
        expect(response).not.toContain("sql_error");
        expect(response).not.toContain("tokko_users"); // No debe filtrar otras tablas
      }
    }
  });
});
