import type { SupabaseClient } from "@supabase/supabase-js";

/** IDs numéricos de 7 dígitos asignados por Viterra (fuera del rango típico Tokko 6M–8M). */
export const VITERRA_TOKKO_ID_MIN = 9_000_000;
export const VITERRA_TOKKO_ID_MAX = 9_999_999;

export function isSevenDigitTokkoId(raw: string): boolean {
  return /^\d{7}$/.test(raw.trim());
}

/** Referencia visible habitual en el catálogo: VAP + tokko_id. */
export function viterraReferenceFromTokkoId(tokkoId: string): string {
  return `VAP${tokkoId.trim()}`;
}

/**
 * Asigna un tokko_id único de 7 dígitos para propiedades creadas en el admin.
 * Usa el bloque 9_000_000–9_999_999 para no chocar con los IDs que vienen del sync Tokko.
 */
export async function allocateUniquePropertyTokkoId(client: SupabaseClient): Promise<string> {
  const { data: maxRows, error: maxErr } = await client
    .from("properties")
    .select("tokko_id")
    .gte("tokko_id", String(VITERRA_TOKKO_ID_MIN))
    .lte("tokko_id", String(VITERRA_TOKKO_ID_MAX))
    .order("tokko_id", { ascending: false })
    .limit(1);

  if (maxErr) throw new Error(maxErr.message);

  let candidate = VITERRA_TOKKO_ID_MIN;
  const maxRow = maxRows?.[0]?.tokko_id;
  if (typeof maxRow === "string" && isSevenDigitTokkoId(maxRow)) {
    const n = Number.parseInt(maxRow, 10);
    if (Number.isFinite(n) && n >= VITERRA_TOKKO_ID_MIN) candidate = n + 1;
  }

  for (let attempt = 0; attempt < 80; attempt++) {
    const id = String(candidate + attempt);
    if (Number(id) > VITERRA_TOKKO_ID_MAX) {
      throw new Error("No hay más IDs Tokko disponibles en el rango Viterra (9_000_000–9_999_999).");
    }
    const { data: clash, error: clashErr } = await client
      .from("properties")
      .select("id")
      .eq("tokko_id", id)
      .maybeSingle();
    if (clashErr) throw new Error(clashErr.message);
    if (!clash) return id;
  }

  throw new Error("No se pudo generar un ID Tokko único. Intenta de nuevo.");
}
