import {
  ArrowRight,
  Bath,
  Bed,
  Box,
  Car,
  Film,
  MapPin,
  MessageCircle,
  Phone,
  Square,
  Star,
} from "lucide-react";
import type { Property } from "../../PropertyCard";
import { ImageWithFallback } from "../../figma/ImageWithFallback";
import { cn } from "../../ui/utils";

function formatPrice(n: number, status: Property["status"]) {
  if (!n) return null;
  const base = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
  return status === "alquiler" ? { main: base, suffix: "/ mes" } : { main: base, suffix: null };
}

function headline(draft: Property) {
  const pub = draft.publicationTitle?.trim();
  const title = draft.title?.trim();
  if (pub) return pub;
  return title || "Sin título";
}

type Props = {
  draft: Property;
  className?: string;
};

export function PropertyFormPreview({ draft, className }: Props) {
  const cover = draft.images?.[0] ?? draft.image;
  const price = formatPrice(draft.price, draft.status);
  const locationLine = [draft.location, draft.colony].filter(Boolean).join(" · ");
  const amenityCount =
    (draft.amenities?.length ?? 0) +
    (draft.services?.length ?? 0) +
    (draft.additionalFeatures?.length ?? 0);
  const hasVideo = (draft.videos?.length ?? 0) > 0 || Boolean(draft.videoUrl?.trim() || draft.videoStoragePath?.trim());
  const hasTour =
    (draft.tours3d?.length ?? 0) > 0 || Boolean(draft.tour3dUrl?.trim());
  const galleryCount = draft.images?.length ?? (draft.image ? 1 : 0);

  return (
    <div className={cn("sticky top-5", className)}>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        Vista previa · sitio público
      </p>

      <article className="overflow-hidden border border-brand-navy/[0.08] bg-white shadow-[0_20px_50px_-24px_rgba(20,28,46,0.35)]">
        {/* Imagen */}
        <div className="relative aspect-[5/4] overflow-hidden bg-stone-100">
          {cover ? (
            <ImageWithFallback
              src={cover}
              alt={headline(draft)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-100 to-stone-200/80 text-slate-400">
              <Square className="h-8 w-8 opacity-40" strokeWidth={1.25} />
              <span className="text-xs font-medium">Añade fotos en Medios</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 via-black/15 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className="border border-primary/20 bg-primary/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-sm backdrop-blur-sm">
              {draft.status === "alquiler" ? "En alquiler" : "En venta"}
            </span>
            {draft.type?.trim() ? (
              <span className="border border-brand-navy/10 bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-navy/90 backdrop-blur-sm">
                {draft.type}
              </span>
            ) : null}
          </div>
          {draft.featured ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 border border-amber-300/50 bg-amber-400/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
              <Star className="h-3 w-3 fill-current" />
              Portada
            </span>
          ) : null}
          {galleryCount > 1 ? (
            <span className="absolute bottom-3 right-3 rounded-sm bg-black/55 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white backdrop-blur-sm">
              +{galleryCount - 1} fotos
            </span>
          ) : null}
        </div>

        {/* Contenido — estilo editorial PropertyCard */}
        <div className="border-t border-brand-navy/[0.06] p-5">
          <h3 className="font-heading line-clamp-3 min-h-[3.25rem] text-lg font-semibold leading-snug tracking-tight text-brand-navy">
            {headline(draft)}
          </h3>

          {locationLine ? (
            <p className="mt-2 flex items-start gap-1.5 text-[13px] font-light leading-relaxed tracking-wide text-brand-navy/45">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span className="line-clamp-2">{locationLine}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs italic text-slate-400">Ubicación pendiente</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-brand-navy/40">
            <span className="flex items-center gap-1.5">
              <Bed className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="text-[11px] font-normal uppercase tracking-[0.12em] tabular-nums">
                {draft.bedrooms} {draft.bedrooms === 1 ? "rec." : "rec."}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Bath className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="text-[11px] font-normal uppercase tracking-[0.12em] tabular-nums">
                {draft.bathrooms} baños
              </span>
            </span>
            {draft.area ? (
              <span className="flex items-center gap-1.5">
                <Square className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[11px] font-normal uppercase tracking-[0.12em] tabular-nums">
                  {draft.area} m²
                </span>
              </span>
            ) : null}
            {(draft.parkingSpaces ?? 0) > 0 ? (
              <span className="flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[11px] font-normal uppercase tracking-[0.12em] tabular-nums">
                  {draft.parkingSpaces} est.
                </span>
              </span>
            ) : null}
          </div>

          <div className="mt-5 border-t border-brand-navy/[0.06] pt-4">
            {price ? (
              <p className="font-tertiary text-2xl font-light leading-none tracking-tight text-brand-navy tabular-nums">
                {price.main}
                {price.suffix ? (
                  <span className="font-heading ml-1 text-xs font-medium text-brand-navy/45">{price.suffix}</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-slate-400">Precio sin definir</p>
            )}
            {draft.referenceCode?.trim() ? (
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-brand-navy/35">
                Ref. {draft.referenceCode.trim()}
              </p>
            ) : null}
          </div>

          {/* Medios y contacto */}
          {(hasVideo || hasTour || amenityCount > 0 || draft.contactPhone || draft.contactWhatsapp) && (
            <ul className="mt-4 space-y-1.5 border-t border-brand-navy/[0.06] pt-3">
              {hasVideo ? (
                <li className="flex items-center gap-2 text-[11px] text-slate-600">
                  <Film className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                  Video en ficha
                </li>
              ) : null}
              {hasTour ? (
                <li className="flex items-center gap-2 text-[11px] text-slate-600">
                  <Box className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                  Recorrido 3D
                </li>
              ) : null}
              {amenityCount > 0 ? (
                <li className="text-[11px] text-slate-600">
                  {amenityCount} {amenityCount === 1 ? "ítem" : "ítems"} en listas públicas
                </li>
              ) : null}
              {draft.contactPhone?.trim() ? (
                <li className="flex items-center gap-2 truncate text-[11px] text-slate-600">
                  <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  {draft.contactPhone.trim()}
                </li>
              ) : null}
              {draft.contactWhatsapp?.trim() ? (
                <li className="flex items-center gap-2 text-[11px] text-[#128C7E]">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">WhatsApp personalizado</span>
                </li>
              ) : null}
            </ul>
          )}

          <div
            className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-brand-navy/15 bg-brand-navy/[0.03] py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-brand-navy/70"
            aria-hidden
          >
            Ver detalle
            <ArrowRight className="h-3 w-3" strokeWidth={2} />
          </div>
        </div>
      </article>
    </div>
  );
}
