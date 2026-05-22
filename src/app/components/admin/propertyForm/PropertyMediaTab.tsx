import type { SupabaseClient } from "@supabase/supabase-js";
import { Film, ImageIcon } from "lucide-react";
import type { Property } from "../../PropertyCard";
import { PropertyFormSection } from "./propertyFormUi";
import { PropertyMediaSection } from "./PropertyMediaSection";
import { PropertyPhotosEditor } from "./PropertyPhotosEditor";

type Props = {
  client: SupabaseClient | null;
  propertyId: string;
  draft: Property;
  onDraftChange: (patch: Partial<Property>) => void;
  onImagesChange: (images: string[]) => void;
  onUploadImage?: (file: File) => Promise<string>;
};

export function PropertyMediaTab({
  client,
  propertyId,
  draft,
  onDraftChange,
  onImagesChange,
  onUploadImage,
}: Props) {
  const images = draft.images?.length ? draft.images : draft.image ? [draft.image] : [];

  return (
    <div className="space-y-6">
      <PropertyFormSection
        icon={ImageIcon}
        title="Fotos de la propiedad"
        description="Organiza la galería: la portada (★) es la que verán en listados y tarjetas."
      >
        <PropertyPhotosEditor images={images} onChange={onImagesChange} onUploadFile={onUploadImage} />
      </PropertyFormSection>

      <PropertyFormSection
        icon={Film}
        title="Video y recorrido 3D"
        description="Opcional. Se muestran como pestañas en la ficha pública cuando hay contenido."
      >
        <PropertyMediaSection client={client} propertyId={propertyId} draft={draft} onDraftChange={onDraftChange} />
      </PropertyFormSection>
    </div>
  );
}
