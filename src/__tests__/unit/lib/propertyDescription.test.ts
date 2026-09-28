import { describe, it, expect } from "vitest";
import {
  hasRichDescription,
  sanitizeRichHtml,
} from "../../../app/lib/propertyDescription";

describe("propertyDescription utilities", () => {
  describe("hasRichDescription", () => {
    it("should return false for empty, null, or empty paragraph HTML tags", () => {
      expect(hasRichDescription(null)).toBe(false);
      expect(hasRichDescription("")).toBe(false);
      expect(hasRichDescription("<p></p>")).toBe(false);
      expect(hasRichDescription("<p>   <br/></p>")).toBe(false);
      expect(hasRichDescription("<p>&nbsp;</p>")).toBe(false);
    });

    it("should return true when text content is present", () => {
      expect(hasRichDescription("<p>Hermosa casa en venta con alberca</p>")).toBe(true);
      expect(hasRichDescription("<h2>Especificaciones</h2>")).toBe(true);
    });
  });

  describe("sanitizeRichHtml", () => {
    it("should strip malicious script tags while preserving allowed formatting elements", () => {
      const dirty = "<p>Casa de <strong>Lujo</strong> <script>alert('xss')</script></p>";
      const clean = sanitizeRichHtml(dirty);
      expect(clean).toContain("<p>Casa de <strong>Lujo</strong> </p>");
      expect(clean).not.toContain("<script>");
    });

    it("should handle links with safe href attributes", () => {
      const input = '<a href="https://viterrainmobiliaria.com" target="_blank">Ver sitio</a>';
      const clean = sanitizeRichHtml(input);
      expect(clean).toContain('href="https://viterrainmobiliaria.com"');
    });

    it("should preserve bold, underline, italic, and strikethrough tags", () => {
      const input = "<p><strong>Negrita</strong> y <u>subrayado</u> y <em>cursiva</em> y <s>tachado</s></p>";
      const clean = sanitizeRichHtml(input);
      expect(clean).toContain("<strong>Negrita</strong>");
      expect(clean).toContain("<u>subrayado</u>");
      expect(clean).toContain("<em>cursiva</em>");
      expect(clean).toContain("<s>tachado</s>");
    });
  });
});
