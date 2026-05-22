import { Building2 } from "lucide-react";
import type { Property } from "../../PropertyCard";
import {
  ORIENTATION_OPTIONS,
  orientationCodeFromProperty,
  orientationNumberFromCode,
} from "../../../lib/propertyOrientation";
import { Switch } from "../../ui/switch";
import {
  PropertyField,
  PropertyFieldGrid,
  PropertyFormSection,
  propertyFieldClass,
} from "./propertyFormUi";

const SITUATION_OPTIONS = ["", "Vacía", "Habitada", "Inquilino"];

type Props = {
  draft: Property;
  onDraftChange: (patch: Partial<Property>) => void;
};

export function PropertyDetailsSection({ draft, onDraftChange }: Props) {
  const numField = (label: string, key: keyof Property) => (
    <PropertyField label={label}>
      <input
        type="number"
        min={0}
        step="any"
        className={propertyFieldClass}
        value={draft[key] === undefined || draft[key] === null ? "" : Number(draft[key])}
        onChange={(e) =>
          onDraftChange({
            [key]: e.target.value === "" ? undefined : Number(e.target.value),
          } as Partial<Property>)
        }
      />
    </PropertyField>
  );

  return (
    <PropertyFormSection
      icon={Building2}
      title="Detalles del inmueble"
      description="Recámaras, baños, medios baños, estacionamiento y datos que aparecen en la ficha pública."
    >
      <PropertyFieldGrid>
        {numField("Recámaras", "bedrooms")}
        {numField("Baños", "bathrooms")}
        {numField("Medios baños", "halfBathrooms")}
        {numField("m² cubiertos", "area")}
        {numField("m² terreno", "surfaceLand")}
        {numField("Estacionamientos", "parkingSpaces")}
        {numField("Pisos", "floorsAmount")}
        {numField("Antigüedad (años)", "age")}
        {numField("Gastos / expensas", "expenses")}
      </PropertyFieldGrid>

      <PropertyFieldGrid>
        <PropertyField label="Situación">
          <select
            className={propertyFieldClass}
            value={draft.situation ?? ""}
            onChange={(e) => onDraftChange({ situation: e.target.value || undefined })}
          >
            {SITUATION_OPTIONS.map((o) => (
              <option key={o || "empty"} value={o}>
                {o || "— Sin especificar —"}
              </option>
            ))}
          </select>
        </PropertyField>
        <PropertyField label="Orientación">
          <select
            className={propertyFieldClass}
            value={orientationCodeFromProperty(draft.orientation)}
            onChange={(e) =>
              onDraftChange({ orientation: orientationNumberFromCode(e.target.value) })
            }
          >
            {ORIENTATION_OPTIONS.map((o) => (
              <option key={o.value || "empty"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </PropertyField>
        <PropertyField label="Apto crédito" className="flex flex-row items-center gap-3 pt-6">
          <Switch
            checked={Boolean(draft.creditEligible)}
            onCheckedChange={(v) => onDraftChange({ creditEligible: v })}
          />
          <span className="text-sm text-slate-600">{draft.creditEligible ? "Sí" : "No"}</span>
        </PropertyField>
      </PropertyFieldGrid>
    </PropertyFormSection>
  );
}
