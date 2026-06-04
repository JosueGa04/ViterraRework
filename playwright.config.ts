/**
 * @file playwright.config.ts
 * @description Configuración de Playwright para pruebas E2E de Viterra.
 *
 * Ejecuta los tests E2E contra el servidor de desarrollo local.
 * Soporta múltiples navegadores: Chromium, Firefox, WebKit (Safari).
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // ── Directorio de tests ───────────────────────────────────────────────────
  testDir: "./src/__tests__/e2e",
  testMatch: "**/*.e2e.{ts,tsx}",

  // ── Configuración global ──────────────────────────────────────────────────
  fullyParallel: false, // Secuencial para evitar conflictos de estado de sesión
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // ── Reporter ──────────────────────────────────────────────────────────────
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],

  // ── Configuración compartida de tests ────────────────────────────────────
  use: {
    // URL base del servidor de desarrollo
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",

    // Capturar screenshots en caso de fallo
    screenshot: "only-on-failure",

    // Capturar traza en caso de fallo
    trace: "on-first-retry",

    // Grabar video en caso de fallo
    video: "on-first-retry",

    // Timeout para navegaciones
    navigationTimeout: 15_000,

    // Timeout para acciones (click, fill, etc.)
    actionTimeout: 8_000,
  },

  // ── Proyectos (navegadores) ───────────────────────────────────────────────
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Tests en móvil
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  // ── Servidor web local ────────────────────────────────────────────────────
  // Inicia automáticamente el servidor de desarrollo para los tests E2E
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe",
  },

  // ── Timeouts ──────────────────────────────────────────────────────────────
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },

  // ── Archivos de salida ────────────────────────────────────────────────────
  outputDir: "test-results",
});
