import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { User } from "../../../contexts/AuthContext";
import { KpiUserAvatar } from "../kpis/KpiUserAvatar";
import { foldSearchText } from "../../../lib/searchText";
import type { ConversationSummary } from "../../../hooks/useDirectMessages";
import { cn } from "../../ui/utils";

type Props = {
  conversations: ConversationSummary[];
  usersById: Map<string, User>;
  selectedPeerId: string | null;
  onSelectPeer: (peerId: string) => void;
  onStartNew: () => void;
};

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} d`;
  return new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function ConversationList({
  conversations,
  usersById,
  selectedPeerId,
  onSelectPeer,
  onStartNew,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = foldSearchText(query);
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const peer = usersById.get(conv.peerId);
      const name = foldSearchText(peer?.name ?? "");
      const body = foldSearchText(conv.lastMessage.body);
      return name.includes(q) || body.includes(q);
    });
  }, [conversations, usersById, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200/80 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">Mensajes</h3>
          <button
            type="button"
            onClick={onStartNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-red-hover"
            title="Nueva conversación"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            Nueva
          </button>
        </div>
        <div className="relative mt-3">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversación…"
            className="h-9 w-full rounded-lg border border-slate-200/90 bg-white pl-9 pr-3 text-sm text-brand-navy shadow-sm placeholder:text-slate-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/40">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-500">
            {query ? "Sin coincidencias." : "Aún no tienes conversaciones."}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/80">
            {filtered.map((conv) => {
              const peer = usersById.get(conv.peerId);
              const active = selectedPeerId === conv.peerId;
              const fallbackName = peer?.name ?? "Usuario";
              return (
                <li key={conv.peerId}>
                  <button
                    type="button"
                    onClick={() => onSelectPeer(conv.peerId)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-3 text-left transition",
                      active ? "bg-primary/[0.08]" : "hover:bg-white",
                    )}
                  >
                    {peer ? (
                      <KpiUserAvatar user={peer} size="md" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-semibold text-white">
                        ?
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            active ? "text-primary" : "text-brand-navy",
                          )}
                          style={{ fontWeight: 700 }}
                        >
                          {fallbackName}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-500">
                          {relativeTime(conv.lastMessage.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {conv.lastMessage.body}
                      </p>
                    </div>
                    {conv.unreadCount > 0 ? (
                      <span
                        className="ml-1 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white"
                        aria-label={`${conv.unreadCount} mensajes sin leer`}
                      >
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
