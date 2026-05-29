"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import type { ServiceCardContent } from "../../data/siteContent";
import { serviceIconForKey, serviceOrbitAnglesDeg } from "../../lib/serviceIcons";
import { resolveServiceCardPrimaryHref } from "../../lib/serviceCardPrimaryHref";
import { cn } from "./ui/utils";

const VITERRA_MARK_MONO = "/images/branding/viterra-mark-mono-alpha.png";

const VB = 520;
const CX = 260;
const CY = 260;
const RADIUS = 200;

const NODE_INACTIVE = 40;
const NODE_ACTIVE = 52;
const NODE_CENTER = 80;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function pct(v: number) {
  return `${(v / VB) * 100}%`;
}

function pathFromCenterTo(x: number, y: number) {
  const mx = (CX + x) / 2;
  const my = (CY + y) / 2;
  const dx = x - CX;
  const dy = y - CY;
  const nx = -dy;
  const ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  const curve = Math.hypot(dx, dy) * 0.1;
  const c1x = mx + (nx / len) * curve;
  const c1y = my + (ny / len) * curve;
  return `M ${CX} ${CY} Q ${c1x} ${c1y} ${x} ${y}`;
}

type Props = {
  cards: ServiceCardContent[];
  reduceMotion?: boolean;
};

export function ServicesNodeGraphTwoState({ cards, reduceMotion }: Props) {
  const [view, setView] = useState<"graph" | "detail">("graph");
  const [activeService, setActiveService] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const indexedCards = useMemo(() => cards.map((c, i) => ({ ...c, i })), [cards]);
  const activeIndex = activeService ?? 0;
  const active = indexedCards[activeIndex] ?? indexedCards[0];
  const ActiveIcon = serviceIconForKey(active?.iconKey ?? "building2");

  const positions = useMemo(() => {
    const n = Math.max(indexedCards.length, 1);
    const MIN_CHORD = 84;
    let orbitR = RADIUS;
    if (n > 1) {
      orbitR = Math.min(222, Math.max(RADIUS - 8, MIN_CHORD / (2 * Math.sin(Math.PI / n))));
    }
    const angles = serviceOrbitAnglesDeg(n);
    return indexedCards.map((_, i) => {
      const deg = angles[i % angles.length] ?? 270;
      const a = degToRad(deg - 90);
      return { x: CX + orbitR * Math.cos(a), y: CY + orbitR * Math.sin(a) };
    });
  }, [indexedCards]);

  const openDetail = (index: number) => {
    setActiveService(index);
    setView("detail");
  };

  const closeDetail = () => {
    setView("graph");
    setTimeout(() => setActiveService(null), 700);
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] py-20">
      <div className="min-h-[600px] overflow-hidden">
        <AnimatePresence mode="wait">
          {view === "graph" ? (
            <motion.section
              key="graph"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.p
                className="mb-12 text-center text-[12px] uppercase tracking-[0.2em] text-white/35"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Red inteligente de soluciones inmobiliarias
              </motion.p>

              <div className="relative mx-auto min-h-[520px] w-full max-w-[980px]">
                <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:40px_40px]" />

                <motion.svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${VB} ${VB}`}
                  preserveAspectRatio="xMidYMid meet"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <defs>
                    <filter id="services-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgb(220 38 38 / 0)" />
                      <stop offset="50%" stopColor="rgb(220 38 38 / 0.8)" />
                      <stop offset="100%" stopColor="rgb(220 38 38 / 0)" />
                    </linearGradient>
                  </defs>

                  {positions.map((p, i) => {
                    const d = pathFromCenterTo(p.x, p.y);
                    const lit = hovered === i;
                    return (
                      <g key={`line-${i}`}>
                        <path
                          d={d}
                          stroke="url(#redGradient)"
                          strokeOpacity={lit ? 1 : 0.3}
                          strokeWidth={1}
                          fill="none"
                          strokeLinecap="round"
                          style={lit ? { filter: "url(#services-glow)" } : undefined}
                        />
                        {!reduceMotion ? (
                          <circle r="3" fill="#DC2626" opacity={lit ? 1 : 0.6}>
                            <animateMotion dur="2s" repeatCount="indefinite" path={d} begin={`${(i * 0.2).toFixed(2)}s`} />
                          </circle>
                        ) : null}
                      </g>
                    );
                  })}
                </motion.svg>

                <motion.div
                  className="pointer-events-none absolute z-[2] flex items-center justify-center"
                  style={{ left: pct(CX), top: pct(CY), transform: "translate(-50%, -50%)" }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  {!reduceMotion ? (
                    <>
                      <motion.div className="absolute h-[100px] w-[100px] rounded-full border border-[#DC2626]/40" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} />
                      <motion.div className="absolute h-[130px] w-[130px] rounded-full border border-dashed border-[#DC2626]/20" animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
                    </>
                  ) : null}
                  <div className="relative flex items-center justify-center rounded-full bg-[#DC2626] shadow-[0_0_30px_rgba(220,38,38,0.4),0_0_60px_rgba(220,38,38,0.15)]" style={{ width: NODE_CENTER, height: NODE_CENTER, border: "2px solid #DC2626" }}>
                    <img src={VITERRA_MARK_MONO} alt="Viterra" width={512} height={132} className="h-[36px] w-auto object-contain" />
                  </div>
                </motion.div>

                {indexedCards.map((card, i) => {
                  const p = positions[i]!;
                  const Icon = serviceIconForKey(card.iconKey);
                  const isHovered = hovered === i;
                  const tipDx = p.x - CX;
                  const tipDy = p.y - CY;
                  const tipLen = Math.hypot(tipDx, tipDy) || 1;
                  const tipUx = tipDx / tipLen;
                  const tipUy = tipDy / tipLen;
                  const labelRadialDist = NODE_ACTIVE / 2 + 38;
                  return (
                    <motion.div
                      key={`node-${card.title}-${i}`}
                      className="absolute z-[5]"
                      style={{ left: pct(p.x), top: pct(p.y), width: 0, height: 0 }}
                      initial={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <motion.button
                        type="button"
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => openDetail(i)}
                        whileHover={reduceMotion ? undefined : { scale: 1.1 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                        className="relative flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)]"
                        style={{
                          position: "absolute",
                          left: -NODE_ACTIVE / 2,
                          top: -NODE_ACTIVE / 2,
                          width: NODE_ACTIVE,
                          height: NODE_ACTIVE,
                          border: "1px solid rgba(220,38,38,0.25)",
                          boxShadow: isHovered ? "0 0 12px rgba(220,38,38,0.3)" : "none",
                        }}
                      >
                        <motion.span layoutId="active-node" className="absolute inset-0 rounded-full" />
                        <Icon className="h-[22px] w-[22px] text-white/85" strokeWidth={1.6} />
                      </motion.button>
                      <div
                        className="pointer-events-none absolute left-0 top-0 flex w-max max-w-[min(200px,46vw)] min-w-[10.5rem] flex-col items-center gap-1 text-center"
                        style={{
                          transform: `translate(-50%, -50%) translate(${tipUx * labelRadialDist}px, ${tipUy * labelRadialDist}px)`,
                        }}
                      >
                        <span
                          className={cn(
                            "text-balance px-1 leading-snug",
                            isHovered ? "text-white" : "text-white/50"
                          )}
                          style={{
                            fontSize: 11,
                            fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {card.title}
                        </span>
                        <AnimatePresence>
                          {isHovered ? (
                            <motion.span
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.15 }}
                              className="mt-1 text-[9px] text-[#DC2626]"
                              style={{ fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            >
                              Click para explorar →
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid min-h-[600px] grid-cols-1 overflow-hidden lg:grid-cols-[45%_55%]"
            >
              <div className="relative bg-[#0A0F1E] px-10 py-12 lg:px-14 lg:py-16">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0 }}>
                  <div className="mb-8 flex items-center gap-3">
                    <span className="relative inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DC2626]/40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#DC2626]" />
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#DC2626]" style={{ fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      ACTIVE NODE
                    </span>
                  </div>
                  <div className="pointer-events-none absolute bottom-[-20px] left-[-10px] select-none text-[200px] font-black leading-none text-white/[0.03]">
                    {String(activeIndex + 1).padStart(2, "0")}
                  </div>
                  <motion.h3
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="relative z-[1] text-[clamp(36px,4vw,56px)] leading-[1.1] text-white"
                    style={{ fontFamily: "\"DM Serif Display\", ui-serif, Georgia, serif" }}
                  >
                    {active?.title}
                  </motion.h3>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-6 max-w-[380px] text-[15px] leading-[1.7] text-white/65">
                    {active?.description}
                  </motion.p>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.48 }}
                    onClick={closeDetail}
                    className="mt-10 inline-flex items-center gap-2 border border-white/20 px-5 py-2.5 text-[12px] text-white/60 transition-colors hover:border-[#DC2626] hover:text-white"
                    style={{ fontFamily: "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace" }}
                  >
                    <span aria-hidden>←</span>
                    Volver a servicios
                  </motion.button>
                </motion.div>
              </div>

              <motion.div
                layoutId="active-node"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                exit={{ clipPath: "inset(0 100% 0 0)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className="relative bg-[#DC2626] px-10 py-12 lg:px-[60px] lg:py-[60px]"
              >
                <div className="flex h-full flex-col justify-center">
                  <div className="space-y-7">
                    {(active?.bullets ?? []).map((b, idx) => (
                      <motion.div key={b} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 + idx * 0.08 }} className="flex items-center">
                        <span className="mr-4 inline-block h-[2px] w-10 bg-[#991B1B]" />
                        <span className="text-[18px] font-normal text-white">{b}</span>
                      </motion.div>
                    ))}
                  </div>

                  {(() => {
                    const href = active ? resolveServiceCardPrimaryHref(active) : null;
                    return href ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
                      <Link
                        to={href}
                        className="mt-10 inline-flex w-fit items-center justify-center bg-white px-8 py-4 font-semibold text-[#DC2626] transition-colors hover:bg-[#0A0F1E] hover:text-white"
                      >
                        {(active?.linkLabel && active.linkLabel.trim()) || "Continuar"} →
                      </Link>
                    </motion.div>
                    ) : null;
                  })()}
                </div>
                <ActiveIcon className="pointer-events-none absolute bottom-10 right-10 h-20 w-20 text-white/10" strokeWidth={1.6} />
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
