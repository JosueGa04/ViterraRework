import type { SupabaseClient } from "@supabase/supabase-js";

/** Comparación insensible a mayúsculas y espacios. */
export function foldPropertyReferenceCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export type ReferenceCatalogRow = {
  id: string;
  title?: string;
  referenceCode?: string;
};

/**
 * Valida referencia manual según el catálogo Tokko/Viterra:
 * - No vacía duplicada frente a otras propiedades.
 * - No números cortos inventados (1–6 dígitos); en BD suelen ser VAP…, I24-M-… u 8+ dígitos.
 */
export function validatePropertyReferenceCode(
  raw: string,
  catalog: ReferenceCatalogRow[],
  excludePropertyId?: string,
): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = raw.trim();
  if (!normalized) return { ok: true, normalized: "" };

  if (/^\d{1,6}$/.test(normalized)) {
    return {
      ok: false,
      message:
        "No uses un número corto de 1 a 6 dígitos. Copia el código Tokko (ej. VAP6721156, I24-M-141908455) o deja el campo vacío.",
    };
  }

  const key = foldPropertyReferenceCode(normalized);
  const duplicate = catalog.find(
    (p) =>
      p.id !== excludePropertyId &&
      p.referenceCode?.trim() &&
      foldPropertyReferenceCode(p.referenceCode) === key,
  );

  if (duplicate) {
    const label = duplicate.title?.trim() || "otra propiedad";
    return {
      ok: false,
      message: `La referencia «${normalized}» ya está en uso (${label}).`,
    };
  }

  return { ok: true, normalized };
}

/** Comprueba duplicado en Supabase (por si el catálogo en memoria está desactualizado). */
export async function findPropertyWithReferenceCode(
  client: SupabaseClient,
  referenceCode: string,
  excludePropertyId?: string,
): Promise<{ id: string; title: string } | null> {
  const code = referenceCode.trim();
  if (!code) return null;

  const { data, error } = await client
    .from("properties")
    .select("id,title,reference_code")
    .ilike("reference_code", code)
    .limit(5);

  if (error || !data?.length) return null;

  const row = data.find(
    (r) =>
      r.id !== excludePropertyId &&
      typeof r.reference_code === "string" &&
      foldPropertyReferenceCode(r.reference_code) === foldPropertyReferenceCode(code),
  );

  if (!row || typeof row.id !== "string") return null;
  return { id: row.id, title: typeof row.title === "string" ? row.title : "Sin título" };
}
