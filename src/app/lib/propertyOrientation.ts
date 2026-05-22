/** Códigos guardados en `properties.orientation` (smallint) para Viterra admin. */
export const ORIENTATION_OPTIONS = [
  { value: "", label: "— Sin especificar —" },
  { value: "1", label: "Norte" },
  { value: "2", label: "Sur" },
  { value: "3", label: "Este" },
  { value: "4", label: "Oeste" },
] as const;

const LABEL_BY_CODE: Record<number, string> = {
  1: "Norte",
  2: "Sur",
  3: "Este",
  4: "Oeste",
};

export function orientationCodeFromProperty(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "";
  const code = Math.round(value);
  return code >= 1 && code <= 4 ? String(code) : "";
}

export function orientationNumberFromCode(code: string): number | undefined {
  const n = Number.parseInt(code, 10);
  if (!Number.isFinite(n) || n < 1 || n > 4) return undefined;
  return n;
}

export function orientationLabel(value: number | undefined | null): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return LABEL_BY_CODE[Math.round(value)];
}
