import { useCallback, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";

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
  onUploadFile?: (file: File) => Promise<string>;
};

export function PropertyPhotosEditor({ images, onChange, disabled = false, onUploadFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const coverIndex = 0;
  const previewIndex = Math.min(activeIndex, Math.max(0, images.length - 1));
  const previewSrc = images[previewIndex];

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
        if (next.length !== images.length) {
          onChange(next);
          if (images.length === 0) setActiveIndex(0);
        }
      } finally {
        setBusy(false);
      }
    },
    [images, onChange, onUploadFile],
  );

  const removeAt = (index: number) => {
    if (disabled) return;
    const next = images.filter((_, i) => i !== index);
    onChange(next);
    setActiveIndex((i) => (i >= next.length ? Math.max(0, next.length - 1) : i));
  };

  const setAsCover = (index: number) => {
    if (disabled || index === 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
    setActiveIndex(0);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    void addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_260px]">
        {/* Vista principal */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-brand-navy/[0.04] ring-1 ring-stone-200/90",
            dragOver && !disabled && "ring-2 ring-primary/40",
          )}
          onDragEnter={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <div className="aspect-[16/10] min-h-[220px] w-full sm:min-h-[280px]">
            {previewSrc ? (
              <img src={previewSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-stone-100 via-white to-stone-50 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-stone-200/90">
                  <ImagePlus className="h-7 w-7 text-stone-400" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-heading text-base font-semibold text-brand-navy">Sin fotos aún</p>
                  <p className="mt-1 max-w-xs text-sm text-slate-500">
                    La primera imagen será la portada en listados y ficha pública.
                  </p>
                </div>
              </div>
            )}
          </div>
          {previewSrc ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-12">
                <div>
                  {previewIndex === coverIndex ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy shadow-sm">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      Portada
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/90">
                      Foto {previewIndex + 1}
                    </span>
                  )}
                </div>
                {!disabled && previewIndex !== coverIndex ? (
                  <button
                    type="button"
                    className="pointer-events-auto rounded-lg bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-brand-navy shadow hover:bg-white"
                    onClick={() => setAsCover(previewIndex)}
                  >
                    Usar como portada
                  </button>
                ) : null}
              </div>
              {!disabled ? (
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-red-600/90"
                  aria-label="Eliminar foto"
                  onClick={() => removeAt(previewIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Miniaturas */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-stone-200/90 bg-stone-50/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-brand-navy">
              Galería
              <span className="ml-1.5 font-normal tabular-nums text-slate-500">({images.length})</span>
            </p>
            <p className="text-[10px] text-slate-500">Clic = vista · ★ = portada</p>
          </div>
          <div className="grid min-h-[120px] flex-1 grid-cols-3 gap-2 overflow-y-auto content-start">
            {images.map((src, index) => (
              <button
                key={`${index}-${src.slice(0, 40)}`}
                type="button"
                disabled={disabled}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl ring-2 transition",
                  previewIndex === index ? "ring-primary shadow-md" : "ring-transparent hover:ring-stone-300",
                )}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
                {index === coverIndex ? (
                  <span className="absolute left-1 top-1 rounded bg-brand-navy/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white">
                    ★
                  </span>
                ) : null}
                {!disabled ? (
                  <span className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                    {index > 0 ? (
                      <span
                        role="button"
                        tabIndex={0}
                        className="rounded bg-white/95 p-0.5 text-[9px] font-bold text-brand-navy shadow ring-1 ring-stone-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsCover(index);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            setAsCover(index);
                          }
                        }}
                        title="Portada"
                      >
                        ★
                      </span>
                    ) : null}
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded bg-white/95 p-0.5 text-rose-600 shadow ring-1 ring-stone-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAt(index);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          removeAt(index);
                        }
                      }}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </span>
                ) : null}
              </button>
            ))}
            {!disabled && images.length < MAX_IMAGES ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 bg-white text-slate-500 transition hover:border-primary/50 hover:bg-primary/[0.03] hover:text-primary"
              >
                <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[9px] font-semibold uppercase">Añadir</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Zona de subida compacta */}
      <div
        role="presentation"
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition",
          disabled ? "cursor-not-allowed border-stone-200 bg-stone-50 opacity-70" : "border-stone-300 bg-white",
          dragOver && !disabled && "border-primary bg-primary/[0.04] ring-1 ring-primary/20",
        )}
      >
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
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-slate-500">
            <Upload className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-navy">Arrastra fotos o selecciónalas</p>
            <p className="text-xs text-slate-500">
              {onUploadFile ? "Cualquier imagen · máx. 25 MB" : "PNG, JPG o WebP · máx. 5 MB"} · hasta {MAX_IMAGES}{" "}
              fotos
            </p>
          </div>
        </div>
        <Button
          type="button"
          disabled={disabled || busy || images.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-xl"
        >
          {busy ? "Subiendo…" : "Elegir archivos"}
        </Button>
      </div>
    </div>
  );
}
