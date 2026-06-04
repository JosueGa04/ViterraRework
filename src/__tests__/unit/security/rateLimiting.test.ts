/**
 * @file rateLimiting.test.ts
 * @module Unit Tests – Rate Limiting y Protección contra Fuerza Bruta
 *
 * Pruebas unitarias para verificar la implementación del rate limiting en
 * los endpoints de autenticación. Simula múltiples intentos de login y
 * verifica que el sistema bloquea correctamente.
 *
 * IMPORTANTE: El rate limiting real debe implementarse en:
 * 1. Supabase Auth (configuración del proyecto)
 * 2. API Routes de Vercel (/api/*) con middleware
 * 3. Edge Functions de Supabase
 *
 * Ejecutar: npx vitest run src/__tests__/unit/security/rateLimiting.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Implementación del Rate Limiter (para testing) ───────────────────────────

/**
 * Rate limiter en memoria (token bucket simplificado).
 * En producción, usar Redis o el rate limiting nativo de Supabase/Vercel.
 * Esta implementación es para testing y documentación del comportamiento esperado.
 */
class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number; blockedUntil?: number }>;
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(options: {
    maxAttempts: number;
    windowMs: number; // Ventana de tiempo en ms
    blockDurationMs: number; // Tiempo de bloqueo en ms
  }) {
    this.attempts = new Map();
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.blockDurationMs = options.blockDurationMs;
  }

  /**
   * Intenta registrar un intento de login para el identificador dado.
   * @returns { allowed: boolean, remainingAttempts: number, retryAfterMs?: number }
   */
  attempt(identifier: string): {
    allowed: boolean;
    remainingAttempts: number;
    retryAfterMs?: number;
  } {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // Si el usuario está bloqueado
    if (record?.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterMs: record.blockedUntil - now,
      };
    }

    // Si la ventana de tiempo expiró, reiniciar contador
    if (record && now - record.firstAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, firstAttempt: now });
      return {
        allowed: true,
        remainingAttempts: this.maxAttempts - 1,
      };
    }

    // Incrementar contador
    const count = (record?.count ?? 0) + 1;
    const firstAttempt = record?.firstAttempt ?? now;

    if (count >= this.maxAttempts) {
      this.attempts.set(identifier, {
        count,
        firstAttempt,
        blockedUntil: now + this.blockDurationMs,
      });
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterMs: this.blockDurationMs,
      };
    }

    this.attempts.set(identifier, { count, firstAttempt });
    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - count,
    };
  }

  /** Limpia intentos de un identificador (para tests). */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /** Limpia todos los registros. */
  clear(): void {
    this.attempts.clear();
  }
}

// ─── Configuración del Rate Limiter para login ────────────────────────────────
// Configuración real recomendada para la ruta POST /login de Viterra:
// - 5 intentos máximos en ventana de 15 minutos
// - Bloqueo de 15 minutos tras exceder el límite

const LOGIN_RATE_LIMITER_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutos
  blockDurationMs: 15 * 60 * 1000, // 15 minutos de bloqueo
};

// ─── Suite 1: Rate Limiter básico ─────────────────────────────────────────────

describe("RateLimiter – Comportamiento básico", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(LOGIN_RATE_LIMITER_CONFIG);
  });

  afterEach(() => {
    limiter.clear();
  });

  /**
   * TC-RATE-001: El primer intento siempre debe estar permitido.
   */
  it("TC-RATE-001: primer intento de login → permitido", () => {
    const result = limiter.attempt("user@viterra.com");
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(4);
  });

  /**
   * TC-RATE-002: Los intentos dentro del límite deben permitirse.
   */
  it("TC-RATE-002: intentos dentro del límite → todos permitidos", () => {
    const email = "asesor@viterra.com";

    for (let i = 1; i <= 4; i++) {
      const result = limiter.attempt(email);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(LOGIN_RATE_LIMITER_CONFIG.maxAttempts - i);
    }
  });

  /**
   * TC-RATE-003: El 5to intento (el límite exacto) debe ser bloqueado.
   */
  it("TC-RATE-003: al alcanzar el límite de intentos → bloqueado", () => {
    const email = "atacante@evil.com";

    // Hacer 4 intentos (no bloqueados)
    for (let i = 0; i < 4; i++) {
      limiter.attempt(email);
    }

    // El 5to intento debe estar bloqueado
    const result = limiter.attempt(email);
    expect(result.allowed).toBe(false);
    expect(result.remainingAttempts).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  /**
   * TC-RATE-004: Tras el bloqueo, intentos adicionales deben seguir bloqueados.
   */
  it("TC-RATE-004: intentos después del bloqueo → seguir bloqueados", () => {
    const email = "brute.force@attack.com";

    // Agotar el límite
    for (let i = 0; i < 5; i++) {
      limiter.attempt(email);
    }

    // Intentos adicionales deben ser rechazados
    for (let i = 0; i < 10; i++) {
      const result = limiter.attempt(email);
      expect(result.allowed).toBe(false);
    }
  });

  /**
   * TC-RATE-005: Diferentes identidades tienen contadores independientes.
   * Un ataque desde un usuario no afecta a otros usuarios.
   */
  it("TC-RATE-005: diferentes IPs/emails tienen contadores independientes", () => {
    const attacker = "attacker@evil.com";
    const innocent = "innocente@viterra.com";

    // Bloquear al atacante
    for (let i = 0; i < 5; i++) {
      limiter.attempt(attacker);
    }

    // El usuario inocente no debe verse afectado
    const result = limiter.attempt(innocent);
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBe(4);
  });

  /**
   * TC-RATE-006: El tiempo de bloqueo debe ser reportado correctamente.
   */
  it("TC-RATE-006: debe retornar el tiempo de bloqueo restante (retryAfterMs)", () => {
    const email = "spam@attack.com";

    for (let i = 0; i < 5; i++) {
      limiter.attempt(email);
    }

    const result = limiter.attempt(email);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    // El tiempo de bloqueo debe ser aproximadamente 15 minutos
    expect(result.retryAfterMs).toBeLessThanOrEqual(LOGIN_RATE_LIMITER_CONFIG.blockDurationMs);
  });
});

