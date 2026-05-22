import { Check, ListChecks, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import { featureDisplayText, formatFeatureWithIconKey } from "../../../lib/featureDisplay";
import { foldFeatureLabel, iconForFeatureLabel } from "../../../lib/featureIcons";
import { FEATURE_ICON_PICKER_OPTIONS } from "../../../lib/featureIconPicker";
import {
  PRESET_ADDITIONAL_FEATURES,
  PRESET_AMENITIES,
  PRESET_SERVICES,
} from "../../../lib/propertyFeatureCatalog";
import { FeatureItemIcon } from "./FeatureItemIcon";
import { PropertyFormSection, propertyFieldClass } from "./propertyFormUi";

function normalizeItem(s: string) {
  return s.trim();
}

function matchesSearch(label: string, query: string) {
  if (!query) return true;
  const q = foldFeatureLabel(query);
  return foldFeatureLabel(featureDisplayText(label)).includes(q);
}

function FeatureListPicker({
  title,
  catalog,
  selected,
  placeholderCustom,
  onChange,
}: {
  title: string;
  catalog: readonly string[];
  selected: string[];
  placeholderCustom: string;
  onChange: (items: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [pickedIconKey, setPickedIconKey] = useState<string>(FEATURE_ICON_PICKER_OPTIONS[0].key);

  const selectedSet = useMemo(
    () => new Set(selected.map((s) => foldFeatureLabel(s))),
    [selected],
  );

  const filteredCatalog = useMemo(
    () => catalog.filter((item) => matchesSearch(item, query)),
    [catalog, query],
  );

  const toggle = (label: string) => {
    const key = foldFeatureLabel(label);
    if (selectedSet.has(key)) {
      onChange(selected.filter((x) => foldFeatureLabel(x) !== key));
    } else {
      onChange([...selected, label]);
    }
  };

  const addCustom = () => {
    const v = normalizeItem(customInput);
    if (!v) return;
    const stored = formatFeatureWithIconKey(pickedIconKey, v);
    if (selected.some((x) => foldFeatureLabel(x) === foldFeatureLabel(stored))) {
      setCustomInput("");
      return;
    }
    onChange([...selected, stored]);
    setCustomInput("");
    setCustomOpen(false);
  };

  const remove = (label: string) => {
    const key = foldFeatureLabel(label);
    onChange(selected.filter((x) => foldFeatureLabel(x) !== key));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 bg-stone-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-brand-navy">{title}</p>
        {selected.length > 0 ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
            {selected.length} seleccionada{selected.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="p-4">
        {selected.length > 0 ? (
          <ul className="mb-4 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200/90 bg-stone-50/40">
            {selected.map((item) => (
              <li key={item} className="flex items-center gap-3 px-3 py-2.5">
                <FeatureItemIcon label={item} />
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                  {featureDisplayText(item)}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  onClick={() => remove(item)}
                  aria-label={`Quitar ${featureDisplayText(item)}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-xs text-slate-500">Ninguna seleccionada — no aparecerá en la ficha pública.</p>
        )}

        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en el catálogo…"
            className={propertyFieldClass + " pl-10"}
          />
        </div>

        <div className="max-h-[220px] overflow-y-auto rounded-xl border border-stone-200/80 bg-stone-50/30 p-2">
          {filteredCatalog.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-slate-500">Sin coincidencias en el catálogo.</p>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {filteredCatalog.map((item) => {
                const Icon = iconForFeatureLabel(item);
                const isOn = selectedSet.has(foldFeatureLabel(item));
                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-sm transition",
                        isOn
                          ? "border-primary/35 bg-primary/5 text-brand-navy ring-1 ring-primary/20"
                          : "border-transparent bg-white text-slate-700 hover:border-stone-200 hover:bg-white hover:shadow-sm",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isOn ? "bg-primary/10 text-primary" : "bg-stone-100 text-slate-500",
                        )}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        ) : (
                          <span className="text-xs text-slate-400" aria-hidden>
                            •
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{featureDisplayText(item)}</span>
                      {isOn ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-3 border-t border-stone-100 pt-3">
          {customOpen ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">
                Elige un icono (mismo estilo que el catálogo)
              </p>
              <div className="grid max-h-[200px] grid-cols-5 gap-1.5 overflow-y-auto sm:grid-cols-7">
                {FEATURE_ICON_PICKER_OPTIONS.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPickedIconKey(key)}
                    className={cn(
                      "flex h-10 w-full items-center justify-center rounded-xl border transition",
                      pickedIconKey === key
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/25"
                        : "border-stone-200 bg-white text-slate-500 hover:border-stone-300",
                    )}
                    title={label}
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                ))}
              </div>
              <input
                autoFocus
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                  if (e.key === "Escape") {
                    setCustomOpen(false);
                    setCustomInput("");
                  }
                }}
                placeholder={placeholderCustom}
                className={propertyFieldClass}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" className="h-11 rounded-xl px-5" onClick={addCustom}>
                  Añadir
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl"
                  onClick={() => {
                    setCustomOpen(false);
                    setCustomInput("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-dashed"
              onClick={() => setCustomOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir otra (personalizada)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type Props = {
  amenities: string[];
  services: string[];
  additionalFeatures: string[];
  onAmenitiesChange: (v: string[]) => void;
  onServicesChange: (v: string[]) => void;
  onAdditionalChange: (v: string[]) => void;
};

export function PropertyAmenitiesEditor({
  amenities,
  services,
  additionalFeatures,
  onAmenitiesChange,
  onServicesChange,
  onAdditionalChange,
}: Props) {
  return (
    <PropertyFormSection
      icon={ListChecks}
      title="Amenidades y servicios"
      description="Elige del catálogo o añade ítems personalizados con icono del mismo estilo."
    >
      <div className="space-y-5">
        <FeatureListPicker
          title="Amenidades"
          catalog={PRESET_AMENITIES}
          selected={amenities}
          placeholderCustom="Ej. Alberca climatizada"
          onChange={onAmenitiesChange}
        />
        <FeatureListPicker
          title="Servicios"
          catalog={PRESET_SERVICES}
          selected={services}
          placeholderCustom="Ej. Servicio de limpieza"
          onChange={onServicesChange}
        />
        <FeatureListPicker
          title="Características adicionales"
          catalog={PRESET_ADDITIONAL_FEATURES}
          selected={additionalFeatures}
          placeholderCustom="Ej. Remodelado recientemente"
          onChange={onAdditionalChange}
        />
      </div>
    </PropertyFormSection>
  );
}
