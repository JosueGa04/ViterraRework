import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_SITE_CONTENT, SITE_CONTENT_KEY, type SiteContent } from "../data/siteContent";
import { deepMerge } from "../lib/deepMerge";
import { mergeSiteSection } from "../lib/siteContentMerge";

type SiteContentContextValue = {
  content: SiteContent;
  /** Reemplaza una sección completa (tras editar en admin) */
  setSection: <K extends keyof SiteContent>(key: K, section: SiteContent[K]) => void;
  /** Fusiona parcialmente una sección */
  patchSection: <K extends keyof SiteContent>(key: K, partial: Partial<SiteContent[K]>) => void;
  resetToDefaults: () => void;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

const LEGACY_CONTACT_ADDRESS = "Av. Principal 123\nGuadalajara, Jalisco";
const LEGACY_MAP_POPUP_ADDRESS = "Av. Principal 123<br/>Guadalajara, Jalisco";
const LEGACY_VISIT_TITLE = "Visítanos en Guadalajara";
const LEGACY_MAP_LAT = 20.676208;
const LEGACY_MAP_LNG = -103.34721;
const UPDATED_CONTACT_ADDRESS = "Cerca de Av Terranova 1455 local 102\nProvidencia 4a Secc., 44639 Zapopan, Jal.";
const UPDATED_MAP_POPUP_ADDRESS = "Cerca de Av Terranova 1455 local 102<br/>Providencia 4a Secc., 44639 Zapopan, Jal.";
const UPDATED_VISIT_TITLE = "Visítanos en Zapopan";
const UPDATED_MAP_LAT = 20.697312;
const UPDATED_MAP_LNG = -103.386476;

function normalizeLegacyContact(content: SiteContent): SiteContent {
  const next = { ...content, contact: { ...content.contact } };
  if (next.contact.addressLines === LEGACY_CONTACT_ADDRESS) {
    next.contact.addressLines = UPDATED_CONTACT_ADDRESS;
  }
  if (next.contact.mapPopupAddress === LEGACY_MAP_POPUP_ADDRESS) {
    next.contact.mapPopupAddress = UPDATED_MAP_POPUP_ADDRESS;
  }
  if (next.contact.visitTitle === LEGACY_VISIT_TITLE) {
    next.contact.visitTitle = UPDATED_VISIT_TITLE;
  }
  if (next.contact.mapLat === LEGACY_MAP_LAT && next.contact.mapLng === LEGACY_MAP_LNG) {
    next.contact.mapLat = UPDATED_MAP_LAT;
    next.contact.mapLng = UPDATED_MAP_LNG;
  }
  return next;
}

function loadMerged(): SiteContent {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_KEY);
    if (!raw) return DEFAULT_SITE_CONTENT;
    const parsedUnknown = JSON.parse(raw) as unknown;
    const parsedRecord =
      typeof parsedUnknown === "object" && parsedUnknown !== null
        ? (parsedUnknown as Record<string, unknown>)
        : {};
    const mergedRecord = deepMerge(
      DEFAULT_SITE_CONTENT as unknown as Record<string, unknown>,
      parsedRecord
    );
    const repaired: SiteContent = {
      home: mergeSiteSection("home", mergedRecord.home),
      contact: mergeSiteSection("contact", mergedRecord.contact),
      services: mergeSiteSection("services", mergedRecord.services),
      about: mergeSiteSection("about", mergedRecord.about),
      developments: mergeSiteSection("developments", mergedRecord.developments),
    };
    return normalizeLegacyContact(repaired);
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(loadMerged);

  useEffect(() => {
    setContent(loadMerged());
  }, []);

  const persist = useCallback((next: SiteContent) => {
    localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(next));
    setContent(next);
  }, []);

  const setSection = useCallback(
    <K extends keyof SiteContent>(key: K, section: SiteContent[K]) => {
      const next = { ...content, [key]: mergeSiteSection(key, section) };
      persist(next);
    },
    [content, persist]
  );

  const patchSection = useCallback(
    <K extends keyof SiteContent>(key: K, partial: Partial<SiteContent[K]>) => {
      const next = {
        ...content,
        [key]: mergeSiteSection(key, {
          ...(content[key] != null ? (content[key] as object) : {}),
          ...partial,
        }),
      };
      persist(next);
    },
    [content, persist]
  );

  const resetToDefaults = useCallback(() => {
    localStorage.removeItem(SITE_CONTENT_KEY);
    setContent(DEFAULT_SITE_CONTENT);
  }, []);

  const value = useMemo(
    () => ({ content, setSection, patchSection, resetToDefaults }),
    [content, setSection, patchSection, resetToDefaults]
  );

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

/**
 * Sustituye solo la lectura de `content` (p. ej. borrador en vista previa del admin).
 * Las acciones (setSection, etc.) siguen siendo las del padre.
 */
export function SiteContentReadOverride({
  content: overrideContent,
  children,
}: {
  content: SiteContent;
  children: ReactNode;
}) {
  const parent = useSiteContent();
  const value = useMemo(
    () => ({ ...parent, content: overrideContent }),
    [parent, overrideContent]
  );
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx) throw new Error("useSiteContent debe usarse dentro de SiteContentProvider");
  return ctx;
}
