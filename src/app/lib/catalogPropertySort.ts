import type { Property } from "../components/PropertyCard";

/** Clave de ordenación del catálogo (público y admin). */
export type CatalogPropertySortKey =
  | "newest"
  | "price-low"
  | "price-high"
  | "area-small"
  | "area-large"
  | "bedrooms-low"
  | "bedrooms-high"
  | "bathrooms-low"
  | "bathrooms-high";

function cmpId(a: Property, b: Property): number {
  return a.id.localeCompare(b.id);
}

/** Ordena una copia del listado; `newest` conserva el orden recibido (p. ej. del hook / Supabase). */
export function sortCatalogProperties(
  items: Property[],
  sortKey: CatalogPropertySortKey
): Property[] {
  const next = [...items];
  if (sortKey === "newest") return next;

  switch (sortKey) {
    case "price-low":
      next.sort((a, b) => (a.price !== b.price ? a.price - b.price : cmpId(a, b)));
      break;
    case "price-high":
      next.sort((a, b) => (a.price !== b.price ? b.price - a.price : cmpId(a, b)));
      break;
    case "area-small":
      next.sort((a, b) => (a.area !== b.area ? a.area - b.area : cmpId(a, b)));
      break;
    case "area-large":
      next.sort((a, b) => (a.area !== b.area ? b.area - a.area : cmpId(a, b)));
      break;
    case "bedrooms-low":
      next.sort((a, b) =>
        a.bedrooms !== b.bedrooms ? a.bedrooms - b.bedrooms : cmpId(a, b)
      );
      break;
    case "bedrooms-high":
      next.sort((a, b) =>
        a.bedrooms !== b.bedrooms ? b.bedrooms - a.bedrooms : cmpId(a, b)
      );
      break;
    case "bathrooms-low":
      next.sort((a, b) =>
        a.bathrooms !== b.bathrooms ? a.bathrooms - b.bathrooms : cmpId(a, b)
      );
      break;
    case "bathrooms-high":
      next.sort((a, b) =>
        a.bathrooms !== b.bathrooms ? b.bathrooms - a.bathrooms : cmpId(a, b)
      );
      break;
    default:
      break;
  }
  return next;
}

/** Opciones de `<select>` compartidas (landing y admin). */
export const CATALOG_PROPERTY_SORT_OPTIONS: {
  value: CatalogPropertySortKey;
  label: string;
}[] = [
  { value: "newest", label: "Más recientes" },
  { value: "price-low", label: "Precio: menor a mayor" },
  { value: "price-high", label: "Precio: mayor a menor" },
  { value: "area-small", label: "Área: menor a mayor" },
  { value: "area-large", label: "Área: mayor a menor" },
  { value: "bedrooms-low", label: "Recámaras: menor a mayor" },
  { value: "bedrooms-high", label: "Recámaras: mayor a menor" },
  { value: "bathrooms-low", label: "Baños: menor a mayor" },
  { value: "bathrooms-high", label: "Baños: mayor a menor" },
];
