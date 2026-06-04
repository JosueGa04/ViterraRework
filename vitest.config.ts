/**
 * @file vitest.config.ts
 * @description Configuración de Vitest para pruebas unitarias e integración de Viterra.
 *
 * Cubre:
 * - Tests unitarios en src/__tests__/unit/**
 * - Mock de módulos de Supabase y variables de entorno
 * - JSDOM como entorno de DOM para tests de React
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // ── Entorno ──────────────────────────────────────────────────────────────
    // jsdom simula el DOM del navegador para componentes React
    environment: "jsdom",

    // ── Setup ────────────────────────────────────────────────────────────────
    // Ejecuta setupTests antes de cada test file
    setupFiles: ["./src/__tests__/setup/setupTests.ts"],

    // ── Patrones de archivos ──────────────────────────────────────────────────
    include: [
      "src/__tests__/unit/**/*.test.{ts,tsx}",
      "src/__tests__/integration/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "src/__tests__/e2e/**",
      "node_modules/**",
    ],

    // ── Variables de entorno ──────────────────────────────────────────────────
    env: {
      VITE_SUPABASE_URL: "https://test-project.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key-placeholder",
    },

    // ── Cobertura ─────────────────────────────────────────────────────────────
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/app/contexts/**",
        "src/app/hooks/**",
        "src/app/lib/**",
        "src/app/pages/**",
      ],
      exclude: [
        "src/app/components/ui/**", // shadcn/ui components
        "src/__tests__/**",
        "**/*.d.ts",
      ],
      thresholds: {
        // Umbrales mínimos de cobertura (ajustar según madurez del proyecto)
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },

    // ── Globals ───────────────────────────────────────────────────────────────
    globals: true,

    // ── Timeout ───────────────────────────────────────────────────────────────
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
