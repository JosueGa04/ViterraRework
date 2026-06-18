import { normalizeAllowedEmbedUrl } from "./safeEmbed";

export type PropertyVideoPlayback =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string };

/** YouTube / Vimeo → URL de iframe. No devuelve MP4 ni URLs genéricas. */
export function embedIframeVideoSrc(raw: string): string | null {
  const u = raw.trim();
  if (!u) return null;
  if (u.includes("youtube.com/embed") || u.includes("player.vimeo.com/video")) {
    return /^https?:/i.test(u) ? u : `https:${u}`;
  }
  const ytWatch =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/.exec(u);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
  const vm = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

/** URL segura para iframe de video (YouTube, Vimeo u host en whitelist). */
export function embeddableVideoSrc(raw: string): string | null {
  const iframe = embedIframeVideoSrc(raw);
  if (iframe) return iframe;
  return normalizeAllowedEmbedUrl(raw);
}

/** Decide si la ficha debe usar iframe (YouTube/Vimeo) o etiqueta video (MP4, Storage). */
export function resolvePropertyVideoPlayback(
  raw: string | null | undefined,
): PropertyVideoPlayback | null {
  const u = raw?.trim();
  if (!u) return null;
  const iframe = embedIframeVideoSrc(u);
  if (iframe) return { kind: "iframe", src: iframe };
  return { kind: "video", src: u };
}
