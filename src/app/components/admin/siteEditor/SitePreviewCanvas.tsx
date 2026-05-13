import type { SiteContent } from "../../../../data/siteContent";
import { PreviewCanvasProvider } from "../../../../contexts/PreviewCanvasContext";
import { SiteContentReadOverride } from "../../../../contexts/SiteContentContext";
import { AboutPage } from "../../../pages/AboutPage";
import { ContactPage } from "../../../pages/ContactPage";
import { DevelopmentsPage } from "../../../pages/DevelopmentsPage";
import { HomePage } from "../../../pages/HomePage";
import { RentPage } from "../../../pages/RentPage";
import { SalePage } from "../../../pages/SalePage";
import { ServicesPage } from "../../../pages/ServicesPage";
import { mergeSiteSection } from "../../../../lib/siteContentMerge";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import { ServiceDetailArticle } from "../../../components/services/ServiceDetailBlocks";
import { PreviewSectionChrome } from "./PreviewSectionChrome";

function ServiceDetailPreviewShell({ slug, mergedContent }: { slug: string; mergedContent: SiteContent }) {
  const services = mergeSiteSection("services", mergedContent.services);
  const cardIndex = services.cards.findIndex((c) => c.slug && c.slug.toLowerCase() === slug.toLowerCase());
  const card = cardIndex >= 0 ? services.cards[cardIndex] : undefined;
  if (!card) {
    return (
      <div className="viterra-page flex min-h-[320px] flex-col bg-brand-canvas px-6 py-12">
        <p className="text-center text-sm text-brand-navy/70">No hay tarjeta con slug «{slug}» en el borrador actual.</p>
      </div>
    );
  }
  if (card.primaryListingHref) {
    return (
      <div className="viterra-page flex min-h-[280px] flex-col items-center justify-center bg-brand-canvas px-6 text-center">
        <p className="text-sm font-medium text-brand-navy">Vista previa de detalle no aplica</p>
        <p className="mt-2 max-w-sm text-xs text-brand-navy/75">
          Esta tarjeta enlaza a <span className="font-mono">{card.primaryListingHref}</span>. Aquí se muestra la página
          de Servicios completa; el contenido por bloques de detalle no se usa.
        </p>
      </div>
    );
  }
  return (
    <div className="viterra-page flex min-h-screen flex-col bg-brand-canvas">
      <Header />
      <PreviewSectionChrome
        blockId={cardIndex >= 0 ? `services-card-${cardIndex}` : "services-detail"}
        label={cardIndex >= 0 ? `Tarjeta ${cardIndex + 1}` : "Detalle"}
      >
        <main className="flex-1 px-6 py-10 lg:px-8">
          <ServiceDetailArticle
            title={card.title}
            description={card.description}
            blocks={card.detailBlocks}
            previewMode
            previewCardIndex={cardIndex >= 0 ? cardIndex : undefined}
          />
        </main>
      </PreviewSectionChrome>
      <Footer />
    </div>
  );
}

/** Sin segundo `<Router>`: la app ya usa `RouterProvider`; aquí solo montamos la página que toca. */
function PreviewPage({
  path,
  mergedContent,
  serviceDetailPreviewSlug,
}: {
  path: string;
  mergedContent: SiteContent;
  serviceDetailPreviewSlug: string | null;
}) {
  if (path === "/servicios" && serviceDetailPreviewSlug) {
    return <ServiceDetailPreviewShell slug={serviceDetailPreviewSlug} mergedContent={mergedContent} />;
  }
  switch (path) {
    case "/":
      return <HomePage />;
    case "/contacto":
      return <ContactPage />;
    case "/servicios":
      return <ServicesPage />;
    case "/nosotros":
      return <AboutPage />;
    case "/renta":
      return <RentPage />;
    case "/venta":
      return <SalePage />;
    case "/desarrollos":
      return <DevelopmentsPage />;
    default:
      return <HomePage />;
  }
}

export function SitePreviewCanvas({
  mergedContent,
  previewPath,
  serviceDetailPreviewSlug,
  /** `true` (defecto): panel estrecho en el admin; `false`: iframe con viewport de escritorio (mismas clases que producción). */
  usePanelLayout = true,
}: {
  mergedContent: SiteContent;
  previewPath: string;
  /** Si estás editando una tarjeta de servicios, muestra la página dedicada en la previsualización. */
  serviceDetailPreviewSlug?: string | null;
  usePanelLayout?: boolean;
}) {
  const canvas = (
    <div className="viterra-preview-canvas min-w-0 max-w-full overflow-x-hidden bg-white [container-type:inline-size]">
      <PreviewPage
        path={previewPath}
        mergedContent={mergedContent}
        serviceDetailPreviewSlug={serviceDetailPreviewSlug ?? null}
      />
    </div>
  );

  return (
    <SiteContentReadOverride content={mergedContent}>
      {usePanelLayout ? <PreviewCanvasProvider>{canvas}</PreviewCanvasProvider> : canvas}
    </SiteContentReadOverride>
  );
}
