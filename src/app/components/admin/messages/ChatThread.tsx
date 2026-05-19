import { useEffect, useRef } from "react";
import type { User } from "../../../contexts/AuthContext";
import { KpiUserAvatar } from "../kpis/KpiUserAvatar";
import type { DirectMessageRow } from "../../../lib/supabaseDirectMessages";
import { cn } from "../../ui/utils";

type Props = {
  meId: string;
  peer: User | null;
  peerId: string;
  messages: DirectMessageRow[];
  usersById: Map<string, User>;
};

function fullTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shouldGroupWithPrevious(
  current: DirectMessageRow,
  prev: DirectMessageRow | undefined,
): boolean {
  if (!prev) return false;
  if (prev.sender_id !== current.sender_id) return false;
  const gapMs = Date.parse(current.created_at) - Date.parse(prev.created_at);
  return gapMs >= 0 && gapMs < 5 * 60_000;
}

export function ChatThread({ meId, peer, peerId, messages, usersById }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(messages.length);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    lastCountRef.current = messages.length;
  }, [messages.length, peerId]);

  if (!peerId) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center bg-slate-50/40 px-8 text-center text-slate-500">
        <p className="text-sm">Selecciona una conversación para empezar.</p>
        <p className="mt-1 text-xs">O abre el perfil de un usuario y pulsa «Enviar mensaje».</p>
      </div>
    );
  }

  const peerName = peer?.name ?? "Usuario";

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50/40">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-3">
        {peer ? (
          <KpiUserAvatar user={peer} size="md" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-300 text-xs font-semibold text-white">
            ?
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-brand-navy" style={{ fontWeight: 700 }}>
            {peerName}
          </p>
          {peer?.email ? (
            <p className="truncate text-xs text-slate-500">{peer.email}</p>
          ) : null}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-slate-500">
              No hay mensajes todavía. Escribe el primero abajo.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : undefined;
            const grouped = shouldGroupWithPrevious(m, prev);
            const isMine = m.sender_id === meId;
            const sender = isMine ? null : (usersById.get(m.sender_id) ?? peer);
            const senderName = isMine ? "Tú" : sender?.name ?? "Usuario";
            return (
              <div
                key={m.id}
                className={cn("flex gap-3", isMine ? "flex-row-reverse" : "flex-row")}
              >
                <div className="w-9 shrink-0">
                  {!grouped && sender ? (
                    <KpiUserAvatar user={sender} size="sm" />
                  ) : !grouped && isMine ? (
                    <span className="block h-8 w-8 rounded-full bg-primary/20" aria-hidden />
                  ) : null}
                </div>
                <div
                  className={cn(
                    "min-w-0 max-w-[min(80%,30rem)]",
                    isMine ? "items-end text-right" : "items-start text-left",
                  )}
                >
                  {!grouped ? (
                    <div
                      className={cn(
                        "mb-0.5 flex items-baseline gap-2",
                        isMine ? "justify-end" : "justify-start",
                      )}
                    >
                      <span className="text-xs text-brand-navy" style={{ fontWeight: 700 }}>
                        {senderName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {fullTime(m.created_at)}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-white text-brand-navy ring-1 ring-slate-200/80",
                    )}
                    style={{ fontWeight: 500 }}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
