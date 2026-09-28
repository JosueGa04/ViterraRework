import { describe, it, expect } from "vitest";
import {
  isLandProperty,
  extractSurfaceFromText,
  parseLocalizedNumber,
  resolvePropertyDisplaySurface,
  formatM2,
} from "../../../app/lib/propertySurface";

describe("propertySurface utility", () => {
  describe("isLandProperty", () => {
    it("identifies land types accurately", () => {
      expect(isLandProperty("Terreno")).toBe(true);
      expect(isLandProperty("terreno rústico")).toBe(true);
      expect(isLandProperty("Lote")).toBe(true);
      expect(isLandProperty("Rancho")).toBe(true);
      expect(isLandProperty("Parcela")).toBe(true);
      expect(isLandProperty("Casa")).toBe(false);
      expect(isLandProperty("Departamento")).toBe(false);
      expect(isLandProperty("")).toBe(false);
      expect(isLandProperty(null)).toBe(false);
    });
  });

  describe("parseLocalizedNumber", () => {
    it("parses both comma thousands and dot decimals correctly", () => {
      expect(parseLocalizedNumber("9,628.98")).toBe(9628.98);
      expect(parseLocalizedNumber("9.628,98")).toBe(9628.98);
      expect(parseLocalizedNumber("9628.98")).toBe(9628.98);
      expect(parseLocalizedNumber("9628,98")).toBe(9628.98);
      expect(parseLocalizedNumber("9,628")).toBe(9628);
      expect(parseLocalizedNumber("250")).toBe(250);
      expect(parseLocalizedNumber("")).toBe(0);
    });
  });

  describe("extractSurfaceFromText", () => {
    it("extracts surface from titles and descriptions", () => {
      const match1 = extractSurfaceFromText("Terreno rústico en venta | 9,628.98 m²");
      expect(match1).not.toBeNull();
      expect(match1?.value).toBe(9628.98);

      const match2 = extractSurfaceFromText("En venta con superficie de 500 m2");
      expect(match2?.value).toBe(500);

      const match3 = extractSurfaceFromText("Casa con 250 m2 de construcción");
      expect(match3?.value).toBe(250);
      expect(match3?.kind).toBe("roofed");

      const match4 = extractSurfaceFromText("Precio $8,570,000 en 2026 tel 3336297122");
      expect(match4).toBeNull();
    });
  });

  describe("resolvePropertyDisplaySurface hierarchy", () => {
    it("for a Terreno with surfaceLand > 0, prioritizes Terreno over 0 covered area", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Terreno",
        area: 0,
        surfaceLand: 9628.98,
      });

      expect(result.numericValue).toBe(9628.98);
      expect(result.formatted).toBe("9,628.98 m²");
      expect(result.label).toBe("Terreno");
      expect(result.source).toBe("structured");
    });

    it("for a Terreno with 0 in numeric fields, extracts m2 from title/description", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Terreno",
        area: 0,
        surfaceLand: 0,
        title: "Terreno rústico en venta | 9,628.98 m²",
      });

      expect(result.numericValue).toBe(9628.98);
      expect(result.formatted).toBe("9,628.98 m²");
      expect(result.label).toBe("Terreno");
      expect(result.source).toBe("extracted_text");
    });

    it("for a Casa with area > 0, prioritizes Cubierta", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Casa",
        area: 250,
        surfaceLand: 350,
      });

      expect(result.numericValue).toBe(250);
      expect(result.formatted).toBe("250 m²");
      expect(result.label).toBe("Cubierta");
    });

    it("for a Casa with area = 0 but surfaceLand > 0, falls back to Terreno", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Casa",
        area: 0,
        surfaceLand: 350,
      });

      expect(result.numericValue).toBe(350);
      expect(result.formatted).toBe("350 m²");
      expect(result.label).toBe("Terreno");
    });

    it("falls back to frontMeasure when no area exists", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Terreno",
        area: 0,
        surfaceLand: 0,
        frontMeasure: 20,
      });

      expect(result.numericValue).toBe(20);
      expect(result.formatted).toBe("20 m");
      expect(result.label).toBe("Fachada");
    });

    it("extracts m2 from richDescription with HTML formatting as last fallback", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Terreno",
        area: 0,
        surfaceLand: 0,
        frontMeasure: 0,
        totalSurface: 0,
        richDescription: "<p>Gran oportunidad de terreno con <strong>9,628.98 m²</strong> en zona norte.</p>",
      });

      expect(result.numericValue).toBe(9628.98);
      expect(result.formatted).toBe("9,628.98 m²");
      expect(result.label).toBe("Terreno");
      expect(result.source).toBe("extracted_text");
    });

    it("extracts m2 from plain description when no structured fields exist", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Casa",
        area: 0,
        surfaceLand: 0,
        frontMeasure: 0,
        totalSurface: 0,
        description: "Casa en privada con 180 m2 de construcción y 3 recámaras.",
      });

      expect(result.numericValue).toBe(180);
      expect(result.formatted).toBe("180 m²");
      expect(result.label).toBe("Cubierta");
      expect(result.source).toBe("extracted_text");
    });

    it("guarantees description extraction is the LAST filter: structured data takes precedence", () => {
      const result = resolvePropertyDisplaySurface({
        type: "Terreno",
        area: 0,
        surfaceLand: 5000,
        description: "En texto dice 2,000 m2 pero en el sistema tiene 5,000 m2",
      });

      expect(result.numericValue).toBe(5000);
      expect(result.formatted).toBe("5,000 m²");
      expect(result.source).toBe("structured");
    });

    it("supports English locale labels", () => {
      const result = resolvePropertyDisplaySurface(
        {
          type: "Terreno",
          surfaceLand: 500,
        },
        "en"
      );

      expect(result.label).toBe("Land");
      expect(result.formatted).toBe("500 m²");
    });
  });
});
