/**
 * @file propertiesFiltering.test.ts
 * Tests de filterPropertiesForDisplay (búsqueda, código de referencia, operación, tipo, ubicación, destacado).
 */
import { describe, it, expect } from "vitest";
import {
  filterPropertiesForDisplay,
  type PropertiesDisplayFilters,
} from "../../../app/pages/admin/propertiesFiltering";
import type { Property } from "../../../app/components/PropertyCard";

function makeProperty(over: Partial<Property> = {}): Property {
  return {
    id: "p1",
    title: "Casa en el centro",
    location: "Monterrey",
    type: "Casa",
    status: "venta",
    price: 1000000,
    referenceCode: "REF-001",
    featured: false,
    ...over,
  } as Property;
}

const base: PropertiesDisplayFilters = {
  propertySearchQuery: "",
  propertyReferenceCodeQuery: "",
  propertyOperationFilter: "all",
  propertyTypeFilter: "all",
  propertyLocationFilter: "all",
  propertyFeaturedFilter: "all",
};

describe("filterPropertiesForDisplay", () => {
  it("sin filtros devuelve todo", () => {
    const props = [makeProperty({ id: "a" }), makeProperty({ id: "b" })];
    expect(filterPropertiesForDisplay(props, base)).toHaveLength(2);
  });

  it("búsqueda libre (insensible a acentos) cubre título/ubicación/tipo/estado", () => {
    const props = [
      makeProperty({ id: "a", title: "Departamento céntrico" }),
      makeProperty({ id: "b", title: "Otra cosa", location: "Guadalajara" }),
    ];
    expect(filterPropertiesForDisplay(props, { ...base, propertySearchQuery: "centrico" }).map((p) => p.id)).toEqual(["a"]);
    expect(filterPropertiesForDisplay(props, { ...base, propertySearchQuery: "guadalajara" }).map((p) => p.id)).toEqual(["b"]);
  });

  it("filtra por código de referencia", () => {
    const props = [
      makeProperty({ id: "a", referenceCode: "REF-001" }),
      makeProperty({ id: "b", referenceCode: "REF-999" }),
    ];
    expect(filterPropertiesForDisplay(props, { ...base, propertyReferenceCodeQuery: "999" }).map((p) => p.id)).toEqual(["b"]);
  });

  it("filtra por operación, tipo y ubicación", () => {
    const props = [
      makeProperty({ id: "a", status: "venta", type: "Casa", location: "Monterrey" }),
      makeProperty({ id: "b", status: "alquiler", type: "Depto", location: "CDMX" }),
    ];
    expect(filterPropertiesForDisplay(props, { ...base, propertyOperationFilter: "alquiler" }).map((p) => p.id)).toEqual(["b"]);
    expect(filterPropertiesForDisplay(props, { ...base, propertyTypeFilter: "Casa" }).map((p) => p.id)).toEqual(["a"]);
    expect(filterPropertiesForDisplay(props, { ...base, propertyLocationFilter: "CDMX" }).map((p) => p.id)).toEqual(["b"]);
  });

  it("filtra por destacado (featured / normal)", () => {
    const props = [
      makeProperty({ id: "a", featured: true }),
      makeProperty({ id: "b", featured: false }),
    ];
    expect(filterPropertiesForDisplay(props, { ...base, propertyFeaturedFilter: "featured" }).map((p) => p.id)).toEqual(["a"]);
    expect(filterPropertiesForDisplay(props, { ...base, propertyFeaturedFilter: "normal" }).map((p) => p.id)).toEqual(["b"]);
  });

  it("combina filtros (AND)", () => {
    const props = [
      makeProperty({ id: "ok", type: "Casa", status: "venta", featured: true }),
      makeProperty({ id: "no", type: "Casa", status: "alquiler", featured: true }),
    ];
    const out = filterPropertiesForDisplay(props, {
      ...base,
      propertyTypeFilter: "Casa",
      propertyOperationFilter: "venta",
      propertyFeaturedFilter: "featured",
    });
    expect(out.map((p) => p.id)).toEqual(["ok"]);
  });
});
