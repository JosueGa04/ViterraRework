import type { Property } from "../components/PropertyCard";
import type { Locale } from "../i18n/locale";

export interface PropertySurfaceResult {
  /** Valor numérico en m² o metros (frente) */
  numericValue: number;
  /** Cadena lista para mostrar con unidad (ej. "9,628.98 m²" o "15 m") */
  formatted: string;
  /** Tipo de métrica seleccionada por la jerarquía */
  kind: "land" | "roofed" | "total" | "unroofed" | "semiroofed" | "front" | "depth" | "extracted";
  /** Etiqueta corta para la tarjeta KPI (ej. "Terreno", "Cubierta", "Total", "m²", "Frente") */
  label: string;
  /** Etiqueta completa para tablas de detalle (ej. "Superficie de terreno") */
  fullLabel: string;
  /** Si el dato proviene de campos numéricos ("structured") o fue extraído por regex del texto ("extracted_text") */
  source: "structured" | "extracted_text" | "empty";
}

/**
 * Detecta si el tipo de propiedad corresponde a tierra/terreno donde
 * el área más relevante por defecto es la superficie de terreno.
 */
export function isLandProperty(type?: string | null): boolean {
  if (!type) return false;
  const t = type.toLowerCase().trim();
  return (
    t.includes("terreno") ||
    t.includes("lote") ||
    t.includes("parcela") ||
    t.includes("rancho") ||
    t.includes("campo") ||
    t.includes("solar") ||
    t.includes("macrolote") ||
    t.includes("predio")
  );
}

/**
 * Parsea un número en texto que puede venir en formato mexicano/latino
 * ("9,628.98", "9.628,98", "9628.98", "9628,98", "9,628").
 */
export function parseLocalizedNumber(str: string | undefined | null): number {
  if (!str?.trim()) return 0;
  const s = str.trim();

  // Ambos separadores presentes
  if (s.includes(",") && s.includes(".")) {
    if (s.indexOf(",") < s.indexOf(".")) {
      // 9,628.98 -> coma miles, punto decimal
      return parseFloat(s.replace(/,/g, "")) || 0;
    } else {
      // 9.628,98 -> punto miles, coma decimal
      return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
    }
  }

  // Solo coma
  if (s.includes(",")) {
    const parts = s.split(",");
    // Caso "9,628" (3 dígitos tras la coma = miles) vs "9628,5" o "9628,98" (decimal)
    if (parts[1] && parts[1].length === 3 && parts[0].length <= 3) {
      return parseFloat(s.replace(/,/g, "")) || 0;
    }
    return parseFloat(s.replace(",", ".")) || 0;
  }

  return parseFloat(s) || 0;
}

/**
 * Formatea un número en m² con separador de miles y hasta 2 decimales si no es entero.
 */
export function formatM2(val: number, locale: Locale = "es"): string {
  if (!val || val <= 0) return "0 m²";
  const formattedNum = val.toLocaleString(locale === "en" ? "en-US" : "es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formattedNum} m²`;
}

/**
 * Extrae superficie en m² de cualquier texto libre (descripción, anotaciones, título).
 * Limpia tags HTML previamente por si el asesor usó el editor con formato (negritas, etc.).
 */
export function extractSurfaceFromText(text: string | undefined | null): {
  value: number;
  kind: "land" | "roofed" | "total" | "general";
} | null {
  if (!text?.trim()) return null;

  // Limpiar etiquetas HTML y entidades antes de evaluar regex
  const clean = text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/\s+/g, " ");

  // Patrón 1: número seguido de unidad ("9,628.98 m²", "9628.98 m2", "500 mts2", "120 metros cuadrados", "150mt2")
  const unitRegex =
    /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?|[0-9]+(?:[.,][0-9]+)?)\s*(?:m²|m2|mts2|mts²|mt2|metros\s*cuadrados|metros²|mts\b)/gi;

  let match: RegExpExecArray | null;
  while ((match = unitRegex.exec(clean)) !== null) {
    const val = parseLocalizedNumber(match[1]);
    // Filtrar valores no realistas (ej. años como 2026 o números insignificantes)
    if (val > 0 && val < 50000000) {
      const start = Math.max(0, match.index - 35);
      const end = Math.min(clean.length, match.index + match[0].length + 35);
      const context = clean.slice(start, end).toLowerCase();

      let kind: "land" | "roofed" | "total" | "general" = "general";
      if (
        context.includes("terreno") ||
        context.includes("lote") ||
        context.includes("solar") ||
        context.includes("predio")
      ) {
        kind = "land";
      } else if (
        context.includes("construcci") ||
        context.includes("cubierta") ||
        context.includes("edifica")
      ) {
        kind = "roofed";
      } else if (context.includes("total")) {
        kind = "total";
      }

      return { value: val, kind };
    }
  }

  // Patrón 2: prefijo explícito ("superficie: 9,628.98", "área: 500", "terreno: 9628.98")
  const prefixRegex =
    /(?:superficie(?:\s+de|\s+del?\s+terreno|\s+total)?|área(?:\s+de)?|area(?:\s+de)?|terreno(?:\s+de)?)\s*[:=-]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/gi;

  while ((match = prefixRegex.exec(clean)) !== null) {
    const preChars = clean.slice(Math.max(0, match.index - 5), match.index);
    if (!preChars.includes("$")) {
      const val = parseLocalizedNumber(match[1]);
      if (val > 0 && val < 50000000) {
        const matchedStr = match[0].toLowerCase();
        let kind: "land" | "roofed" | "total" | "general" = "general";
        if (matchedStr.includes("terreno")) kind = "land";
        else if (matchedStr.includes("construcci") || matchedStr.includes("cubierta")) kind = "roofed";
        else if (matchedStr.includes("total")) kind = "total";

        return { value: val, kind };
      }
    }
  }

  return null;
}

