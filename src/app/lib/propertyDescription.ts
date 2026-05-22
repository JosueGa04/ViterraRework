/** HTML de TipTap vacío o solo párrafo en blanco. */
export function hasRichDescription(html: string | undefined | null): boolean {
  if (!html?.trim()) return false;
  const stripped = html
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
  return stripped.length > 0;
}

export const RICH_DESCRIPTION_HTML_CLASS =
  "text-base leading-relaxed text-slate-700 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline";
