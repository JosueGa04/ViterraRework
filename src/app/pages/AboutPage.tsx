import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Target, Award, TrendingUp, Shield, Sparkles } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { usePreviewLayout } from "../../contexts/PreviewCanvasContext";
import { useSiteContent } from "../../contexts/SiteContentContext";
import { mergeSiteSection } from "../../lib/siteContentMerge";
import { PreviewSectionChrome } from "../components/admin/siteEditor/PreviewSectionChrome";
import { PreviewFieldPulse } from "../components/admin/siteEditor/PreviewFieldPulse";
import { HeroBackdropMedia } from "../components/HeroBackdropMedia";
import { Reveal } from "../components/Reveal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../components/ui/carousel";
import { ViterraHeroTopClusterAnimated } from "../components/ViterraHeroTopClusterAnimated";
import { cn } from "../components/ui/utils";
import {
  viterraHeroSectionClass,
  viterraHeroCenteredStackClass,
  viterraHeroCenteredInnerClass,
  viterraHeroMainClass,
  viterraHeroSubtitleClass,
} from "../config/heroLayout";

const VALUE_ICONS = [Award, Shield, Target, Sparkles];

function parseStatValue(raw: string): { target: number; suffix: string; useLocale: boolean } {
  const m = raw.match(/^([\d,]*\d)(.*)$/);
  if (!m) return { target: 0, suffix: raw, useLocale: false };
  const target = parseInt(m[1].replace(/,/g, ""), 10);
  if (Number.isNaN(target)) return { target: 0, suffix: raw, useLocale: false };
  return { target, suffix: m[2] ?? "", useLocale: m[1].includes(",") };
}

function formatStatCount(n: number, useLocale: boolean): string {
  if (useLocale) return n.toLocaleString("es-MX");
  return String(n);
}

