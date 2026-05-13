import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { useVisualSiteEditorOptional } from "../../../../contexts/VisualSiteEditorContext";
import { getSupabaseClient, syncSupabaseAuthSession } from "../../../lib/supabaseClient";
import { uploadSiteImage, removeSiteStorageObjectByPublicUrl, type SiteContentPageKey } from "../../../lib/supabaseSiteContent";
import { isHeroBackgroundVideoUrl } from "@/lib/heroBackgroundMedia";

const EditorSectionIdContext = createContext<string | null>(null);

export function EditorSection({
  title,
  children,
  sectionId,
}: {
  title: string;
  children: ReactNode;
  /** Coincide con ids de vista previa (`viterra-form-${sectionId}`) */
  sectionId?: string;
}) {
  return (
    <EditorSectionIdContext.Provider value={sectionId ?? null}>
      <div
        id={sectionId ? `viterra-form-${sectionId}` : undefined}
        className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 scroll-mt-4"
      >
        <h3 className="mb-5 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wide text-slate-800">{title}</h3>
        <div className="space-y-6">{children}</div>
      </div>
    </EditorSectionIdContext.Provider>
  );
}

export function LabeledField({
  label,
  hint,
  children,
  editorFieldKey,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  /** Clave estable compartida con `PreviewFieldPulse` en la vista previa (p. ej. `home-hero-devLink`). */
  editorFieldKey?: string;
}) {
  const sectionId = useContext(EditorSectionIdContext);
  const v = useVisualSiteEditorOptional();
  const handleFocus = () => {
    if (!sectionId || !v?.requestPreviewNavigate) return;
    if (editorFieldKey == null || editorFieldKey === "") return;
    v.requestPreviewNavigate(sectionId, editorFieldKey);
  };
  return (
    <div onFocus={handleFocus}>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy/25"
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy/25"
    />
  );
}

export function ImageUrlField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <LabeledField label={label} hint={hint}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <TextInput value={value} onChange={onChange} placeholder="https://…" />
        </div>
        <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-28 sm:w-40">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">Vista previa</div>
          )}
        </div>
      </div>
    </LabeledField>
  );
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;
}

const HERO_VIDEO_ACCEPT =
  "image/*,video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.m4v,.ogv";

function formatUploadError(raw: string, allowVideo: boolean): string {
  const m = raw.toLowerCase();
  if (m.includes("maximum allowed size") || m.includes("exceeded the maximum") || m.includes("entity too large")) {
    return allowVideo
      ? "El archivo supera el tamaño máximo permitido en almacenamiento. Prueba un vídeo más corto o comprimido (p. ej. MP4 H.264), o pide que suban el límite del bucket «site» en Supabase (migración 20260512202000)."
      : "El archivo supera el tamaño máximo permitido. Reduce peso o sube el límite del bucket «site» en Supabase.";
  }
  return raw;
}

