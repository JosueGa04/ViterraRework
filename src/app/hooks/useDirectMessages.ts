import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabaseClient";
import {
  type DirectMessageRow,
  fetchInbox,
  markConversationAsRead,
  sendDirectMessage,
  subscribeToInbox,
} from "../lib/supabaseDirectMessages";

export interface ConversationSummary {
  /** Id del otro usuario en la conversación. */
  peerId: string;
  lastMessage: DirectMessageRow;
  unreadCount: number;
}

export interface UseDirectMessagesResult {
  ready: boolean;
  loading: boolean;
  error: string | null;
  messages: DirectMessageRow[];
  conversations: ConversationSummary[];
  unreadTotal: number;
  /** Mensajes con `peerId` (yo soy emisor o receptor), orden ascendente. */
  messagesWith: (peerId: string) => DirectMessageRow[];
  /** Cuenta no-leídos con `peerId`. */
  unreadWith: (peerId: string) => number;
  send: (recipientId: string, body: string) => Promise<{ ok: boolean; message?: string }>;
  markRead: (peerId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function otherPartyId(row: DirectMessageRow, meId: string): string {
  return row.sender_id === meId ? row.recipient_id : row.sender_id;
}

function buildConversationSummaries(rows: DirectMessageRow[], meId: string): ConversationSummary[] {
  const lastByPeer = new Map<string, DirectMessageRow>();
  const unreadByPeer = new Map<string, number>();

  for (const row of rows) {
    const peerId = otherPartyId(row, meId);
    const previous = lastByPeer.get(peerId);
    if (!previous || Date.parse(row.created_at) > Date.parse(previous.created_at)) {
      lastByPeer.set(peerId, row);
    }
    if (row.recipient_id === meId && !row.read_at) {
      unreadByPeer.set(peerId, (unreadByPeer.get(peerId) ?? 0) + 1);
    }
  }

  return Array.from(lastByPeer.entries())
    .map(([peerId, lastMessage]) => ({
      peerId,
      lastMessage,
      unreadCount: unreadByPeer.get(peerId) ?? 0,
    }))
    .sort(
      (a, b) =>
        Date.parse(b.lastMessage.created_at) - Date.parse(a.lastMessage.created_at),
    );
}

export function useDirectMessages(meId: string | undefined): UseDirectMessagesResult {
  const safeMeId = meId?.trim() ?? "";
  const [messages, setMessages] = useState<DirectMessageRow[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(safeMeId));
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const meIdRef = useRef(safeMeId);
  meIdRef.current = safeMeId;

  const applyEvent = useCallback(
    (event: {
      type: "INSERT" | "UPDATE" | "DELETE";
      row: DirectMessageRow | null;
      oldRow: DirectMessageRow | null;
    }) => {
      setMessages((prev) => {
        if (event.type === "INSERT" && event.row) {
          if (prev.some((m) => m.id === event.row!.id)) return prev;
          return [...prev, event.row];
        }
        if (event.type === "UPDATE" && event.row) {
          return prev.map((m) => (m.id === event.row!.id ? { ...m, ...event.row } : m));
        }
        if (event.type === "DELETE" && event.oldRow) {
          return prev.filter((m) => m.id !== event.oldRow!.id);
        }
        return prev;
      });
    },
    [],
  );

  const refresh = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !meIdRef.current) {
      setMessages([]);
      setLoading(false);
      setReady(true);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await fetchInbox(client, meIdRef.current);
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      setReady(true);
      return;
    }
    setMessages(data ?? []);
    setError(null);
    setLoading(false);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | undefined;
    const client = getSupabaseClient();
    if (!client || !safeMeId) {
      setMessages([]);
      setLoading(false);
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    /**
     * Difiere el bootstrap del inbox a un tick ocioso para no competir con la carga
     * inicial del dashboard. Si la tabla `direct_messages` no existe (migración no
     * aplicada), evita abrir el canal Realtime y entrar en bucle de reconexión.
     */
    const boot = async () => {
      setLoading(true);
      const { data, error: fetchError } = await fetchInbox(client, safeMeId);
      if (cancelled) return;

      if (fetchError) {
        const msg = fetchError.message ?? "";
        const tableMissing = /direct_messages|relation .* does not exist|schema cache/i.test(msg);
        setError(msg);
        setLoading(false);
        setReady(true);
        if (tableMissing && import.meta.env.DEV) {
          console.warn(
            "[Viterra] Tabla `direct_messages` ausente. Aplica la migración para activar mensajes.",
          );
        }
        // Sin tabla / sin permisos no abrimos Realtime: ahorra una WS que reconectaría sin parar.
        return;
      }

      setMessages(data ?? []);
      setError(null);
      setLoading(false);
      setReady(true);

      if (cancelled) return;
      try {
        const channel = subscribeToInbox(client, safeMeId, applyEvent);
        channelRef.current = channel;
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn("[Viterra] No se pudo suscribir a Realtime de mensajes:", e);
        }
      }
    };

    const w = typeof window !== "undefined" ? (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number; cancelIdleCallback?: (handle: number) => void }) : undefined;
    if (w?.requestIdleCallback) {
      idleHandle = w.requestIdleCallback(() => void boot(), { timeout: 2000 });
    } else {
      idleHandle = window.setTimeout(() => void boot(), 250) as unknown as number;
    }

