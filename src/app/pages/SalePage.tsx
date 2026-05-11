import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SearchBar, SearchFilters } from "../components/SearchBar";
import { PropertyCard, type Property } from "../components/PropertyCard";
import { PropertyMap } from "../components/PropertyMap";
import { useCatalogProperties } from "../hooks/useCatalogProperties";
import {
  sortCatalogProperties,
  CATALOG_PROPERTY_SORT_OPTIONS,
  type CatalogPropertySortKey,
} from "../lib/catalogPropertySort";
import { SlidersHorizontal, Map, LayoutGrid } from "lucide-react";
import { Reveal } from "../components/Reveal";
import { ViterraHeroTopClusterAnimated } from "../components/ViterraHeroTopClusterAnimated";
import { cn } from "../components/ui/utils";
import {
  viterraHeroSectionClass,
  viterraHeroCenteredStackClass,
  viterraHeroCenteredInnerClass,
  viterraHeroMainClass,
  viterraHeroTitleClass,
  viterraHeroSubtitleClass,
} from "../config/heroLayout";

function PropertyGridSkeleton() {
  return (
    <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={`sale-skeleton-${idx}`} className="overflow-hidden rounded-none border border-slate-200 bg-white">
          <div className="h-64 animate-pulse bg-slate-200" />
          <div className="space-y-4 p-6">
            <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SalePage() {
  const reduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const { properties, loading } = useCatalogProperties();
  const saleProperties = useMemo(
    () => properties.filter((p) => p.status === "venta"),
    [properties]
  );
  const catalogPrices = useMemo(() => saleProperties.map((p) => p.price), [saleProperties]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [sortBy, setSortBy] = useState<CatalogPropertySortKey>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const displayedProperties = useMemo(
    () => sortCatalogProperties(filteredProperties, sortBy),
    [filteredProperties, sortBy]
  );

  useEffect(() => {
    setFilteredProperties(saleProperties);
  }, [saleProperties]);

  const handleSearch = useCallback((filters: SearchFilters) => {
    let filtered = [...saleProperties];

    if (filters.query) {
      filtered = filtered.filter(
        (property) =>
          property.title.toLowerCase().includes(filters.query.toLowerCase()) ||
          property.location.toLowerCase().includes(filters.query.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter(
        (property) => property.type.toLowerCase() === filters.type.toLowerCase()
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter((property) => property.price >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      filtered = filtered.filter((property) => property.price <= Number(filters.maxPrice));
    }

    setFilteredProperties(filtered);
  }, [saleProperties]);

  useEffect(() => {
    const filters: SearchFilters = {
      query: searchParams.get("query") || "",
      type: searchParams.get("type") || "",
      status: "venta",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
    };

    const hasFilters = filters.query || filters.type || filters.minPrice || filters.maxPrice;
    if (hasFilters) {
      handleSearch(filters);
    }
  }, [searchParams, handleSearch]);

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
    <div className="viterra-page min-h-screen flex flex-col bg-white" >
      <Header />

      <section className={viterraHeroSectionClass}>
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.img
            src="https://plus.unsplash.com/premium_photo-1661954372617-15780178eb2e?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8bHV4dXJ5JTIwaG91c2V8ZW58MHx8MHx8fDA%3D"
            alt="Propiedades en Venta"
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
          <div
            className="absolute inset-0 bg-gradient-to-b from-brand-navy/78 via-black/48 to-black/60"
            aria-hidden
          />
        </div>

        <div className={viterraHeroCenteredStackClass}>
          <motion.div
            className={viterraHeroCenteredInnerClass}
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
          >
            <ViterraHeroTopClusterAnimated
              kicker="Viterra · Listados"
              itemVariants={heroItemVariants}
              reduceMotion={!!reduceMotion}
            />
            <motion.div variants={heroItemVariants} className={viterraHeroMainClass}>
              <h1 className={viterraHeroTitleClass}>Propiedades en Venta</h1>
            </motion.div>
            <motion.p variants={heroItemVariants} className={viterraHeroSubtitleClass}>
              Invierte en tu patrimonio con las mejores opciones del mercado
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="border-b border-brand-navy/10 bg-brand-canvas py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal y={22}>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0.94, y: 10 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <SearchBar onSearch={handleSearch} defaultStatus="venta" catalogPrices={catalogPrices} />
            </motion.div>
          </Reveal>
        </div>
      </section>

      <section id="venta-catalogo" className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal
            className={cn(
              "mb-8 flex flex-col gap-4 md:flex-row md:items-center",
              viewMode === "map"
                ? "items-end justify-end md:justify-end"
                : "items-start justify-between md:items-center"
            )}
            y={18}
          >
            {viewMode === "grid" && (
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="h-5 w-5 text-primary" strokeWidth={1.5} aria-hidden />
                <p className="font-heading text-sm font-medium text-brand-navy/90 not-italic">
                  {loading
                    ? "Cargando propiedades..."
                    : `${displayedProperties.length} propiedad${displayedProperties.length !== 1 ? "es" : ""} disponible${displayedProperties.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            )}

            <div
              className={cn(
                "flex flex-wrap items-center gap-4",
                viewMode === "map" && "w-full justify-end"
              )}
            >
              <div className="flex items-center gap-1 rounded-lg border border-brand-navy/10 bg-brand-canvas p-1">
                <motion.button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className={cn(
                    "rounded-md px-3 py-2 transition-colors",
                    viewMode === "grid"
                      ? "bg-white text-brand-navy shadow-sm ring-1 ring-primary/25"
                      : "text-brand-navy/60 hover:text-brand-navy"
                  )}
                  aria-pressed={viewMode === "grid"}
                  aria-label="Vista en cuadrícula"
                >
                  <LayoutGrid className="h-4 w-4" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setViewMode("map")}
                  whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className={cn(
                    "rounded-md px-3 py-2 transition-colors",
                    viewMode === "map"
                      ? "bg-white text-brand-navy shadow-sm ring-1 ring-primary/25"
                      : "text-brand-navy/60 hover:text-brand-navy"
                  )}
                  aria-pressed={viewMode === "map"}
                  aria-label="Vista en mapa"
                >
                  <Map className="h-4 w-4" />
                </motion.button>
              </div>

              {viewMode === "grid" && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as CatalogPropertySortKey)}
                  className="font-heading rounded-lg border border-brand-navy/15 bg-white px-4 py-2 text-sm font-normal text-brand-navy not-italic transition-shadow duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {CATALOG_PROPERTY_SORT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Reveal>

          {loading ? (
            <PropertyGridSkeleton />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 items-stretch md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayedProperties.map((property, index) => (
                <Reveal key={property.id} className="h-full" delay={Math.min(index * 0.055, 0.4)} y={24}>
                  <PropertyCard property={property} disablePreview />
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal y={20}>
              <PropertyMap properties={displayedProperties} mapHeightClassName="h-[58vh] min-h-[320px] max-h-[460px]" />
            </Reveal>
          )}

          {!loading && displayedProperties.length === 0 && (
            <motion.div
              className="py-20 text-center"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-heading text-lg font-light not-italic text-brand-navy/65">
                No se encontraron propiedades que coincidan con tu búsqueda
              </p>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
