/**
 * Pruebas de penetración RLS (checklist docs/RLS-CHECKLIST.md).
 * Ejecutar: npm run test:rls:script
 *
 * IMPORTANTE: TEST_ASESOR_* debe ser un usuario con role=asesor en tokko_users (no admin).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // noop
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.TEST_ASESOR_EMAIL?.trim();
const password = process.env.TEST_ASESOR_PASSWORD;

if (!url || !anonKey) {
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

if (!email || !password) {
  console.error("Configura TEST_ASESOR_EMAIL y TEST_ASESOR_PASSWORD en .env");
  process.exit(1);
}

const client = createClient(url, anonKey);

function pass(name, detail) {
  console.log(`✅ PASS — ${name}: ${detail}`);
  return true;
}

function fail(name, detail) {
  console.error(`❌ FAIL — ${name}: ${detail}`);
  return false;
}

function leadBelongsToUser(lead, uid, tokkoUserId) {
  const assigned = (lead.assigned_to_user_id ?? "").trim();
  if (!assigned) return false;
  if (assigned === uid) return true;
  if (tokkoUserId && assigned === tokkoUserId) return true;
  return false;
}

async function main() {
  console.log("RLS penetration test (asesor)…\n");

  const { data: signIn, error: signInErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !signIn.user) {
    console.error("No se pudo iniciar sesión:", signInErr?.message);
    process.exit(2);
  }
  const uid = signIn.user.id;

  const { data: profile, error: profileErr } = await client
    .from("tokko_users")
    .select("id, email, role, tokko_user_id, permissions")
    .eq("id", uid)
    .maybeSingle();

  if (profileErr || !profile) {
    console.error("No se pudo leer tokko_users:", profileErr?.message);
    process.exit(2);
  }

  console.log(`Sesión: ${email} (${uid})`);
  console.log(`Rol en tokko_users: ${profile.role ?? "(null)"}\n`);

  if (profile.role === "admin") {
    console.error(
      "❌ ABORT — Este usuario es admin, no asesor. Las pruebas RLS de asesor no aplican.\n" +
        "   Crea un usuario con role=asesor o usa sus credenciales en TEST_ASESOR_*.",
    );
    await client.auth.signOut();
    process.exit(3);
  }

  if (profile.role === "lider_grupo") {
    console.warn(
      "⚠ Aviso: el usuario es lider_grupo; algunas pruebas pueden comportarse distinto que un asesor puro.\n",
    );
  }

  const tokkoUserId = (profile.tokko_user_id ?? "").trim();
  let ok = 0;
  let total = 4;

  // 1) Update lead ajeno (excluir asignación por UUID o tokko_user_id)
  const { data: allLeads } = await client.from("leads").select("id, assigned_to_user_id").limit(200);
  const foreignLead = (allLeads ?? []).find((l) => !leadBelongsToUser(l, uid, tokkoUserId));

  if (!foreignLead?.id) {
    console.warn("⚠ SKIP — update lead ajeno: no hay leads de otro asesor");
    total -= 1;
  } else {
    const { data: updData, error: updErr } = await client
      .from("leads")
      .update({ priority_stars: 4 })
      .eq("id", foreignLead.id)
      .select("id");
    const blocked = Boolean(updErr) || !updData?.length;
    if (blocked) ok += pass("update lead ajeno", updErr?.message || "0 filas afectadas");
    else ok += fail("update lead ajeno", `se modificó lead ${foreignLead.id}`);
  }

  // 2) Elevar propio rol
  const { data: roleData, error: roleErr } = await client
    .from("tokko_users")
    .update({ role: "admin" })
    .eq("id", uid)
    .select("id, role");

  const roleBlocked = Boolean(roleErr) || !roleData?.length;
  if (roleBlocked) ok += pass("elevar rol", roleErr?.message || "0 filas");
  else {
    ok += fail("elevar rol", `role=${roleData?.[0]?.role}`);
    await client.from("tokko_users").update({ role: profile.role }).eq("id", uid);
  }

  // 3) Mensajes donde el usuario NO participa
  const { data: msgs } = await client
    .from("direct_messages")
    .select("id, sender_id, recipient_id")
    .limit(50);

  const foreignMsgs = (msgs ?? []).filter(
    (m) => m.sender_id !== uid && m.recipient_id !== uid,
  );
  if (foreignMsgs.length > 0) {
    ok += fail("leer mensajes ajenos", `expuso ${foreignMsgs.length} filas ajenas`);
  } else {
    ok += pass(
      "leer mensajes ajenos",
      msgs?.length ? `${msgs.length} filas propias (OK)` : "0 filas",
    );
  }

  // 4) Borrar grupo
  const { data: groups } = await client.from("user_groups").select("id").limit(1);
  const groupId = groups?.[0]?.id;
  if (!groupId) {
    console.warn("⚠ SKIP — delete grupo: no hay user_groups");
    total -= 1;
  } else {
    const { data: delData, error: delErr } = await client
      .from("user_groups")
      .delete()
      .eq("id", groupId)
      .select("id");
    const delBlocked = Boolean(delErr) || !delData?.length;
    if (delBlocked) ok += pass("delete grupo", delErr?.message || "0 filas");
    else ok += fail("delete grupo", "se borró un grupo");
  }

  await client.auth.signOut();

  console.log(`\nResultado: ${ok}/${total} pruebas pasaron`);
  process.exit(ok === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
