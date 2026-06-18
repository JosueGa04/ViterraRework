import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "../app/lib/supabaseClient";
import {
  fetchAllSiteSections,
  upsertAllDefaultSections,
  upsertSiteSection,
} from "../app/lib/supabaseSiteContent";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "../data/siteContent";
import { mergeSiteSection } from "../lib/siteContentMerge";

export type SiteContentSyncState = "idle" | "syncing" | "synced" | "error";

type SiteContentContextValue = {
  content: SiteContent;
  loading: boolean;
  error: string | null;
  syncState: SiteContentSyncState;
  /** Reemplaza una sección completa (tras editar en admin) */
  setSection: <K extends keyof SiteContent>(key: K, section: SiteContent[K]) => void;
  /** Fusiona parcialmente una sección */
  patchSection: <K extends keyof SiteContent>(key: K, partial: Partial<SiteContent[K]>) => void;
  resetToDefaults: () => Promise<void>;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

const LEGACY_CONTACT_ADDRESS = "Av. Principal 123\nGuadalajara, Jalisco";
const LEGACY_MAP_POPUP_ADDRESS = "Av. Principal 123<br/>Guadalajara, Jalisco";
const LEGACY_VISIT_TITLE = "Visítanos en Guadalajara";
const LEGACY_MAP_LAT = 20.676208;
const LEGACY_MAP_LNG = -103.34721;
const UPDATED_CONTACT_ADDRESS = "Av Terranova 1455 local 102\nProvidencia 4a Secc., 44639 Zapopan, Jal.";
const UPDATED_MAP_POPUP_ADDRESS = "Av Terranova 1455 local 102<br/>Providencia 4a Secc., 44639 Zapopan, Jal.";
const UPDATED_VISIT_TITLE = "Visítanos en Zapopan";
const UPDATED_MAP_LAT = 20.697312;
const UPDATED_MAP_LNG = -103.386476;

function normalizeLegacyContact(content: SiteContent): SiteContent {
  const next = { ...content, contact: { ...content.contact } };
  const mapIdx = next.contact.infoItems?.findIndex((r) => r.icon === "map");
  if (mapIdx !== undefined && mapIdx >= 0 && next.contact.infoItems[mapIdx].body === LEGACY_CONTACT_ADDRESS) {
    const infoItems = next.contact.infoItems.map((row, i) =>
      i === mapIdx ? { ...row, body: UPDATED_CONTACT_ADDRESS } : row
    );
    next.contact = { ...next.contact, infoItems };
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

  // Normalize WhatsApp link if it contains placeholder digits or is empty
  const wa = next.contact.quickWhatsappHref;
  if (
    !wa ||
    wa.includes("12356789") ||
    wa.includes("3300000000") ||
    wa.includes("123456789") ||
    wa.includes("1234567890")
  ) {
    next.contact.quickWhatsappHref = "https://wa.me/523331991774";
  }

  // Normalize contact infoItems for email and phone if they contain placeholder values
  if (next.contact.infoItems) {
    next.contact.infoItems = next.contact.infoItems.map((item) => {
      if (item.icon === "mail") {
        const email = item.body.toLowerCase();
        if (
          email.includes("info@viterra") ||
          email.includes("ventas@viterra") ||
          email.includes("@viterra.mx") ||
          (email.includes("@viterra.com") && !email.includes("viterrainmobiliaria"))
        ) {
          return { ...item, body: "contacto@viterrainmobiliaria.com" };
        }
      }
      if (item.icon === "phone") {
        if (
          item.body.includes("12356789") ||
          item.body.includes("3300000000") ||
          item.body.includes("123456789")
        ) {
          return { ...item, body: "(33) 3629-7122\n(33) 3199-1774" };
        }
      }
      return item;
    });
  }

  // Normalize services section contactLinks
  if (content.services) {
    const services = { ...content.services };
    if (Array.isArray(services.cards)) {
      services.cards = services.cards.map((card) => {
        if (Array.isArray(card.contactLinks)) {
          const contactLinks = card.contactLinks.map((link) => {
            const href = link.href.toLowerCase();
            if (link.icon === "mail") {
              if (
                href.includes("info@viterra") ||
                href.includes("ventas@viterra") ||
                href.includes("@viterra.mx") ||
                (href.includes("@viterra.com") && !href.includes("viterrainmobiliaria"))
              ) {
                return { ...link, href: "mailto:contacto@viterrainmobiliaria.com" };
              }
            } else if (link.icon === "messageCircle") {
              if (
                href.includes("12356789") ||
                href.includes("3300000000") ||
                href.includes("123456789") ||
                href.includes("1234567890")
              ) {
                return {
                  ...link,
                  href: "https://wa.me/523331991774?text=Hola%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n%20sobre%20sus%20servicios.",
                };
              }
            } else if (link.icon === "phone") {
              if (
                href.includes("12356789") ||
                href.includes("3300000000") ||
                href.includes("123456789") ||
                href.includes("1234567890")
              ) {
                return { ...link, href: "tel:+523331991774" };
              }
            }
            return link;
          });
          return { ...card, contactLinks };
        }
        return card;
      });
    }
    return { ...next, services };
  }

  return next;
}

const PERSIST_DEBOUNCE_MS = 480;

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() =>
    normalizeLegacyContact(
      structuredClone(DEFAULT_SITE_CONTENT) as SiteContent
    )
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SiteContentSyncState>("idle");

  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const persistTimersRef = useRef<Partial<Record<keyof SiteContent, ReturnType<typeof setTimeout>>>>(
    {}
  );

  useEffect(() => {
    return () => {
      for (const t of Object.values(persistTimersRef.current)) {
        if (t) clearTimeout(t);
      }
    };
  }, []);

  const schedulePersist = useCallback((key: keyof SiteContent) => {
    const client = getSupabaseClient();
    if (!client) return;

    const prev = persistTimersRef.current[key];
    if (prev) clearTimeout(prev);

    persistTimersRef.current[key] = setTimeout(() => {
      delete persistTimersRef.current[key];
      void (async () => {
        const c = getSupabaseClient();
        if (!c) return;
        const section = contentRef.current[key];
        setSyncState("syncing");
        const { error: upErr } = await upsertSiteSection(c, key, section);
        if (upErr) {
          setError(upErr.message);
          setSyncState("error");
          return;
        }
        setError(null);
        setSyncState("synced");
        window.setTimeout(() => setSyncState((s) => (s === "synced" ? "idle" : s)), 2000);
      })();
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const merged = normalizeLegacyContact(await fetchAllSiteSections(client));
        if (!cancelled) {
          setContent(merged);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const channel = client
      .channel("site_content_sections_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content_sections" },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as { page?: keyof SiteContent; payload?: unknown } | null;
          if (!row?.page || typeof row.payload === "undefined") return;
          setContent((prev) => ({
            ...prev,
            [row.page!]: mergeSiteSection(row.page!, row.payload),
          }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, []);

  const setSection = useCallback(
    <K extends keyof SiteContent>(key: K, section: SiteContent[K]) => {
      setContent((prev) => {
        const next = { ...prev, [key]: mergeSiteSection(key, section) };
        contentRef.current = next;
        return next;
      });
      schedulePersist(key);
    },
    [schedulePersist]
  );

  const patchSection = useCallback(
    <K extends keyof SiteContent>(key: K, partial: Partial<SiteContent[K]>) => {
      setContent((prev) => {
        const nextSection = mergeSiteSection(key, {
          ...(prev[key] != null ? (prev[key] as object) : {}),
          ...partial,
        });
        const next = { ...prev, [key]: nextSection };
        contentRef.current = next;
        return next;
      });
      schedulePersist(key);
    },
    [schedulePersist]
  );

  const resetToDefaults = useCallback(async () => {
    const client = getSupabaseClient();
    const defaults = structuredClone(DEFAULT_SITE_CONTENT) as SiteContent;
    const normalized = normalizeLegacyContact(defaults);
    if (!client) {
      setContent(normalized);
      return;
    }
    setSyncState("syncing");
    const { error: upErr } = await upsertAllDefaultSections(client, normalized);
    if (upErr) {
      setError(upErr.message);
      setSyncState("error");
      return;
    }
    setError(null);
    setContent(normalized);
    setSyncState("synced");
    window.setTimeout(() => setSyncState((s) => (s === "synced" ? "idle" : s)), 2000);
  }, []);

  const value = useMemo(
    () => ({
      content,
      loading,
      error,
      syncState,
      setSection,
      patchSection,
      resetToDefaults,
    }),
    [content, loading, error, syncState, setSection, patchSection, resetToDefaults]
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
