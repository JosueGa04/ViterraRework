import { useCallback, useEffect, useRef, useState } from "react";
import type { Property } from "../components/PropertyCard";
import { getSupabaseClient, syncSupabaseAuthSession } from "../lib/supabaseClient";
import { logTableCountHints } from "../lib/supabaseDiagnostics";
import { fetchCatalogProperties, rowToProperty, type PropertyRow } from "../lib/supabaseProperties";
import { withTimeout } from "../lib/withTimeout";

const CATALOG_FETCH_ATTEMPTS = 3;
/** Refresco de sesión en segundo plano (no bloquea el catálogo público). Si colgara, se corta solo. */
const SYNC_SESSION_TIMEOUT_MS = 8_000;
/** Por intento; si la red cuelga, no dejar "Cargando…" indefinidamente. */
const FETCH_PROPERTIES_TIMEOUT_MS = 25_000;

export type UseCatalogPropertiesOptions = {
  /** Si es false, no se dispara la carga automática (p. ej. pestañas admin que no usan el catálogo). */
  enabled?: boolean;
  /** Listado admin: consulta sin columna `payload` (menos transferencia). */
  omitPayload?: boolean;
};

export function useCatalogProperties(opts?: UseCatalogPropertiesOptions) {
  const enabled = opts?.enabled !== false;
  const omitPayload = Boolean(opts?.omitPayload);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(() => enabled);
  const [error, setError] = useState<string | null>(null);
  /** Aviso cuando el listado cargó sin columnas de medios/contacto (migración pendiente). */
  const [catalogSchemaWarning, setCatalogSchemaWarning] = useState<string | null>(null);
  const fetchGenerationRef = useRef(0);

  /** Sustituye o inserta una ficha tras guardar en admin (evita listado con precio antiguo si el refetch llega con lectura rezagada). */
  const applySavedProperty = useCallback((p: Property) => {
    setProperties((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      if (i === -1) {
        return [p, ...prev];
      }
      const next = [...prev];
      next[i] = p;
      return next;
    });
  }, []);

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    const gen = ++fetchGenerationRef.current;
    const client = getSupabaseClient();
    if (!client) {
      if (gen !== fetchGenerationRef.current) return;
      setProperties([]);
      setError("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.");
      setCatalogSchemaWarning(null);
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(null);
      setCatalogSchemaWarning(null);
    }

    try {
      void withTimeout(syncSupabaseAuthSession(client), SYNC_SESSION_TIMEOUT_MS, "Sesión").catch(() => {});

      if (gen !== fetchGenerationRef.current) return;

      let lastErr: { message: string } | null = null;
      let rows: PropertyRow[] | undefined;

      for (let attempt = 0; attempt < CATALOG_FETCH_ATTEMPTS; attempt++) {
        try {
          const { data, error: qErr } = await withTimeout(
            fetchCatalogProperties(client, omitPayload ? { omitPayload: true } : undefined),
            FETCH_PROPERTIES_TIMEOUT_MS,
            "Catálogo"
          );
          if (gen !== fetchGenerationRef.current) return;
          if (!qErr) {
            rows = (data ?? []) as PropertyRow[];
            lastErr = null;
            if (omitPayload && rows.length > 0) {
              const sample = rows[0] as PropertyRow;
              const hasMediaCols =
                "contact_phone" in sample ||
                "video_url" in sample ||
                "tour_3d_url" in sample;
              setCatalogSchemaWarning(
                hasMediaCols
                  ? null
                  : "Faltan columnas de contacto y medios en Supabase. Aplica las migraciones 20260520180000, 20260521100000 y 20260521120000 para medios, videos y tours 3D.",
              );
            } else {
              setCatalogSchemaWarning(null);
            }
            break;
          }
          lastErr = qErr;
        } catch (e) {
          lastErr = { message: e instanceof Error ? e.message : String(e) };
        }
        if (lastErr && attempt < CATALOG_FETCH_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, 320 * (attempt + 1)));
          if (gen !== fetchGenerationRef.current) return;
        }
      }

      if (gen !== fetchGenerationRef.current) return;

      if (lastErr) {
        if (!silent) {
          setError(lastErr.message);
          setProperties([]);
        } else if (import.meta.env.DEV) {
          console.warn("[catalog] silent reload failed:", lastErr.message);
        }
      } else {
        if (silent) setError(null);
        const list = rows ?? [];
        setProperties(list.map((row) => rowToProperty(row)));
        if (import.meta.env.DEV && list.length === 0) {
          void logTableCountHints(client, "properties");
        }
      }
    } finally {
      if (gen === fetchGenerationRef.current && !silent) {
        setLoading(false);
      }
    }
  }, [omitPayload]);

  /** Actualiza una fila en memoria (p. ej. destacado) sin esperar un refetch completo. */
  const patchProperty = useCallback((id: string, patch: Partial<Property>) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, reload]);

  return { properties, loading, error, catalogSchemaWarning, reload, patchProperty, applySavedProperty };
}
