import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../ui/utils";
import { foldFeatureLabel } from "../../../lib/featureIcons";
import { propertyFieldClass } from "./propertyFormUi";

export type PropertyTypeOption = { tokko_type_id: string; name: string };

type Props = {
  types: PropertyTypeOption[];
  typeName: string;
  propertyTypeTokkoId?: string;
  onSelectCatalog: (tokkoTypeId: string, name: string) => void;
  onSelectOther: (customName: string) => void;
  onClear: () => void;
};

function matchesSearch(name: string, query: string) {
  if (!query) return true;
  return foldFeatureLabel(name).includes(foldFeatureLabel(query));
}

export function PropertyTypeSearchSelect({
  types,
  typeName,
  propertyTypeTokkoId,
  onSelectCatalog,
  onSelectOther,
  onClear,
}: Props) {
  const [query, setQuery] = useState("");
  const isOtherMode = Boolean(typeName.trim() && !propertyTypeTokkoId);
  const [otherOpen, setOtherOpen] = useState(isOtherMode);
  const [otherInput, setOtherInput] = useState(isOtherMode ? typeName : "");

  const filtered = useMemo(
    () => types.filter((t) => matchesSearch(t.name, query)),
    [types, query],
  );

  const selectedCatalog = propertyTypeTokkoId
    ? types.find((t) => t.tokko_type_id === propertyTypeTokkoId)
    : null;

  if (otherOpen || isOtherMode) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-600">Tipo personalizado (no está en catálogo Tokko)</p>
        <input
          className={propertyFieldClass}
          value={otherInput}
          onChange={(e) => setOtherInput(e.target.value)}
          placeholder="Ej. Loft industrial, Rancho…"
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
            onClick={() => {
              const v = otherInput.trim();
              if (!v) return;
              onSelectOther(v);
              setOtherOpen(false);
            }}
          >
            Usar este tipo
          </button>
          <button
            type="button"
            className="h-11 rounded-xl border border-stone-200 px-4 text-sm font-medium text-slate-700"
            onClick={() => {
              setOtherOpen(false);
              setOtherInput("");
              if (isOtherMode) onClear();
            }}
          >
            Volver al catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedCatalog ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
          <span className="text-sm font-medium text-brand-navy">{selectedCatalog.name}</span>
          <button
            type="button"
            className="text-xs font-medium text-slate-500 hover:text-red-600"
            onClick={() => {
              onClear();
              setQuery("");
            }}
          >
            Cambiar
          </button>
        </div>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar tipo de inmueble…"
          className={propertyFieldClass + " pl-10"}
        />
      </div>

      <div className="max-h-[220px] overflow-y-auto rounded-xl border border-stone-200/80 bg-stone-50/30 p-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-500">Sin coincidencias.</p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((t) => {
              const active = t.tokko_type_id === propertyTypeTokkoId;
              return (
                <li key={t.tokko_type_id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCatalog(t.tokko_type_id, t.name);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                      active
                        ? "bg-primary/10 font-semibold text-brand-navy ring-1 ring-primary/25"
                        : "text-slate-700 hover:bg-white hover:shadow-sm",
                    )}
                  >
                    {t.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        className="w-full rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-slate-600 transition hover:border-primary/40 hover:bg-stone-50"
        onClick={() => {
          setOtherOpen(true);
          setOtherInput(typeName && !propertyTypeTokkoId ? typeName : "");
        }}
      >
        Otro (escribir tipo)
      </button>
    </div>
  );
}
