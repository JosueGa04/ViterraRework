/** Pantalla de carga Viterra (misma idea que `index.html` y el fallback de rutas). */
export function ViterraPageLoader() {
  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-brand-canvas px-6"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <span className="font-heading text-sm font-light tracking-[0.28em] text-brand-navy">VITERRA</span>
      <div className="h-1 w-28 overflow-hidden rounded-full bg-slate-200/90">
        <div className="h-full w-2/5 animate-pulse rounded-full bg-brand-gold/75" />
      </div>
    </div>
  );
}
