import type { Property } from "../components/PropertyCard";
import type { SearchFilters } from "../components/SearchBar";

/** Recámaras / baños mínimos y rango de superficie (m²) desde `SearchBar`. */
export function applyAdvancedPropertyFilters(properties: Property[], f: SearchFilters): Property[] {
  let out = properties;
  if (f.minBedrooms) {
    const n = Number(f.minBedrooms);
    if (Number.isFinite(n) && n > 0) out = out.filter((p) => p.bedrooms >= n);
  }
  if (f.minBathrooms) {
    const n = Number(f.minBathrooms);
    if (Number.isFinite(n) && n > 0) out = out.filter((p) => p.bathrooms >= n);
  }
  if (f.minArea) {
    const n = Number(f.minArea);
    if (Number.isFinite(n) && n >= 0) out = out.filter((p) => p.area >= n);
  }
  if (f.maxArea) {
    const n = Number(f.maxArea);
    if (Number.isFinite(n) && n > 0) out = out.filter((p) => p.area <= n);
  }
  return out;
}