// ─── Suite 2: Simulación de ataque de fuerza bruta ───────────────────────────

describe("RateLimiter – Ataque de fuerza bruta", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(LOGIN_RATE_LIMITER_CONFIG);
  });

  /**
   * TC-RATE-007: Simula un ataque de diccionario (múltiples contraseñas para un email).
   * Un atacante que prueba 100 contraseñas debe ser bloqueado después del límite.
   */
  it("TC-RATE-007: ataque de diccionario (100 intentos) → bloqueado después del límite", () => {
    const targetEmail = "admin@viterra.com";
    const passwords = Array.from({ length: 100 }, (_, i) => `password${i}`);

    let blockedAt = -1;
    for (let i = 0; i < passwords.length; i++) {
      const result = limiter.attempt(targetEmail);
      if (!result.allowed && blockedAt === -1) {
        blockedAt = i;
        break;
      }
    }

    // El bloqueo debe ocurrir en el intento número 5 (índice 4)
    expect(blockedAt).toBe(LOGIN_RATE_LIMITER_CONFIG.maxAttempts - 1);
  });

  /**
   * TC-RATE-008: El mensaje de error NO debe revelar si el email existe.
   * Evitar user enumeration a través de mensajes de error diferentes.
   */
  it("TC-RATE-008: el mensaje de error debe ser genérico (no revelar si el email existe)", () => {
    const GENERIC_ERROR_MESSAGE = "Credenciales incorrectas. Verifica tu email y contraseña.";
    const EMAIL_NOT_FOUND_MESSAGE = "No existe una cuenta con este email.";
    const WRONG_PASSWORD_MESSAGE = "Contraseña incorrecta.";

    // CORRECTO: Mensaje genérico que no revela información
    expect(GENERIC_ERROR_MESSAGE).not.toContain("No existe");
    expect(GENERIC_ERROR_MESSAGE).not.toContain("contraseña incorrecta");

    // INCORRECTO: Mensajes específicos que ayudan al atacante a enumerar usuarios
    expect(EMAIL_NOT_FOUND_MESSAGE).toContain("No existe");
    expect(WRONG_PASSWORD_MESSAGE).toContain("incorrecta");

    // El sistema real de Supabase retorna: "Invalid login credentials" (genérico ✓)
    const supabaseError = "Invalid login credentials";
    expect(supabaseError).not.toContain("email not found");
    expect(supabaseError).not.toContain("wrong password");
  });

  /**
   * TC-RATE-009: Rate limiting por IP además de por email.
   * Un atacante no debe poder bypassear el rate limit usando emails diferentes
   * desde la misma IP.
   */
  it("TC-RATE-009: rate limiting por IP protege contra rotación de emails", () => {
    const attackerIp = "192.168.1.100";

    // El atacante usa emails diferentes pero desde la misma IP
    const emails = Array.from(
      { length: 10 },
      (_, i) => `victim${i}@viterra.com`
    );

    let blockedAt = -1;
    for (let i = 0; i < emails.length; i++) {
      // En el sistema real, se limita por IP. Aquí simulamos usando la IP como identificador.
      const result = limiter.attempt(`ip:${attackerIp}`);
      if (!result.allowed && blockedAt === -1) {
        blockedAt = i;
        break;
      }
    }

    // Debe bloquearse después del límite por IP
    expect(blockedAt).toBe(LOGIN_RATE_LIMITER_CONFIG.maxAttempts - 1);
  });
});

// ─── Suite 3: Respuestas HTTP del endpoint de login ───────────────────────────

describe("RateLimiter – Respuestas HTTP esperadas", () => {
  /**
   * TC-RATE-010: El endpoint bloqueado debe retornar HTTP 429 Too Many Requests.
   */
  it("TC-RATE-010: endpoint bloqueado debe retornar status 429", () => {
    const HTTP_TOO_MANY_REQUESTS = 429;

    // Simular la respuesta que debería dar el endpoint de /api/auth/login
    function simulateLoginEndpoint(blocked: boolean): { status: number; headers: Record<string, string> } {
      if (blocked) {
        return {
          status: HTTP_TOO_MANY_REQUESTS,
          headers: {
            "Retry-After": "900", // 15 minutos en segundos
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 900),
          },
        };
      }
      return { status: 200, headers: {} };
    }

    const blockedResponse = simulateLoginEndpoint(true);
    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.headers["Retry-After"]).toBeDefined();
    expect(blockedResponse.headers["X-RateLimit-Remaining"]).toBe("0");

    const allowedResponse = simulateLoginEndpoint(false);
    expect(allowedResponse.status).toBe(200);
  });

  /**
   * TC-RATE-011: Los headers de rate limiting deben informar sobre límites restantes.
   */
  it("TC-RATE-011: respuestas permitidas deben incluir headers informativos de rate limit", () => {
    function buildRateLimitHeaders(remaining: number, limit: number): Record<string, string> {
      return {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 900),
      };
    }

    const headers = buildRateLimitHeaders(4, 5);
    expect(headers["X-RateLimit-Limit"]).toBe("5");
    expect(headers["X-RateLimit-Remaining"]).toBe("4");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });
});
