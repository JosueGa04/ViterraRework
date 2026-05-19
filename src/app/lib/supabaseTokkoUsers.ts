import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Perfil sincronizado Tokko. `id` debe coincidir con `auth.users.id` si el sync enlaza filas 1:1.
 * Si no hay fila, se usa solo `user_metadata` en AuthContext.
 */
export async function fetchTokkoUserRow(client: SupabaseClient, userId: string) {
  const byId = await client.from("tokko_users").select("*").eq("id", userId).maybeSingle();
  if (!byId.error && byId.data) return byId;

  const session = (await client.auth.getUser()).data.user;
  const email = session?.email?.trim().toLowerCase();
  if (!email) return byId;

  return client.from("tokko_users").select("*").ilike("email", email).maybeSingle();
}

/** Listado para el módulo Equipo y accesos (respeta RLS del proyecto). */
export async function fetchAllTokkoUsersForDirectory(client: SupabaseClient) {
  return await client.from("tokko_users").select("*").order("email", { ascending: true, nullsFirst: false });
}

type TokkoUserAccessPayload = {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
};

/** Persiste rol/permisos en `tokko_users` (id primario; fallback por email). */
export async function upsertTokkoUserAccess(client: SupabaseClient, payload: TokkoUserAccessPayload) {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const normalizedPermissions = Array.from(new Set(payload.permissions.map((p) => p.trim()).filter(Boolean)));
  const updateShape = {
    role: payload.role,
    permissions: normalizedPermissions,
    updated_at: new Date().toISOString(),
  };

  const byId = await client.from("tokko_users").update(updateShape).eq("id", payload.userId).select("id").maybeSingle();
  if (!byId.error && byId.data) return byId;

  const byEmail = await client
    .from("tokko_users")
    .update(updateShape)
    .ilike("email", normalizedEmail)
    .select("id")
    .maybeSingle();
  if (!byEmail.error && byEmail.data) return byEmail;

  return {
    data: null,
    error: {
      message:
        "No se pudo actualizar tokko_users por id/email. Revisa políticas RLS para UPDATE en esa tabla.",
    },
  };
}

export type TokkoUserProfilePatch = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  cellphone?: string | null;
  position?: string | null;
  picture?: string | null;
  branch_tokko_id?: string | null;
  payload?: Record<string, unknown>;
};

/** Actualiza la fila `tokko_users` del usuario (perfil de Tokko/CRM). Respeta RLS. */
export async function updateTokkoUserProfile(
  client: SupabaseClient,
  userId: string,
  patch: TokkoUserProfilePatch
) {
  const ts = new Date().toISOString();
  const row: Record<string, unknown> = { updated_at: ts, synced_at: ts };

  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.cellphone !== undefined) row.cellphone = patch.cellphone;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.picture !== undefined) row.picture = patch.picture;
  if (patch.branch_tokko_id !== undefined) row.branch_tokko_id = patch.branch_tokko_id;
  if (patch.payload !== undefined) row.payload = patch.payload;

  return client.from("tokko_users").update(row).eq("id", userId);
}

export type ProvisionTokkoUserPayload = {
  name: string;
  email: string;
  password: string;
  role: string;
  permissions: string[];
  phone?: string;
  address?: string;
  birthDate?: string;
  workHistory?: string[];
  picture?: string;
};

export type ProvisionTokkoUserResult = {
  ok: boolean;
  id?: string;
  message?: string;
};

/**
 * Crea cuenta `auth.users` + fila `tokko_users` mediante la Edge Function `admin-create-user`
 * (requiere service role; la función valida que el caller sea admin).
 */
export async function provisionTokkoUser(
  client: SupabaseClient,
  payload: ProvisionTokkoUserPayload
): Promise<ProvisionTokkoUserResult> {
  const body = {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    role: payload.role,
    permissions: payload.permissions,
    phone: payload.phone ?? "",
    address: payload.address ?? "",
    birthDate: payload.birthDate ?? "",
    workHistory: payload.workHistory ?? [],
    picture: payload.picture ?? "",
  };

  const { data, error } = await client.functions.invoke<{
    ok: boolean;
    id?: string;
    error?: string;
  }>("admin-create-user", { body });

  if (error) {
    // En supabase-js v2, `FunctionsHttpError.context` es el `Response` original (no un wrapper).
    const ctx = (error as unknown as { context?: unknown }).context;
    const maybeResponse =
      ctx && typeof ctx === "object" && "clone" in (ctx as object)
        ? (ctx as Response)
        : ctx && typeof ctx === "object" && "response" in (ctx as object)
          ? ((ctx as { response?: Response }).response ?? null)
          : null;

    if (maybeResponse) {
      try {
        const parsed = (await maybeResponse.clone().json()) as { error?: string };
        if (parsed?.error) return { ok: false, message: parsed.error };
      } catch {
        try {
          const text = (await maybeResponse.clone().text()).trim();
          if (text) return { ok: false, message: text };
        } catch {
          // ignorado
        }
      }
    }
    if (/Failed to send|TypeError|fetch/i.test(error.message)) {
      return {
        ok: false,
        message:
          "No se pudo contactar la función `admin-create-user`. Despliégala: `supabase functions deploy admin-create-user`.",
      };
    }
    return { ok: false, message: error.message };
  }

  if (!data?.ok) {
    return { ok: false, message: data?.error ?? "Error desconocido al crear el usuario." };
  }
  return { ok: true, id: data.id };
}

/** Cuando no hay fila en `tokko_users`, el perfil editable vive en `user_metadata` de Supabase Auth. */
export async function updateAuthUserProfileMetadata(
  client: SupabaseClient,
  patch: {
    name?: string;
    phone?: string | null;
    cellphone?: string | null;
    position?: string | null;
    picture?: string | null;
  }
) {
  const { data, error: guErr } = await client.auth.getUser();
  if (guErr) return { data: { user: null }, error: guErr };
  if (!data.user) {
    return { data: { user: null }, error: { message: "No autenticado" } };
  }
  const meta = { ...(data.user.user_metadata ?? {}) } as Record<string, unknown>;
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return { data: { user: null }, error: { message: "El nombre es obligatorio." } };
    meta.name = n;
    meta.full_name = n;
  }
  if (patch.phone !== undefined) meta.phone = (patch.phone ?? "").trim();
  if (patch.cellphone !== undefined) meta.cellphone = (patch.cellphone ?? "").trim();
  if (patch.position !== undefined) meta.position = (patch.position ?? "").trim();
  if (patch.picture !== undefined) meta.picture = (patch.picture ?? "").trim();

  return client.auth.updateUser({ data: meta });
}
