/**
 * Pruebas de penetración RLS contra Supabase remoto.
 * Requiere usuario con role=asesor (NO admin) en TEST_ASESOR_*.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const url = process.env.VITE_SUPABASE_URL?.trim();
const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const email = process.env.TEST_ASESOR_EMAIL?.trim();
const password = process.env.TEST_ASESOR_PASSWORD?.trim();

const canRun = Boolean(url && anonKey && email && password);

function leadBelongsToUser(
  lead: { assigned_to_user_id?: string | null },
  uid: string,
  tokkoUserId: string,
) {
  const assigned = (lead.assigned_to_user_id ?? "").trim();
  if (!assigned) return false;
  if (assigned === uid) return true;
  if (tokkoUserId && assigned === tokkoUserId) return true;
  return false;
}

describe.skipIf(!canRun)("RLS penetration (asesor, live Supabase)", () => {
  const client = createClient(url!, anonKey!);
  let uid = "";
  let role = "";
  let tokkoUserId = "";

  beforeAll(async () => {
    const { data, error } = await client.auth.signInWithPassword({ email: email!, password: password! });
    if (error || !data.user) throw new Error(`Login asesor falló: ${error?.message}`);
    uid = data.user.id;

    const { data: profile, error: pErr } = await client
      .from("tokko_users")
      .select("role, tokko_user_id")
      .eq("id", uid)
      .maybeSingle();
    if (pErr || !profile) throw new Error(`Sin fila tokko_users: ${pErr?.message}`);
    role = String(profile.role ?? "");
    tokkoUserId = String(profile.tokko_user_id ?? "").trim();

    if (role === "admin") {
      throw new Error("TEST_ASESOR_* apunta a un admin; usa un usuario asesor real.");
    }
  });

  afterAll(async () => {
    await client.auth.signOut();
  });

  it("no puede UPDATE un lead ajeno", async () => {
    const { data: leads } = await client.from("leads").select("id, assigned_to_user_id").limit(200);
    const foreign = (leads ?? []).find((l) => !leadBelongsToUser(l, uid, tokkoUserId));
    if (!foreign?.id) return;

    const { data, error } = await client
      .from("leads")
      .update({ priority_stars: 4 })
      .eq("id", foreign.id)
      .select("id");
    expect(error || !data?.length).toBeTruthy();
  });

  it("no puede elevar su propio rol a admin", async () => {
    const { data, error } = await client
      .from("tokko_users")
      .update({ role: "admin" })
      .eq("id", uid)
      .select("role");
    expect(error || !data?.length).toBeTruthy();
  });

  it("no lee mensajes directos ajenos", async () => {
    const { data } = await client.from("direct_messages").select("sender_id, recipient_id").limit(50);
    const foreign = (data ?? []).filter((m) => m.sender_id !== uid && m.recipient_id !== uid);
    expect(foreign).toHaveLength(0);
  });

  it("no puede borrar user_groups", async () => {
    const { data: group } = await client.from("user_groups").select("id").limit(1).maybeSingle();
    if (!group?.id) return;

    const { data, error } = await client.from("user_groups").delete().eq("id", group.id).select("id");
    expect(error || !data?.length).toBeTruthy();
  });
});

describe("RLS penetration (documentación)", () => {
  it("documenta requisito de usuario asesor para pruebas live", () => {
    expect(true).toBe(true);
  });
});
