import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/** Fila tal como vive en `public.direct_messages`. */
export interface DirectMessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

/** Lista la conversación completa entre dos usuarios, en orden ascendente. */
export async function fetchConversation(
  client: SupabaseClient,
  meId: string,
  otherId: string,
): Promise<{ data: DirectMessageRow[] | null; error: Error | null }> {
  const a = meId.trim();
  const b = otherId.trim();
  if (!a || !b) return { data: [], error: null };
  const res = await client
    .from("direct_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(
      `and(sender_id.eq.${a},recipient_id.eq.${b}),and(sender_id.eq.${b},recipient_id.eq.${a})`,
    )
    .order("created_at", { ascending: true });
  if (res.error) return { data: null, error: new Error(res.error.message) };
  return { data: (res.data ?? []) as DirectMessageRow[], error: null };
}

/** Trae todos los mensajes donde el usuario es parte. Útil para hidratar la bandeja completa. */
export async function fetchInbox(
  client: SupabaseClient,
  meId: string,
): Promise<{ data: DirectMessageRow[] | null; error: Error | null }> {
  const id = meId.trim();
  if (!id) return { data: [], error: null };
  const res = await client
    .from("direct_messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(`sender_id.eq.${id},recipient_id.eq.${id}`)
    .order("created_at", { ascending: true });
  if (res.error) return { data: null, error: new Error(res.error.message) };
  return { data: (res.data ?? []) as DirectMessageRow[], error: null };
}

/** Inserta un nuevo mensaje. `sender_id` lo fuerza RLS al `auth.uid()`. */
export async function sendDirectMessage(
  client: SupabaseClient,
  senderId: string,
  recipientId: string,
  body: string,
): Promise<{ data: DirectMessageRow | null; error: Error | null }> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { data: null, error: new Error("El mensaje no puede estar vacío.") };
  }
  if (trimmed.length > 4000) {
    return { data: null, error: new Error("El mensaje es demasiado largo (máx. 4000 caracteres).") };
  }
  if (senderId === recipientId) {
    return { data: null, error: new Error("No puedes mensajearte a ti mismo.") };
  }
  const res = await client
    .from("direct_messages")
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      body: trimmed,
    })
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .single();
  if (res.error) return { data: null, error: new Error(res.error.message) };
  return { data: res.data as DirectMessageRow, error: null };
}

/** Marca como leídos los mensajes que `meId` recibió de `otherId`. */
export async function markConversationAsRead(
  client: SupabaseClient,
  meId: string,
  otherId: string,
): Promise<{ count: number; error: Error | null }> {
  const me = meId.trim();
  const other = otherId.trim();
  if (!me || !other) return { count: 0, error: null };
  const res = await client
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", me)
    .eq("sender_id", other)
    .is("read_at", null)
    .select("id");
  if (res.error) return { count: 0, error: new Error(res.error.message) };
  return { count: res.data?.length ?? 0, error: null };
}

/** Borra un mensaje propio (sólo el emisor puede). */
export async function deleteDirectMessage(
  client: SupabaseClient,
  messageId: string,
): Promise<{ error: Error | null }> {
  const id = messageId.trim();
  if (!id) return { error: null };
  const res = await client.from("direct_messages").delete().eq("id", id);
  if (res.error) return { error: new Error(res.error.message) };
  return { error: null };
}

function uniqueChannelSuffix(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Suscribe al canal Realtime para reflejar mensajes entrantes y salientes del usuario.
 * Usa un nombre único para evitar colisiones con StrictMode/HMR y delega el filtrado a RLS
 * (sólo recibirás eventos donde seas sender o recipient).
 */
export function subscribeToInbox(
  client: SupabaseClient,
  meId: string,
  handler: (event: {
    type: "INSERT" | "UPDATE" | "DELETE";
    row: DirectMessageRow | null;
    oldRow: DirectMessageRow | null;
  }) => void,
): RealtimeChannel {
  const id = meId.trim();
  const channelName = `dm:${id}:${uniqueChannelSuffix()}`;
  const channel = client.channel(channelName);

  channel
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "direct_messages" },
      (payload) => {
        const row = (payload.new as DirectMessageRow | null) ?? null;
        const oldRow = (payload.old as DirectMessageRow | null) ?? null;
        const involvesMe =
          (row && (row.sender_id === id || row.recipient_id === id)) ||
          (oldRow && (oldRow.sender_id === id || oldRow.recipient_id === id));
        if (!involvesMe) return;
        handler({
          type: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          row,
          oldRow,
        });
      },
    )
    .subscribe();

  return channel;
}
