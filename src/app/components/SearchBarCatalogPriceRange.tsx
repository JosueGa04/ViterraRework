import { ChevronDown } from "lucide-react";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useState } from "react";
import { usePreviewCanvas } from "../../contexts/PreviewCanvasContext";
import { Slider } from "./ui/slider";
import { cn } from "./ui/utils";

export type SearchBarPriceVariant = "default" | "premium" | "ambient";

function formatMxnLong(n: number): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString("es-MX")} MXN`;
  }
}

function formatAxis(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function niceStep(rough: number): number {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const f = rough / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function parseDigits(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function computeDomain(prices: number[]): { min: number; max: number; step: number } {
  const valid = prices.filter((p) => Number.isFinite(p) && p >= 0);
  if (valid.length === 0) return { min: 0, max: 10_000_000, step: 50_000 };
  let mn = Math.min(...valid);
  let mx = Math.max(...valid);
  if (mx <= mn) mx = mn + Math.max(50_000, mn * 0.05);
  const pad = (mx - mn) * 0.06;
  const rawMin = Math.max(0, mn - pad);
  const rawMax = mx + pad;
  const range = rawMax - rawMin;
  /** Paso fino para drag fluido (más posiciones en la pista). */
  const step = Math.max(1, niceStep(range / 320));
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  return { min, max, step };
}

type Props = {
  prices: number[];
  minPrice: string;
  maxPrice: string;
  onChange: (next: { minPrice: string; maxPrice: string }) => void;
  variant: SearchBarPriceVariant;
};

export type SearchBarCatalogPriceRangeHandle = {
  /** Valores de filtro equivalentes al estado actual del slider (p. ej. al enviar el formulario sin soltar). */
  getPriceFilterPatch: () => { minPrice: string; maxPrice: string };
};

function rangeToPriceStrings(
  v: [number, number],
  domMin: number,
  domMax: number,
  step: number
): { minPrice: string; maxPrice: string } {
  const [rawA, rawB] = v;
  const a = clamp(rawA, domMin, domMax);
  const b = clamp(rawB, domMin, domMax);
  const eps = step * 0.2;
  const atFloor = a <= domMin + eps;
  const atCeil = b >= domMax - eps;
  return {
    minPrice: atFloor ? "" : String(Math.round(a)),
    maxPrice: atCeil ? "" : String(Math.round(b)),
  };
}

export const SearchBarCatalogPriceRange = forwardRef<SearchBarCatalogPriceRangeHandle, Props>(
  function SearchBarCatalogPriceRange({ prices, minPrice, maxPrice, onChange, variant }, ref) {
    const previewCanvas = usePreviewCanvas();
    const isAmbient = variant === "ambient";
    const isPremium = variant === "premium";
    /** Home búsqueda: menos aire en móvil dentro del panel. */
    const compactAmbient = isAmbient && !previewCanvas;
    const manualToggleId = useId();
    const manualRegionId = `${manualToggleId}-region`;

    const { min: domMin, max: domMax, step } = useMemo(() => computeDomain(prices), [prices]);

    const fromProps = useMemo((): [number, number] => {
      const lo = parseDigits(minPrice);
      const hi = parseDigits(maxPrice);
      let a = lo != null ? clamp(lo, domMin, domMax) : domMin;
      let b = hi != null ? clamp(hi, domMin, domMax) : domMax;
      if (a > b) [a, b] = [b, a];
      return [a, b];
    }, [minPrice, maxPrice, domMin, domMax]);

    /** Estado local: el padre solo se actualiza al soltar (onValueCommit) → drag fluido. */
    const [local, setLocal] = useState<[number, number]>(fromProps);
    /** Campos Desde/Hasta ocultos por defecto; solo para montos muy específicos. */
    const [manualOpen, setManualOpen] = useState(false);

    useEffect(() => {
      setLocal(fromProps);
    }, [fromProps[0], fromProps[1], domMin, domMax]);

    const commitToParent = useCallback(
      (v: number[]) => {
        const pair: [number, number] =
          v.length >= 2 ? [v[0], v[1]] : [domMin, domMax];
        onChange(rangeToPriceStrings(pair, domMin, domMax, step));
      },
      [domMin, domMax, step, onChange]
    );

    useImperativeHandle(
      ref,
      () => ({
        getPriceFilterPatch: () => rangeToPriceStrings(local, domMin, domMax, step),
      }),
      [local, domMin, domMax, step]
    );

    const setMinStr = (s: string) => {
      const n = parseDigits(s);
      if (n == null) {
        onChange({ minPrice: "", maxPrice });
        return;
      }
      const capped = clamp(n, domMin, local[1]);
      const next = [capped, local[1]] as [number, number];
      setLocal(next);
      onChange({ minPrice: String(Math.round(capped)), maxPrice });
    };

    const setMaxStr = (s: string) => {
      const n = parseDigits(s);
      if (n == null) {
        onChange({ minPrice, maxPrice: "" });
        return;
      }
      const capped = clamp(n, local[0], domMax);
      const next = [local[0], capped] as [number, number];
      setLocal(next);
      onChange({ minPrice, maxPrice: String(Math.round(capped)) });
    };

    // Calculate Price Density Histogram
    const histogramData = useMemo(() => {
      if (!prices || prices.length === 0) return [];
      const binCount = 28;
      const bins = Array(binCount).fill(0);
      const range = domMax - domMin;
      if (range <= 0) return [];

      const binSize = range / binCount;

      // Filter prices in active catalog domain
      const validPrices = prices.filter((p) => p >= domMin && p <= domMax);
      if (validPrices.length === 0) return [];

      validPrices.forEach((p) => {
        let binIdx = Math.floor((p - domMin) / binSize);
        if (binIdx >= binCount) binIdx = binCount - 1;
        if (binIdx < 0) binIdx = 0;
        bins[binIdx]++;
      });

      const maxVal = Math.max(...bins);
      if (maxVal === 0) return [];

      return bins.map((count, index) => {
        const minVal = domMin + index * binSize;
        const maxValRange = domMin + (index + 1) * binSize;
        return {
          count,
          percentage: (count / maxVal) * 100,
          minVal,
          maxVal: maxValRange,
        };
      });
    }, [prices, domMin, domMax]);

    if (prices.length === 0) {
      return (
        <div
          className={cn(
            "border-t animate-pulse select-none pointer-events-none",
            compactAmbient ? "mt-3 border-white/10 pt-3 sm:mt-4 sm:pt-4" : previewCanvas ? "mt-3 border-white/10 pt-3" : "mt-4 pt-4",
            !compactAmbient && isAmbient && "border-white/10",
            isPremium && "border-brand-navy/10",
            !isPremium && !isAmbient && "border-slate-200"
          )}
        >
          <div
            className={cn(
              "rounded-none",
              isAmbient && "bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl",
              isPremium && !isAmbient && "bg-white shadow-sm border border-slate-100",
              !isPremium && !isAmbient && "bg-white shadow-sm border border-slate-100",
              previewCanvas ? "px-3 py-4 sm:px-4" : compactAmbient ? "px-3 py-4 sm:px-4" : "px-4 py-5 sm:px-5"
            )}
          >
            {/* Skeleton Title */}
            <div className={cn(
              "mb-4 h-3.5 w-28 bg-current",
              isAmbient ? "opacity-20 text-white" : "opacity-15 text-brand-navy"
            )} />

            {/* Skeleton Histogram */}
            <div className={cn(
              "flex items-end justify-between w-full h-[36px] px-[9px] mb-[2px] overflow-hidden",
              isAmbient ? "opacity-15 text-white" : "opacity-10 text-brand-navy"
            )}>
              {Array.from({ length: 28 }).map((_, i) => {
                const height = [20, 45, 65, 80, 55, 30, 25, 15, 10, 8, 8, 12, 18, 10, 8, 14, 20, 15, 8, 8, 8, 8, 12, 10, 8, 8, 8, 8][i] ?? 10;
                return (
                  <div key={i} className="flex-1 px-[1px] h-full flex items-end">
                    <div style={{ height: `${height}%` }} className="w-full bg-current" />
                  </div>
                );
              })}
            </div>

            {/* Skeleton Track & Thumbs */}
            <div className="relative w-full py-3 px-[9px] flex items-center">
              <div className={cn(
                "w-full h-[2px] bg-current",
                isAmbient ? "opacity-20 text-white" : "opacity-15 text-slate-400"
              )} />
              {/* Left Thumb skeleton */}
              <div className={cn(
                "absolute w-[18px] h-[18px] rounded-full border-2 border-current bg-current left-[9px] top-1/2 -translate-y-1/2",
                isAmbient ? "opacity-35 text-white" : "opacity-25 text-brand-navy"
              )} />
              {/* Right Thumb skeleton */}
              <div className={cn(
                "absolute w-[18px] h-[18px] rounded-full border-2 border-current bg-current right-[9px] top-1/2 -translate-y-1/2",
                isAmbient ? "opacity-35 text-white" : "opacity-25 text-brand-navy"
              )} />
            </div>

            {/* Skeleton Price Display Cards */}
            <div className="mt-5 grid grid-cols-2 gap-3.5">
              <div className={cn(
                "px-3 py-2 border flex flex-col gap-1 text-left",
                isAmbient ? "bg-white/[0.02] border-white/10 opacity-30 text-white" : "bg-slate-50 border-slate-200 opacity-25 text-brand-navy"
              )}>
                <div className="h-2 w-8 bg-current" />
                <div className="h-4 w-20 bg-current" />
              </div>
              <div className={cn(
                "px-3 py-2 border flex flex-col gap-1 text-left",
                isAmbient ? "bg-white/[0.02] border-white/10 opacity-30 text-white" : "bg-slate-50 border-slate-200 opacity-25 text-brand-navy"
              )}>
                <div className="h-2 w-8 bg-current" />
                <div className="h-4 w-20 bg-current" />
              </div>
            </div>

            {/* Skeleton Toggle */}
            <div className="mt-4 flex justify-center">
              <div className={cn(
                "h-4 w-24 bg-current",
                isAmbient ? "opacity-25 text-white" : "opacity-20 text-slate-500"
              )} />
            </div>
          </div>
        </div>
      );
    }

    const cardClass = cn(
      "rounded-none",
      isAmbient && "bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl",
      isPremium && !isAmbient && "bg-white shadow-sm border border-slate-100",
      !isPremium && !isAmbient && "bg-white shadow-sm border border-slate-100"
    );

    const titleClass = cn(
      "text-xs tracking-[0.16em] uppercase font-semibold",
      isAmbient ? "text-white/80" : "text-brand-navy"
    );

    const fieldWrap = cn(
      "flex min-h-[2.5rem] items-stretch overflow-hidden border text-sm transition-all duration-200",
      isAmbient && "border-white/10 bg-black/35 focus-within:border-white/40 focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]",
      !isAmbient && "border-slate-200 bg-slate-50 focus-within:border-brand-navy focus-within:bg-white"
    );

    const innerInput = cn(
      "min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-[15px] outline-none tabular-nums transition-[color,font-weight] duration-200",
      isAmbient && "text-white placeholder:text-white/30",
      !isAmbient && "text-brand-navy placeholder:text-slate-400 focus:text-brand-navy"
    );

    const mxnChip = cn(
      "flex items-center border-l px-2.5 text-[9px] font-bold uppercase tracking-wider",
      isAmbient && "border-white/10 text-white/55",
      !isAmbient && "border-slate-200 bg-slate-100 text-slate-500"
    );

    /** Precision architectural circular-knob fader slider. */
    const sliderLook = cn(
      "w-full cursor-grab touch-pan-x active:cursor-grabbing relative z-10",
      compactAmbient ? "py-2" : "py-3",
      // Slider track (no horizontal margin to allow perfect end-to-end alignment inside the padded content box)
      "[&_[data-slot=slider-track]]:relative [&_[data-slot=slider-track]]:h-[2px] [&_[data-slot=slider-track]]:rounded-none [&_[data-slot=slider-track]]:shadow-none [&_[data-slot=slider-track]]:overflow-visible",
      isAmbient 
        ? "[&_[data-slot=slider-track]]:bg-white/20" 
        : "[&_[data-slot=slider-track]]:bg-slate-200",
      // Active range line
      "[&_[data-slot=slider-range]]:rounded-none [&_[data-slot=slider-range]]:h-[2px] [&_[data-slot=slider-range]]:shadow-none",
      isAmbient 
        ? "[&_[data-slot=slider-range]]:bg-white" 
        : isPremium 
          ? "[&_[data-slot=slider-range]]:bg-brand-navy" 
          : "[&_[data-slot=slider-range]]:bg-primary",
      // Circular Thumbs (scoped style overrides rounded-none)
      "[&_[data-slot=slider-thumb]]:box-border [&_[data-slot=slider-thumb]]:w-[18px] [&_[data-slot=slider-thumb]]:h-[18px] [&_[data-slot=slider-thumb]]:min-w-[18px] [&_[data-slot=slider-thumb]]:min-h-[18px] [&_[data-slot=slider-thumb]]:shrink-0 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:absolute [&_[data-slot=slider-thumb]]:cursor-ew-resize [&_[data-slot=slider-thumb]]:outline-none [&_[data-slot=slider-thumb]]:transition-none",
      // Solid center dot inside circular grab knob
      "[&_[data-slot=slider-thumb]]:after:content-[''] [&_[data-slot=slider-thumb]]:after:absolute [&_[data-slot=slider-thumb]]:after:w-[6px] [&_[data-slot=slider-thumb]]:after:h-[6px] [&_[data-slot=slider-thumb]]:after:top-1/2 [&_[data-slot=slider-thumb]]:after:left-1/2 [&_[data-slot=slider-thumb]]:after:-translate-x-1/2 [&_[data-slot=slider-thumb]]:after:-translate-y-1/2 [&_[data-slot=slider-thumb]]:after:transition-transform [&_[data-slot=slider-thumb]]:after:duration-150",
      isAmbient
        ? [
            "[&_[data-slot=slider-thumb]]:bg-white",
            "[&_[data-slot=slider-thumb]]:border-white",
            "[&_[data-slot=slider-thumb]]:after:bg-primary",
            "[&_[data-slot=slider-thumb]]:shadow-[0_0_10px_rgba(255,255,255,0.45),0_2px_4px_rgba(0,0,0,0.3)]",
            "[&_[data-slot=slider-thumb]]:hover:shadow-[0_0_14px_rgba(255,255,255,0.65),0_3px_6px_rgba(0,0,0,0.4)]"
          ].join(" ")
        : isPremium
          ? [
              "[&_[data-slot=slider-thumb]]:bg-white",
              "[&_[data-slot=slider-thumb]]:border-brand-navy",
              "[&_[data-slot=slider-thumb]]:after:bg-brand-gold",
              "[&_[data-slot=slider-thumb]]:shadow-[0_2px_5px_rgba(20,28,46,0.15)]",
              "[&_[data-slot=slider-thumb]]:hover:border-brand-gold"
            ].join(" ")
          : [
              "[&_[data-slot=slider-thumb]]:bg-white",
              "[&_[data-slot=slider-thumb]]:border-brand-navy",
              "[&_[data-slot=slider-thumb]]:after:bg-primary",
              "[&_[data-slot=slider-thumb]]:shadow-[0_2px_5px_rgba(20,28,46,0.15)]",
              "[&_[data-slot=slider-thumb]]:hover:border-primary"
            ].join(" ")
    );

    return (
      <div
        className={cn(
          "border-t",
          compactAmbient ? "mt-3 border-white/10 pt-3 sm:mt-4 sm:pt-4" : previewCanvas ? "mt-3 border-white/10 pt-3" : "mt-4 pt-4",
          !compactAmbient && isAmbient && "border-white/10",
          isPremium && "border-brand-navy/10",
          !isPremium && !isAmbient && "border-slate-200"
        )}
      >
        {/* Scoped CSS exception to bypass Viterra global border-radius: 0 override & enforce pixel-perfect absolute center positioning */}
        <style dangerouslySetInnerHTML={{ __html: `
          [data-slot="slider-thumb"] {
            border-radius: 9999px !important;
            transform: translate(-50%, -50%) scale(1) !important;
            transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms !important;
          }
          [data-slot="slider-thumb"]:hover {
            transform: translate(-50%, -50%) scale(1.1) !important;
          }
          [data-slot="slider-thumb"]:active {
            transform: translate(-50%, -50%) scale(0.95) !important;
          }
          [data-slot="slider-thumb"]::after {
            border-radius: 9999px !important;
          }
        `}} />

        <div
          className={cn(
            cardClass,
            previewCanvas
              ? "px-3 py-4 sm:px-4"
              : compactAmbient
                ? "px-3 py-4 sm:px-4"
                : "px-4 py-5 sm:px-5"
          )}
        >
          {/* Title Header */}
          <div className={cn(compactAmbient ? "mb-2" : "mb-3")}>
            <h3 className={titleClass}>
              Rango de precios{" "}
              <span className={isAmbient ? "text-white/40" : "text-slate-400"}>| MXN</span>
            </h3>
          </div>

          {/* Dynamic Price Density Histogram Chart Container */}
          {histogramData.length > 0 && (
            <div className="flex items-end justify-between w-full h-[36px] px-[9px] mb-[2px] select-none pointer-events-none overflow-hidden relative">
              {histogramData.map((bin, index) => {
                // Determine if this bin is active under current slider values
                const isActive = bin.minVal <= local[1] && bin.maxVal >= local[0];
                const isEmpty = bin.count === 0;
                // Populated bins: max normalized height of 100% with a minimum baseline height of 12%.
                // Empty bins: constant 8% height (approx. 3px) to create a clean continuous horizontal baseline indicator
                const heightPercent = !isEmpty ? Math.max(12, bin.percentage) : 8;

                return (
                  <div key={index} className="flex-1 px-[1px] h-full flex items-end">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={cn(
                        "w-full transition-all duration-300 ease-out",
                        isActive
                          ? isEmpty
                            ? isAmbient
                              ? "bg-white/15"
                              : "bg-slate-300/30"
                            : isAmbient
                              ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.25)]"
                              : isPremium
                                ? "bg-brand-navy"
                                : "bg-primary"
                          : isAmbient
                            ? isEmpty
                              ? "bg-white/5"
                              : "bg-white/10"
                            : isEmpty
                              ? "bg-slate-200/10"
                              : "bg-slate-200/50"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Radix Slider */}
          <Slider
            className={cn(sliderLook, "px-[9px]")}
            min={domMin}
            max={domMax}
            step={step}
            value={local}
            onValueChange={(v) => {
              if (v.length >= 2) setLocal([v[0], v[1]]);
            }}
            onValueCommit={(v) => {
              if (v.length >= 2) {
                setLocal([v[0], v[1]]);
                commitToParent(v);
              }
            }}
            minStepsBetweenThumbs={1}
            aria-label="Rango de precio en pesos mexicanos"
          />

          {/* High-End Monospace Price Label Cards */}
          <div className="mt-5 grid grid-cols-2 gap-3.5">
            {/* Min Price Card */}
            <div
              className={cn(
                "px-3 py-2 border flex flex-col text-left transition-colors duration-200",
                isAmbient
                  ? "bg-white/[0.02] border-white/10"
                  : "bg-slate-50 border-slate-200"
              )}
            >
              <span
                className={cn(
                  "text-[8px] font-bold tracking-widest uppercase mb-1",
                  isAmbient ? "text-white/40" : "text-slate-400"
                )}
              >
                Mínimo
              </span>
              <span
                className={cn(
                  "text-[13px] sm:text-sm font-semibold tabular-nums leading-none tracking-tight",
                  isAmbient ? "text-white" : "text-brand-navy"
                )}
              >
                {formatMxnLong(local[0])}
              </span>
            </div>

            {/* Max Price Card */}
            <div
              className={cn(
                "px-3 py-2 border flex flex-col text-left transition-colors duration-200",
                isAmbient
                  ? "bg-white/[0.02] border-white/10"
                  : "bg-slate-50 border-slate-200"
              )}
            >
              <span
                className={cn(
                  "text-[8px] font-bold tracking-widest uppercase mb-1",
                  isAmbient ? "text-white/40" : "text-slate-400"
                )}
              >
                Máximo
              </span>
              <span
                className={cn(
                  "text-[13px] sm:text-sm font-semibold tabular-nums leading-none tracking-tight",
                  isAmbient ? "text-white" : "text-brand-navy"
                )}
              >
                {formatMxnLong(local[1])}
              </span>
            </div>
          </div>

          {/* Toggle Manual Input */}
          <div className={cn("mt-4 flex", compactAmbient ? "justify-start" : "justify-center")}>
            <button
              type="button"
              id={manualToggleId}
              aria-expanded={manualOpen}
              aria-controls={manualRegionId}
              onClick={() => setManualOpen((o) => !o)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] border transition-all duration-200 select-none",
                isAmbient
                  ? manualOpen
                    ? "bg-white text-brand-navy border-white"
                    : "bg-transparent text-white/70 border-white/15 hover:text-white hover:border-white/40"
                  : manualOpen
                    ? "bg-brand-navy text-white border-brand-navy"
                    : "bg-transparent text-slate-500 border-slate-200 hover:text-brand-navy hover:border-slate-400"
              )}
            >
              <span>{manualOpen ? "Ocultar Montos" : "Ajustar Montos"}</span>
              <ChevronDown
                className={cn("h-3 w-3 shrink-0 transition-transform duration-300 ease-out", manualOpen && "rotate-180")}
                aria-hidden
              />
            </button>
          </div>

          {/* Manual Input Form Drawers */}
          {manualOpen ? (
            <div
              id={manualRegionId}
              role="region"
              aria-labelledby={manualToggleId}
              className="mt-4 grid grid-cols-2 gap-3 transition-all duration-300"
            >
              {/* Min Input */}
              <div className="flex flex-col gap-1.5">
                <label
                  className={cn(
                    "text-[8px] font-bold uppercase tracking-widest text-left",
                    isAmbient ? "text-white/40" : "text-slate-400"
                  )}
                >
                  Desde
                </label>
                <div className={cn(fieldWrap, "w-full")}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={innerInput}
                    placeholder="Mín."
                    value={minPrice}
                    onChange={(e) => setMinStr(e.target.value)}
                    aria-label="Precio mínimo en MXN"
                  />
                  <span className={mxnChip}>MXN</span>
                </div>
              </div>

              {/* Max Input */}
              <div className="flex flex-col gap-1.5">
                <label
                  className={cn(
                    "text-[8px] font-bold uppercase tracking-widest text-left",
                    isAmbient ? "text-white/40" : "text-slate-400"
                  )}
                >
                  Hasta
                </label>
                <div className={cn(fieldWrap, "w-full")}>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={innerInput}
                    placeholder="Máx."
                    value={maxPrice}
                    onChange={(e) => setMaxStr(e.target.value)}
                    aria-label="Precio máximo en MXN"
                  />
                  <span className={mxnChip}>MXN</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);
