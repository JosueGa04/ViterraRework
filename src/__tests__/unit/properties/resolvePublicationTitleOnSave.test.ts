/**
 * @file resolvePublicationTitleOnSave.test.ts
 * @module Unit Tests – Sincronización de "Título de publicación" al guardar propiedades
 *
 * Cubre el ticket: al editar solo "Título" en el admin, el sitio público seguía mostrando
 * el título viejo porque prioriza `publicationTitle` (cardHeadline() en PropertyCard.tsx) y
 * ese campo no se actualizaba junto con "Título". El fix sincroniza `publicationTitle` con
 * el nuevo título SOLO cuando antes del cambio ambos coincidían (es decir, publicationTitle
 * no era una copia de marketing deliberadamente distinta) — para no pisar copy personalizado.
 *
 * Ejecutar: npx vitest run src/__tests__/unit/properties/resolvePublicationTitleOnSave.test.ts
 */

import { describe, it, expect } from "vitest";
import { resolvePublicationTitleOnSave } from "../../../app/components/admin/PropertyFormDialog";
import type { Property } from "../../../app/components/PropertyCard";

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "p1",
    title: "Departamento en venta, Fracc. Puerta de Hierro",
    price: 36000,
    location: "Zapopan",
    bedrooms: 2,
    bathrooms: 3,
    area: 110,
    image: "",
    type: "Casa",
    status: "alquiler",
    publicationTitle: "Departamento en venta, Fracc. Puerta de Hierro",
    ...overrides,
  };
}

describe("resolvePublicationTitleOnSave", () => {
  it("modo create: no toca publicationTitle (no hay 'original' con qué comparar)", () => {
    const draft = { title: "Casa nueva", publicationTitle: "" };
    expect(resolvePublicationTitleOnSave("create", null, draft)).toBe("");
  });

  it("caso del ticket: título editado, publicationTitle sin tocar y coincidía con el título viejo → se sincroniza", () => {
    const original = makeProperty();
    const draft = { title: "Departamento en renta, Fracc. Puerta de Hierro", publicationTitle: original.publicationTitle };
    expect(resolvePublicationTitleOnSave("edit", original, draft)).toBe(
      "Departamento en renta, Fracc. Puerta de Hierro",
    );
  });

  it("no pisa un publicationTitle que ya era una copia de marketing deliberadamente distinta", () => {
    const original = makeProperty({ publicationTitle: "Depa de lujo con alberca — ¡vista al club!" });
    const draft = { title: "Departamento en renta, Fracc. Puerta de Hierro", publicationTitle: original.publicationTitle };
    expect(resolvePublicationTitleOnSave("edit", original, draft)).toBe(
      "Depa de lujo con alberca — ¡vista al club!",
    );
  });

  it("si el admin edita publicationTitle explícitamente en este mismo guardado, se respeta su valor", () => {
    const original = makeProperty();
    const draft = { title: "Departamento en renta, Fracc. Puerta de Hierro", publicationTitle: "Copy nuevo a mano" };
    expect(resolvePublicationTitleOnSave("edit", original, draft)).toBe("Copy nuevo a mano");
  });

  it("si el título no cambió, no toca publicationTitle aunque coincidiera con el título", () => {
    const original = makeProperty();
    const draft = { title: original.title, publicationTitle: original.publicationTitle };
    expect(resolvePublicationTitleOnSave("edit", original, draft)).toBe(original.publicationTitle);
  });

  it("publicationTitle undefined (nunca se llenó) también se sincroniza si mirroreaba el título vacío", () => {
    const original = makeProperty({ title: "", publicationTitle: undefined });
    const draft = { title: "Nuevo título", publicationTitle: undefined };
    expect(resolvePublicationTitleOnSave("edit", original, draft)).toBe("Nuevo título");
  });
});
