import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import type { User } from "../../../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { KpiUserAvatar } from "../kpis/KpiUserAvatar";
import { getSupabaseClient } from "../../../lib/supabaseClient";
import { sendDirectMessage } from "../../../lib/supabaseDirectMessages";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sender: User;
  recipient: User | null;
  /** Si está presente, se llama tras un envío exitoso (por ejemplo, para navegar al tab de mensajes). */
  onSent?: (recipientId: string) => void;
};

export function SendMessageDialog({ open, onOpenChange, sender, recipient, onSent }: Props) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) {
      setBody("");
      setSending(false);
    }
  }, [open]);

  if (!recipient) return null;

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    const client = getSupabaseClient();
    if (!client) {
      toast.error("Supabase no está configurado.");
      return;
    }
    setSending(true);
    const { error } = await sendDirectMessage(client, sender.id, recipient.id, trimmed);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Mensaje enviado a ${recipient.name}.`);
    onOpenChange(false);
    onSent?.(recipient.id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="w-full max-w-md border-slate-200 bg-white p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-semibold text-brand-navy">
            Enviar mensaje
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            El destinatario lo verá en su pestaña de Mensajes.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
          <KpiUserAvatar user={recipient} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm text-brand-navy" style={{ fontWeight: 700 }}>
              Para: {recipient.name}
            </p>
            <p className="truncate text-xs text-slate-500">{recipient.email}</p>
          </div>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={5}
          maxLength={4000}
          placeholder={`Escríbele a ${recipient.name.split(" ")[0] ?? recipient.name}…`}
          disabled={sending}
          className="mt-3 w-full resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm text-brand-navy shadow-sm placeholder:text-slate-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
          style={{ fontWeight: 500 }}
          autoFocus
        />
        <p className="mt-1 text-[10px] text-slate-400">
          Cmd/Ctrl + Enter para enviar.
        </p>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={sending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={sending || !body.trim()}
            onClick={() => void submit()}
            className="bg-primary text-primary-foreground hover:bg-brand-red-hover"
          >
            <Send className="mr-1.5 h-4 w-4" strokeWidth={2} />
            {sending ? "Enviando…" : "Enviar mensaje"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
