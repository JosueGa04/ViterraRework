import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Search, X } from "lucide-react";
import type { User } from "../../../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { KpiUserAvatar } from "../kpis/KpiUserAvatar";
import { foldSearchText } from "../../../lib/searchText";
import { useDirectMessages } from "../../../hooks/useDirectMessages";
import { ConversationList } from "./ConversationList";
import { ChatThread } from "./ChatThread";
import { MessageComposer } from "./MessageComposer";
import { cn } from "../../ui/utils";

type Props = {
  currentUser: User;
  users: User[];
  initialPeerId?: string | null;
  onPeerIdChange?: (peerId: string | null) => void;
};

export function MessagesModule({ currentUser, users, initialPeerId, onPeerIdChange }: Props) {
  const messaging = useDirectMessages(currentUser.id);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(initialPeerId ?? null);
  const [newOpen, setNewOpen] = useState(false);
  const [newQuery, setNewQuery] = useState("");

  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  useEffect(() => {
    if (initialPeerId && initialPeerId !== selectedPeerId) {
      setSelectedPeerId(initialPeerId);
    }
  }, [initialPeerId, selectedPeerId]);

  useEffect(() => {
    if (!selectedPeerId) return;
    void messaging.markRead(selectedPeerId);
  }, [selectedPeerId, messaging.messages.length, messaging]);

  const handleSelect = useCallback(
    (peerId: string) => {
      setSelectedPeerId(peerId);
      onPeerIdChange?.(peerId);
      void messaging.markRead(peerId);
    },
    [messaging, onPeerIdChange],
  );

  const peerUser = useMemo(
    () => (selectedPeerId ? usersById.get(selectedPeerId) ?? null : null),
    [selectedPeerId, usersById],
  );

  const messagesWithPeer = useMemo(
    () => (selectedPeerId ? messaging.messagesWith(selectedPeerId) : []),
    [selectedPeerId, messaging],
  );

  const candidatesForNew = useMemo(() => {
    const q = foldSearchText(newQuery);
    const list = users
      .filter((u) => u.id !== currentUser.id && u.isActive)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (!q) return list;
    return list.filter((u) => {
      const blob = foldSearchText(`${u.name} ${u.email}`);
      return blob.includes(q);
    });
  }, [users, currentUser.id, newQuery]);

  const send = useCallback(
    async (body: string) => {
      if (!selectedPeerId) {
        return { ok: false, message: "Selecciona un destinatario primero." };
      }
      return messaging.send(selectedPeerId, body);
    },
    [messaging, selectedPeerId],
  );

  if (!messaging.ready && messaging.loading) {
    return (
      <div className="flex h-[calc(100dvh-9rem)] items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-sm text-slate-500">
        Cargando mensajes…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {messaging.error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {messaging.error}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[20rem_1fr]">
        <aside className="hidden border-r border-slate-200/80 md:flex md:min-h-0 md:flex-col">
          <ConversationList
            conversations={messaging.conversations}
            usersById={usersById}
            selectedPeerId={selectedPeerId}
            onSelectPeer={handleSelect}
            onStartNew={() => setNewOpen(true)}
          />
        </aside>
        <section className="flex min-h-0 flex-col">
          {selectedPeerId ? (
            <>
              <ChatThread
                meId={currentUser.id}
                currentUser={currentUser}
                peer={peerUser}
                peerId={selectedPeerId}
                messages={messagesWithPeer}
                usersById={usersById}
              />
              <MessageComposer
                disabled={!selectedPeerId}
                placeholder={peerUser ? `Mensaje a ${peerUser.name}…` : undefined}
                onSend={send}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-slate-50/40 px-6 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200/80">
                <MessageSquare className="h-7 w-7 text-slate-400" strokeWidth={1.5} />
              </span>
              <p className="max-w-sm text-sm text-slate-600">
                Selecciona una conversación o pulsa <span className="font-semibold text-brand-navy">Nueva</span> para escribirle a alguien del equipo.
              </p>
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-red-hover"
              >
                Iniciar conversación
              </button>
            </div>
          )}
        </section>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="w-full max-w-md border-slate-200 bg-white p-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold text-brand-navy">
              Nueva conversación
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Elige a un compañero para iniciar el chat.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              className="h-9 w-full rounded-lg border border-slate-200/90 bg-white pl-9 pr-3 text-sm text-brand-navy shadow-sm placeholder:text-slate-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-200/80 bg-slate-50/50">
            {candidatesForNew.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">
                Sin resultados.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200/80">
                {candidatesForNew.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setNewOpen(false);
                        setNewQuery("");
                        handleSelect(u.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white",
                        selectedPeerId === u.id && "bg-primary/[0.06]",
                      )}
                    >
                      <KpiUserAvatar user={u} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-brand-navy" style={{ fontWeight: 600 }}>
                          {u.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{u.email}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
