import { useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Film, Link2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import {
  PROPERTY_VIDEO_MAX_BYTES,
  deletePropertyMediaObject,
  uploadPropertyVideo,
} from "../../../lib/supabasePropertyMedia";
import type { PropertyVideoEntry } from "../../PropertyCard";
import { PropertyVideoPlayer } from "../../PropertyVideoPlayer";
import {
  newPropertyVideoId,
  propertyVideosToJson,
  resolvePropertyVideoEntryUrl,
} from "../../../lib/propertyVideos";
import { propertyMediaPublicUrl } from "../../../lib/supabasePropertyMedia";
import { propertyFieldClass } from "./propertyFormUi";

const MAX_VIDEOS = 12;

type Props = {
  client: SupabaseClient | null;
  propertyId: string;
  videos: PropertyVideoEntry[];
  onChange: (videos: PropertyVideoEntry[]) => void;
};

export function PropertyVideosEditor({ client, propertyId, videos, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addMode, setAddMode] = useState<"upload" | "url">("url");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");

  const list = propertyVideosToJson(videos);

  const resolveUrl = (entry: PropertyVideoEntry) =>
    resolvePropertyVideoEntryUrl(entry, (path) =>
      client ? propertyMediaPublicUrl(client, path) : null,
    );

  const updateEntry = (id: string, patch: Partial<PropertyVideoEntry>) => {
    onChange(list.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const removeAt = async (index: number) => {
    const entry = list[index];
    if (client && entry?.kind === "storage" && entry.storagePath?.trim()) {
      await deletePropertyMediaObject(client, entry.storagePath).catch(() => undefined);
    }
    onChange(list.filter((_, i) => i !== index));
  };

  const addExternal = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (list.length >= MAX_VIDEOS) {
      window.alert(`Máximo ${MAX_VIDEOS} videos por propiedad.`);
      return;
    }
    const label = titleInput.trim() || undefined;
    onChange([...list, { id: newPropertyVideoId(), kind: "external", url, label }]);
    setUrlInput("");
    setTitleInput("");
  };

  const onFile = async (file: File) => {
    if (!client) {
      window.alert("Supabase no está configurado.");
      return;
    }
    if (list.length >= MAX_VIDEOS) {
      window.alert(`Máximo ${MAX_VIDEOS} videos por propiedad.`);
      return;
    }
    if (file.size > PROPERTY_VIDEO_MAX_BYTES) {
      window.alert("El video supera 5 GB.");
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const { path, publicUrl } = await uploadPropertyVideo(client, propertyId, file, setUploadPct);
      const baseName = file.name.replace(/\.[^.]+$/, "").trim();
      const label = titleInput.trim() || baseName || undefined;
      onChange([
        ...list,
        { id: newPropertyVideoId(), kind: "storage", storagePath: path, url: publicUrl, label },
      ]);
      setTitleInput("");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "No se pudo subir el video.");
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  };

  return (
    <div className="space-y-4">
      {list.length > 0 ? (
        <ul className="space-y-3">
          {list.map((entry, index) => {
            const playbackUrl = resolveUrl(entry);
            return (
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
                          ? `Ej. Recorrido sala · Video ${index + 1}`
                          : "Ej. Tour virtual, Presentación…"
                      }
                      onChange={(e) =>
                        updateEntry(entry.id, { label: e.target.value.trim() || undefined })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() => void removeAt(index)}
                    aria-label="Quitar video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {playbackUrl ? (
                  <PropertyVideoPlayer url={playbackUrl} className="rounded-lg" iframeClassName="max-h-40" />
                ) : (
                  <p className="text-xs text-amber-700">No se pudo resolver la URL de reproducción.</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-center text-sm text-slate-500">
          Sin videos. Añade enlaces de YouTube/Vimeo o sube archivos (puedes combinar ambos).
        </p>
      )}

      {list.length < MAX_VIDEOS ? (
        <div className="rounded-xl border border-stone-200/90 bg-white p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Plus className="h-4 w-4" />
            Añadir video
          </p>
          <div className="mb-3 flex rounded-lg bg-stone-100 p-0.5">
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition",
                addMode === "upload" ? "bg-white text-brand-navy shadow-sm" : "text-slate-600",
              )}
              onClick={() => setAddMode("upload")}
            >
              <Upload className="h-3.5 w-3.5" />
              Subir archivo
            </button>
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition",
                addMode === "url" ? "bg-white text-brand-navy shadow-sm" : "text-slate-600",
              )}
              onClick={() => setAddMode("url")}
            >
              <Link2 className="h-3.5 w-3.5" />
              Enlace (YouTube…)
            </button>
          </div>

          <div className="mb-3 space-y-1.5">
            <label className="text-[11px] font-medium text-slate-600">Título (opcional)</label>
            <input
              className={propertyFieldClass}
              value={titleInput}
              placeholder="Ej. Vista fachada, Recorrido interior…"
              onChange={(e) => setTitleInput(e.target.value)}
            />
          </div>

          {addMode === "upload" ? (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl"
                disabled={uploading || !client}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? `Subiendo… ${uploadPct ?? 0}%` : "Seleccionar video"}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                className={propertyFieldClass}
                value={urlInput}
                placeholder="https://www.youtube.com/watch?v=…"
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addExternal();
                  }
                }}
              />
              <Button type="button" className="h-11 shrink-0 rounded-xl px-4" onClick={addExternal}>
                Añadir
              </Button>
            </div>
          )}
          {!client ? (
            <p className="mt-2 text-[11px] text-amber-700">Subir archivos requiere Supabase configurado.</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-[11px] text-slate-500">
        <Film className="mr-1 inline h-3.5 w-3.5" />
        {list.length}/{MAX_VIDEOS} videos · El título personalizado reemplaza «Video 1», «Video 2», etc.
      </p>
    </div>
  );
}
