import React from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";

export async function generatePdf(element: React.ReactElement, filename: string): Promise<void> {
  try {
    // El elemento siempre es un <Document> de @react-pdf; el cast acota el tipo en el límite.
    const blob = await pdf(element as React.ReactElement<DocumentProps>).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error("Error al generar el documento PDF:", error);
    throw new Error("No se pudo generar el contenido del PDF.");
  }
}
