import { describe, it, expect } from "vitest";
import { sanitizeRichHtml } from "../../../app/lib/propertyDescription";
import { escapeHtml } from "../../../app/lib/escapeHtml";
import { isAllowedEmbedUrl, normalizeAllowedEmbedUrl } from "../../../app/lib/safeEmbed";

describe("sanitizeRichHtml", () => {
  it("elimina scripts maliciosos", () => {
    const dirty = '<p>Hola</p><script>alert("xss")</script>';
    expect(sanitizeRichHtml(dirty)).toBe("<p>Hola</p>");
  });

  it("permite enlaces https seguros", () => {
    const html = '<p><a href="https://viterra.mx">Viterra</a></p>';
    expect(sanitizeRichHtml(html)).toContain('href="https://viterra.mx"');
  });

  it("elimina javascript: en href", () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    expect(sanitizeRichHtml(html)).not.toContain("javascript:");
  });
});

describe("escapeHtml", () => {
  it("escapa caracteres especiales", () => {
    expect(escapeHtml('<script>"&</script>')).toBe(
      "&lt;script&gt;&quot;&amp;&lt;/script&gt;",
    );
  });
});

describe("safeEmbed", () => {
  it("acepta YouTube embed", () => {
    expect(isAllowedEmbedUrl("https://www.youtube.com/embed/abc123")).toBe(true);
  });

  it("rechaza dominios arbitrarios", () => {
    expect(isAllowedEmbedUrl("https://evil.example/phish")).toBe(false);
  });

  it("normaliza URLs permitidas", () => {
    expect(normalizeAllowedEmbedUrl("https://my.matterport.com/show/?m=abc")).toMatch(
      /^https:\/\//,
    );
  });
});
