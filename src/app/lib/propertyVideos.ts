import type { SupabaseClient } from "@supabase/supabase-js";
import { propertyMediaPublicUrl } from "./supabasePropertyMedia";

export type PropertyVideoEntry = {
  id: string;
  kind: "external" | "storage";
  url?: string;
  storagePath?: string;
  label?: string;
};

export function newPropertyVideoId(): string {
  return crypto.randomUUID();
}

/** Título en la ficha pública; si no hay `label`, numeración solo con varios videos. */
export function propertyVideoDisplayTitle(
  entry: PropertyVideoEntry,
  index: number,
  total: number,
): string | null {
  if (entry.label?.trim()) return entry.label.trim();
  if (total > 1) return `Video ${index + 1}`;
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export function normalizePropertyVideoEntry(raw: unknown): PropertyVideoEntry | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind === "storage" ? "storage" : raw.kind === "external" ? "external" : null;
  if (!kind) return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : newPropertyVideoId();
  const url = typeof raw.url === "string" ? raw.url.trim() : undefined;
  const storagePath = typeof raw.storagePath === "string" ? raw.storagePath.trim() : undefined;
  const label = typeof raw.label === "string" ? raw.label.trim() : undefined;
  if (kind === "storage" && !storagePath && !url) return null;
  if (kind === "external" && !url) return null;
  return {
    id,
    kind,
    url: url || undefined,
    storagePath: storagePath || undefined,
    label: label || undefined,
  };
}

export function parsePropertyVideosJson(raw: unknown): PropertyVideoEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PropertyVideoEntry[] = [];
  for (const item of raw) {
    const e = normalizePropertyVideoEntry(item);
    if (e) out.push(e);
  }
  return out;
}

/** Lee lista desde jsonb o columnas legacy (un solo video). */
export function propertyVideosFromRow(row: {
  property_videos?: unknown;
  video_url?: string | null;
  video_storage_path?: string | null;
  payload?: Record<string, unknown> | null;
}): PropertyVideoEntry[] {
  const fromCol = parsePropertyVideosJson(row.property_videos);
  if (fromCol.length > 0) return fromCol;

  const fromPayload = parsePropertyVideosJson(
    row.payload && typeof row.payload === "object" ? row.payload.viterra_videos : undefined,
  );
  if (fromPayload.length > 0) return fromPayload;

  const legacy: PropertyVideoEntry[] = [];
  const storagePath = row.video_storage_path?.trim();
  const videoUrl = row.video_url?.trim();
  if (storagePath) {
    legacy.push({
      id: newPropertyVideoId(),
      kind: "storage",
      storagePath,
      url: videoUrl || undefined,
    });
  } else if (videoUrl) {
    legacy.push({ id: newPropertyVideoId(), kind: "external", url: videoUrl });
  }
  return legacy;
}

export function propertyVideosToJson(videos: PropertyVideoEntry[]): PropertyVideoEntry[] {
  return videos
    .map((v) => normalizePropertyVideoEntry(v))
    .filter((v): v is PropertyVideoEntry => v != null);
}

/** Primera entrada para columnas legacy `video_url` / `video_storage_path`. */
export function legacyVideoColumnsFromVideos(videos: PropertyVideoEntry[]): {
  video_url: string | null;
  video_storage_path: string | null;
} {
  const first = propertyVideosToJson(videos)[0];
  if (!first) return { video_url: null, video_storage_path: null };
  if (first.kind === "storage") {
    return {
      video_url: first.url?.trim() || null,
      video_storage_path: first.storagePath?.trim() || null,
    };
  }
  return { video_url: first.url?.trim() || null, video_storage_path: null };
}

export function resolvePropertyVideoEntryUrl(
  entry: PropertyVideoEntry,
  getPublicUrl?: (storagePath: string) => string | null,
): string | null {
  if (entry.kind === "storage") {
    const path = entry.storagePath?.trim();
    if (path && getPublicUrl) {
      const fromStorage = getPublicUrl(path);
      if (fromStorage) return fromStorage;
    }
    return entry.url?.trim() || null;
  }
  return entry.url?.trim() || null;
}

export function resolveAllPropertyVideoUrls(
  videos: PropertyVideoEntry[],
  client?: SupabaseClient | null,
): { entry: PropertyVideoEntry; playbackUrl: string }[] {
  const getPublicUrl = client
    ? (path: string) => propertyMediaPublicUrl(client, path)
    : undefined;
  const out: { entry: PropertyVideoEntry; playbackUrl: string }[] = [];
  for (const entry of propertyVideosToJson(videos)) {
    const playbackUrl = resolvePropertyVideoEntryUrl(entry, getPublicUrl);
    if (playbackUrl) out.push({ entry, playbackUrl });
  }
  return out;
}

/** Migra draft antiguo con solo videoUrl/videoStoragePath. */
export function videosFromLegacyFields(p: {
  videos?: PropertyVideoEntry[];
  videoUrl?: string;
  videoStoragePath?: string;
}): PropertyVideoEntry[] {
  if (p.videos && p.videos.length > 0) return propertyVideosToJson(p.videos);
  return propertyVideosFromRow({
    video_url: p.videoUrl ?? null,
    video_storage_path: p.videoStoragePath ?? null,
  });
}