function AboutStatCounter({
  rawValue,
  start,
  delayMs,
  reduceMotion,
}: {
  rawValue: string;
  start: boolean;
  delayMs: number;
  reduceMotion: boolean;
}) {
  const parsed = useMemo(() => parseStatValue(rawValue), [rawValue]);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setN(parsed.target);
      return;
    }
    if (!start) {
      setN(0);
      return;
    }
    let cancelled = false;
    let raf = 0;
    const timeout = window.setTimeout(() => {
      let t0: number | null = null;
      const duration = 1850;
      const to = parsed.target;
      const tick = (now: number) => {
        if (cancelled) return;
        if (t0 === null) t0 = now;
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - (1 - p) ** 3;
        setN(Math.round(to * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [start, reduceMotion, parsed.target, delayMs]);

  if (reduceMotion) {
    return <span className="inline-block tabular-nums">{rawValue}</span>;
  }

  return (
    <span className="inline-block tabular-nums">
      {formatStatCount(n, parsed.useLocale)}
      {parsed.suffix}
    </span>
  );
}

export function AboutPage() {
  const reduceMotion = useReducedMotion();
  const pl = usePreviewLayout();
  const { content } = useSiteContent();
  const a = mergeSiteSection("about", content.about);
  const statsGridRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsGridRef, { once: true, amount: 0.28 });

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
    <div className="viterra-page flex min-h-screen flex-col bg-white">
      <Header />

      <main className="flex min-h-0 flex-1 flex-col">
      <PreviewSectionChrome blockId="about-hero" label="Cabecera">
      <section className={viterraHeroSectionClass}>
        <div className="absolute inset-0 z-0 overflow-hidden">
          <PreviewFieldPulse blockId="about-hero" fieldKey="about-hero-bg" layout="cover" className="h-full w-full">
            <HeroBackdropMedia
              src={a.heroImage ?? ""}
              fallbackSrc="/images/about-nosotros-hero.png"
              reduceMotion={!!reduceMotion}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/78 via-black/48 to-black/60" />
          </PreviewFieldPulse>
        </div>
        <div className={viterraHeroCenteredStackClass}>
          <motion.div
            className={viterraHeroCenteredInnerClass}
            variants={heroContainerVariants}
            initial="hidden"
            animate="visible"
          >
            <ViterraHeroTopClusterAnimated
              kicker={
                <PreviewFieldPulse blockId="about-hero" fieldKey="about-hero-kicker" className="inline-block">
                  {a.heroKicker}
                </PreviewFieldPulse>
              }
              itemVariants={heroItemVariants}
              reduceMotion={!!reduceMotion}
            />
            <motion.div variants={heroItemVariants} className={viterraHeroMainClass}>
              <h1 className={pl.heroTitleClass()}>
                <PreviewFieldPulse blockId="about-hero" fieldKey="about-hero-title" className="block">
                  {a.heroTitle}
                </PreviewFieldPulse>
              </h1>
            </motion.div>
            <motion.p variants={heroItemVariants} className={viterraHeroSubtitleClass}>
              <PreviewFieldPulse blockId="about-hero" fieldKey="about-hero-subtitle" className="block w-full">
                {a.heroSubtitle}
              </PreviewFieldPulse>
            </motion.p>
          </motion.div>
        </div>
      </section>
      </PreviewSectionChrome>

      <PreviewSectionChrome blockId="about-story" label="Historia">
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={cn("grid items-center gap-16", pl.gridCols("grid-cols-1 lg:grid-cols-2"))}>
            <Reveal y={24}>
              <div>
                <p className="font-heading mb-4 text-sm uppercase tracking-[0.1em] text-brand-navy/60">
                  {a.storyKicker}
                </p>
                <h2 className="font-heading mb-6 text-4xl font-semibold tracking-tight text-brand-navy">
                  {a.storyTitle}
                </h2>
                <p className="font-heading mb-4 leading-relaxed text-brand-navy/72 font-normal not-italic">
                  {a.storyP1}
                </p>
                <p className="font-heading mb-4 leading-relaxed text-brand-navy/72 font-normal not-italic">
                  {a.storyP2}
                </p>
                <p className="font-heading leading-relaxed text-brand-navy/72 font-normal not-italic">
                  {a.storyP3}
                </p>
              </div>
            </Reveal>
            <motion.div
              className="relative h-[500px] overflow-hidden rounded-lg border border-brand-navy/10"
              initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              <ImageWithFallback src={a.storyImage} alt="" className="h-full w-full object-cover" />
            </motion.div>
          </div>
        </div>
      </section>
      </PreviewSectionChrome>

      <PreviewSectionChrome blockId="about-mission" label="Misión y visión">
      <section className="bg-brand-canvas py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={cn("grid items-stretch gap-8", pl.gridCols("grid-cols-1 md:grid-cols-2"))}>
            <Reveal y={22} delay={0} className="h-full min-h-0">
              <motion.div
                className="flex h-full min-h-0 flex-col rounded-lg border border-brand-navy/10 bg-white p-10"
                whileHover={reduceMotion ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-primary">
                  <Target className="h-7 w-7 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading mb-4 text-2xl font-semibold tracking-tight text-brand-navy">
                  {a.missionTitle}
                </h3>
                <p className="font-heading leading-relaxed text-brand-navy/72 font-normal not-italic">
                  {a.missionText}
                </p>
              </motion.div>
            </Reveal>

            <Reveal y={22} delay={0.08} className="h-full min-h-0">
              <motion.div
                className="flex h-full min-h-0 flex-col rounded-lg border border-brand-navy/10 bg-white p-10"
                whileHover={reduceMotion ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-primary">
                  <TrendingUp className="h-7 w-7 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading mb-4 text-2xl font-semibold tracking-tight text-brand-navy">
                  {a.visionTitle}
                </h3>
                <p className="font-heading leading-relaxed text-brand-navy/72 font-normal not-italic">
                  {a.visionText}
                </p>
              </motion.div>
            </Reveal>
          </div>
        </div>
      </section>
      </PreviewSectionChrome>

      <PreviewSectionChrome blockId="about-values" label="Valores">
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal className="mb-16 text-center" y={22}>
            <div>
              <p className="font-heading mb-3 text-sm uppercase tracking-[0.1em] text-brand-navy/60">
                {a.valuesKicker}
              </p>
              <h2 className="font-heading mb-4 text-4xl font-semibold tracking-tight text-brand-navy">
                {a.valuesTitle}
              </h2>
              <p className="font-heading mx-auto max-w-2xl text-brand-navy/72 font-normal not-italic">
                {a.valuesIntro}
              </p>
            </div>
          </Reveal>

          <div className={cn("grid gap-8", pl.gridCols("grid-cols-1 md:grid-cols-2 lg:grid-cols-4"))}>
            {a.values.map((v, index) => {
              const Ic = VALUE_ICONS[index] ?? Award;
              return (
                <Reveal key={`${v.title}-${index}`} delay={Math.min(index * 0.055, 0.35)} y={20}>
                  <motion.div
                    className="text-center"
                    whileHover={reduceMotion ? undefined : { y: -3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  >
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
                      <Ic className="h-8 w-8 text-white" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-heading mb-2 text-lg font-semibold tracking-tight text-brand-navy">
                      {v.title}
                    </h3>
                    <p className="font-heading text-sm leading-relaxed text-brand-navy/72 font-normal not-italic">
                      {v.text}
                    </p>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
      </PreviewSectionChrome>

      <PreviewSectionChrome blockId="about-stats" label="Cifras">
      <section className="bg-brand-navy py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            ref={statsGridRef}
            className={cn("grid gap-12", pl.gridCols("grid-cols-2 md:grid-cols-4"))}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.28 }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: reduceMotion ? 0 : 0.13,
                  delayChildren: reduceMotion ? 0 : 0.05,
                },
              },
            }}
          >
            {a.stats.map((st, index) => (
              <motion.div
                key={st.label}
                variants={{
                  hidden: {
                    opacity: reduceMotion ? 1 : 0,
                    y: reduceMotion ? 0 : 36,
                    scale: reduceMotion ? 1 : 0.94,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] as const },
                  },
                }}
                className="group text-center text-white"
                whileHover={
                  reduceMotion
                    ? undefined
                    : { y: -6, transition: { type: "spring", stiffness: 400, damping: 26 } }
                }
              >
                <motion.div
                  className="font-heading mb-3 text-5xl font-semibold tracking-tight tabular-nums"
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                >
                  <AboutStatCounter
                    rawValue={st.value}
                    start={statsInView}
                    delayMs={index * 130}
                    reduceMotion={!!reduceMotion}
                  />
                </motion.div>
                <div className="font-heading text-sm uppercase tracking-[0.05em] text-white/85 transition-colors duration-300 group-hover:text-white">
                  {st.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      </PreviewSectionChrome>

      <PreviewSectionChrome blockId="about-timeline" label="Línea de tiempo">
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal className="mb-16 text-center" y={22}>
            <div>
              <p className="font-heading mb-3 text-sm uppercase tracking-[0.1em] text-brand-navy/60">
                {a.timelineKicker}
              </p>
              <h2 className="font-heading mb-4 text-4xl font-semibold tracking-tight text-brand-navy">
                {a.timelineTitle}
              </h2>
              <p className="font-heading mx-auto max-w-2xl text-brand-navy/72 font-normal not-italic">
                {a.timelineIntro}
              </p>
            </div>
          </Reveal>

          <div className="relative">
            <div className="absolute left-1/2 h-full w-0.5 -translate-x-1/2 transform bg-brand-navy/12" />

            <div className="space-y-16">
              {a.milestones.map((milestone, index) => (
                <Reveal
                  key={`${milestone.year}-${index}`}
                  delay={Math.min(index * 0.08, 0.45)}
                  y={24}
                  className={cn(
                    "flex items-center gap-8",
                    pl.preview ? "flex-col" : index % 2 === 0 ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "flex-1",
                      pl.preview ? "text-center" : index % 2 === 0 ? "text-right" : "text-left"
                    )}
                  >
                    <motion.div
                      className="inline-block rounded-lg border border-brand-navy/10 bg-white p-6"
                      whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 400, damping: 26 }}
                    >
                      <div className="font-heading mb-2 text-sm uppercase tracking-[0.1em] text-brand-navy/60">
                        {milestone.year}
                      </div>
                      <h3 className="font-heading mb-2 text-xl font-semibold text-brand-navy">
                        {milestone.title}
                      </h3>
                      <p className="font-heading text-sm leading-relaxed text-brand-navy/72 font-normal not-italic">
                        {milestone.description}
                      </p>
                    </motion.div>
                  </div>
                  <div className="relative z-10">
                    <div className="h-4 w-4 rounded-full border-4 border-white shadow-lg bg-primary" />
                  </div>
                  <div className="flex-1" />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>
      </PreviewSectionChrome>

      <PreviewSectionChrome blockId="about-team" label="Equipo">
      <section className="bg-brand-canvas py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Reveal className="mb-16 text-center" y={22}>
            <div>
              <p className="font-heading mb-3 text-sm uppercase tracking-[0.1em] text-brand-navy/60">
                {a.teamKicker}
              </p>
              <h2 className="font-heading mb-4 text-4xl font-semibold tracking-tight text-brand-navy">
                {a.teamTitle}
              </h2>
              <p className="font-heading mx-auto max-w-2xl text-brand-navy/72 font-normal not-italic">
                {a.teamIntro}
              </p>
            </div>
          </Reveal>

          <Carousel
            opts={{ align: "start", loop: true }}
            className="w-full"
            aria-label="Carrusel del equipo"
          >
            <CarouselContent className={cn(pl.preview ? "-ml-0" : "-ml-3 md:-ml-4")}>
              {a.team.map((member, index) => (
                <CarouselItem
                  key={`${member.name}-${index}`}
                  className={cn("basis-full pl-3", !pl.preview && "sm:basis-1/2 md:pl-4 lg:basis-1/3")}
                >
                  <motion.div
                    className="h-full border border-brand-navy/10 bg-white p-8 text-center transition-colors hover:border-brand-navy/25"
                    whileHover={reduceMotion ? undefined : { y: -2 }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  >
                    <div
                      className={cn(
                        "mx-auto mb-6 aspect-square overflow-hidden border border-brand-navy/15 bg-primary",
                        pl.preview ? "w-28 max-w-full" : "w-[min(7.5rem,42vw)]"
                      )}
                    >
                      {member.image ? (
                        <ImageWithFallback
                          src={member.image}
                          alt={member.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary">
                          <span className="font-heading text-2xl font-semibold text-white">
                            {member.initials}
                          </span>
                        </div>
                      )}
                    </div>
                    <h3 className="font-heading mb-2 text-xl font-semibold tracking-tight text-brand-navy">
                      {member.name}
                    </h3>
                    <p className="font-heading text-sm font-medium text-brand-navy/72">
                      {member.role}
                    </p>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              aria-label="Anterior"
              className={cn(
                "left-1 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-none border-brand-navy/25 bg-white text-brand-navy shadow-md hover:bg-brand-canvas disabled:opacity-40 sm:left-0",
                pl.preview && "hidden"
              )}
            />
            <CarouselNext
              aria-label="Siguiente"
              className={cn(
                "right-1 top-1/2 z-10 h-10 w-10 -translate-y-1/2 rounded-none border-brand-navy/25 bg-white text-brand-navy shadow-md hover:bg-brand-canvas disabled:opacity-40 sm:right-0",
                pl.preview && "hidden"
              )}
            />
          </Carousel>
        </div>
      </section>
      </PreviewSectionChrome>

      </main>

      <Footer />
    </div>
  );
}
