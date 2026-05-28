import type { SearchFilters } from "../components/SearchBar";
import type { Development } from "../data/developments";

/** Precios numéricos del inventario del desarrollo (unidades manuales). */
export function developmentUnitPrices(dev: Development): number[] {
  return dev.developmentUnits.map((u) => u.price).filter((p) => Number.isFinite(p) && p > 0);
}

/** Todos los precios del catálogo para el slider de la barra de búsqueda. */
export function developmentsCatalogPrices(devs: Development[]): number[] {
  const out: number[] = [];
  for (const d of devs) {
    const unitPrices = developmentUnitPrices(d);
    if (unitPrices.length > 0) {
      out.push(...unitPrices);
    } else if (d.priceRange) {
      const bounds = parsePriceRangeString(d.priceRange);
      if (bounds.min !== null) out.push(bounds.min);
      if (bounds.max !== null) out.push(bounds.max);
    }
  }
  return out;
}

/** Rango numérico aproximado a partir del inventario (para filtrar por precio). */
export function developmentPriceBounds(dev: Development): { min: number | null; max: number | null } {
  const prices = developmentUnitPrices(dev);
  if (prices.length === 0) return { min: null, max: null };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

function parsePriceRangeString(range: string): { min: number | null; max: number | null } {
  const digits = range.match(/\d[\d,]*/g);
  if (!digits?.length) return { min: null, max: null };
  const nums = digits
    .map((s) => Number(s.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return { min: null, max: null };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function effectiveDevelopmentPriceBounds(dev: Development): { min: number | null; max: number | null } {
  const fromUnits = developmentPriceBounds(dev);
  if (fromUnits.min !== null) return fromUnits;
  return parsePriceRangeString(dev.priceRange ?? "");
}

function matchesQuery(dev: Development, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    dev.name,
    dev.location,
    dev.colony,
    dev.fullAddress,
    dev.type,
    dev.description,
    dev.status,
    dev.referenceCode ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function matchesPrice(dev: Development, minPrice: string, maxPrice: string): boolean {
  const userMin = minPrice.trim() ? Number(minPrice) : null;
  const userMax = maxPrice.trim() ? Number(maxPrice) : null;
  if (userMin === null && userMax === null) return true;
  if (userMin !== null && !Number.isFinite(userMin)) return true;
  if (userMax !== null && !Number.isFinite(userMax)) return true;

  const { min: devMin, max: devMax } = effectiveDevelopmentPriceBounds(dev);
  if (devMin === null && devMax === null) return true;

  const lo = devMin ?? devMax!;
  const hi = devMax ?? devMin!;

  if (userMin !== null && hi < userMin) return false;
  if (userMax !== null && lo > userMax) return false;
  return true;
}

export function filterDevelopmentsCatalog(devs: Development[], filters: SearchFilters): Development[] {
  return devs.filter(
    (dev) => matchesQuery(dev, filters.query) && matchesPrice(dev, filters.minPrice, filters.maxPrice)
  );
}
