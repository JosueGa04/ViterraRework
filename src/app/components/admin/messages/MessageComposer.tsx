import { useState } from "react";
import { Send } from "lucide-react";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  onSend: (body: string) => Promise<{ ok: boolean; message?: string }>;
};

export function MessageComposer({ disabled = false, placeholder, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending || disabled) return;
    setSending(true);
    setError(null);
    const result = await onSend(body);
    setSending(false);
    if (!result.ok) {
      setError(result.message ?? "No se pudo enviar.");
      return;
    }
    setDraft("");
  };

  return (
    <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3">
      {error ? (
        <p className="mb-2 text-xs text-red-700">{error}</p>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder ?? "Escribe un mensaje…"}
          disabled={disabled || sending}
          rows={1}
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-brand-navy shadow-sm placeholder:text-slate-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
          style={{ fontWeight: 500 }}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || sending || !draft.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-red-hover disabled:opacity-50"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-400">
        Enter envía · Shift+Enter agrega salto de línea
      </p>
    </div>
  );
}
