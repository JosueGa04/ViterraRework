const VIDEO_EXT_RE = /\.(mp4|webm|m4v|ogv|ogg|mov)(?:$|[?#&/])/i;

/**
 * Detecta si la URL de fondo de un hero debe renderizarse como `<video>`.
 * Incluye extensiones habituales y rutas de Storage (p. ej. `…/heroImage-uuid.mp4`).
 */
export function isHeroBackgroundVideoUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (/[?&](?:type|content[_-]?type)=video[/+]/i.test(u)) return true;
  let path = (u.split("?")[0] ?? u).split("#")[0] ?? u;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* mantener path */
  }
  return VIDEO_EXT_RE.test(path);
}
