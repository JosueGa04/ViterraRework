import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { propertyFieldClass } from "./propertyFormUi";

type Props = {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
};

export function StringListEditor({ label, items, placeholder, onChange }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (!v || items.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...items, v]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-brand-navy">{label}</p>
      <div className="flex gap-2">
        <input
          className={propertyFieldClass}
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 rounded-xl px-4 font-semibold"
          onClick={add}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Añadir
        </Button>
      </div>
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-xs text-slate-700"
            >
              {item}
              <button
                type="button"
                className="text-slate-400 hover:text-red-600"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                aria-label={`Quitar ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-slate-500">Sin ítems.</p>
      )}
    </div>
  );
}
