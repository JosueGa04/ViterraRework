/**
 * @file setupTests.ts
 * @description Configuración global de Vitest + Testing Library para Viterra.
 *
 * Se ejecuta automáticamente antes de cada archivo de test (configurado en vitest.config.ts).
 * Proporciona:
 * - Extensiones de matchers de @testing-library/jest-dom
 * - Limpieza del DOM después de cada test
 * - Mock global de import.meta.env para Vite
 * - Supresión de warnings de consola esperados en tests
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// ─── Limpieza del DOM tras cada test ──────────────────────────────────────────
// Evita que un test contamine el estado del siguiente.
afterEach(() => {
  cleanup();
});

// ─── Mock de import.meta.env (Vite) ───────────────────────────────────────────
// Vitest expone import.meta.env automáticamente, pero las variables específicas
// del proyecto deben estar presentes para que los módulos no fallen al importar.
beforeAll(() => {
  Object.defineProperty(import.meta, "env", {
    value: {
      DEV: true,
      PROD: false,
      MODE: "test",
      VITE_SUPABASE_URL: "https://test-project.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
    writable: true,
  });
});

// ─── Mock de window.matchMedia ────────────────────────────────────────────────
// JSDOM no implementa matchMedia; es necesario para componentes con responsive design.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── Mock de window.ResizeObserver ───────────────────────────────────────────
// Necesario para componentes que usan ResizeObserver (recharts, embla-carousel, etc.)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// ─── Mock de window.IntersectionObserver ─────────────────────────────────────
// Necesario para componentes con lazy loading y animaciones de scroll.
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  root: null,
  rootMargin: "",
  thresholds: [],
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
}));

// ─── Suprimir warnings esperados ──────────────────────────────────────────────
// Algunos warnings de React/librería son esperados en tests y ensucian la salida.
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() ?? "";

    // Suprimir advertencias conocidas de React en entorno de tests
    if (
      message.includes("Warning: ReactDOM.render is no longer supported") ||
      message.includes("Warning: An update to") ||
      message.includes("act(...)") ||
      message.includes("React Router Future Flag Warning")
    ) {
      return;
    }

    originalConsoleError(...args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() ?? "";

    // Suprimir warnings de Viterra en tests (son informativos, no errores)
    if (message.includes("[Viterra]")) {
      return;
    }

    originalConsoleWarn(...args);
  };
});
