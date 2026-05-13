import { createContext, useContext, type ReactNode } from "react";

/** Iframe `/admin/site-preview-frame`: por defecto oculta el `<Header />` para ganar espacio; se puede desactivar (p. ej. pestaña «Headder»). */
const SitePreviewSuppressHeaderContext = createContext(false);

export function SitePreviewSuppressHeaderProvider({
  suppress = true,
  children,
}: {
  /** `false` muestra el header real del sitio en la vista previa. */
  suppress?: boolean;
  children: ReactNode;
}) {
  return (
    <SitePreviewSuppressHeaderContext.Provider value={suppress}>{children}</SitePreviewSuppressHeaderContext.Provider>
  );
}

export function useSitePreviewSuppressHeader(): boolean {
  return useContext(SitePreviewSuppressHeaderContext);
}
