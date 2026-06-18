import { normalizeAllowedEmbedUrl } from "./safeEmbed";

export type PropertyTour3dEntry = {
  id: string;
  url: string;
  label?: string;
};

export function newPropertyTour3dId(): string {
  return crypto.randomUUID();
}

/** Título en la ficha pública; si no hay `label`, numeración solo con varios tours. */
export function propertyTour3dDisplayTitle(
  entry: PropertyTour3dEntry,
  index: number,
  total: number,
): string | null {
  if (entry.label?.trim()) return entry.label.trim();
  if (total > 1) return `Recorrido 3D ${index + 1}`;
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export function normalizePropertyTour3dEntry(raw: unknown): PropertyTour3dEntry | null {
  if (!isRecord(raw)) return null;
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (!url) return null;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : newPropertyTour3dId();
  const label = typeof raw.label === "string" ? raw.label.trim() : undefined;
  return { id, url, label: label || undefined };
}

export function parsePropertyTours3dJson(raw: unknown): PropertyTour3dEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: PropertyTour3dEntry[] = [];
  for (const item of raw) {
    const e = normalizePropertyTour3dEntry(item);
    if (e) out.push(e);
  }
  return out;
}

export function propertyTours3dFromRow(row: {
  property_tours_3d?: unknown;
  tour_3d_url?: string | null;
  payload?: Record<string, unknown> | null;
}): PropertyTour3dEntry[] {
  const fromCol = parsePropertyTours3dJson(row.property_tours_3d);
  if (fromCol.length > 0) return fromCol;

  const fromPayload = parsePropertyTours3dJson(
    row.payload && typeof row.payload === "object" ? row.payload.viterra_tours_3d : undefined,
  );
  if (fromPayload.length > 0) return fromPayload;

  const legacyUrl = row.tour_3d_url?.trim();
  if (legacyUrl) {
    return [{ id: newPropertyTour3dId(), url: legacyUrl }];
  }
  return [];
}

export function propertyTours3dToJson(tours: PropertyTour3dEntry[]): PropertyTour3dEntry[] {
  return tours
    .map((t) => normalizePropertyTour3dEntry(t))
    .filter((t): t is PropertyTour3dEntry => t != null);
}

export function legacyTour3dUrlFromTours(tours: PropertyTour3dEntry[]): string | null {
  return propertyTours3dToJson(tours)[0]?.url?.trim() || null;
}

export function resolvePropertyTour3dUrls(
  tours: PropertyTour3dEntry[],
): { entry: PropertyTour3dEntry; embedUrl: string }[] {
  const out: { entry: PropertyTour3dEntry; embedUrl: string }[] = [];
  for (const entry of propertyTours3dToJson(tours)) {
    const embedUrl = normalizeAllowedEmbedUrl(entry.url ?? "");
    if (embedUrl) out.push({ entry, embedUrl });
  }
  return out;
}

export function tours3dFromLegacyFields(p: {
  tours3d?: PropertyTour3dEntry[];
  tour3dUrl?: string;
}): PropertyTour3dEntry[] {
  if (p.tours3d && p.tours3d.length > 0) return propertyTours3dToJson(p.tours3d);
  const url = p.tour3dUrl?.trim();
  if (url) return [{ id: newPropertyTour3dId(), url }];
  return [];
}
