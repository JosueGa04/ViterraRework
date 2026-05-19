/**
 * Crea un usuario CRM completo desde el panel admin:
 * 1) Valida que el caller (JWT) tenga `role = 'admin'` en `tokko_users`.
 * 2) Crea la cuenta en `auth.users` con service role (confirmando el email).
 * 3) Inserta la fila en `public.tokko_users` con rol/permisos/perfil.
 *
 * Secrets (Dashboard → Edge Functions):
 * - SUPABASE_URL                      — auto-inyectado
 * - SUPABASE_SERVICE_ROLE_KEY         — auto-inyectado
 * - SUPABASE_ANON_KEY                 — auto-inyectado
 *
 * Despliegue:
 *   supabase functions deploy admin-create-user
 *
 * Invocación desde el cliente:
 *   supabase.functions.invoke("admin-create-user", { body: { name, email, password, role, permissions, ... } })
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEnv(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.length > 0 ? v : undefined;
}

function requireEnv(name: string): string {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing required secret: ${name}`);
  return v;
}

type Role = "admin" | "lider_grupo" | "asesor";
const VALID_ROLES: Role[] = ["admin", "lider_grupo", "asesor"];

type Payload = {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  permissions?: string[];
  phone?: string;
  address?: string;
  birthDate?: string;
  workHistory?: string[];
  picture?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!bearer) {
      return jsonResponse(
        { ok: false, error: "Falta la sesión del administrador (Bearer)." },
        401
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(bearer);
    if (callerErr || !callerData?.user) {
      return jsonResponse({ ok: false, error: "Sesión inválida o expirada." }, 401);
    }
    const callerId = callerData.user.id;

    const callerRow = await admin
      .from("tokko_users")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();
    if (callerRow.error) {
      return jsonResponse(
        { ok: false, error: `No se pudo validar el rol del solicitante: ${callerRow.error.message}` },
        500
      );
    }
    if ((callerRow.data?.role ?? "") !== "admin") {
      return jsonResponse(
        { ok: false, error: "Solo un administrador puede crear usuarios." },
        403
      );
    }

    const body = (await req.json().catch(() => ({}))) as Payload;

    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const role = (body.role ?? "asesor") as Role;
    const permissions = Array.isArray(body.permissions)
      ? Array.from(new Set(body.permissions.map((p) => String(p).trim()).filter(Boolean)))
      : [];

    if (!name) {
      return jsonResponse({ ok: false, error: "El nombre es obligatorio." }, 400);
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ ok: false, error: "Correo inválido." }, 400);
    }
    if (!password || password.length < 6) {
      return jsonResponse(
        { ok: false, error: "La contraseña debe tener al menos 6 caracteres." },
        400
      );
    }
    if (!VALID_ROLES.includes(role)) {
      return jsonResponse({ ok: false, error: "Rol inválido." }, 400);
    }

    const dupRow = await admin
      .from("tokko_users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (dupRow.error && dupRow.error.code !== "PGRST116") {
      return jsonResponse(
        { ok: false, error: `Error verificando duplicados: ${dupRow.error.message}` },
        500
      );
    }
    if (dupRow.data?.id) {
      return jsonResponse(
        { ok: false, error: "Ya existe un usuario con ese correo." },
        409
      );
    }

    const createRes = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, name },
    });
    if (createRes.error || !createRes.data.user) {
      const msg = createRes.error?.message ?? "No se pudo crear la cuenta.";
      const status = /already|registered|exists|duplicate/i.test(msg) ? 409 : 400;
      return jsonResponse({ ok: false, error: msg }, status);
    }
    const newUserId = createRes.data.user.id;

    const nowIso = new Date().toISOString();
    const payloadExtras: Record<string, unknown> = {};
    if ((body.address ?? "").trim()) payloadExtras.address = body.address!.trim();
    if ((body.birthDate ?? "").trim()) payloadExtras.birth_date = body.birthDate!.trim();
    if (Array.isArray(body.workHistory) && body.workHistory.length > 0) {
      payloadExtras.work_history = body.workHistory;
    }

    const insertRow: Record<string, unknown> = {
      id: newUserId,
      tokko_user_id: `crm-${newUserId}`,
      name,
      email,
      role,
      permissions,
      must_change_password: false,
      synced_at: nowIso,
      updated_at: nowIso,
    };
    if ((body.phone ?? "").trim()) insertRow.phone = body.phone!.trim();
    if ((body.picture ?? "").trim()) insertRow.picture = body.picture!.trim();
    if (Object.keys(payloadExtras).length > 0) insertRow.payload = payloadExtras;

    const insertRes = await admin.from("tokko_users").insert(insertRow);
    if (insertRes.error) {
      // Rollback best-effort de la cuenta auth para no dejar huérfana.
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return jsonResponse(
        {
          ok: false,
          error: `No se pudo crear la fila en tokko_users: ${insertRes.error.message}`,
        },
        500
      );
    }

    return jsonResponse({
      ok: true,
      id: newUserId,
      email,
      name,
      role,
      permissions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
