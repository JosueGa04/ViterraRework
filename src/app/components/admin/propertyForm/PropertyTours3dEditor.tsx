import { useState } from "react";
import { Box, Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import type { PropertyTour3dEntry } from "../../../lib/propertyTours3d";
import {
  newPropertyTour3dId,
  propertyTours3dToJson,
} from "../../../lib/propertyTours3d";
import { propertyFieldClass } from "./propertyFormUi";

const MAX_TOURS = 12;

type Props = {
  tours: PropertyTour3dEntry[];
  onChange: (tours: PropertyTour3dEntry[]) => void;
};

export function PropertyTours3dEditor({ tours, onChange }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");

  const list = propertyTours3dToJson(tours);

  const updateEntry = (id: string, patch: Partial<PropertyTour3dEntry>) => {
    onChange(list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeAt = (index: number) => {
    onChange(list.filter((_, i) => i !== index));
  };

  const addTour = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (list.length >= MAX_TOURS) {
      window.alert(`Máximo ${MAX_TOURS} recorridos 3D por propiedad.`);
      return;
    }
    const label = titleInput.trim() || undefined;
    onChange([...list, { id: newPropertyTour3dId(), url, label }]);
    setUrlInput("");
    setTitleInput("");
  };

  return (
    <div className="space-y-4">
      {list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((entry, index) => (
            <li
              key={entry.id}
              className="rounded-xl border border-stone-200/90 bg-stone-50/50 p-3 ring-1 ring-stone-100"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Título en la ficha pública
                  </label>
                  <input
                    className={propertyFieldClass}
                    value={entry.label ?? ""}
                    placeholder={
                      list.length > 1
                        ? `Ej. Planta baja · Recorrido 3D ${index + 1}`
                        : "Ej. Tour Matterport, Vista aérea…"
                    }
                    onChange={(e) =>
                      updateEntry(entry.id, { label: e.target.value.trim() || undefined })
                    }
                  />
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => removeAt(index)}
                  aria-label="Quitar recorrido 3D"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-hidden rounded-xl ring-1 ring-stone-200/80">
                <iframe
                  title={entry.label?.trim() || `Vista previa tour ${index + 1}`}
                  src={entry.url}
                  className="h-40 w-full bg-stone-100"
                  allow="fullscreen; xr-spatial-tracking"
                />
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 border-t border-stone-100 py-2 text-[11px] font-medium text-primary hover:underline"
                >
                  Abrir en nueva pestaña
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-center text-sm text-slate-500">
          Sin recorridos 3D. Añade enlaces de Matterport, Kuula u otro visor embebible.
        </p>
      )}

      {list.length < MAX_TOURS ? (
        <div className="rounded-xl border border-stone-200/90 bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Plus className="h-4 w-4" />
            Añadir recorrido 3D
          </p>
          <div className="mb-3 space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600">Título (opcional)</label>
            <input
              className={propertyFieldClass}
              value={titleInput}
              placeholder="Ej. Planta alta, Estacionamiento…"
              onChange={(e) => setTitleInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              className={propertyFieldClass}
              value={urlInput}
              placeholder="https://my.matterport.com/…"
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTour();
                }
              }}
            />
            <Button type="button" className="h-11 shrink-0 rounded-xl px-4" onClick={addTour}>
              Añadir
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-[11px] text-slate-500">
        <Box className="mr-1 inline h-3.5 w-3.5" />
        {list.length}/{MAX_TOURS} recorridos · El título personalizado reemplaza «Recorrido 3D 1», «Recorrido 3D 2», etc.
      </p>
    </div>
  );
}
