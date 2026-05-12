import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PropertyCard } from "../components/PropertyCard";
import { SearchBar, SearchFilters } from "../components/SearchBar";
import { useFeaturedHomeProperties } from "../hooks/useFeaturedHomeProperties";
import { useCatalogPriceSlices } from "../hooks/useCatalogPriceSlices";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePreviewLayout } from "../../contexts/PreviewCanvasContext";
import { useSiteContent } from "../../contexts/SiteContentContext";
import { PreviewSectionChrome } from "../components/admin/siteEditor/PreviewSectionChrome";
import { Reveal } from "../components/Reveal";
import { cn } from "../components/ui/utils";
function SectionKicker({ children, tone = "dark" }: { children: ReactNode; tone?: "dark" | "light" }) {
  return (
    <div className="text-center">
      <p
        className={cn(
          "text-[10px] uppercase tracking-[0.32em] font-normal",
          tone === "light" ? "text-white/70" : "text-brand-navy/55"
        )}
      >
        {children}
      </p>
      <span className="mt-4 mx-auto block h-px w-10 bg-primary" aria-hidden />
    </div>
  );
}

export function HomePage() {
  const pl = usePreviewLayout();
  const reduceMotion = useReducedMotion();
  const { content } = useSiteContent();
  const h = content.home;
  const {
    properties: featuredProperties,
    loading: featuredLoading,
    error: featuredError,
    reload: reloadFeatured,
  } = useFeaturedHomeProperties();
  const catalogPriceSlices = useCatalogPriceSlices();
  const [activeFeaturedId, setActiveFeaturedId] = useState<string | null>(null);
  const activeFeaturedProperty = useMemo(
    () =>
      featuredProperties.find((p) => p.id === activeFeaturedId) ??
      featuredProperties[0] ??
      null,
    [featuredProperties, activeFeaturedId]
  );
  const activeFeaturedIndex = useMemo(
    () => featuredProperties.findIndex((p) => p.id === activeFeaturedProperty?.id),
    [featuredProperties, activeFeaturedProperty?.id]
  );
  const featuredLabel = (title?: string, fallback?: string) => {
    const a = title?.trim();
    const b = fallback?.trim();
    const base = a || b || "Propiedad destacada";
    const MAX_CHARS = 44;
    return base.length > MAX_CHARS ? `${base.slice(0, MAX_CHARS - 3).trimEnd()}...` : base;
  };
  const goFeaturedPrev = () => {
    if (featuredProperties.length <= 1 || activeFeaturedIndex < 0) return;
    const next = (activeFeaturedIndex - 1 + featuredProperties.length) % featuredProperties.length;
    setActiveFeaturedId(featuredProperties[next].id);
  };
  const goFeaturedNext = () => {
    if (featuredProperties.length <= 1 || activeFeaturedIndex < 0) return;
    const next = (activeFeaturedIndex + 1) % featuredProperties.length;
    setActiveFeaturedId(featuredProperties[next].id);
  };

  useEffect(() => {
    if (featuredProperties.length === 0) {
      setActiveFeaturedId(null);
      return;
    }
    if (!activeFeaturedId || !featuredProperties.some((p) => p.id === activeFeaturedId)) {
      setActiveFeaturedId(featuredProperties[0].id);
    }
  }, [featuredProperties, activeFeaturedId]);

  const handleSearch = (filters: SearchFilters) => {
    const params = new URLSearchParams();
    if (filters.query) params.append("query", filters.query);
    if (filters.type) params.append("type", filters.type);
    if (filters.status) params.append("status", filters.status);
    if (filters.minPrice) params.append("minPrice", filters.minPrice);
    if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
    if (filters.minBedrooms) params.append("minBedrooms", filters.minBedrooms);
    if (filters.minBathrooms) params.append("minBathrooms", filters.minBathrooms);
    if (filters.minArea) params.append("minArea", filters.minArea);
    if (filters.maxArea) params.append("maxArea", filters.maxArea);
    const status = filters.status === "venta" ? "venta" : "renta";
    window.location.href = `/${status}?${params.toString()}`;
  };

  const scrollToSearch = () => {
    document.getElementById("busqueda")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const heroContainerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.1,
        delayChildren: reduceMotion ? 0 : 0.06,
      },
    },
  } as const;

  const heroItemVariants = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.52, ease: [0.22, 1, 0.36, 1] as const },
    },
  } as const;

  return (
    <div className="viterra-page min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero portada: layout propio (no compartido con el resto de páginas). */}
      <PreviewSectionChrome blockId="home-hero" label="Portada principal">
      <section
        className={
          "viterra-reveal-off scroll-fade-exit-white relative flex min-h-[100svh] flex-col justify-center overflow-hidden " +
          "pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] sm:pb-16 md:pb-24 " +
          "pt-[calc(env(safe-area-inset-top,0px)+4.25rem)] lg:pt-[calc(env(safe-area-inset-top,0px)+8.25rem)]"
        }
      >
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.img
            src={h.heroImage}
            alt=""
            className="h-full w-full object-cover"
            initial={false}
            animate={
              reduceMotion
                ? { scale: 1.05 }
                : { scale: [1.05, 1.07, 1.05] }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 22, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-10 text-center sm:px-6 sm:pt-12 lg:px-8 lg:pt-16">
          <motion.div
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 md:space-y-10"
          >
            <motion.p
              variants={heroItemVariants}
              className="text-[11px] font-normal uppercase tracking-[0.35em] text-white/70 md:text-xs lg:mt-2"
            >
              {h.heroKicker}
            </motion.p>

            <motion.h1
              variants={heroItemVariants}
              className="px-2 text-[2.35rem] font-light leading-[1.05] tracking-tight text-white not-italic sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
              style={{ fontFamily: "var(--font-hero-display)", fontWeight: 300 }}
            >
              {h.heroTitle}
            </motion.h1>

            <motion.p variants={heroItemVariants} className="mx-auto max-w-xl text-lg font-light leading-relaxed text-white/88 md:text-xl">
              {h.heroSubtitle}
            </motion.p>

            <motion.div
              variants={heroItemVariants}
              className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] uppercase tracking-[0.28em] text-white/65 md:text-xs"
            >
              <Link to="/desarrollos" className="py-1 font-normal transition-colors hover:text-white">
                {h.heroLinkDevLabel}
              </Link>
              <span className="hidden text-white/30 sm:inline">|</span>
              <Link to="/nosotros" className="py-1 font-normal transition-colors hover:text-white">
                {h.heroLinkAboutLabel}
              </Link>
            </motion.div>

            <motion.div
              variants={heroItemVariants}
              className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-5 pt-4 sm:grid-cols-2 sm:items-center sm:gap-x-6 sm:gap-y-0 sm:pt-2 md:gap-x-10"
            >
              <div className="flex w-full justify-center sm:justify-end">
                <motion.button
                  type="button"
                  onClick={scrollToSearch}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  className="flex w-full max-w-sm min-w-0 cursor-pointer items-center justify-center border-0 border-b border-white/40 bg-transparent px-2 py-4 text-center text-xs font-normal uppercase tracking-[0.22em] text-white transition-colors hover:border-white sm:w-auto sm:max-w-none sm:shrink-0 sm:px-0"
                >
                  {h.heroCtaPrimary}
                </motion.button>
              </div>
              <div className="flex w-full justify-center sm:justify-start">
                <Link
                  to="/venta"
                  className="group flex shrink-0 items-center gap-2 border-b border-white/40 py-4 text-sm font-light leading-snug tracking-wide text-white transition-colors hover:border-white"
                >
                  {h.heroCtaSecondary}
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      </PreviewSectionChrome>

      {/* Búsqueda — mismo lenguaje visual que el hero: imagen + velo para legibilidad */}
      <PreviewSectionChrome blockId="home-search" label="Búsqueda">
      <section
        id="busqueda"
        className={cn(
          "relative flex flex-col justify-center overflow-hidden border-b border-brand-navy/20",
          "h-[calc(100dvh-var(--viterra-sticky-header-offset))]",
          "max-h-[calc(100dvh-var(--viterra-sticky-header-offset))]",
          "min-h-0",
          "scroll-mt-[var(--viterra-sticky-header-offset)]",
          "py-5 md:py-6"
        )}
      >
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={h.searchImage}
            alt=""
            className="w-full h-full object-cover scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/88 via-black/55 to-black/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
        </div>
        {/* Velo radial: oscurece el centro (donde están filtros y texto) sin “tapar” todo el encuadre */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_135%_92%_at_50%_58%,rgb(0_0_0/0.78)_0%,rgb(0_0_0/0.42)_48%,rgb(0_0_0/0.14)_72%,transparent_100%)]"
        />

        <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center overflow-x-visible px-4 py-1 sm:px-6 lg:px-8">
          <Reveal className="mb-3 shrink-0 md:mb-4" y={28}>
            <div>
              <SectionKicker tone="light">{h.searchKicker}</SectionKicker>
              <h2 className="font-heading font-light mt-4 text-center text-2xl leading-tight tracking-tight text-white [text-shadow:0_2px_28px_rgb(0_0_0/0.55),0_1px_2px_rgb(0_0_0/0.4)] sm:text-3xl md:text-4xl lg:text-[2.2rem]">
                {h.searchTitle}
              </h2>
              <p className="font-heading mx-auto mt-2 max-w-xl text-center text-sm font-light not-italic leading-relaxed text-white/90 [text-shadow:0_1px_18px_rgb(0_0_0/0.5)] md:text-base">
                {h.searchSubtitle}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.06} y={16}>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0.92, y: 8 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-4xl"
            >
              <SearchBar onSearch={handleSearch} variant="ambient" catalogPriceSlices={catalogPriceSlices} />
            </motion.div>
          </Reveal>
        </div>
      </section>
      </PreviewSectionChrome>

      {/* Selección — fondo blanco (sin imagen de fondo) */}
      <PreviewSectionChrome blockId="home-selection" label="Selección de propiedades">
      <section className="relative scroll-fade-exit-white bg-white py-20 md:py-28">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal
            className={cn(
              "mb-14 flex gap-8 border-b border-brand-navy/10 pb-10 sm:gap-10 md:mb-16 md:pb-12",
              pl.preview ? "flex-col" : "flex-col lg:flex-row lg:items-end lg:justify-between"
            )}
            y={24}
          >
            <div className="lg:max-w-[65%]">
              <p className="mb-4 text-[10px] font-normal uppercase tracking-[0.32em] text-brand-navy/55">{h.selectionKicker}</p>
              <span className="mb-6 block h-px w-10 bg-primary" aria-hidden />
              <h2 className="font-heading text-3xl font-light leading-[1.12] tracking-tight text-brand-navy sm:text-4xl md:text-5xl lg:text-[3.25rem]">
                {h.selectionTitle}
              </h2>
              <p className="mt-5 max-w-xl text-[15px] font-light leading-relaxed text-brand-navy/70 md:text-base">
                {h.selectionSubtitle}
              </p>
            </div>
            <Link
              to="/venta"
              className="inline-flex shrink-0 items-center gap-2 self-start border-b border-brand-navy/35 pb-1 text-[11px] uppercase tracking-[0.22em] text-brand-navy transition-colors hover:border-primary hover:text-primary lg:self-auto"
            >
              {h.selectionCatalogLink}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <div className="mx-auto max-w-6xl">
            {featuredLoading ? (
              <p className="text-center text-sm text-brand-navy/60" style={{ fontWeight: 500 }}>
                Cargando propiedades…
              </p>
            ) : featuredProperties.length === 0 ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-brand-navy/60" style={{ fontWeight: 500 }}>
                  {featuredError
                    ? "No pudimos cargar las propiedades destacadas. Comprueba tu conexión e inténtalo de nuevo."
                    : "No hay propiedades destacadas en este momento."}
                </p>
                {featuredError ? (
                  <button
                    type="button"
                    onClick={() => void reloadFeatured()}
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    Reintentar
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-5 md:space-y-6">
                {activeFeaturedProperty && (
                  <div
                    key={activeFeaturedProperty.id}
                    className="relative mx-auto h-[360px] w-full max-w-5xl sm:h-[390px] md:h-[420px]"
                  >
                    <div className="h-full [&>article]:h-full">
                      <PropertyCard property={activeFeaturedProperty} variant="editorial" />
                    </div>
                    {featuredProperties.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={goFeaturedPrev}
                          className="absolute left-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/45 text-white transition hover:bg-black/65 sm:left-3 sm:h-10 sm:w-10"
                          aria-label="Propiedad destacada anterior"
                        >
                          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={goFeaturedNext}
                          className="absolute right-2 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/55 bg-black/45 text-white transition hover:bg-black/65 sm:right-3 sm:h-10 sm:w-10"
                          aria-label="Siguiente propiedad destacada"
                        >
                          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="relative">
                  <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="mx-auto flex w-max gap-2.5 md:gap-3">
                      {featuredProperties.map((property) => {
                        const selected = property.id === activeFeaturedProperty?.id;
                        return (
                          <motion.button
                            key={property.id}
                            type="button"
                            onMouseEnter={() => setActiveFeaturedId(property.id)}
                            onFocus={() => setActiveFeaturedId(property.id)}
                            onClick={() => setActiveFeaturedId(property.id)}
                            whileHover={reduceMotion ? undefined : { y: -2 }}
                            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                            className={cn(
                              "group relative h-44 w-[130px] shrink-0 overflow-hidden border text-left transition-all duration-300 md:h-48 md:w-[146px]",
                              selected
                                ? "border-primary/60 bg-black text-white shadow-[0_12px_30px_-20px_rgba(8,12,22,0.85)]"
                                : "border-white/15 bg-black text-white/90 hover:border-white/35"
                            )}
                            aria-label={`Show featured property ${property.title}`}
                            aria-pressed={selected}
                          >
                            <img
                              src={property.image}
                              alt=""
                              className={cn(
                                "absolute inset-0 h-full w-full object-cover transition-all duration-500",
                                selected
                                  ? "scale-[1.03] opacity-86 blur-[0.35px] group-hover:scale-100 group-hover:opacity-100 group-hover:blur-0"
                                  : "opacity-76 blur-[0.6px] group-hover:scale-100 group-hover:opacity-95 group-hover:blur-0"
                              )}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/45 to-black/55 transition-opacity duration-300 group-hover:opacity-30" />

                            <div className="relative z-[1] flex h-full flex-col justify-between p-3 transition-opacity duration-300 group-hover:opacity-95">
                              <div>
                                <p className="rounded-sm bg-black/28 px-1.5 py-1 text-[12px] font-medium leading-snug text-white/95 backdrop-blur-[1px]">
                                  {featuredLabel(property.publicationTitle, property.title)}
                                </p>
                              </div>

                              <div />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Reveal className="mt-20 flex flex-col items-center justify-center gap-8 border-t border-brand-navy/10 pt-12 text-sm sm:flex-row" y={18} delay={0.06}>
            <Link
              to="/renta"
              className="inline-flex items-center gap-2 border-b border-brand-navy/25 pb-1 text-[11px] uppercase tracking-[0.16em] text-brand-navy/85 transition-colors hover:border-primary hover:text-primary"
            >
              {h.selectionRentLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="hidden h-4 w-px bg-brand-navy/15 sm:inline" aria-hidden />
            <Link
              to="/venta"
              className="inline-flex items-center gap-2 border-b border-brand-navy/25 pb-1 text-[11px] uppercase tracking-[0.16em] text-brand-navy/85 transition-colors hover:border-primary hover:text-primary"
            >
              {h.selectionSaleLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>
      </PreviewSectionChrome>

      {/* Redes sociales — posts recientes */}
      <section className="relative bg-brand-canvas py-20 md:py-28 border-t border-brand-navy/10">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-14 text-center" y={24}>
            <p className="mb-4 text-[10px] font-normal uppercase tracking-[0.32em] text-brand-navy/55">
              Síguenos
            </p>
            <span className="mx-auto mb-6 block h-px w-10 bg-primary" aria-hidden />
            <h2 className="font-heading text-3xl font-light leading-[1.12] tracking-tight text-brand-navy sm:text-4xl md:text-5xl">
              Lo último en redes
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] font-light leading-relaxed text-brand-navy/70 md:text-base">
              Mantente al día con nuestras publicaciones más recientes, proyectos y estilo de vida.
            </p>
          </Reveal>

          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "post-1",
                image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=600&fit=crop",
                caption: "Nuevo desarrollo exclusivo en Zapopan. Departamentos con acabados premium y amenidades de lujo.",
                date: "Hace 2 días",
                likes: 148,
              },
              {
                id: "post-2",
                image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=600&fit=crop",
                caption: "Espacios diseñados para vivir mejor. Descubre nuestra selección de propiedades con terraza.",
                date: "Hace 5 días",
                likes: 203,
              },
              {
                id: "post-3",
                image: "https://images.unsplash.com/photo-1600566753376-12c8ab7c5a38?w=600&h=600&fit=crop",
                caption: "La vista perfecta existe. Conoce los penthouses disponibles en nuestra cartera exclusiva.",
                date: "Hace 1 semana",
                likes: 312,
              },
            ].map((post) => (
              <Reveal key={post.id} y={20} delay={0.04}>
                <a
                  href="https://www.instagram.com/viterramx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.caption}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span style={{ fontWeight: 500 }}>{post.likes}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-700" style={{ fontWeight: 400 }}>
                      {post.caption}
                    </p>
                    <p className="mt-2 text-xs text-slate-400" style={{ fontWeight: 500 }}>
                      {post.date}
                    </p>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 flex justify-center" y={16} delay={0.08}>
            <a
              href="https://www.instagram.com/viterramx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full border border-brand-navy/15 bg-white px-6 py-3 text-[13px] uppercase tracking-[0.14em] text-brand-navy shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              style={{ fontWeight: 500 }}
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              Síguenos en Instagram
              <ArrowRight className="h-4 w-4" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* Experiencia — navy marca + imagen */}
      <PreviewSectionChrome blockId="home-experience" label="Experiencia">
      <section className={cn("grid min-h-[420px] lg:min-h-[540px]", pl.gridCols("grid-cols-1 lg:grid-cols-2"))}>
        <motion.div
          className={cn(
            "relative min-h-[300px] overflow-hidden lg:min-h-0",
            pl.preview ? "order-2" : "order-2 lg:order-1"
          )}
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={reduceMotion ? undefined : { opacity: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={h.experienceImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduceMotion ? false : { scale: 1.1 }}
            whileInView={reduceMotion ? undefined : { scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
        <div
          className={cn(
            "order-1 flex flex-col justify-center bg-brand-navy px-5 py-14 text-white sm:px-8 md:py-16 lg:px-16 lg:py-24",
            pl.preview ? "" : "lg:order-2"
          )}
        >
          <Reveal y={22} delay={0.04}>
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/45 font-normal mb-5">{h.experienceKicker}</p>
              <span className="block h-px w-10 bg-primary mb-8" aria-hidden />
              <h3 className="font-heading font-light text-3xl md:text-4xl lg:text-[2.65rem] tracking-tight leading-[1.15] mb-6">
                {h.experienceTitle}
              </h3>
              <p className="font-heading text-lg md:text-xl not-italic text-white/70 leading-relaxed max-w-md mb-4 font-light">
                {h.experienceLead}
              </p>
              <p className="text-white/78 font-light leading-relaxed max-w-md mb-10 text-[15px]">
                {h.experienceBody}
              </p>
              <motion.div whileHover={reduceMotion ? undefined : { x: 3 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
                <Link
                  to="/nosotros"
                  className="inline-flex items-center gap-2 self-start uppercase tracking-[0.22em] text-[11px] border border-white/50 px-9 py-3.5 hover:bg-white hover:text-brand-navy transition-colors duration-300"
                >
                  {h.experienceCta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </div>
          </Reveal>
        </div>
      </section>
      </PreviewSectionChrome>

      {/* Cierre — negro marca + acento rojo en hover */}
      <PreviewSectionChrome blockId="home-closing" label="Cierre">
      <section className="py-24 md:py-32 bg-brand-canvas border-t border-brand-navy/10">
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6" y={26}>
          <div>
            <SectionKicker>{h.closingKicker}</SectionKicker>
            <h2 className="font-heading font-light text-3xl md:text-4xl lg:text-[2.65rem] text-brand-navy tracking-tight mt-8 mb-5 leading-tight">
              {h.closingTitle}
            </h2>
            <p className="text-brand-navy/70 font-light mb-12 leading-relaxed text-[15px] md:text-base max-w-lg mx-auto">
              {h.closingSubtitle}
            </p>
            <div className={cn("flex gap-4 justify-center", pl.preview ? "flex-col" : "flex-col sm:flex-row")}>
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[11px] bg-brand-navy text-white px-10 py-4 transition-colors hover:brightness-110"
                >
                  {h.closingBtnPrimary}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}>
                <Link
                  to="/renta"
                  className="inline-flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-[11px] border border-brand-navy/25 text-brand-navy px-10 py-4 transition-colors hover:border-primary hover:text-brand-burgundy bg-white/70"
                >
                  {h.closingBtnSecondary}
                </Link>
              </motion.div>
            </div>
          </div>
        </Reveal>
      </section>
      </PreviewSectionChrome>

      <Footer />
    </div>
  );
}
