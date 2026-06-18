import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Link, useBlocker, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { SitePreviewSuppressHeaderProvider } from "../../../contexts/SitePreviewSuppressHeaderContext";
import { SitePreviewVirtualPathProvider } from "../../../contexts/SitePreviewVirtualPathContext";
import { VisualSiteEditorProvider } from "../../../contexts/VisualSiteEditorContext";
import { SiteContentReadOverride } from "../../../contexts/SiteContentContext";
import { SitePreviewCanvas } from "../../components/admin/siteEditor/SitePreviewCanvas";
import { DEFAULT_SITE_CONTENT } from "../../../data/siteContent";
import {
  VITERRA_SITE_PREVIEW_SYNC,
  VITERRA_SITE_PREVIEW_CHILD,
  VITERRA_SITE_PREVIEW_READY,
  type SitePreviewSyncPayload,
  isSameOriginMessage,
} from "../../components/admin/siteEditor/sitePreviewFrameMessages";

/** Captura nativa en `window` (antes que React Router) para bloquear SPA en el iframe y avisar al padre (Servicios grafo ↔ detalle). */
function useSitePreviewFrameClickCapture(syncRef: MutableRefObject<SitePreviewSyncPayload | null>) {
  useEffect(() => {
    const onWindowClickCapture = (e: MouseEvent) => {
      if (window.parent === window) return;
      const sync = syncRef.current;
      if (!sync?.previewPath) return;

      const t = e.target;
      if (!(t instanceof Element)) return;
      const anchor = t.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const raw = anchor.getAttribute("href");
      if (raw == null || raw === "" || raw.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(raw, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/admin") || url.pathname === "/login") return;

      const previewPath = sync.previewPath;
      const detailSlug = sync.serviceDetailPreviewSlug ?? null;

      if (previewPath === "/servicios") {
        const detailMatch = /^\/servicios\/d\/([^/]+)\/?$/.exec(url.pathname);
        const isServicesRoot = url.pathname === "/servicios" || url.pathname === "/servicios/";
        if (detailMatch) {
          const slug = decodeURIComponent(detailMatch[1] ?? "").trim();
          if (slug) {
            const cur = (detailSlug ?? "").toLowerCase();
            const go = !detailSlug || slug.toLowerCase() !== cur;
            if (go) {
              window.parent.postMessage(
                {
                  type: VITERRA_SITE_PREVIEW_CHILD,
                  action: "servicesPreviewNavigate",
                  surface: "detail",
                  slug,
                },
                window.location.origin,
              );
            }
          }
        } else if (isServicesRoot && detailSlug) {
          window.parent.postMessage(
            { type: VITERRA_SITE_PREVIEW_CHILD, action: "servicesPreviewNavigate", surface: "main" },
            window.location.origin,
          );
        }
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    window.addEventListener("click", onWindowClickCapture, true);
    return () => window.removeEventListener("click", onWindowClickCapture, true);
  }, []);
}

/** Ruta del documento del iframe; la página mostrada la dicta `sync.previewPath` vía postMessage. */
const SITE_PREVIEW_FRAME_PATH = "/site-preview-frame";

function isEmbeddedPreviewFrame(): boolean {
  try {
    return window.parent !== window;
  } catch {
    return false;
  }
}

function scrollSitePreviewToBlock(root: HTMLElement, blockId: string, fieldKey: string | null) {
  const run = () => {
    const key = fieldKey?.trim() || null;
    let target: HTMLElement | null = null;
    if (key) {
      try {
        target = root.querySelector<HTMLElement>(`[data-viterra-editor-field="${CSS.escape(key)}"]`);
      } catch {
        target = root.querySelector<HTMLElement>(`[data-viterra-editor-field="${key}"]`);
      }
      if (target && !root.contains(target)) target = null;
    }
    if (!target) {
      try {
        target = root.querySelector<HTMLElement>(`#viterra-block-${CSS.escape(blockId)}`);
      } catch {
        target = root.querySelector<HTMLElement>(`#viterra-block-${blockId}`);
      }
    }
    if (!target || !root.contains(target)) return;
    target.scrollIntoView({
      behavior: "smooth",
      block: key ? "center" : "start",
      inline: "nearest",
    });
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

/**
 * Documento embebido para la vista previa del editor de sitio: viewport fijo (escritorio / móvil)
 * para que los breakpoints Tailwind coincidan con el sitio público.
 */
export function SitePreviewFramePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const embedded = isEmbeddedPreviewFrame();
  const { authReady, isAuthenticated, user } = useAuth();
  const scrollRootRef = useRef<HTMLDivElement | null>(null);
  const [sync, setSync] = useState<SitePreviewSyncPayload | null>(null);
  const syncRef = useRef<SitePreviewSyncPayload | null>(null);
  syncRef.current = sync;
  useSitePreviewFrameClickCapture(syncRef);

  const requestSyncFromParent = useCallback(() => {
    if (!embedded) return;
    window.parent.postMessage({ type: VITERRA_SITE_PREVIEW_READY }, window.location.origin);
  }, [embedded]);

  /** Handshake: avisa al editor padre que ya puede enviar el borrador. */
  useEffect(() => {
    if (!embedded || !authReady || !isAuthenticated) return;
    requestSyncFromParent();
    const id = window.setInterval(requestSyncFromParent, 400);
    const stop = window.setTimeout(() => window.clearInterval(id), 4000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [embedded, authReady, isAuthenticated, requestSyncFromParent]);

  useEffect(() => {
    if (location.pathname === SITE_PREVIEW_FRAME_PATH) return;
    if (location.pathname.startsWith("/admin")) {
      navigate(SITE_PREVIEW_FRAME_PATH, { replace: true });
    }
  }, [location.pathname, navigate]);

  const previewNavBlocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (currentLocation.pathname !== SITE_PREVIEW_FRAME_PATH) return false;
    if (nextLocation.pathname === SITE_PREVIEW_FRAME_PATH) return false;
    if (nextLocation.pathname.startsWith("/admin")) return false;
    if (nextLocation.pathname === "/login") return false;
    return true;
  });

  useEffect(() => {
    if (previewNavBlocker.state === "blocked") {
      previewNavBlocker.reset();
    }
  }, [previewNavBlocker, previewNavBlocker.state]);

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (user?.mustChangePassword) {
      navigate("/admin/cambiar-contrasena", { replace: true });
    }
  }, [authReady, isAuthenticated, user?.mustChangePassword, navigate]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (embedded && e.source !== window.parent) return;
      if (!isSameOriginMessage(e.origin)) return;
      const d = e.data as { type?: string; payload?: SitePreviewSyncPayload };
      if (d?.type === VITERRA_SITE_PREVIEW_SYNC && d.payload) {
        setSync(d.payload);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [embedded]);

  useEffect(() => {
    if (!sync?.previewPath) return;
    const el = scrollRootRef.current;
    if (el) el.scrollTop = 0;
  }, [sync?.previewPath, sync?.serviceDetailPreviewSlug]);

  useEffect(() => {
    if (!sync?.activeBlockId) return;
    const root = scrollRootRef.current;
    if (!root) return;
    scrollSitePreviewToBlock(root, sync.activeBlockId, sync.previewNavigateFieldKey);
  }, [
    sync?.activeBlockId,
    sync?.previewNavigateSeq,
    sync?.previewNavigateTargetId,
    sync?.previewNavigateFieldKey,
  ]);

  const postToParent = useCallback((msg: { type: typeof VITERRA_SITE_PREVIEW_CHILD; action: "setActiveBlock"; blockId: string | null }) => {
    window.parent.postMessage(msg, window.location.origin);
  }, []);

  const setActiveBlockId = useCallback(
    (id: string | null) => {
      setSync((prev) => (prev ? { ...prev, activeBlockId: id } : prev));
      postToParent({ type: VITERRA_SITE_PREVIEW_CHILD, action: "setActiveBlock", blockId: id });
    },
    [postToParent]
  );

  const requestPreviewNavigate = useCallback(() => {
    /* Solo el formulario en el padre dispara navegación; aquí no aplica. */
  }, []);

  const editorValue = useMemo(
    () =>
      sync
        ? {
            enabled: true,
            editorTab: sync.editorTab,
            showBlockLabels: sync.showBlockLabels ?? false,
            activeBlockId: sync.activeBlockId,
            setActiveBlockId,
            previewNavigateSeq: sync.previewNavigateSeq,
            previewNavigateTargetId: sync.previewNavigateTargetId,
            previewNavigateFieldKey: sync.previewNavigateFieldKey,
            requestPreviewNavigate,
          }
        : null,
    [sync, setActiveBlockId, requestPreviewNavigate]
  );

  if (!authReady || !isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-white text-sm text-slate-600">
        Comprobando sesión…
      </div>
    );
  }

  if (user?.mustChangePassword) {
    return null;
  }

  /** Abierto directamente (sin iframe): muestra el sitio publicado por defecto, no un spinner infinito. */
  if (!embedded && !sync) {
    return (
      <div className="min-h-[100dvh] bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs text-slate-600">
          Vista previa independiente — para editar, abre{" "}
          <Link to="/admin/sitio" className="font-semibold text-brand-navy underline">
            Mi empresa → Sitio web
          </Link>
          .
        </div>
        <SiteContentReadOverride content={DEFAULT_SITE_CONTENT}>
          <SitePreviewCanvas
            mergedContent={DEFAULT_SITE_CONTENT}
            previewPath="/"
            serviceDetailPreviewSlug={null}
            usePanelLayout={false}
          />
        </SiteContentReadOverride>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white">
      <div ref={scrollRootRef} className="h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-y-contain [overscroll-behavior-y:contain]">
        {!sync ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500">
            <p>Conectando con el editor…</p>
            <p className="text-xs text-slate-400">Si tarda, cambia de bloque o recarga la pestaña del admin.</p>
          </div>
        ) : editorValue ? (
          <SitePreviewSuppressHeaderProvider suppress={false}>
            <SitePreviewVirtualPathProvider pathname={sync.previewPath}>
              <VisualSiteEditorProvider {...editorValue}>
                <SitePreviewCanvas
                  key={`${sync.previewPath}-${sync.serviceDetailPreviewSlug ?? "page"}`}
                  mergedContent={sync.mergedContent}
                  previewPath={sync.previewPath}
                  serviceDetailPreviewSlug={sync.serviceDetailPreviewSlug}
                  usePanelLayout={false}
                />
              </VisualSiteEditorProvider>
            </SitePreviewVirtualPathProvider>
          </SitePreviewSuppressHeaderProvider>
        ) : null}
      </div>
    </div>
  );
}
