import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteContent } from "../../data/siteContent";
import { mergeSiteSection } from "../../lib/siteContentMerge";

export const SITE_CONTENT_PAGE_KEYS: (keyof SiteContent)[] = [
  "home",
  "header",
  "contact",
  "services",
  "about",
  "developments",
  "rent",
  "sale",
];

export type SiteContentPageKey = keyof SiteContent;

/** Bucket público del CMS (imágenes / vídeos del sitio). */
export const SITE_STORAGE_BUCKET_ID = "site" as const;

type SectionRow = { page: string; payload: unknown };

/** Lee todas las secciones y las fusiona con los valores por defecto. */
export async function fetchAllSiteSections(client: SupabaseClient): Promise<SiteContent> {
  const { data, error } = await client.from("site_content_sections").select("page,payload");
  if (error) throw error;
  const rows = (data ?? []) as SectionRow[];
  const byPage: Partial<Record<SiteContentPageKey, unknown>> = {};
  for (const r of rows) {
    const p = r.page as keyof SiteContent;
    if (SITE_CONTENT_PAGE_KEYS.includes(p)) byPage[p as SiteContentPageKey] = r.payload;
  }
  return {
    home: mergeSiteSection("home", byPage.home),
    header: mergeSiteSection("header", byPage.header),
    contact: mergeSiteSection("contact", byPage.contact),
    services: mergeSiteSection("services", byPage.services),
    about: mergeSiteSection("about", byPage.about),
    developments: mergeSiteSection("developments", byPage.developments),
    rent: mergeSiteSection("rent", byPage.rent),
    sale: mergeSiteSection("sale", byPage.sale),
  };
}

/** Persiste una sección completa (JSON ya fusionado en cliente). */
export async function upsertSiteSection<K extends keyof SiteContent>(
  client: SupabaseClient,
  page: K,
  section: SiteContent[K]
) {
  return client.from("site_content_sections").upsert(
    {
      page,
      payload: section as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "page" }
  );
}

function extensionForSiteUpload(file: File): string {
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{1,8}$/.test(rawExt)) {
    if (rawExt === "jpeg") return "jpg";
    return rawExt;
  }
  const mime = file.type.toLowerCase();
  const byMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/ogg": "ogv",
  };
  if (byMime[mime]) return byMime[mime];
  if (mime.startsWith("image/")) return "jpg";
  if (mime.startsWith("video/")) return "mp4";
  return "jpg";
}

/** Sube imagen o vídeo al bucket `site` y devuelve la URL pública. */
export async function uploadSiteImage(
  client: SupabaseClient,
  args: { page: SiteContentPageKey; fieldKey: string; file: File }
): Promise<string> {
  const ext = extensionForSiteUpload(args.file);
  const path = `${args.page}/${args.fieldKey}-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await client.storage.from(SITE_STORAGE_BUCKET_ID).upload(path, args.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: args.file.type || undefined,
  });
  if (upErr) throw upErr;
  const { data } = client.storage.from(SITE_STORAGE_BUCKET_ID).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("No se obtuvo URL pública del archivo.");
  return data.publicUrl;
}

/**
 * Ruta del objeto dentro del bucket `site` a partir de su URL pública de Storage.
 * Solo coincide con URLs del formato `.../storage/v1/object/public/site/<ruta>`.
 */
export function siteStorageObjectPathFromPublicUrl(publicUrl: string): string | null {
  const t = publicUrl.trim();
  if (!t) return null;
  let pathname: string;
  try {
    pathname = new URL(t).pathname;
  } catch {
    return null;
  }
  const needle = `/storage/v1/object/public/${SITE_STORAGE_BUCKET_ID}/`;
  const idx = pathname.indexOf(needle);
  if (idx === -1) return null;
  let path = pathname.slice(idx + needle.length);
  if (!path) return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* mantener */
  }
  return path;
}

/** Elimina un objeto del bucket `site` si la URL es una pública gestionada por nosotros. Errores: silencioso en UI. */
export async function removeSiteStorageObjectByPublicUrl(client: SupabaseClient, publicUrl: string): Promise<void> {
  const path = siteStorageObjectPathFromPublicUrl(publicUrl);
  if (!path) return;
  const { error } = await client.storage.from(SITE_STORAGE_BUCKET_ID).remove([path]);
  if (error) throw error;
}

/** Persiste todas las secciones del sitio con los valores por defecto fusionados (reset). */
export async function upsertAllDefaultSections(
  client: SupabaseClient,
  defaults: SiteContent
): Promise<{ error: Error | null }> {
  for (const page of SITE_CONTENT_PAGE_KEYS) {
    const { error } = await upsertSiteSection(client, page, defaults[page]);
    if (error) return { error: new Error(error.message) };
  }
  return { error: null };
}
