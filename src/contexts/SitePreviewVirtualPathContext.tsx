import { createContext, useContext, type ReactNode } from "react";

/**
 * Dentro del iframe del editor, `useLocation()` refleja `/admin/site-preview-frame`, no la página simulada.
 * Este contexto inyecta la ruta pública que se está previsualizando (p. ej. `/`) para Header y similares.
 */
const SitePreviewVirtualPathContext = createContext<string | null>(null);

export function SitePreviewVirtualPathProvider({ pathname, children }: { pathname: string; children: ReactNode }) {
  return <SitePreviewVirtualPathContext.Provider value={pathname}>{children}</SitePreviewVirtualPathContext.Provider>;
}

export function useSitePreviewVirtualPath(): string | null {
  return useContext(SitePreviewVirtualPathContext);
}
