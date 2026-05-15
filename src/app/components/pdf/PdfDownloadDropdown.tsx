import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { generatePdf } from "../../lib/generatePdfFicha";
import { FichaTecnicaPdf } from "./FichaTecnicaPdf";
import type { Property } from "../PropertyCard";
import type { Development } from "../../data/developments";
import { useAuth } from "../../contexts/AuthContext";

interface PdfDownloadDropdownProps {
  data: Property | Development;
  type: "property" | "development";
  className?: string;
}

export function PdfDownloadDropdown({ data, type, className }: PdfDownloadDropdownProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  const handleDownload = async (includeLogo: boolean) => {
    try {
      setIsGenerating(true);
      const loadingToast = toast.loading("Generando PDF...");
      
      const fileName = `Ficha_Tecnica_${type === "development" ? (data as Development).name : (data as Property).title}.pdf`
        .replace(/[^a-zA-Z0-9-_\.]/g, "_");

      await generatePdf(
        <FichaTecnicaPdf data={data} type={type} includeLogo={includeLogo} user={user} />,
        fileName
      );

      toast.success("PDF generado exitosamente.", { id: loadingToast });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Ocurrió un error al generar el PDF. Intenta de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isGenerating}
          className={className || "rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"}
          title="Descargar Ficha Técnica"
          aria-label="Descargar Ficha Técnica"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : (
            <Download className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload(true)}>
          Con membrete Viterra
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload(false)}>
          Libre de logo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
