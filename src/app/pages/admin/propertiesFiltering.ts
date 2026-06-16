import type { Property } from "../../components/PropertyCard";
import { foldSearchText } from "../../lib/searchText";

export type PropertiesDisplayFilters = {
  propertySearchQuery: string;
  propertyReferenceCodeQuery: string;
  propertyOperationFilter: string;
  propertyTypeFilter: string;
  propertyLocationFilter: string;
  propertyFeaturedFilter: "all" | "featured" | "normal";
};

/**
 * Filtra el catálogo de propiedades por búsqueda libre, código de referencia, operación,
 * tipo, ubicación y destacado. Pura y testeable (sin orden — eso lo hace sortCatalogProperties).
 */
export function filterPropertiesForDisplay(
  properties: Property[],
  filters: PropertiesDisplayFilters,
): Property[] {
  const q = foldSearchText(filters.propertySearchQuery);
  const refQ = foldSearchText(filters.propertyReferenceCodeQuery);

  return properties.filter((property) => {
    const matchesSearch =
      !q ||
      foldSearchText(property.title).includes(q) ||
      foldSearchText(property.location).includes(q) ||
      foldSearchText(property.type).includes(q) ||
      foldSearchText(property.status).includes(q);
    const matchesReferenceCode = !refQ || foldSearchText(property.referenceCode ?? "").includes(refQ);
    const matchesOperation =
      filters.propertyOperationFilter === "all" || property.status === filters.propertyOperationFilter;
    const matchesType =
      filters.propertyTypeFilter === "all" || property.type === filters.propertyTypeFilter;
    const matchesLocation =
      filters.propertyLocationFilter === "all" || property.location === filters.propertyLocationFilter;
    const matchesFeatured =
      filters.propertyFeaturedFilter === "all" ||
      (filters.propertyFeaturedFilter === "featured" ? Boolean(property.featured) : !property.featured);

    return (
      matchesSearch &&
      matchesReferenceCode &&
      matchesOperation &&
      matchesType &&
      matchesLocation &&
      matchesFeatured
    );
  });
}
