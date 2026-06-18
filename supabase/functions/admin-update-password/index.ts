/**
 * Actualiza la contraseña de un usuario CRM (admin o el propio usuario).
 * Valida caller admin (o self) y usa service role para auth.admin.updateUserById.
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

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required secret: ${name}`);
  return v;
}

type Payload = {
  userId?: string;
  password?: string;
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_MAX = 20;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const clientKey = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown";
  if (!checkRateLimit(`admin-update-password:${clientKey}`)) {
    return jsonResponse({ ok: false, error: "Too many requests" }, 429);
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!bearer) {
      return jsonResponse({ ok: false, error: "Falta la sesión (Bearer)." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(bearer);
    if (callerErr || !callerData?.user) {
      return jsonResponse({ ok: false, error: "Sesión inválida o expirada." }, 401);
    }
    const callerId = callerData.user.id;

    const body = (await req.json().catch(() => ({}))) as Payload;
    const userId = (body.userId ?? "").trim();
    const password = body.password ?? "";

    if (!userId) {
      return jsonResponse({ ok: false, error: "Falta userId." }, 400);
    }
    if (!password || password.length < 8) {
      return jsonResponse(
        { ok: false, error: "La contraseña debe tener al menos 8 caracteres." },
        400,
      );
    }

    const callerRow = await admin
      .from("tokko_users")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    const callerRole = callerRow.data?.role ?? "";
    const isAdmin = callerRole === "admin";
    const isSelf = callerId === userId;

    if (!isAdmin && !isSelf) {
      return jsonResponse(
        { ok: false, error: "No autorizado para cambiar esta contraseña." },
        403,
      );
    }

    const updateRes = await admin.auth.admin.updateUserById(userId, { password });
    if (updateRes.error) {
      return jsonResponse({ ok: false, error: updateRes.error.message }, 400);
    }

    if (isSelf) {
      await admin
        .from("tokko_users")
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
