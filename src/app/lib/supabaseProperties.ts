import type { SupabaseClient } from "@supabase/supabase-js";
import type { Property } from "../components/PropertyCard";

const nowIso = () => new Date().toISOString();

/** Máximo de propiedades destacadas en la portada (inicio). */
export const MAX_FEATURED_PROPERTIES = 4;

function appStatusFromDb(s: string): "venta" | "alquiler" {
  const t = s.trim().toLowerCase();
  if (t.includes("alquiler") || t.includes("rent") || t === "renta") return "alquiler";
  return "venta";
}

function dbStatusFromApp(s: Property["status"]): string {
  return s === "alquiler" ? "alquiler" : "venta";
}

/** Interpreta el estado operativo desde el texto en BD (antes de colapsar a venta/alquiler). */
export function parseListingInventory(raw: string): NonNullable<Property["listingInventory"]> {
  const t = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/vendid|sold|liquidad/.test(t)) return "vendida";
  if (/apartad|reservad/.test(t)) return "en_apartado";
  if (/\brenta\b|alquiler|rent\b|for rent/.test(t)) return "renta";
  return "disponible";
}

/** Entero ≥ 0 a partir de valores que vienen de Postgres/JSON (a veces string). */
function nonNegInt(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** Normaliza columnas `text[]` de Postgres. */
function textArrayCol(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function optionalPositiveNum(v: number | string | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** URLs de galería: primero la principal, luego el resto sin duplicados. */
function buildGalleryUrls(primary: string, images: string[]): string[] {
  const cleaned = images.map((u) => String(u).trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (u: string) => {
    if (seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  if (primary) push(primary);
  for (const u of cleaned) push(u);
  return out.length ? out : primary ? [primary] : [];
}

export type PropertyRow = {
  id: string;
  tokko_id: string;
  title: string;
  price: number | null;
  location: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  image: string | null;
  type: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
  images: string[];
  deleted_at: string | null;
  payload: Record<string, unknown>;
  synced_at?: string | null;
  updated_at?: string | null;
  featured: boolean;
  /** `public.properties.colony` (puede faltar en filas antiguas). */
  colony?: string | null;
  amenities?: string[] | null;
  services?: string[] | null;
  additional_features?: string[] | null;
  publication_title?: string | null;
  full_address?: string | null;
  description?: string | null;
  rich_description?: string | null;
  reference_code?: string | null;
  public_url?: string | null;
  surface_land?: number | string | null;
  expenses?: number | string | null;
  age?: number | null;
  parking_spaces?: number | null;
  development_tokko_id?: string | null;
};

/**
 * Convierte una fila de `public.properties` al tipo `Property` de la app.
 * Recámaras y baños salen de las columnas **`bedrooms`** y **`bathrooms`** (no de `payload`).
 */
export function rowToProperty(row: PropertyRow): Property {
  const imgs = Array.isArray(row.images) ? row.images.filter((x): x is string => typeof x === "string") : [];
  const primary = row.image?.trim() || imgs[0] || "";
  const rawStatus = String(row.status ?? "");
  const listedAtIso =
    typeof row.synced_at === "string" && row.synced_at.trim()
      ? row.synced_at
      : typeof row.updated_at === "string" && row.updated_at.trim()
        ? row.updated_at
        : undefined;
  const pubTitle = row.publication_title?.trim();
  const listingAt = row.synced_at || row.updated_at;
  const galleryUrls = buildGalleryUrls(primary, imgs);
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price ?? 0),
    location: row.location ?? "",
    bedrooms: nonNegInt(row.bedrooms),
    bathrooms: nonNegInt(row.bathrooms),
    area: Number(row.area ?? 0),
    image: primary,
    type: row.type ?? "",
    status: appStatusFromDb(row.status),
    featured: Boolean(row.featured),
    coordinates:
      row.lat != null && row.lng != null
        ? { lat: row.lat, lng: row.lng }
        : undefined,
    colony:
      row.colony != null && String(row.colony).trim() !== ""
        ? String(row.colony).trim()
        : undefined,
    amenities: textArrayCol(row.amenities),
    services: textArrayCol(row.services),
    additionalFeatures: textArrayCol(row.additional_features),
    publicationTitle: pubTitle || undefined,
    fullAddress: row.full_address?.trim() || undefined,
    description: row.description?.trim() || undefined,
    richDescription: row.rich_description?.trim() || undefined,
    referenceCode: row.reference_code?.trim() || undefined,
    publicUrl: row.public_url?.trim() || undefined,
    surfaceLand: optionalPositiveNum(row.surface_land),
    expenses: optionalPositiveNum(row.expenses),
    age: row.age != null && Number.isFinite(row.age) ? Math.max(0, Math.round(row.age)) : undefined,
    parkingSpaces: row.parking_spaces != null ? nonNegInt(row.parking_spaces) : undefined,
    galleryImages: galleryUrls,
    listingUpdatedAt: listingAt || undefined,
    developmentTokkoId:
      row.development_tokko_id != null && String(row.development_tokko_id).trim() !== ""
        ? String(row.development_tokko_id).trim()
        : undefined,
    listedAtIso,
    listingInventory: parseListingInventory(rawStatus),
    images: galleryUrls.length > 0 ? galleryUrls : undefined,
  };
}

/** PostgREST devuelve `data` como array en insert/update con `.select()`; normaliza el id devuelto. */
export function idFromPropertyWriteResult(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === "object" && "id" in first) {
      const v = (first as { id: unknown }).id;
      return v != null ? String(v) : undefined;
    }
    return undefined;
  }
  if (typeof data === "object" && "id" in data) {
    const v = (data as { id: unknown }).id;
    return v != null ? String(v) : undefined;
  }
  return undefined;
}

export async function fetchCatalogProperties(client: SupabaseClient) {
  /** No filtramos por `deleted_at IS NULL`: en datos sincronizados desde Tokko a veces nunca queda NULL y el listado quedaría vacío. El borrado en admin sigue usando `softDeleteProperty`. */
  /** `select('*')` incluye `bedrooms` y `bathrooms`; `rowToProperty` las mapea al modelo. */
  return client.from("properties").select("*").order("updated_at", { ascending: false });
}

/**
 * Solo propiedades destacadas (portada). Pocas filas — no usar el listado completo en el home.
 * Índice recomendado en Postgres: `(featured) WHERE featured = true` o partial index en `featured`.
 */
export async function fetchFeaturedPropertiesForHome(client: SupabaseClient) {
  return await client
    .from("properties")
    .select("*")
    .eq("featured", true)
    .order("updated_at", { ascending: false })
    .limit(MAX_FEATURED_PROPERTIES);
}

/** Propiedades vinculadas a un desarrollo por `development_tokko_id` (Tokko). */
export async function fetchPropertiesByDevelopmentTokkoId(client: SupabaseClient, developmentTokkoId: string) {
  const id = developmentTokkoId.trim();
  if (!id) {
    return { data: [] as Property[], error: null };
  }
  /** `ilike` sin comodines equivale a igualdad sin distinguir mayúsculas (alineado con el conteo por tokko en desarrollos). */
  const res = await client
    .from("properties")
    .select("*")
    .ilike("development_tokko_id", id)
    .order("updated_at", { ascending: false });
  if (res.error) return { data: null, error: res.error };
  const rows = (res.data ?? []) as PropertyRow[];
  return { data: rows.map(rowToProperty), error: null };
}

export async function insertProperty(client: SupabaseClient, p: Property, explicitId: string) {
  const ts = nowIso();
  const id = explicitId || p.id;
  const tokkoId = `manual_${id}`;
  const imgs =
    p.galleryImages && p.galleryImages.length > 0
      ? [...p.galleryImages]
      : p.images && p.images.length > 0
        ? [...p.images]
        : p.image
          ? [p.image]
          : [];
  const row = {
    id,
    tokko_id: tokkoId,
    title: p.title,
    price: p.price,
    location: p.location || null,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.area,
    image: imgs[0] ?? p.image ?? null,
    type: p.type || null,
    status: dbStatusFromApp(p.status),
    lat: p.coordinates?.lat ?? null,
    lng: p.coordinates?.lng ?? null,
    development_tokko_id: p.developmentTokkoId?.trim() || null,
    payload: { source: "viterra_admin" } as Record<string, unknown>,
    synced_at: ts,
    updated_at: ts,
    images: imgs,
    colony: p.colony?.trim() || null,
    full_address: p.fullAddress?.trim() || null,
    description: p.description?.trim() || null,
    rich_description: p.richDescription?.trim() || null,
    amenities: [...(p.amenities ?? [])],
    services: [...(p.services ?? [])],
    additional_features: [...(p.additionalFeatures ?? [])],
    reference_code: p.referenceCode?.trim() || null,
    public_url: p.publicUrl?.trim() || null,
    deleted_at: null,
    publication_title: null,
    featured: Boolean(p.featured),
    surface_land: null,
    expenses: null,
    age: null,
    parking_spaces: null,
    property_type_tokko_id: null,
    total_surface: null,
    roofed_surface: null,
    semiroofed_surface: null,
    unroofed_surface: null,
    front_measure: null,
    depth_measure: null,
    floors_amount: null,
    situation: null,
    orientation: null,
    half_bathrooms: null,
    credit_eligible: null,
    tags: [] as string[],
  };
  return client.from("properties").insert(row).select("id");
}

export async function updateProperty(client: SupabaseClient, p: Property) {
  const ts = nowIso();
  const imgs =
    p.galleryImages && p.galleryImages.length > 0
      ? [...p.galleryImages]
      : p.images && p.images.length > 0
        ? [...p.images]
        : p.image
          ? [p.image]
          : [];
  return client
    .from("properties")
    .update({
      title: p.title,
      price: p.price,
      location: p.location || null,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      image: imgs[0] ?? p.image ?? null,
      type: p.type || null,
      status: dbStatusFromApp(p.status),
      lat: p.coordinates?.lat ?? null,
      lng: p.coordinates?.lng ?? null,
      images: imgs,
      updated_at: ts,
      synced_at: ts,
      featured: Boolean(p.featured),
      payload: { source: "viterra_admin", lastEdit: ts } as Record<string, unknown>,
    })
    .eq("id", p.id)
    .select("id");
}

export async function updatePropertyFeatured(client: SupabaseClient, id: string, featured: boolean) {
  const ts = nowIso();
  return client.from("properties").update({ featured, updated_at: ts, synced_at: ts }).eq("id", id);
}

export async function softDeleteProperty(client: SupabaseClient, id: string) {
  const ts = nowIso();
  return client.from("properties").update({ deleted_at: ts, updated_at: ts, synced_at: ts }).eq("id", id);
}
