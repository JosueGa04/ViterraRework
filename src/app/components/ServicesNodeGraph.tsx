"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { serviceIconForKey, serviceOrbitAnglesDeg } from "../../lib/serviceIcons";
import { resolveServiceCardPrimaryHref } from "../../lib/serviceCardPrimaryHref";
import type { ServiceCardContent } from "../../data/siteContent";
import { usePreviewCanvas } from "../../contexts/PreviewCanvasContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { PreviewSectionChrome } from "./admin/siteEditor/PreviewSectionChrome";
import { cn } from "./ui/utils";

/** Misma marca mono que el header (sobre fondo corporativo rojo) */
const VITERRA_MARK_MONO = "/images/branding/viterra-mark-mono-alpha.png";

const VB = 520;
const CX = 260;
const CY = 260;

// Hexágono perfecto (viewBox units ~ px)
const RADIUS = 140;

// Movimiento mínimo opcional (solo respiración)
const WANDER_AMP = 6;

// Jerarquía de tamaños solicitada
const NODE_INACTIVE = 40;
const NODE_ACTIVE = 52;
const NODE_CENTER = 72;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function pointOnCircle(index: number, nodeCount: number) {
  const angles = serviceOrbitAnglesDeg(Math.max(nodeCount, 1));
  const deg = angles[index % angles.length] ?? 270;
  const a = degToRad(deg - 90);
  return {
    x: CX + RADIUS * Math.cos(a),
    y: CY + RADIUS * Math.sin(a),
  };
}

function wanderOffset(i: number, tSec: number) {
  const p = i * 1.37 + 0.2;
  const q = i * 1.91 + 0.6;
  const ox = WANDER_AMP * (0.55 * Math.sin(tSec * 0.18 + p) + 0.45 * Math.cos(tSec * 0.14 + q));
  const oy = WANDER_AMP * (0.55 * Math.cos(tSec * 0.16 + q) + 0.45 * Math.sin(tSec * 0.12 + p));
  return { ox, oy };
}

function layoutNode(i: number, cards: ServiceCardContent[], tSec: number, reduceMotion: boolean) {
  const nc = Math.max(cards.length, 1);
  const base = pointOnCircle(i, nc);
  if (reduceMotion) return { x: base.x, y: base.y };
  const { ox, oy } = wanderOffset(i, tSec);
  return { x: base.x + ox, y: base.y + oy };
}

function pct(v: number) {
  return `${(v / VB) * 100}%`;
}

function curvedPath(x1: number, y1: number, x2: number, y2: number, bend = 0.16) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const nx = -dy;
  const ny = dx;
  const len = Math.hypot(nx, ny) || 1;
  const c1x = mx + (nx / len) * (Math.hypot(dx, dy) * bend);
  const c1y = my + (ny / len) * (Math.hypot(dx, dy) * bend);
  return `M ${x1} ${y1} Q ${c1x} ${c1y} ${x2} ${y2}`;
}

function nodeDepth(y: number) {
  const t = Math.max(0, Math.min(1, (y - (CY - 220)) / 440));
  return {
    scale: 0.9 + t * 0.05,
    opacity: 0.72 + t * 0.08,
    blur: 0,
  };
}

/** Interpolación exponencial hacia el objetivo; `stiffness` ~10–18 da arrastre fluido a cualquier FPS */
function smoothScalar(from: number, to: number, dtSec: number, stiffness: number) {
  const a = 1 - Math.exp(-stiffness * dtSec);
  return from + (to - from) * a;
}

type LayoutPoint = { x: number; y: number };

type ServicesNodeGraphProps = {
  cards: ServiceCardContent[];
  reduceMotion?: boolean;
};

