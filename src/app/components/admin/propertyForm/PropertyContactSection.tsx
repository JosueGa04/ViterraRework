import { ExternalLink, Link2, Phone } from "lucide-react";
import { isValidWhatsappLinkInput } from "../../../lib/whatsappLink";
import {
  PropertyField,
  PropertyFieldGrid,
  PropertyFormSection,
  propertyFieldClass,
} from "./propertyFormUi";

type Props = {
  contactPhone: string;
  contactWhatsapp: string;
  onPhoneChange: (v: string) => void;
  onWhatsappChange: (v: string) => void;
};

export function PropertyContactSection({
  contactPhone,
  contactWhatsapp,
  onPhoneChange,
  onWhatsappChange,
}: Props) {
  const waTrim = contactWhatsapp.trim();
  const waValid = isValidWhatsappLinkInput(contactWhatsapp);
  const waPreview =
    waTrim && /^https?:\/\//i.test(waTrim)
      ? waTrim
      : waTrim.replace(/\D/g, "").length >= 10
        ? `https://wa.me/${waTrim.replace(/\D/g, "")}`
        : null;

  return (
    <PropertyFormSection
      icon={Phone}
      title="Contacto en la ficha pública"
      description="Define cómo contactarte por esta propiedad. El botón WhatsApp abrirá el enlace que indiques."
    >
      <PropertyFieldGrid>
        <PropertyField
          label="Teléfono para llamar"
          hint="Mínimo 3 dígitos (recomendado 10 con lada). Ej. 33 1234 5678"
        >
          <input
            type="tel"
            className={propertyFieldClass}
            value={contactPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+52 33 1234 5678"
          />
        </PropertyField>
        <PropertyField
          label="Enlace de WhatsApp"
          span={2}
          hint="Pega la liga completa (wa.me, api.whatsapp.com o enlace de tu CRM)."
        >
          <div className="relative">
            <Link2
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              strokeWidth={1.75}
            />
            <input
              type="url"
              className={propertyFieldClass + " pl-10"}
              value={contactWhatsapp}
              onChange={(e) => onWhatsappChange(e.target.value)}
              placeholder="https://wa.me/523318878494"
            />
          </div>
          {!waValid && waTrim ? (
            <p className="text-xs text-amber-700">Usa una URL que empiece con https:// o un número con lada.</p>
          ) : null}
          {waPreview ? (
            <a
              href={waPreview}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#128C7E] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Probar enlace
            </a>
          ) : null}
        </PropertyField>
      </PropertyFieldGrid>
      <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-slate-600">
        Si dejas ambos vacíos, la ficha usará el contacto global del sitio (página Contacto).
      </p>
    </PropertyFormSection>
  );
}
