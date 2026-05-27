import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let clientRef: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  if (!clientRef) {
    clientRef = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return clientRef;
}

/** Expone el host del proyecto (solo origen) para comprobar que .env apunta al mismo que el Dashboard. */
export function getSupabaseProjectHost(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * Asegura que el cliente leyó la sesión desde storage y refresca el JWT para que RLS reciba `authenticated`
 * y los metadatos (p. ej. role) estén actualizados.
 */
export async function syncSupabaseAuthSession(client: SupabaseClient): Promise<{
  hasSession: boolean;
  userId: string | null;
}> {
  const { data: { session } } = await client.auth.getSession();
  if (!session) {
    return { hasSession: false, userId: null };
  }
  try {
    // Only refresh when the JWT expires within the next 5 minutes — avoids an
    // unnecessary network round-trip on every page load / tab switch when the
    // token is still valid for a long time.
    const expiresAt = session.expires_at ?? 0;
    const secsLeft = expiresAt - Math.floor(Date.now() / 1000);
    if (secsLeft < 300) {
      const { error } = await client.auth.refreshSession();
      if (error && import.meta.env.DEV) {
        console.warn("[Viterra] refreshSession:", error.message);
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[Viterra] refreshSession exception:", e);
    }
  }
  return { hasSession: true, userId: session.user?.id ?? null };
}