/** Sube un archivo al bucket `site` de Supabase y guarda la URL pública en el contenido. */
export function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  storagePage,
  fieldKey,
  editorPreviewFieldKey,
  allowVideo = false,
  replaceStorageObject = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  storagePage: SiteContentPageKey;
  fieldKey: string;
  /** Opcional: resalte en vista previa al enfocar el control de subida. */
  editorPreviewFieldKey?: string;
  /** Cabeceras tipo hero: también MP4 / WebM / MOV (mismo campo URL que la imagen). */
  allowVideo?: boolean;
  /** Si es true (defecto), al subir un archivo nuevo se intenta borrar el anterior solo si era del bucket `site`. */
  replaceStorageObject?: boolean;
}) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{ name: string; size: number } | null>(null);
  const [heavyUploadHint, setHeavyUploadHint] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    setLocalError(null);
    setHeavyUploadHint(null);
    if (!file) return;
    const okImage = file.type.startsWith("image/");
    const okVideo = allowVideo && file.type.startsWith("video/");
    if (okVideo && file.size > 20 * 1024 * 1024) {
      setHeavyUploadHint(
        "Este vídeo pesa mucho: en la web suele ir a tirones hasta que termine de descargarse. Para fluidez, exporta un bucle corto (pocos segundos), 1080p o 720p y unos 3–15 MB (HandBrake, FFmpeg o «Exportar para web»).",
      );
    } else if (okImage && file.size > 4 * 1024 * 1024) {
      setHeavyUploadHint("Imagen grande: conviene comprimirla (WebP o JPG) para que el hero cargue más rápido.");
    } else {
      setHeavyUploadHint(null);
    }
    if (!okImage && !okVideo) {
      setLocalError(
        allowVideo
          ? "Elige una imagen (JPG, PNG, WebP…) o un vídeo (MP4, WebM, MOV)."
          : "Elige un archivo de imagen.",
      );
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setLocalError("Supabase no está configurado (variables de entorno).");
      return;
    }
    setUploading(true);
    setUploadMeta({ name: file.name, size: file.size });
    try {
      await syncSupabaseAuthSession(client);
      const url = await uploadSiteImage(client, { page: storagePage, fieldKey, file });
      const previous = value?.trim() ?? "";
      if (replaceStorageObject && previous && previous !== url) {
        try {
          await removeSiteStorageObjectByPublicUrl(client, previous);
        } catch {
          /* No bloquear el flujo si el borrado falla (permisos, URL antigua externa, etc.) */
        }
      }
      onChange(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocalError(formatUploadError(msg, allowVideo));
    } finally {
      setUploading(false);
      setUploadMeta(null);
      setHeavyUploadHint(null);
    }
  };

  return (
    <LabeledField label={label} hint={hint} editorFieldKey={editorPreviewFieldKey}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          {allowVideo ? (
            <p className="rounded-md border border-amber-200/90 bg-amber-50/95 px-2.5 py-2 text-[11px] leading-snug text-amber-950/90">
              Para un fondo fluido usa un vídeo <strong>corto en bucle</strong>, resolución moderada (720p–1080p) y{" "}
              <strong>poco peso</strong> (orientativo bajo 10–20 MB). Archivos de cientos de MB dependen del ancho
              de banda del visitante y suelen verse trabados.
            </p>
          ) : null}
          <input
            id={inputId}
            type="file"
            accept={allowVideo ? HERO_VIDEO_ACCEPT : "image/*"}
            disabled={uploading}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#1e2a45] disabled:opacity-50"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void handleFile(f);
            }}
          />
          {uploading && (
            <div
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label={allowVideo ? "Subiendo archivo" : "Subiendo imagen"}
            >
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
                <span className="absolute inset-0 rounded-full border-2 border-slate-200" />
                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/50 animate-spin [animation-duration:0.85s]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700">
                  {allowVideo ? "Subiendo archivo…" : "Subiendo imagen…"}
                </p>
                {uploadMeta ? (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500" title={uploadMeta.name}>
                    {uploadMeta.name} · {formatBytes(uploadMeta.size)}
                  </p>
                ) : null}
                {heavyUploadHint ? (
                  <p className="mt-2 border-t border-amber-200/80 pt-2 text-[11px] leading-snug text-amber-900/90">
                    {heavyUploadHint}
                  </p>
                ) : null}
              </div>
            </div>
          )}
          {localError && <p className="text-xs text-red-600">{localError}</p>}
        </div>
        <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-28 sm:w-40">
          {value ? (
            allowVideo && isHeroBackgroundVideoUrl(value) ? (
              <video src={value} className="h-full w-full object-cover" muted playsInline loop autoPlay />
            ) : (
              <img
                src={value}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">Vista previa</div>
          )}
        </div>
      </div>
    </LabeledField>
  );
}

export function NumberInput({
  value,
  onChange,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy/25"
    />
  );
}