/**
 * Resuelve la superficie y etiqueta más relevante de una propiedad según una jerarquía
 * inteligente. Si el valor prioritario es 0 o no existe, desciende al siguiente disponible.
 * Si todos los campos numéricos son 0, busca menciones de m² en el texto de la ficha.
 */
export function resolvePropertyDisplaySurface(
  property: Partial<Property> | null | undefined,
  locale: Locale = "es"
): PropertySurfaceResult {
  const isEn = locale === "en";

  if (!property) {
    return {
      numericValue: 0,
      formatted: "0 m²",
      kind: "roofed",
      label: isEn ? "Covered" : "Cubierta",
      fullLabel: isEn ? "Covered Area" : "Superficie cubierta",
      source: "empty",
    };
  }

  const isLand = isLandProperty(property.type);

  // Valores normalizados de campos numéricos (positivos únicamente)
  const surfaceLand = (property.surfaceLand ?? 0) > 0 ? property.surfaceLand! : 0;
  const totalSurface = (property.totalSurface ?? 0) > 0 ? property.totalSurface! : 0;
  const coveredArea =
    (property.roofedSurface ?? 0) > 0
      ? property.roofedSurface!
      : (property.area ?? 0) > 0
        ? property.area!
        : 0;
  const unroofed = (property.unroofedSurface ?? 0) > 0 ? property.unroofedSurface! : 0;
  const semiroofed = (property.semiroofedSurface ?? 0) > 0 ? property.semiroofedSurface! : 0;
  const front = (property.frontMeasure ?? 0) > 0 ? property.frontMeasure! : 0;

  // 1. Si es terreno: Terreno es la prioridad #1, luego Fachada/Frente, luego Total, etc.
  if (isLand) {
    if (surfaceLand > 0) {
      return {
        numericValue: surfaceLand,
        formatted: formatM2(surfaceLand, locale),
        kind: "land",
        label: isEn ? "Land" : "Terreno",
        fullLabel: isEn ? "Land Area" : "Superficie de terreno",
        source: "structured",
      };
    }
    if (front > 0) {
      return {
        numericValue: front,
        formatted: `${front.toLocaleString(isEn ? "en-US" : "es-MX")} m`,
        kind: "front",
        label: isEn ? "Frontage" : "Fachada",
        fullLabel: isEn ? "Frontage" : "Frente / Fachada",
        source: "structured",
      };
    }
    if (totalSurface > 0) {
      return {
        numericValue: totalSurface,
        formatted: formatM2(totalSurface, locale),
        kind: "total",
        label: isEn ? "Total" : "Total",
        fullLabel: isEn ? "Total Area" : "Superficie total",
        source: "structured",
      };
    }
    if (coveredArea > 0) {
      return {
        numericValue: coveredArea,
        formatted: formatM2(coveredArea, locale),
        kind: "roofed",
        label: isEn ? "Covered" : "Cubierta",
        fullLabel: isEn ? "Covered Area" : "Superficie cubierta",
        source: "structured",
      };
    }
    if (unroofed > 0) {
      return {
        numericValue: unroofed,
        formatted: formatM2(unroofed, locale),
        kind: "unroofed",
        label: isEn ? "Uncovered" : "Descubierta",
        fullLabel: isEn ? "Uncovered Area" : "Superficie descubierta",
        source: "structured",
      };
    }
  } else {
    // 2. Si no es terreno (Casa, Depto, etc.): Cubierta/Construcción es la prioridad #1
    if (coveredArea > 0) {
      return {
        numericValue: coveredArea,
        formatted: formatM2(coveredArea, locale),
        kind: "roofed",
        label: isEn ? "Covered" : "Cubierta",
        fullLabel: isEn ? "Covered Area" : "Superficie cubierta",
        source: "structured",
      };
    }
    if (surfaceLand > 0) {
      return {
        numericValue: surfaceLand,
        formatted: formatM2(surfaceLand, locale),
        kind: "land",
        label: isEn ? "Land" : "Terreno",
        fullLabel: isEn ? "Land Area" : "Superficie de terreno",
        source: "structured",
      };
    }
    if (front > 0) {
      return {
        numericValue: front,
        formatted: `${front.toLocaleString(isEn ? "en-US" : "es-MX")} m`,
        kind: "front",
        label: isEn ? "Frontage" : "Fachada",
        fullLabel: isEn ? "Frontage" : "Frente / Fachada",
        source: "structured",
      };
    }
    if (totalSurface > 0) {
      return {
        numericValue: totalSurface,
        formatted: formatM2(totalSurface, locale),
        kind: "total",
        label: isEn ? "Total" : "Total",
        fullLabel: isEn ? "Total Area" : "Superficie total",
        source: "structured",
      };
    }
    if (semiroofed > 0) {
      return {
        numericValue: semiroofed,
        formatted: formatM2(semiroofed, locale),
        kind: "semiroofed",
        label: isEn ? "Semi-covered" : "Semicubierta",
        fullLabel: isEn ? "Semi-covered Area" : "Superficie semi-cubierta",
        source: "structured",
      };
    }
    if (unroofed > 0) {
      return {
        numericValue: unroofed,
        formatted: formatM2(unroofed, locale),
        kind: "unroofed",
        label: isEn ? "Uncovered" : "Descubierta",
        fullLabel: isEn ? "Uncovered Area" : "Superficie descubierta",
        source: "structured",
      };
    }
  }

  // 3. Fallback de extracción de texto (último filtro de la jerarquía)
  // Revisa descripción (con formato o plano), notas y títulos
  const candidateTexts = [
    property.richDescription,
    property.description,
    property.publicationTitle,
    property.title,
    property.fullAddress,
  ];

  for (const text of candidateTexts) {
    const extracted = extractSurfaceFromText(text);
    if (extracted && extracted.value > 0) {
      let label = isEn ? "m²" : "m²";
      let fullLabel = isEn ? "Surface (m²)" : "Superficie (m²)";

      if (extracted.kind === "land" || isLand) {
        label = isEn ? "Land" : "Terreno";
        fullLabel = isEn ? "Land Area" : "Superficie de terreno";
      } else if (extracted.kind === "roofed") {
        label = isEn ? "Covered" : "Cubierta";
        fullLabel = isEn ? "Covered Area" : "Superficie cubierta";
      } else if (extracted.kind === "total") {
        label = isEn ? "Total" : "Total";
        fullLabel = isEn ? "Total Area" : "Superficie total";
      }

      return {
        numericValue: extracted.value,
        formatted: formatM2(extracted.value, locale),
        kind: "extracted",
        label,
        fullLabel,
        source: "extracted_text",
      };
    }
  }

  // 4. Si todo está verdaderamente en 0 y sin texto
  const defaultLabel = isLand ? (isEn ? "Land" : "Terreno") : isEn ? "Covered" : "Cubierta";
  return {
    numericValue: 0,
    formatted: "0 m²",
    kind: isLand ? "land" : "roofed",
    label: defaultLabel,
    fullLabel: defaultLabel,
    source: "empty",
  };
}
