import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StructuredDescription } from "../../../app/components/StructuredDescription";

describe("StructuredDescription component", () => {
  it("renders null for empty string or whitespace", () => {
    const { container } = render(<StructuredDescription source="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders rich HTML with bold, underline, italic, and headings preserving formatting tags", () => {
    const richHtml = "<p><strong>Terreno rústico en venta | 9,628.98 m²</strong></p><p>En venta con <u>servicios incluidos</u> y <em>escritura pública</em>.</p>";
    const { container } = render(<StructuredDescription source={richHtml} />);

    expect(container.querySelector(".viterra-prose")).not.toBeNull();
    const strongEl = container.querySelector("strong");
    expect(strongEl).not.toBeNull();
    expect(strongEl?.textContent).toBe("Terreno rústico en venta | 9,628.98 m²");

    const underlineEl = container.querySelector("u");
    expect(underlineEl).not.toBeNull();
    expect(underlineEl?.textContent).toBe("servicios incluidos");

    const italicEl = container.querySelector("em");
    expect(italicEl).not.toBeNull();
    expect(italicEl?.textContent).toBe("escritura pública");
  });

  it("renders plain text structured blocks with headers and bullets", () => {
    const plainText = "En venta terreno rústico.\nCaracterísticas:\n* Bardeado\n* Transformador CFE";
    const { container } = render(<StructuredDescription source={plainText} />);

    expect(screen.getByText("En venta terreno rústico.")).toBeInTheDocument();
    expect(screen.getByText("Características")).toBeInTheDocument();
    expect(screen.getByText("Bardeado")).toBeInTheDocument();
    expect(screen.getByText("Transformador CFE")).toBeInTheDocument();
  });
});
