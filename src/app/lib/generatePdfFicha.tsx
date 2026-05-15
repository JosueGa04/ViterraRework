import React from "react";
import { pdf } from "@react-pdf/renderer";

export async function generatePdf(element: React.ReactElement, filename: string): Promise<void> {
  try {
    const blob = await pdf(element).toBlob();
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