export function ServicesNodeGraph({ cards, reduceMotion }: ServicesNodeGraphProps) {
  const inPreview = usePreviewCanvas();
  const n = Math.max(cards.length, 1);
  const uid = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState<number | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const smoothRef = useRef<LayoutPoint[] | null>(null);
  const lastFrameMsRef = useRef<number | null>(null);
  const [smoothedLayouts, setSmoothedLayouts] = useState<LayoutPoint[]>(() => {
    const nn = Math.max(cards.length, 1);
    return cards.map((_, i) => layoutNode(i, cards, 0, !!reduceMotion));
  });

  /** Reset de posiciones cuando cambia el número de tarjetas o reduceMotion */
  useEffect(() => {
    const rm = !!reduceMotion;
    const list = cardsRef.current;
    if (list.length === 0) return;
    const init = list.map((_, i) => layoutNode(i, list, 0, rm));
    smoothRef.current = init;
    setSmoothedLayouts(init);
    lastFrameMsRef.current = null;
  }, [n, reduceMotion, cards.length]);

  /** Bucle: objetivo analítico + suavizado con Δt real (sin saltos “por frame”) */
  useEffect(() => {
    if (reduceMotion) return;

    const t0 = performance.now();
    let rafId = 0;
    let cancelled = false;
    const STIFF = 17;

    const tick = (now: number) => {
      if (cancelled) return;
      const c = cardsRef.current;
      const tSec = (now - t0) * 0.001;
      const targets = c.map((_, i) => layoutNode(i, c, tSec, false));

      let dt = 1 / 60;
      if (lastFrameMsRef.current != null) {
        dt = (now - lastFrameMsRef.current) / 1000;
        dt = Math.min(Math.max(dt, 1 / 240), 1 / 30);
      }
      lastFrameMsRef.current = now;

      const prev = smoothRef.current;
      const next: LayoutPoint[] = targets.map((tgt, i) => {
        const p = prev?.[i] ?? tgt;
        return {
          x: smoothScalar(p.x, tgt.x, dt, STIFF),
          y: smoothScalar(p.y, tgt.y, dt, STIFF),
        };
      });
      smoothRef.current = next;
      setSmoothedLayouts(next);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [reduceMotion, n]);

  useEffect(() => {
    if (cards.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex > cards.length - 1) {
      setSelectedIndex(0);
    }
  }, [cards.length, selectedIndex]);

  const activeCard = openIndex != null ? cards[openIndex] : null;
  const ActiveIcon = openIndex != null ? serviceIconForKey(cards[openIndex]?.iconKey ?? "building2") : serviceIconForKey("building2");
  const highlighted = hovered ?? selectedIndex;
  const highlightedCard = cards[highlighted] ?? cards[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      {/* Tablet+Mobile: pestañas horizontales (lista) */}
      <div className={cn(inPreview ? "mb-6 block overflow-x-auto" : "mb-6 lg:hidden overflow-x-auto")}>
        <div className="mb-6 overflow-x-auto">
          <div className="flex w-max items-center gap-6 px-2">
            {cards.map((card, i) => {
              const isActive = selectedIndex === i;
              const isHovered = hovered === i;
              return (
                <button
                  key={`tab-${card.title}-${i}`}
                  type="button"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelectedIndex(i)}
                  className="flex items-center gap-2 text-left"
                  aria-label={`Seleccionar servicio: ${card.title}`}
                >
                  <span
                    className="text-[10px] font-medium uppercase"
                    style={{
                      fontFamily:
                        "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace",
                      color: "#DC2626",
                      opacity: isActive ? 0.8 : 0.3,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("text-[13px] font-medium transition-colors", isActive || isHovered ? "text-white" : "text-white/70")}>
                    {card.title}
                  </span>
                  <span
                    aria-hidden
                    className="ml-2 h-[2px] w-4 bg-[#DC2626]"
                    style={{
                      opacity: isActive || isHovered ? 1 : 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid items-start gap-10",
          inPreview ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-[25%_40%_35%]"
        )}
      >
        {/* Desktop: lista vertical */}
        <div className={cn("w-[200px]", inPreview ? "hidden" : "hidden lg:block")}>
          <div>
            {cards.map((card, i) => {
              const isActive = selectedIndex === i;
              const isHovered = hovered === i;
              const isSep = i < cards.length - 1;
              return (
                <button
                  key={`list-${card.title}-${i}`}
                  type="button"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelectedIndex(i)}
                  className="relative w-[200px] py-4 pl-4 pr-2 text-left"
                  aria-label={`Seleccionar servicio: ${card.title}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: isSep ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#DC2626] transition-opacity"
                    style={{ opacity: isActive || isHovered ? 1 : 0.0 }}
                  />
                  <div
                    style={{
                      fontFamily:
                        "\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace",
                      letterSpacing: "0.08em",
                    }}
                    className="text-[10px] font-medium uppercase"
                  >
                    <span style={{ color: "#DC2626", opacity: isActive ? 0.8 : 0.3 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-2 text-[14px] font-medium transition-colors",
                      isActive || isHovered ? "text-white" : "text-white/70"
                    )}
                  >
                    {card.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Columna central: grafo */}
        <div className={cn(inPreview ? "block" : "hidden md:block")}>
          <div
            className="relative mx-auto min-h-[520px] w-full max-w-[860px] overflow-hidden bg-transparent p-1 sm:p-3 flex items-center justify-center"
            role="group"
            aria-label="Mapa blueprint de servicios"
          >
          {!reduceMotion ? (
            <>
              <motion.div
                className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/18 blur-3xl"
                animate={{ x: [0, 28, 0], y: [0, 10, 0], opacity: [0.38, 0.22, 0.38] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
              <motion.div
                className="pointer-events-none absolute -bottom-20 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
                animate={{ x: [0, -22, 0], y: [0, -18, 0], opacity: [0.22, 0.3, 0.22] }}
                transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden
              />
            </>
          ) : null}

          <div className="relative mx-auto aspect-square w-full max-w-[780px]">
            {/* Fondo blueprint: grid MUY sutil + radial rojo centrado */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:40px_40px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(220,38,38,0.08) 0%, transparent 70%)" }}
              aria-hidden
            />

            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
              <defs>
                <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
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
                <linearGradient id={`${uid}-line`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(148 163 184 / 0.05)" />
                  <stop offset="100%" stopColor="rgb(148 163 184 / 0.015)" />
                </linearGradient>
              </defs>

              {cards.map((_, i) => {
                const { x, y } = smoothedLayouts[i]!;
                const lit = selectedIndex === i;
                const d = curvedPath(CX, CY, x, y, 0.12);
                return (
                  <g key={`conn-${i}`}>
                    <path
                      d={d}
                      stroke="url(#redGradient)"
                      strokeOpacity={lit ? 1 : 0.3}
                      strokeWidth={1}
                      strokeLinecap="round"
                      fill="none"
                      style={{
                        transition: "stroke-width 240ms ease, stroke-opacity 240ms ease",
                        ...(lit && !reduceMotion ? { filter: `url(#${uid}-glow)` } : {}),
                      }}
                    />
                    {!reduceMotion ? (
                      <>
                        <circle r="3" fill="#DC2626" opacity={lit ? 1 : 0.6}>
                          <animateMotion dur="2s" repeatCount="indefinite" path={d} begin={`${(i * 0.22).toFixed(2)}s`} />
                        </circle>
                      </>
                    ) : null}
                  </g>
                );
              })}
            </svg>

            <div className="pointer-events-none absolute z-[2] flex items-center justify-center" style={{ left: pct(CX), top: pct(CY), transform: "translate(-50%, -50%)" }}>
              {!reduceMotion ? (
                <>
                  <motion.div
                    className="absolute h-[15.5rem] w-[15.5rem] rounded-full bg-[radial-gradient(circle,rgba(200,16,46,0.28)_0%,rgba(200,16,46,0.08)_38%,transparent_74%)]"
                    animate={{ scale: [1, 1.14, 1], opacity: [0.22, 0.52, 0.22] }}
                    transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute h-[14rem] w-[14rem] rounded-full border border-primary/35"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.12, 0.3] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              ) : null}
              <div
                className="relative flex items-center justify-center rounded-full bg-[#DC2626] shadow-[0_0_30px_rgba(220,38,38,0.4),0_0_60px_rgba(220,38,38,0.15)]"
                style={{ width: NODE_CENTER, height: NODE_CENTER, border: "2px solid #DC2626" }}
              >
                {!reduceMotion ? (
                  <>
                    <motion.div
                      className="pointer-events-none absolute rounded-full"
                      style={{ width: 100, height: 100, border: "1px solid rgba(220,38,38,0.4)" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      aria-hidden
                    />
                    <motion.div
                      className="pointer-events-none absolute rounded-full"
                      style={{ width: 130, height: 130, border: "1px dashed rgba(220,38,38,0.2)" }}
                      animate={{ rotate: -360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                      aria-hidden
                    />
                  </>
                ) : null}
                <img
                  src={VITERRA_MARK_MONO}
                  alt="Viterra"
                  width={512}
                  height={132}
                  decoding="async"
                  className="relative z-[1] h-[28px] w-auto object-contain opacity-100"
                />
              </div>
            </div>

            {cards.map((card, i) => {
              const { x, y } = smoothedLayouts[i]!;
              const Icon = serviceIconForKey(card.iconKey);
              const lit = selectedIndex === i;
              const isHovered = hovered === i;
              const depth = nodeDepth(y);
              return (
                <PreviewSectionChrome key={`${card.title}-${i}`} blockId={`services-card-${i}`} label={`Tarjeta ${i + 1}`}>
                  <div
                    className="absolute z-[5] overflow-visible"
                    style={{
                      left: pct(x),
                      top: pct(y),
                      transform: "translate(-50%, -50%)",
                      opacity: lit ? 1 : Math.min(0.8, depth.opacity),
                      filter: lit ? "none" : `blur(${depth.blur}px)`,
                    }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => setSelectedIndex(i)}
                      onDoubleClick={() => setOpenIndex(i)}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => {
                        setHovered(i);
                        setSelectedIndex(i);
                      }}
                      onBlur={() => setHovered(null)}
                      whileHover={reduceMotion ? undefined : { scale: 1.1 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 340, damping: 24 }}
                      aria-haspopup="dialog"
                      aria-expanded={openIndex === i}
                      aria-label={`Seleccionar servicio: ${card.title}`}
                      className={cn(
                        "group pointer-events-auto relative flex items-center justify-center rounded-full transition-all",
                        lit ? "bg-[#DC2626] text-white" : "bg-[rgba(255,255,255,0.04)]",
                      )}
                      style={{
                        width: lit ? NODE_ACTIVE : NODE_INACTIVE,
                        height: lit ? NODE_ACTIVE : NODE_INACTIVE,
                        transform: `translateZ(0) scale(${lit ? 1 : depth.scale})`,
                        border: lit
                          ? "1px solid #DC2626"
                          : isHovered
                            ? "1px solid rgba(220,38,38,0.8)"
                            : "1px solid rgba(220,38,38,0.25)",
                        transition: "all 0.25s ease",
                        boxShadow: lit
                          ? "0 0 18px rgba(220,38,38,0.35)"
                          : isHovered
                            ? "0 0 12px rgba(220,38,38,0.3)"
                            : "none",
                      }}
                    >
                      {!reduceMotion && lit ? (
                        <span className="pointer-events-none absolute inset-0 rounded-full">
                          <span className="absolute inset-0 rounded-full bg-[#DC2626]/25 animate-ping" />
                        </span>
                      ) : null}
                      {lit ? (
                        <motion.span
                          layoutId="active-node-ring"
                          className="absolute inset-0 rounded-full ring-1 ring-white/35"
                          transition={{ type: "spring", stiffness: 320, damping: 26 }}
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          lit ? "h-[22px] w-[22px] text-white" : "h-[18px] w-[18px]",
                          !lit && isHovered ? "text-white" : !lit ? "text-white/50" : "",
                        )}
                        style={{ transition: "all 0.25s ease" }}
                        strokeWidth={1.6}
                        aria-hidden
                      />
                    </motion.button>
                  </div>
                </PreviewSectionChrome>
              );
            })}
          </div>
          </div>
        </div>

        {/* Columna derecha: panel */}
        <AnimatePresence mode="wait">
          {highlightedCard ? (
            <motion.aside
              key={`service-side-${highlighted}`}
              initial={reduceMotion ? false : { opacity: 0, x: 20 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -16 }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "relative overflow-hidden bg-[#0A0F1E]/88 px-12 py-9",
                inPreview && "px-6 py-7"
              )}
            >
              {/* Separador vertical: gradiente (transparent → rojo → transparent) */}
              <div
                className="pointer-events-none absolute left-0 top-0 h-full w-px"
                style={{
                  background: "linear-gradient(to bottom, transparent 0%, #DC2626 50%, transparent 100%)",
                  opacity: 0.9,
                }}
                aria-hidden
              />
              <div className="pointer-events-none absolute -top-14 right-0 h-40 w-40 rounded-full bg-primary/12 blur-2xl" aria-hidden />
              <div className="relative z-[1]">
                <div className="mb-4 flex items-center gap-3">
                  <span className="relative inline-flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DC2626]/40" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#DC2626]" />
                  </span>
                  <span
                    className="text-[10px] uppercase"
                    style={{
                      color: "#DC2626",
                      letterSpacing: "0.28em",
                      fontFamily: "\"Poppins\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
                    }}
                  >
                    ACTIVE NODE
                  </span>
                </div>
                {/* Watermark de índice */}
                <div
                  className="pointer-events-none absolute right-6 top-4 select-none"
                  style={{
                    fontSize: 180,
                    lineHeight: 1,
                    color: "rgba(255,255,255,0.03)",
                    zIndex: 0,
                  }}
                  aria-hidden
                >
                  {String(highlighted + 1).padStart(2, "0")}
                </div>
                <h3 className="font-heading text-[42px] leading-[1.02] text-white sm:text-[48px]" style={{ letterSpacing: "-0.02em" }}>
                  {highlightedCard.title}
                </h3>
                <p className="font-heading mt-5 text-[15px] font-light leading-[1.6] text-white/70">
                  {highlightedCard.description}
                </p>
                <ul className="mt-6 grid gap-3">
                  {(highlightedCard.bullets ?? []).map((b) => (
                    <li key={b} className="font-heading flex items-start gap-3 text-sm text-white/78">
                      <span className="mt-1.5 h-2 w-2 shrink-0 bg-primary" aria-hidden />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
                {(() => {
                  const href = resolveServiceCardPrimaryHref(highlightedCard);
                  return href ? (
                  <Link
                    to={href}
                    className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-primary px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-primary"
                    style={{
                      fontFamily: "\"Poppins\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
                      borderRadius: 0,
                      borderLeft: "3px solid #991B1B",
                      padding: "16px 32px",
                      textDecoration: "none",
                    }}
                  >
                    {(highlightedCard.linkLabel && highlightedCard.linkLabel.trim()) || "Continuar"}{" "}
                    <span aria-hidden>→</span>
                  </Link>
                  ) : (
                  <button
                    type="button"
                    onClick={() => setOpenIndex(highlighted)}
                    className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-primary px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-primary"
                    style={{
                      fontFamily: "\"Poppins\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
                      borderRadius: 0,
                      borderLeft: "3px solid #991B1B",
                      padding: "16px 32px",
                    }}
                  >
                    Ver detalle completo <span aria-hidden>→</span>
                  </button>
                  );
                })()}
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      </div>

      <Dialog open={openIndex != null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-h-[min(88dvh,640px)] gap-0 overflow-y-auto border-brand-navy/10 p-0 sm:max-w-lg">
          {activeCard && openIndex != null ? (
            <>
              <DialogHeader className="border-b border-brand-navy/[0.08] bg-brand-canvas/50 px-6 pb-4 pt-6 text-left sm:px-8 sm:pb-5 sm:pt-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-brand-navy/10">
                    <ActiveIcon className="h-6 w-6 text-primary" strokeWidth={1.5} aria-hidden />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-heading text-[11px] font-semibold uppercase tracking-wider text-primary">Servicio</p>
                    <DialogTitle className="font-heading mt-1 text-balance text-xl font-light leading-snug text-brand-navy sm:text-2xl">
                      {activeCard.title}
                    </DialogTitle>
                  </div>
                </div>
                <DialogDescription className="sr-only">{activeCard.description}</DialogDescription>
              </DialogHeader>
              <div className="px-6 py-6 sm:px-8 sm:py-7">
                <p className="font-heading text-pretty text-sm leading-relaxed text-brand-navy/75 font-light sm:text-base">
                  {activeCard.description}
                </p>
                <p className="font-heading mb-2.5 mt-6 text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                  Incluye
                </p>
                <ul className="mb-8 grid gap-2">
                  {(activeCard.bullets ?? []).map((b) => (
                    <li
                      key={b}
                      className="font-heading flex items-start gap-2.5 rounded-xl border border-brand-navy/[0.06] bg-brand-canvas/40 px-3.5 py-2.5 text-sm text-brand-navy/80"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="font-light leading-snug">{b}</span>
                    </li>
                  ))}
                </ul>
                {(() => {
                  const href = resolveServiceCardPrimaryHref(activeCard);
                  return href ? (
                  <Link
                    to={href}
                    onClick={() => setOpenIndex(null)}
                    className="font-heading inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy px-5 py-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-burgundy sm:w-auto sm:min-w-[12rem]"
                  >
                    {(activeCard.linkLabel && activeCard.linkLabel.trim()) || "Conocer más"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  ) : null;
                })()}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
