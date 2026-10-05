import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StructuredDescription } from "../../../app/components/StructuredDescription";

describe("StructuredDescription component", () => {
  it("renders null for empty string or whitespace", () => {
    const { container } = render(<StructuredDescription source="" />);
    expect(container.firstChild).toBeNull();
  });

  it("strips HTML tags and renders them as structured text", () => {
    const richHtml = "<p><strong>Terreno rústico en venta | 9,628.98 m²</strong></p><p>En venta con <u>servicios incluidos</u> y <em>escritura pública</em>.</p>";
    const { container } = render(<StructuredDescription source={richHtml} />);

    expect(container.querySelector(".viterra-prose")).toBeNull();
    const strongEl = container.querySelector("strong");
    expect(strongEl).toBeNull(); // HTML is stripped
    
    // It should render the stripped text in paragraphs
    expect(screen.getByText("Terreno rústico en venta | 9,628.98 m²")).toBeInTheDocument();
    expect(screen.getByText(/En venta con servicios incluidos y escritura pública/)).toBeInTheDocument();
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