    return () => {
      cancelled = true;
      if (idleHandle !== undefined) {
        if (w?.cancelIdleCallback) {
          w.cancelIdleCallback(idleHandle);
        } else {
          window.clearTimeout(idleHandle as unknown as number);
        }
      }
      if (channelRef.current) {
        void client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [safeMeId, applyEvent]);

  const conversations = useMemo(
    () => (safeMeId ? buildConversationSummaries(messages, safeMeId) : []),
    [messages, safeMeId],
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((acc, c) => acc + c.unreadCount, 0),
    [conversations],
  );

  const messagesWith = useCallback(
    (peerId: string) => {
      const peer = peerId.trim();
      if (!peer || !safeMeId) return [];
      return messages
        .filter(
          (m) =>
            (m.sender_id === safeMeId && m.recipient_id === peer) ||
            (m.sender_id === peer && m.recipient_id === safeMeId),
        )
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    },
    [messages, safeMeId],
  );

  const unreadWith = useCallback(
    (peerId: string) => {
      const peer = peerId.trim();
      if (!peer || !safeMeId) return 0;
      return messages.filter(
        (m) => m.recipient_id === safeMeId && m.sender_id === peer && !m.read_at,
      ).length;
    },
    [messages, safeMeId],
  );

  const send = useCallback<UseDirectMessagesResult["send"]>(
    async (recipientId, body) => {
      const client = getSupabaseClient();
      if (!client) {
        return { ok: false, message: "Supabase no está configurado." };
      }
      if (!safeMeId) {
        return { ok: false, message: "Sesión no válida." };
      }
      const { data, error: sendError } = await sendDirectMessage(
        client,
        safeMeId,
        recipientId,
        body,
      );
      if (sendError || !data) {
        return { ok: false, message: sendError?.message ?? "No se pudo enviar el mensaje." };
      }
      setMessages((prev) =>
        prev.some((m) => m.id === data.id) ? prev : [...prev, data],
      );
      return { ok: true };
    },
    [safeMeId],
  );

  const markRead = useCallback<UseDirectMessagesResult["markRead"]>(
    async (peerId) => {
      const client = getSupabaseClient();
      const peer = peerId.trim();
      if (!client || !safeMeId || !peer) return;
      const { error: updErr } = await markConversationAsRead(client, safeMeId, peer);
      if (updErr) {
        setError(updErr.message);
        return;
      }
      const now = new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) =>
          m.recipient_id === safeMeId && m.sender_id === peer && !m.read_at
            ? { ...m, read_at: now }
            : m,
        ),
      );
    },
    [safeMeId],
  );

  return {
    ready,
    loading,
    error,
    messages,
    conversations,
    unreadTotal,
    messagesWith,
    unreadWith,
    send,
    markRead,
    refresh,
  };
}
