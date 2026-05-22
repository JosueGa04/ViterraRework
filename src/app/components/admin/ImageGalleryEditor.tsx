import { useCallback, useRef, useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

const MAX_IMAGES = 24;
const MAX_DATA_URL_BYTES = 5 * 1024 * 1024;
const MAX_STORAGE_IMAGE_BYTES = 25 * 1024 * 1024;

function isImageFile(file: File): boolean {
  if (/^image\//i.test(file.type)) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|avif)$/i.test(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

type Props = {
  images: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
  /** Destaca portada grande + miniaturas amplias (formularios admin). */
  variant?: "default" | "featured";
  /**
   * En `featured`: divide la UI para usar grid en el padre.
   * `hero` = portada + zona de subida; `gallery` = carrusel a ancho completo debajo del formulario.
   */
  segment?: "all" | "hero" | "gallery";
  className?: string;
  /**
   * `featured` + `segment: all`: portada baja, galería en una sola fila sin scroll horizontal, zona de subida mínima.
   * (p. ej. formulario de desarrollos en una pantalla sin desplazarse).
   */
  compactSingleScreen?: boolean;
  /** Si se define, sube a Storage en lugar de data URL (permite más formatos y tamaño). */
  onUploadFile?: (file: File) => Promise<string>;
};

export function ImageGalleryEditor({
  images,
  onChange,
  disabled = false,
  label = "Imágenes",
  hint,
  variant = "default",
  segment = "all",
  className,
  compactSingleScreen = false,
  onUploadFile,
}: Props) {
  const resolvedHint =
    hint ??
    (onUploadFile
      ? "Cualquier imagen · máx. 25 MB · la primera es la portada."
      : "PNG, JPG o WebP · máx. 5 MB · la primera es la portada.");
  const featured = variant === "featured";
  const splitHero = featured && segment === "hero";
  const splitGallery = featured && segment === "gallery";
  const singleScreen = featured && segment === "all" && compactSingleScreen;
  const inputRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const scrollStrip = useCallback(
    (dir: -1 | 1) => {
      const el = stripRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * (featured ? 360 : 280), behavior: "smooth" });
    },
    [featured]
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter(isImageFile);
      if (list.length === 0) {
        window.alert("Selecciona archivos de imagen válidos.");
        return;
      }
      const room = MAX_IMAGES - images.length;
      if (room <= 0) {
        window.alert(`Máximo ${MAX_IMAGES} imágenes. Elimina alguna antes de agregar más.`);
        return;
      }
      setBusy(true);
      try {
        const next: string[] = [...images];
        for (const file of list.slice(0, room)) {
          const maxBytes = onUploadFile ? MAX_STORAGE_IMAGE_BYTES : MAX_DATA_URL_BYTES;
          if (file.size > maxBytes) {
            window.alert(
              `«${file.name}» supera ${onUploadFile ? "25 MB" : "5 MB"}. Comprime la imagen o usa otro archivo.`,
            );
            continue;
          }
          const url = onUploadFile ? await onUploadFile(file) : await readFileAsDataUrl(file);
          next.push(url);
        }
        if (next.length !== images.length) onChange(next);
      } finally {
        setBusy(false);
      }
    },
    [images, onChange, onUploadFile]
  );

  const removeAt = useCallback(
    (index: number) => {
      if (disabled) return;
      onChange(images.filter((_, i) => i !== index));
    },
    [disabled, images, onChange]
  );

  const moveTowardStart = useCallback(
    (index: number) => {
      if (disabled || index <= 0) return;
      const next = [...images];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next);
    },
    [disabled, images, onChange]
  );

  const thumbClass = featured
    ? "relative h-44 w-full min-w-[220px] max-w-[280px] sm:h-52 sm:max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border-2 border-white shadow-lg ring-2 ring-slate-200/90 sm:min-w-[260px]"
    : "relative h-36 w-52 shrink-0 snap-start overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm";

  /** Carrusel ancho completo (segmento `gallery` en layouts en grid). */
  const thumbClassWide =
    "relative h-32 w-full min-w-[160px] max-w-[220px] sm:h-36 sm:min-w-[200px] sm:max-w-[280px] shrink-0 snap-start overflow-hidden rounded-xl border-2 border-white shadow-md ring-2 ring-slate-200/90";

  const galleryPanel = (wideThumbs: boolean) =>
    images.length > 0 ? (
      <div
        className={cn(
          "space-y-2",
          featured ? "mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:p-4" : "mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3",
          splitGallery && "mt-0 w-full border-slate-200/90 bg-slate-50/70 p-2 shadow-sm sm:p-2.5"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "font-semibold uppercase tracking-wide text-slate-600",
              splitGallery && "text-[10px] sm:text-[11px]",
              !splitGallery && featured && "text-xs sm:text-[13px]",
              !splitGallery && !featured && "text-[11px]"
            )}
          >
            Galería ({images.length})
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn("shrink-0", splitGallery ? "h-7 w-7" : "h-8 w-8")}
              disabled={disabled}
              aria-label="Ver imágenes anteriores"
              onClick={() => scrollStrip(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn("shrink-0", splitGallery ? "h-7 w-7" : "h-8 w-8")}
              disabled={disabled}
              aria-label="Ver más imágenes"
              onClick={() => scrollStrip(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          ref={stripRef}
          className={cn(
            "flex w-full min-w-0 overflow-x-auto [scrollbar-width:thin]",
            splitGallery && "gap-2.5 pb-1 pt-0.5",
            !splitGallery && featured && "gap-4 pb-3 pt-1",
            !splitGallery && !featured && "gap-3 pb-2 pt-1"
          )}
          style={{ scrollSnapType: "x mandatory" }}
        >
          {images.map((src, index) => (
            <figure
              key={`${index}-${src.slice(0, 48)}`}
              className={cn(wideThumbs ? thumbClassWide : thumbClass)}
              style={{ scrollSnapAlign: "start" }}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              {index === 0 ? (
                <figcaption
                  className={cn(
                    "pointer-events-none absolute left-2 top-2 rounded-md bg-brand-navy/95 px-2 py-0.5 font-semibold uppercase tracking-wide text-white shadow-sm",
                    featured ? "text-[11px] sm:text-xs" : "text-[10px]"
                  )}
                >
                  Portada
                </figcaption>
              ) : null}
              {!disabled ? (
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {index > 0 ? (
                    <button
                      type="button"
                      className="rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
                      onClick={() => moveTowardStart(index)}
                    >
                      Subir orden
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md bg-white/95 p-1.5 text-rose-600 shadow ring-1 ring-slate-200 hover:bg-rose-50"
                    aria-label={`Eliminar imagen ${index + 1}`}
                    onClick={() => removeAt(index)}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    ) : null;

  const dropHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      void addFiles(e.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      disabled={disabled || busy}
      onChange={(e) => {
        const f = e.target.files;
        if (f?.length) void addFiles(f);
        e.target.value = "";
      }}
    />
  );

  if (splitGallery) {
    if (images.length === 0) return null;
    return <div className={cn("w-full min-w-0", className)}>{galleryPanel(true)}</div>;
  }

  if (singleScreen) {
    return (
      <div className={cn("flex h-full min-h-0 min-w-0 w-full max-w-full flex-col gap-2", className)}>
        <div className="min-w-0 w-full rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-primary/[0.04] p-2.5 shadow-md min-[1100px]:p-3">
          <p className="text-xs font-bold uppercase leading-tight tracking-wide text-brand-navy min-[1100px]:text-sm" style={{ fontWeight: 700 }}>
            {label}
          </p>
          {resolvedHint ? (
            <p className="line-clamp-2 text-[10px] leading-snug text-slate-500 min-[1100px]:text-xs" style={{ fontWeight: 500 }}>
              {resolvedHint}
            </p>
          ) : null}

          <div className="relative mt-2 h-[6.5rem] w-full min-w-0 max-w-full overflow-hidden rounded-lg bg-slate-900 ring-1 ring-slate-900/10 min-[1100px]:h-[7.5rem] min-[1200px]:h-[8.5rem]">
            {images[0] ? (
              <img src={images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-slate-800 to-brand-navy px-3 text-center">
                <ImagePlus className="h-7 w-7 text-white/45 min-[1100px]:h-8 min-[1100px]:w-8" strokeWidth={1.25} aria-hidden />
                <span className="text-[10px] font-medium leading-tight text-white/85 min-[1100px]:text-xs" style={{ fontWeight: 600 }}>
                  Añade la portada
                </span>
              </div>
            )}
            {images[0] ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1 pt-8 min-[1100px]:pt-10">
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/95 min-[1100px]:text-[10px]">Vista principal</p>
              </div>
            ) : null}
          </div>

          {images.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600 min-[1100px]:text-xs">Galería ({images.length})</p>
              <div className="flex w-full min-w-0 max-w-full flex-nowrap gap-1">
                {images.map((src, index) => (
                  <figure
                    key={`${index}-${src.slice(0, 48)}`}
                    className="relative h-12 min-w-0 max-h-12 min-[1100px]:h-14 min-[1100px]:max-h-14 flex-1 basis-0 overflow-hidden rounded-md border-2 border-white/90 shadow ring-1 ring-slate-200/80"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {index === 0 ? (
                      <figcaption className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-brand-navy/95 px-0.5 py-0.5 text-[7px] font-bold uppercase text-white min-[1100px]:text-[8px]">
                        Port.
                      </figcaption>
                    ) : null}
                    {!disabled ? (
                      <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                        {index > 0 ? (
                          <button
                            type="button"
                            className="rounded bg-white/95 px-0.5 text-[8px] font-bold leading-none text-slate-700 ring-1 ring-slate-200"
                            onClick={() => moveTowardStart(index)}
                            title="Subir en la galería"
                          >
                            ↑
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded bg-white/95 p-0.5 text-rose-600 ring-1 ring-slate-200"
                          title={`Quitar ${index + 1}`}
                          onClick={() => removeAt(index)}
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={2.2} />
                        </button>
                      </div>
                    ) : null}
                  </figure>
                ))}
              </div>
            </div>
          ) : null}

          <div
            role="presentation"
            {...dropHandlers}
            className={cn(
              "mt-2 rounded-lg border-2 border-dashed px-2 py-2 transition-colors min-[1100px]:px-2.5 min-[1100px]:py-2.5",
              disabled
                ? "cursor-not-allowed border-slate-200/90 bg-slate-50/80 opacity-70"
                : "border-primary/45 bg-primary/[0.04]",
              dragOver && !disabled && "border-primary bg-primary/[0.08] ring-2 ring-primary/20"
            )}
          >
            {fileInput}
            <div className="flex items-center justify-center">
              <Button
                type="button"
                size="sm"
                disabled={disabled || busy || images.length >= MAX_IMAGES}
                onClick={() => inputRef.current?.click()}
                className="h-8 gap-1 rounded-full bg-gradient-to-r from-primary to-brand-burgundy/85 px-4 text-[10px] font-bold uppercase leading-none text-primary-foreground shadow-md ring-2 ring-primary/30 hover:brightness-110 min-[1100px]:h-9 min-[1100px]:px-5 min-[1100px]:text-xs"
              >
                {busy ? (
                  "…"
                ) : (
                  <>
                    <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    Añadir imágenes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (splitHero) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-primary/[0.04] p-3 shadow-[0_8px_28px_-14px_rgba(20,28,46,0.1)] sm:p-3.5">
          <div>
            <p
              className="font-heading text-xs uppercase tracking-wide text-brand-navy sm:text-sm"
              style={{ fontWeight: 700 }}
            >
              {label}
            </p>
            {resolvedHint ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>
                {resolvedHint}
              </p>
            ) : null}
          </div>

          <div className="relative mt-2 overflow-hidden rounded-xl bg-slate-900 shadow-inner ring-1 ring-slate-900/10">
            <div className="aspect-[2.4/1] min-h-[96px] w-full max-h-[min(28vh,200px)] sm:aspect-[2.2/1] sm:min-h-[120px] sm:max-h-[min(32vh,240px)]">
              {images[0] ? (
                <img src={images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[96px] flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-800 via-slate-900 to-brand-navy px-4 text-center sm:min-h-[120px] sm:gap-2">
                  <ImagePlus className="h-9 w-9 text-white/40 sm:h-10 sm:w-10" strokeWidth={1} aria-hidden />
                  <p className="max-w-sm text-[11px] font-medium text-white/85 sm:text-xs" style={{ fontWeight: 600 }}>
                    Sin fotos aún · la primera es la portada
                  </p>
                </div>
              )}
            </div>
            {images[0] ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-3 pb-2 pt-10 sm:pt-12">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90">Vista principal</p>
              </div>
            ) : null}
          </div>

          <div
            role="presentation"
            {...dropHandlers}
            className={cn(
              "mt-2 rounded-xl border-2 border-dashed px-2.5 py-2.5 text-center transition-colors sm:px-3",
              disabled ? "cursor-not-allowed border-slate-200 bg-slate-50/50 opacity-70" : "border-primary/40 bg-white/90 shadow-inner",
              dragOver && !disabled && "border-primary bg-primary/[0.06] ring-2 ring-primary/20"
            )}
          >
            {fileInput}
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
              <div className="flex items-center gap-1.5 text-left sm:text-center">
                <ImagePlus className="h-6 w-6 shrink-0 text-primary sm:h-6 sm:w-6" strokeWidth={1.75} aria-hidden />
                <p className="text-[11px] text-slate-600 sm:max-w-[13rem]" style={{ fontWeight: 600 }}>
                  Arrastra o añade archivos
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={disabled || busy || images.length >= MAX_IMAGES}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "h-9 shrink-0 gap-1.5 rounded-full px-4 text-[11px] font-bold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-primary/30 transition hover:brightness-110",
                  "bg-gradient-to-r from-primary via-primary to-brand-burgundy/85"
                )}
              >
                {busy ? (
                  <span className="text-[10px] normal-case tracking-normal">Procesando…</span>
                ) : (
                  <>
                    <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    Añadir imágenes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", featured && "space-y-4", className)}>
      <div className={cn(featured && "rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-primary/[0.04] p-4 shadow-[0_12px_40px_-16px_rgba(20,28,46,0.12)] sm:p-5")}>
        <div>
          <p
            className={cn(
              "uppercase tracking-wide text-slate-700",
              featured ? "font-heading text-sm sm:text-base" : "text-xs",
              featured && "text-brand-navy"
            )}
            style={{ fontWeight: featured ? 700 : 600 }}
          >
            {label}
          </p>
          {resolvedHint ? (
            <p
              className={cn("text-slate-500", featured ? "mt-2 text-xs sm:text-sm" : "mt-1 text-[11px]")}
              style={{ fontWeight: 500 }}
            >
              {resolvedHint}
            </p>
          ) : null}
        </div>

        {featured ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-900 shadow-inner ring-1 ring-slate-900/10">
            <div className="aspect-[21/9] min-h-[200px] w-full max-h-[min(52vh,440px)] sm:aspect-[2/1] sm:min-h-[240px]">
              {images[0] ? (
                <img src={images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 via-slate-900 to-brand-navy px-6 text-center">
                  <ImagePlus className="h-14 w-14 text-white/40" strokeWidth={1} aria-hidden />
                  <p className="max-w-sm text-sm font-medium text-white/85 sm:text-base" style={{ fontWeight: 600 }}>
                    Sin fotos aún · la primera será la portada del listado y la ficha pública
                  </p>
                </div>
              )}
            </div>
            {images[0] ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-4 pb-4 pt-16">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">Vista principal</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {galleryPanel(false)}

      <div
        role="presentation"
        {...dropHandlers}
        className={cn(
          "rounded-2xl border-2 border-dashed text-center transition-colors",
          featured ? "mt-5 px-4 py-6 sm:px-6 sm:py-8" : "mt-4 px-4 py-8",
          images.length > 0 && "border-t border-slate-200/90 pt-5 sm:pt-6",
          disabled ? "cursor-not-allowed border-slate-200 bg-slate-50/50 opacity-70" : "border-slate-300 bg-white",
          dragOver && !disabled && "border-primary/60 bg-primary/[0.03]",
          featured && !disabled && "border-primary/35 bg-white/90 shadow-inner"
        )}
      >
        {fileInput}
        <ImagePlus
          className={cn("mx-auto text-slate-400", featured ? "h-12 w-12 sm:h-14 sm:w-14" : "h-10 w-10")}
          strokeWidth={1.25}
          aria-hidden
        />
        <p
          className={cn("mt-2 text-slate-700", featured ? "text-base sm:text-lg" : "text-sm")}
          style={{ fontWeight: 600 }}
        >
          Arrastra imágenes aquí o súbelas desde tu equipo
        </p>
        <Button
          type="button"
          size="sm"
          disabled={disabled || busy || images.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-4 gap-1.5 rounded-full px-5 text-[11px] font-bold uppercase tracking-wide shadow-lg ring-2 transition hover:brightness-110",
            featured
              ? "h-9 bg-gradient-to-r from-primary via-primary to-brand-burgundy/85 text-primary-foreground shadow-primary/35 ring-primary/25"
              : "h-9 border border-slate-300 bg-white text-slate-800 shadow-slate-200/80 ring-slate-200 hover:bg-slate-50"
          )}
        >
          {busy ? (
            "Procesando…"
          ) : (
            <>
              <ImagePlus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              Añadir imágenes
            </>
          )}
        </Button>
      </div>

      {!featured && images.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500" style={{ fontWeight: 500 }}>
          Aún no hay imágenes. Al guardar, puedes usar una imagen por defecto si lo permite el formulario.
        </p>
      ) : null}
      </div>
    </div>
  );
}
