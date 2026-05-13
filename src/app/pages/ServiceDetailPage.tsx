import { useEffect, useMemo } from "react";
import { useParams, Navigate } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { NotFoundPage } from "./NotFoundPage";
import { useSiteContent } from "../../contexts/SiteContentContext";
import { mergeSiteSection } from "../../lib/siteContentMerge";
import { ServiceDetailArticle } from "../components/services/ServiceDetailBlocks";

export function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { content } = useSiteContent();
  const services = useMemo(() => mergeSiteSection("services", content.services), [content.services]);

  const card = useMemo(
    () => services.cards.find((c) => c.slug && c.slug === slug?.toLowerCase()),
    [services.cards, slug],
  );

  useEffect(() => {
    if (!card || card.primaryListingHref) return;
    const prevTitle = document.title;
    document.title = `${card.title} · Viterra`;
    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, follow");
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      meta.remove();
    };
  }, [card]);

  if (!slug) {
    return <Navigate to="/servicios" replace />;
  }

  if (!card) {
    return <NotFoundPage />;
  }

  if (card.primaryListingHref) {
    return <Navigate to={card.primaryListingHref} replace />;
  }

  return (
    <div className="viterra-page flex min-h-screen flex-col bg-brand-canvas">
      <Header />
      <main className="relative flex-1 overflow-hidden px-5 pb-20 pt-10 sm:px-8 lg:px-12 lg:pb-24 lg:pt-14">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(200,16,46,0.11),transparent_55%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-navy/10 to-transparent" aria-hidden />
        <div className="relative z-[1] mx-auto max-w-4xl">
          <ServiceDetailArticle title={card.title} description={card.description} blocks={card.detailBlocks} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
