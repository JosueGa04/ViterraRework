"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePreviewCanvas } from "../../contexts/PreviewCanvasContext";
import { useVisualSiteEditorOptional } from "../../contexts/VisualSiteEditorContext";
import { PreviewFieldPulse } from "./admin/siteEditor/PreviewFieldPulse";
import { PreviewSectionChrome } from "./admin/siteEditor/PreviewSectionChrome";
import { useSiteContent } from "../../contexts/SiteContentContext";
import { mergeSiteSection } from "../../lib/siteContentMerge";
import { resolveServiceCardPrimaryHref } from "../../lib/serviceCardPrimaryHref";
import { serviceIconForKey, serviceOrbitAnglesDeg } from "../../lib/serviceIcons";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Phone, Mail, MessageCircle, Link2 } from "lucide-react";

const FONT_TITLE = '"Poppins", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
const FONT_UI = '"Poppins", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
const FONT_MONO = '"Poppins", ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';

const TOKENS = {
  bg: "#0C1220",
  panel: "#111827",
  nodeInactive: "rgba(245,245,240,0.04)",
  nodeBorder: "rgba(245,245,240,0.15)",
  red: "#C41E3A",
  text: "#F5F5F0",
  muted: "rgba(245,245,240,0.72)",
  border: "rgba(245,245,240,0.08)",
};

const CONTAINER = 500;
const CENTER = CONTAINER / 2;
const RADIUS = 170;
const NODE_DIAM = 48;
const NODE_R = NODE_DIAM / 2;
const RETURN_NODE_DIAM = 64;

function servicePanelContactIcon(icon) {
  switch (icon) {
    case "mail":
      return Mail;
    case "phone":
      return Phone;
    case "link":
      return Link2;
    default:
      return MessageCircle;
  }
}

/** Texto del enlace en el panel: con teléfono muestra el número (y la etiqueta si existe). */
function panelContactLinkCaption(link) {
  if (link.icon === "phone") {
    const h = (link.href ?? "").trim();
    const n = h.toLowerCase().startsWith("tel:") ? h.slice(4).trim() : "";
    const lab = (link.label ?? "").trim();
    if (lab && n) return `${lab} · ${n}`;
    if (n) return n;
    return lab || "Teléfono";
  }
  return (link.label ?? "").trim() || "Enlace";
}

/** Marca del nodo central y del estado vacío (`public/images/branding/…`). */
const VITERRA_MARK_MONO_PNG = "/images/branding/viterra-mark-mono-alpha.png";

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}
function nodeCenter(angleDeg, orbitR = RADIUS, gc = CENTER) {
  const a = degToRad(angleDeg - 90);
  return {
    x: gc + orbitR * Math.cos(a),
    y: gc + orbitR * Math.sin(a),
  };
}

function nodeEdge(angleDeg, orbitR = RADIUS, gc = CENTER) {
  const a = degToRad(angleDeg - 90);
  const d = orbitR - NODE_R;
  return {
    x: gc + d * Math.cos(a),
    y: gc + d * Math.sin(a),
  };
}

function nodeEdgeByRadius(angleDeg, nodeRadius, orbitR = RADIUS, gc = CENTER) {
  const a = degToRad(angleDeg - 90);
  const d = orbitR - nodeRadius;
  return {
    x: gc + d * Math.cos(a),
    y: gc + d * Math.sin(a),
  };
}

function buildOrbitArc(fromAngle, toAngle, directionHint = null, orbitR = RADIUS, gc = CENTER) {
  const from = nodeCenter(fromAngle, orbitR, gc);
  const to = nodeCenter(toAngle, orbitR, gc);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const side = directionHint === -1 ? -1 : 1;
  const bend = Math.min(56, Math.max(26, len * 0.18)) * side;

  // Curva Bezier suave para un desplazamiento más natural (sin órbita circular completa)
  const c1 = { x: from.x + dx * 0.33 + nx * bend, y: from.y + dy * 0.33 + ny * bend };
  const c2 = { x: from.x + dx * 0.66 + nx * bend * 0.78, y: from.y + dy * 0.66 + ny * bend * 0.78 };
  const steps = 16;
  const points = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    const x =
      mt * mt * mt * from.x +
      3 * mt * mt * t * c1.x +
      3 * mt * t * t * c2.x +
      t * t * t * to.x;
    const y =
      mt * mt * mt * from.y +
      3 * mt * mt * t * c1.y +
      3 * mt * t * t * c2.y +
      t * t * t * to.y;
    points.push({ x, y });
  }

  return points;
}

export function ServicesSection() {
  const inPreview = usePreviewCanvas();
  const { content } = useSiteContent();
  const mergedSvc = useMemo(() => mergeSiteSection("services", content.services), [content.services]);
  const SERVICES = useMemo(
    () =>
      mergedSvc.cards.map((c, i) => ({
        id: i + 1,
        index: String(i + 1).padStart(2, "0"),
        tag: (c.tag ?? "").trim(),
        name: c.title,
        description: c.description,
        benefits: Array.isArray(c.bullets) && c.bullets.length > 0 ? [...c.bullets] : [""],
        icon: serviceIconForKey(c.iconKey),
        slug: c.slug,
        linkLabel: (c.linkLabel ?? "").trim() || "Conocer más",
        ctaLink: resolveServiceCardPrimaryHref(c),
        contactLinks: Array.isArray(c.contactLinks) ? c.contactLinks : [],
      })),
    [mergedSvc.cards],
  );
  const ANGLES = useMemo(() => serviceOrbitAnglesDeg(SERVICES.length), [SERVICES.length]);

  /** Radio y lienzo dinámicos: más nodos → órbita más grande y scroll horizontal si hace falta. */
  const orbitLayout = useMemo(() => {
    const n = Math.max(SERVICES.length, 1);
    const MIN_CHORD = 88;
    let orbitR = RADIUS;
    if (n > 1) {
      orbitR = Math.min(252, Math.max(RADIUS, MIN_CHORD / (2 * Math.sin(Math.PI / n))));
    }
    const labelPad = 96;
    const halfExtent = Math.ceil(orbitR + NODE_R + labelPad);
    const canvas = Math.max(CONTAINER, halfExtent * 2);
    const gc = canvas / 2;
    return { orbitR, canvas, gc };
  }, [SERVICES.length]);

  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  const [activeIndex, setActiveIndex] = useState(0);
  const visualEditor = useVisualSiteEditorOptional();
  const editorCardIndex = useMemo(() => {
    if (!visualEditor?.enabled || !visualEditor.activeBlockId) return null;
    const m = /^services-card-(\d+)$/.exec(visualEditor.activeBlockId);
    return m ? Number(m[1]) : null;
  }, [visualEditor?.enabled, visualEditor?.activeBlockId]);
  const [swappedIndex, setSwappedIndex] = useState(null); // nodo de servicio que intercambia lugar con Viterra
  const [clickFx, setClickFx] = useState({ key: 0, x: CENTER, y: CENTER });
  const [returnPathAnim, setReturnPathAnim] = useState(null);
  const prevSwappedRef = useRef(null);
  const navDirectionRef = useRef(null);
  const isCompactLayout = inPreview || viewportWidth < 1024;
  const active = activeIndex !== null ? SERVICES[activeIndex] : null;
  const ActiveCenterIcon = active?.icon;
  const isSwapped = swappedIndex !== null;
  const graphTargetIndex = activeIndex;
  const graphScale = useMemo(() => {
    if (!isCompactLayout) return 1;
    const basis = inPreview ? Math.min(viewportWidth, 560) : viewportWidth;
    const safeWidth = Math.max(300, basis - 48);
    return Math.max(0.62, Math.min(1, safeWidth / orbitLayout.canvas));
  }, [isCompactLayout, viewportWidth, inPreview, orbitLayout.canvas]);
  const graphShellSize = orbitLayout.canvas * graphScale;

  const activeId = active?.id ?? "none";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const n = SERVICES.length;
    if (n <= 0) return;
    setActiveIndex((i) => Math.min(Math.max(0, i ?? 0), n - 1));
  }, [SERVICES.length]);

  useEffect(() => {
    if (editorCardIndex === null || !Number.isFinite(editorCardIndex)) return;
    const n = SERVICES.length;
    if (n <= 0) return;
    const clamped = Math.min(Math.max(0, editorCardIndex), n - 1);
    setActiveIndex((cur) => (cur === clamped ? cur : clamped));
  }, [editorCardIndex, SERVICES.length]);

  useEffect(() => {
    if (swappedIndex === null) {
      prevSwappedRef.current = null;
      setReturnPathAnim(null);
      return;
    }

    const prevIdx = prevSwappedRef.current;
    if (prevIdx !== null && prevIdx !== swappedIndex) {
      const fromAngle = ANGLES[prevIdx] ?? 270;
      const toAngle = ANGLES[swappedIndex] ?? 270;
      const arcPoints = buildOrbitArc(fromAngle, toAngle, navDirectionRef.current, orbitLayout.orbitR, orbitLayout.gc);
      setReturnPathAnim({
        points: arcPoints,
        key: Date.now(),
      });
    } else {
      setReturnPathAnim(null);
    }

    navDirectionRef.current = null;
    prevSwappedRef.current = swappedIndex;
  }, [swappedIndex, ANGLES, orbitLayout.orbitR, orbitLayout.gc]);

  const shiftService = (direction) => {
    navDirectionRef.current = direction;
    const base = activeIndex ?? 0;
    const nextIndex = (base + direction + SERVICES.length) % SERVICES.length;
    setActiveIndex(nextIndex);
    visualEditor?.setActiveBlockId?.(`services-card-${nextIndex}`);
    const p = nodeCenter(ANGLES[nextIndex] ?? 270, orbitLayout.orbitR, orbitLayout.gc);
    setClickFx({ key: Date.now(), x: p.x, y: p.y });
  };

  const prev = () => shiftService(-1);
  const next = () => shiftService(1);

  const selectServiceFromFooter = (targetIndex) => {
    const current = activeIndex ?? 0;
    const cwSteps = (targetIndex - current + SERVICES.length) % SERVICES.length;
    const ccwSteps = (current - targetIndex + SERVICES.length) % SERVICES.length;
    navDirectionRef.current = cwSteps <= ccwSteps ? 1 : -1;

    setActiveIndex(targetIndex);
    visualEditor?.setActiveBlockId?.(`services-card-${targetIndex}`);
    const p = nodeCenter(ANGLES[targetIndex] ?? 270, orbitLayout.orbitR, orbitLayout.gc);
    setClickFx({ key: Date.now(), x: p.x, y: p.y });
  };

  return (
    <section
      style={{
        height: "auto",
        minHeight: inPreview
          ? "min(720px, calc(100dvh - var(--viterra-sticky-header-offset, 72px) - 24px))"
          : "calc(100dvh - var(--viterra-sticky-header-offset, 72px) - 24px)",
        width: "100%",
        background: "#FFFFFF",
        marginTop: 0,
        marginBottom: 0,
      }}
      className="relative overflow-x-hidden"
    >
      {/* Fonts (sin tocar otros archivos) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
      `}</style>

      {/* BODY: 2 columns */}
      <div
        className="services-grid grid"
        style={{
          gridTemplateColumns: inPreview ? "1fr" : "50% 50%",
          height: "auto",
          minHeight: inPreview
            ? "min(720px, calc(100dvh - var(--viterra-sticky-header-offset, 72px) - 24px))"
            : "calc(100dvh - var(--viterra-sticky-header-offset, 72px) - 24px)",
        }}
      >
        {/* COLUMN A */}
        <aside
          style={{
            background: "#FFFFFF",
            borderRight: "none",
            position: "relative",
            overflowX: "auto",
            overflowY: "hidden",
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Radial glow centered on hub */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: 480,
              height: 480,
              borderRadius: 9999,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, rgba(185,28,28,0.08) 0%, transparent 65%)",
              zIndex: 0,
              pointerEvents: "none",
            }}
          />

          {/* graph canvas */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: isCompactLayout ? Math.max(320, graphShellSize + 26) : undefined,
              padding: isCompactLayout ? "24px 8px 14px 8px" : "20px 8px 12px 8px",
              overflowX: "auto",
              overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div
              style={{
                position: "relative",
                width: orbitLayout.canvas,
                height: orbitLayout.canvas,
                minWidth: orbitLayout.canvas,
                minHeight: orbitLayout.canvas,
                overflow: "visible",
                transform: `scale(${graphScale})`,
                transformOrigin: "center center",
              }}
            >
              <svg
                aria-hidden
                style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
                viewBox={`0 0 ${orbitLayout.canvas} ${orbitLayout.canvas}`}
              >
                <defs>
                  {SERVICES.map((_, i) => {
                    const angle = ANGLES[i] ?? 270;
                    const nc = nodeCenter(angle, orbitLayout.orbitR, orbitLayout.gc);
                    return (
                      <g key={`grad-${i}`}>
                        <linearGradient
                          id={`lineInactiveGrad-${i}`}
                          gradientUnits="userSpaceOnUse"
                          x1={orbitLayout.gc}
                          y1={orbitLayout.gc}
                          x2={nc.x}
                          y2={nc.y}
                        >
                          <stop offset="0%" stopColor="#B91C1C" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#B91C1C" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient
                          id={`lineActiveGrad-${i}`}
                          gradientUnits="userSpaceOnUse"
                          x1={orbitLayout.gc}
                          y1={orbitLayout.gc}
                          x2={nc.x}
                          y2={nc.y}
                        >
                          <stop offset="0%" stopColor="#B91C1C" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#B91C1C" stopOpacity={0.2} />
                        </linearGradient>
                      </g>
                    );
                  })}
                </defs>

                {graphTargetIndex !== null ? (() => {
                  const e =
                    isSwapped && graphTargetIndex === swappedIndex
                      ? nodeEdgeByRadius(ANGLES[graphTargetIndex] ?? 270, RETURN_NODE_DIAM / 2, orbitLayout.orbitR, orbitLayout.gc)
                      : nodeEdge(ANGLES[graphTargetIndex] ?? 270, orbitLayout.orbitR, orbitLayout.gc);
                  const activeD = `M ${orbitLayout.gc} ${orbitLayout.gc} L ${e.x} ${e.y}`;
                  return (
                    <path id="activePath" d={activeD} fill="none" stroke="none" strokeWidth={0} pointerEvents="none" />
                  );
                })() : null}

                {SERVICES.map((_, idx) => {
                  const angle = ANGLES[idx] ?? 270;
                  const edge = nodeEdge(angle, orbitLayout.orbitR, orbitLayout.gc);
                  const isActive = graphTargetIndex !== null && idx === graphTargetIndex;
                  const gradId = isActive ? `lineActiveGrad-${idx}` : `lineInactiveGrad-${idx}`;
                  return (
                    <motion.line
                      key={`l-${idx}`}
                      x1={orbitLayout.gc}
                      y1={orbitLayout.gc}
                      x2={edge.x}
                      y2={edge.y}
                      stroke={`url(#${gradId})`}
                      strokeWidth={isActive ? 1.5 : 1}
                      strokeLinecap="round"
                      initial={false}
                      animate={{ strokeOpacity: isActive ? 0.95 : 0.32 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                  );
                })}

                {graphTargetIndex !== null ? (
                  <circle key={graphTargetIndex} r={2} fill="#B91C1C">
                    <animateMotion dur="4.4s" repeatCount="indefinite" rotate="auto">
                      <mpath href="#activePath" />
                    </animateMotion>
                  </circle>
                ) : null}
              </svg>

              {/* Center node */}
              <motion.button
                key={`center-node-${swappedIndex ?? "base"}-${graphTargetIndex ?? "none"}`}
                type="button"
                onClick={() => {
                  if (isSwapped) {
                    setSwappedIndex(null);
                    setActiveIndex(null);
                    setClickFx({ key: Date.now(), x: orbitLayout.gc, y: orbitLayout.gc });
                    return;
                  }
                  if (!isSwapped) {
                    setActiveIndex(null);
                  }
                }}
                aria-label="Viterra nodo central"
                style={{
                  position: "absolute",
                  left: orbitLayout.gc - 44,
                  top: orbitLayout.gc - 44,
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  background: "#B91C1C",
                  boxShadow: isSwapped
                    ? "0 0 0 10px rgba(185,28,28,0.16), 0 0 0 20px rgba(185,28,28,0.08), 0 0 26px rgba(185,28,28,0.35)"
                    : "0 0 0 8px rgba(185,28,28,0.12), 0 0 0 16px rgba(185,28,28,0.06)",
                  zIndex: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
                initial={{ opacity: 0.9, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: [1, 1.08, 1], rotate: [0, -3, 0] }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {/* Ring 1 */}
                <div
                  className="ne-empty-glow"
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 100,
                    height: 100,
                    marginLeft: -50,
                    marginTop: -50,
                    borderRadius: "50%",
                    border: "1px solid rgba(185,28,28,0.25)",
                    animation: "neSpin 14s linear infinite",
                    transformOrigin: "50% 50%",
                    pointerEvents: "none",
                  }}
                />
                {/* Ring 2 + diamonds */}
                <div
                  className="ne-empty-line ne-empty-line--top"
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 132,
                    height: 132,
                    marginLeft: -66,
                    marginTop: -66,
                    borderRadius: "50%",
                    border: "1px dashed rgba(185,28,28,0.12)",
                    animation: "neSpin 22s linear infinite reverse",
                    transformOrigin: "50% 50%",
                    pointerEvents: "none",
                  }}
                >
                  {[0, 90, 180, 270].map((deg) => {
                    const rad = (deg * Math.PI) / 180;
                    const R = 62;
                    const cx = 66;
                    const cy = 66;
                    const x = cx + R * Math.cos(rad) - 2;
                    const y = cy + R * Math.sin(rad) - 2;
                    return (
                      <div
                        key={deg}
                        style={{
                          position: "absolute",
                          left: x,
                          top: y,
                          width: 4,
                          height: 4,
                          background: "rgba(185,28,28,0.5)",
                          transform: "rotate(45deg)",
                        }}
                      />
                    );
                  })}
                </div>
                <motion.div
                  key={`center-icon-${isSwapped ? `service-${swappedIndex}` : `logo-${activeIndex ?? "none"}`}`}
                  initial={{ opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {!isSwapped ? (
                    <img
                      src={VITERRA_MARK_MONO_PNG}
                      alt=""
                      width={1024}
                      height={264}
                      decoding="async"
                      style={{
                        width: 62,
                        height: 62,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <ActiveCenterIcon size={56} color="#FFFFFF" strokeWidth={2.2} />
                  )}
                </motion.div>
              </motion.button>

              {/* Service nodes */}
              {SERVICES.map((s, i) => {
                const angle = ANGLES[i] ?? 270;
                const p = nodeCenter(angle, orbitLayout.orbitR, orbitLayout.gc);
                const isReturnNode = false;
                const nodeSize = NODE_DIAM;
                const isActive = graphTargetIndex !== null && i === graphTargetIndex;
                const isArrivalTarget = graphTargetIndex !== null && i === graphTargetIndex;
                const tipDx = p.x - orbitLayout.gc;
                const tipDy = p.y - orbitLayout.gc;
                const tipLen = Math.hypot(tipDx, tipDy) || 1;
                const tipUx = tipDx / tipLen;
                const tipUy = tipDy / tipLen;
                const tipDist = 62;
                const editorNodeSelected =
                  visualEditor?.enabled && visualEditor.activeBlockId === `services-card-${i}`;

                return (
                  <motion.div
                    key={isReturnNode ? "return-viterra-node" : s.id}
                    className="ne-nodewrap"
                    style={{
                      position: "absolute",
                      left:
                        isReturnNode && returnPathAnim
                          ? returnPathAnim.points[0].x - nodeSize / 2
                          : p.x - nodeSize / 2,
                      top:
                        isReturnNode && returnPathAnim
                          ? returnPathAnim.points[0].y - nodeSize / 2
                          : p.y - nodeSize / 2,
                      zIndex: editorNodeSelected ? 8 : 4,
                    }}
                    animate={
                      isReturnNode && returnPathAnim
                        ? {
                            left: returnPathAnim.points.map((pt) => pt.x - nodeSize / 2),
                            top: returnPathAnim.points.map((pt) => pt.y - nodeSize / 2),
                          }
                        : { left: p.x - nodeSize / 2, top: p.y - nodeSize / 2 }
                    }
                    transition={
                      isReturnNode && returnPathAnim
                        ? { duration: 0.72, ease: [0.22, 0.61, 0.36, 1] }
                        : { type: "spring", stiffness: 220, damping: 20, mass: 0.6 }
                    }
                    onAnimationComplete={() => {
                      if (isReturnNode && returnPathAnim) setReturnPathAnim(null);
                    }}
                  >
                    <PreviewSectionChrome
                      blockId={`services-card-${i}`}
                      label={`Tarjeta ${i + 1}`}
                      compact
                      hideLabel
                    >
                      <div
                        style={{
                          position: "relative",
                          width: nodeSize,
                          height: nodeSize,
                          overflow: "visible",
                        }}
                      >
                        <motion.button
                          type="button"
                          className={`ne-snode${isActive ? " ne-snode--active" : ""}${isArrivalTarget ? " ne-snode--arrival-pulse" : ""}`}
                          onClick={() => {
                            setActiveIndex(i);
                            visualEditor?.setActiveBlockId?.(`services-card-${i}`);
                            setSwappedIndex(null);
                            setClickFx({ key: Date.now(), x: p.x, y: p.y });
                          }}
                          aria-label={`Servicio ${s.index}`}
                          initial={{ opacity: 0, scale: 0.6 }}
                          whileHover={
                            isActive
                              ? {}
                              : {
                                  scale: 1.08,
                                  backgroundColor: "rgba(185,28,28,0.1)",
                                  borderColor: "rgba(185,28,28,0.5)",
                                  boxShadow: "0 0 14px rgba(185,28,28,0.2)",
                                }
                          }
                          animate={{
                            opacity: 1,
                            scale: isActive ? [1, 1.1, 1] : 1,
                            backgroundColor: isActive ? "#B91C1C" : "rgba(15,23,42,0.08)",
                            borderColor: isActive ? "#B91C1C" : "rgba(15,23,42,0.28)",
                            boxShadow: isActive
                              ? "0 0 0 3px rgba(185,28,28,0.14), 0 0 16px rgba(185,28,28,0.28)"
                              : "0 0 0 0 rgba(0,0,0,0)",
                          }}
                          transition={{
                            opacity: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
                            scale: isActive
                              ? { duration: 0.35, ease: "easeOut" }
                              : { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
                            backgroundColor: { duration: 0.2, ease: "easeOut" },
                            borderColor: { duration: 0.2, ease: "easeOut" },
                            boxShadow: { duration: 0.25, ease: "easeOut" },
                          }}
                          style={{
                            position: "relative",
                            width: nodeSize,
                            height: nodeSize,
                            borderRadius: 8,
                            border: "1px solid rgba(15,23,42,0.28)",
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                            backdropFilter: "blur(4px)",
                            WebkitBackdropFilter: "blur(4px)",
                          }}
                        >
                          {isActive ? (
                            <span
                              className="ne-snode-pulse"
                              aria-hidden
                              style={{
                                position: "absolute",
                                top: -3,
                                right: -3,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: "#ffffff",
                                border: "1.5px solid #B91C1C",
                                pointerEvents: "none",
                              }}
                            />
                          ) : null}
                          <PreviewFieldPulse
                            blockId={`services-card-${i}`}
                            fieldKey={`services-card-${i}-icon`}
                            className="inline-flex"
                          >
                            <s.icon
                              className="ne-snode-icon"
                              size={18}
                              style={{
                                color: isActive ? "#ffffff" : "rgba(15,23,42,0.68)",
                                transition: "color 0.2s ease",
                              }}
                            />
                          </PreviewFieldPulse>
                        </motion.button>

                        <div
                          className="ne-tip"
                          style={{ transform: `translate(-50%, -50%) translate(${tipUx * tipDist}px, ${tipUy * tipDist}px)` }}
                        >
                          {s.name}
                        </div>
                      </div>
                    </PreviewSectionChrome>
                  </motion.div>
                );
              })}

              <motion.span
                key={`clickfx-${clickFx.key}`}
                initial={{ opacity: 0.45, scale: 0.35 }}
                animate={{ opacity: 0, scale: 1.55 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  left: clickFx.x,
                  top: clickFx.y,
                  width: 54,
                  height: 54,
                  borderRadius: 10,
                  border: "1px solid rgba(185,28,28,0.55)",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                  zIndex: 7,
                }}
              />
            </div>
          </div>

          <footer
            style={{
              height: 52,
              background: "#0A1628",
              borderTop: `1px solid ${TOKENS.border}`,
              padding: "0 clamp(16px, 3vw, 36px)",
              flexShrink: 0,
            }}
            className="flex items-center"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap", overflowX: "auto", width: "100%" }}>
              {SERVICES.map((s, i) => {
                const isActive = i === activeIndex;
                const short = s.name.split(" ")[0] ?? s.name;
                return (
                  <span key={`seg-left-${s.id}`} style={{ display: "inline-flex", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => selectServiceFromFooter(i)}
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 9,
                        color: isActive ? TOKENS.text : TOKENS.muted,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        letterSpacing: "0.02em",
                        padding: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      · {short}
                    </button>
                    {i < SERVICES.length - 1 ? <span style={{ color: "rgba(255,255,255,0.12)", marginLeft: 10 }}>|</span> : null}
                  </span>
                );
              })}
            </div>
          </footer>

          {/* Keyframes + graph-only UI */}
          <style>{`
            @keyframes neSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes nodePulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.4); opacity: 0.5; }
            }
            @keyframes nodeArrivalPulse {
              0%, 84% {
                box-shadow: 0 0 0 4px rgba(185,28,28,0.15), 0 0 20px rgba(185,28,28,0.35);
              }
              90% {
                box-shadow: 0 0 0 5px rgba(185,28,28,0.2), 0 0 26px rgba(185,28,28,0.44);
              }
              100% {
                box-shadow: 0 0 0 4px rgba(185,28,28,0.15), 0 0 20px rgba(185,28,28,0.35);
              }
            }
            .ne-snode {
              transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background-color 0.25s ease;
            }
            .ne-snode:hover:not(.ne-snode--active) {
              transform: translateY(-3px) scale(1.1) rotate(-1deg);
              background: rgba(185,28,28,0.1) !important;
              border-color: rgba(185,28,28,0.5) !important;
              box-shadow: 0 10px 20px rgba(185,28,28,0.22), 0 0 14px rgba(185,28,28,0.22);
            }
            .ne-snode:hover:not(.ne-snode--active) .ne-snode-icon {
              color: #1a2744 !important;
              transform: scale(1.07);
            }
            .ne-snode-pulse {
              animation: nodePulse 2s ease infinite;
            }
            .ne-snode--arrival-pulse {
              animation: nodeArrivalPulse 4.4s ease-in-out infinite;
            }
            .ne-return-base {
              position: absolute;
              left: 50%;
              top: 50%;
              pointer-events: none;
              border-radius: 6px;
              transform: translate(-50%, -50%) rotate(0deg);
              opacity: 0.34;
              filter: blur(0.25px);
            }
            .ne-return-base--a {
              width: 86px;
              height: 86px;
              border: 1px solid rgba(230, 48, 48, 0.2);
              animation: neReturnBaseSpin 14s linear infinite;
            }
            .ne-return-base--b {
              width: 78px;
              height: 78px;
              border: 1px dashed rgba(230, 48, 48, 0.16);
              animation: neReturnBaseSpinRev 18s linear infinite;
            }
            @keyframes neReturnBaseSpin {
              from { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.22; }
              50% { opacity: 0.36; }
              to { transform: translate(-50%, -50%) rotate(360deg); opacity: 0.22; }
            }
            @keyframes neReturnBaseSpinRev {
              from { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.16; }
              50% { opacity: 0.28; }
              to { transform: translate(-50%, -50%) rotate(-360deg); opacity: 0.16; }
            }
            .ne-tip {
              position: absolute;
              left: 50%;
              top: 50%;
              right: auto;
              bottom: auto;
              background: rgba(255,255,255,0.96);
              border: 1px solid rgba(15,23,42,0.24);
              color: rgba(15,23,42,0.92);
              font-size: 11px;
              font-family: inherit;
              font-weight: 600;
              letter-spacing: 0.04em;
              padding: 6px 10px;
              border-radius: 4px;
              text-align: center;
              line-height: 1.25;
              width: max-content;
              max-width: min(200px, 46vw);
              white-space: normal;
              overflow-wrap: break-word;
              word-break: normal;
              pointer-events: none;
              z-index: 50;
              opacity: 0;
              transition: opacity 0.15s ease;
              box-shadow: 0 4px 14px rgba(15,23,42,0.08);
            }
            .ne-nodewrap:hover .ne-tip {
              opacity: 1;
            }
          `}</style>
        </aside>

        {/* COLUMN B: INFO PANEL */}
        <aside
          style={{
            background: TOKENS.panel,
            borderLeft: "none",
            padding: isCompactLayout ? "28px 16px 36px" : "34px clamp(18px, 2.3vw, 34px) 86px",
            overflow: "hidden",
            position: "relative",
          }}
          className="flex min-h-[calc(100dvh-var(--viterra-sticky-header-offset,72px)-24px)] flex-col"
        >
          <AnimatePresence mode="wait" initial={false}>
            {active ? (
              <motion.div
                key={activeId}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  position: "relative",
                  zIndex: 1,
                  minHeight: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >

              <h3
                style={{
                  fontFamily: FONT_TITLE,
                  fontSize: isCompactLayout ? "clamp(28px, 8vw, 40px)" : "clamp(34px, 3.2vw, 44px)",
                  fontWeight: 600,
                  lineHeight: 1.06,
                  marginBottom: 20,
                  paddingBottom: 14,
                  color: "#F8FAFC",
                  textWrap: "balance",
                  borderBottom: "2px solid rgba(230,48,48,0.9)",
                }}
              >
                <PreviewFieldPulse
                  blockId={`services-card-${activeIndex}`}
                  fieldKey={`services-card-${activeIndex}-title`}
                  className="block"
                >
                  {active.name}
                </PreviewFieldPulse>
              </h3>

              <div style={{ width: 52, height: 2, background: "linear-gradient(90deg, #FB7185, rgba(251,113,133,0.25))", marginBottom: 24 }} />

              <p
                style={{
                  fontFamily: FONT_UI,
                  fontSize: isCompactLayout ? 15 : 17,
                  fontWeight: 450,
                  lineHeight: 1.6,
                  color: "rgba(248,250,252,0.86)",
                  maxWidth: 480,
                  marginBottom: 28,
                }}
              >
                <PreviewFieldPulse
                  blockId={`services-card-${activeIndex}`}
                  fieldKey={`services-card-${activeIndex}-description`}
                  className="block"
                >
                  {active.description}
                </PreviewFieldPulse>
              </p>

              <PreviewFieldPulse
                blockId={`services-card-${activeIndex}`}
                fieldKey={`services-card-${activeIndex}-bullets`}
                className="block w-full"
              >
              <div style={{ marginBottom: 28, display: "grid", gap: 10, position: "relative" }}>
                {active.benefits.map((b, idx) => (
                  <div
                    key={`${active.id}-${idx}`}
                    style={{
                      padding: isCompactLayout ? "12px 14px" : "12px 168px 12px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 10,
                        height: 10,
                        flexShrink: 0,
                        marginTop: 6,
                        color: "#FB7185",
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      -
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_UI,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#F8FAFC",
                        letterSpacing: "0.02em",
                        lineHeight: 1.45,
                      }}
                    >
                      {b}
                    </span>
                  </div>
                ))}
              </div>
              </PreviewFieldPulse>

              <div
                style={{
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
                  {active.contactLinks.map((link, li) => {
                    const Icon = servicePanelContactIcon(link.icon);
                    const href = (link.href ?? "").trim();
                    if (!href) return null;
                    const openExternal = /^https?:\/\//i.test(href);
                    return (
                      <PreviewFieldPulse
                        key={`${active.id}-cl-${li}`}
                        blockId={`services-card-${activeIndex}`}
                        fieldKey={`services-card-${activeIndex}-contact-${li}`}
                        className="inline-flex"
                      >
                        <a
                          href={href}
                          {...(openExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 7,
                            color: "rgba(248,250,252,0.86)",
                            textDecoration: "none",
                            fontFamily: FONT_UI,
                            fontSize: 13,
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                          }}
                        >
                          <Icon size={14} color="#F8FAFC" />
                          {panelContactLinkCaption(link)}
                        </a>
                      </PreviewFieldPulse>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                  <button
                    type="button"
                    onClick={prev}
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      background: "transparent",
                      border: "none",
                      color: "rgba(248,250,252,0.8)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      padding: 0,
                    }}
                    className="ne-nav"
                  >
                    ← Ant.
                  </button>
                  <span style={{ color: "rgba(245,245,240,0.42)" }}>·</span>
                  <button
                    type="button"
                    onClick={next}
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      background: "transparent",
                      border: "none",
                      color: "rgba(248,250,252,0.8)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      padding: 0,
                    }}
                    className="ne-nav"
                  >
                    Sig. →
                  </button>
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: 4 }}>
                {active.ctaLink ? (
                <PreviewFieldPulse
                  blockId={`services-card-${activeIndex}`}
                  fieldKey={`services-card-${activeIndex}-slug`}
                  className="inline-flex"
                >
                  <PreviewFieldPulse
                    blockId={`services-card-${activeIndex}`}
                    fieldKey={`services-card-${activeIndex}-primary`}
                    className="inline-flex"
                  >
                    <PreviewFieldPulse
                      blockId={`services-card-${activeIndex}`}
                      fieldKey={`services-card-${activeIndex}-linkLabel`}
                      className="inline-flex"
                    >
                      <Link
                        to={active.ctaLink}
                        style={{
                          fontFamily: FONT_UI,
                          fontSize: 12,
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                          background: "transparent",
                          color: "rgba(248,250,252,0.8)",
                          border: "none",
                          padding: 0,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        className="ne-cta"
                      >
                        {active.linkLabel}
                      </Link>
                    </PreviewFieldPulse>
                  </PreviewFieldPulse>
                </PreviewFieldPulse>
                ) : null}
              </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                style={{
                  minHeight: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: 6,
                  padding: "0 20px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  className="ne-empty-line ne-empty-line--bottom"
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "radial-gradient(circle at 50% 42%, rgba(251,113,133,0.09) 0%, rgba(251,113,133,0.03) 28%, transparent 60%)",
                  }}
                />
                <div
                  className="ne-empty-spark ne-empty-spark--left"
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "22%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "72%",
                    height: 1,
                    background: "linear-gradient(90deg, transparent, rgba(251,113,133,0.35), transparent)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  className="ne-empty-spark ne-empty-spark--right"
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "84%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "60%",
                    height: 1,
                    background: "linear-gradient(90deg, transparent, rgba(248,250,252,0.1), transparent)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "30%",
                    left: "18%",
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    transform: "rotate(45deg)",
                    background: "rgba(251,113,133,0.45)",
                    pointerEvents: "none",
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "56%",
                    right: "16%",
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    transform: "rotate(45deg)",
                    background: "rgba(248,250,252,0.35)",
                    pointerEvents: "none",
                  }}
                />
                <img
                  className="ne-empty-logo"
                  src={VITERRA_MARK_MONO_PNG}
                  alt=""
                  width={1024}
                  height={264}
                  decoding="async"
                  style={{
                    width: 220,
                    height: 220,
                    objectFit: "contain",
                    marginBottom: -44,
                    display: "block",
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_TITLE,
                    fontSize: "clamp(28px, 2.8vw, 40px)",
                    color: TOKENS.red,
                    lineHeight: 1.1,
                    fontWeight: 600,
                  }}
                >
                  Red Viterra en espera
                </div>
                <p
                  style={{
                    margin: 0,
                    maxWidth: 420,
                    fontFamily: FONT_UI,
                    fontSize: 16,
                    lineHeight: 1.65,
                    color: "rgba(248,250,252,0.74)",
                    fontWeight: 500,
                  }}
                >
                  Selecciona cualquier nodo del grafo para explorar su información. Pulsa Viterra para volver aquí.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <style>{`
            @media (max-width: 1023px) {
              .services-grid {
                grid-template-columns: 1fr !important;
                min-height: auto !important;
              }
            }

            @media (max-width: 1023px) {
              .services-grid > aside {
                min-height: auto !important;
              }
            }

            @media (max-width: 768px) {
              .services-grid > aside:last-child {
                padding: 32px 18px 48px !important;
              }
            }

            @media (max-width: 600px) {
              .services-grid > aside:last-child {
                padding: 28px 16px 40px !important;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .ne-empty-logo {
                animation: none !important;
              }
            }
            @keyframes neEmptyGlowPulse {
              0%, 100% { opacity: 0.78; transform: scale(1); }
              50% { opacity: 1; transform: scale(1.05); }
            }
            @keyframes neEmptyLogoFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-7px); }
            }
            @keyframes neEmptyLineBreath {
              0%, 100% { opacity: 0.45; }
              50% { opacity: 0.9; }
            }
            @keyframes neEmptySparkTwinkle {
              0%, 100% { opacity: 0.4; transform: rotate(45deg) scale(1); }
              50% { opacity: 1; transform: rotate(45deg) scale(1.18); }
            }
            .ne-empty-glow {
              animation: neEmptyGlowPulse 5.8s ease-in-out infinite;
              transform-origin: center;
            }
            .ne-empty-logo {
              animation: neEmptyLogoFloat 4.8s ease-in-out infinite;
            }
            .ne-empty-line {
              animation: neEmptyLineBreath 4.6s ease-in-out infinite;
            }
            .ne-empty-line--bottom {
              animation-delay: 0.8s;
            }
            .ne-empty-spark {
              animation: neEmptySparkTwinkle 3.6s ease-in-out infinite;
            }
            .ne-empty-spark--right {
              animation-delay: 1.2s;
            }
            .ne-cta:hover {
              background: transparent;
              color: #ffffff;
              transform: none;
              box-shadow: none;
            }
            .ne-nav:hover {
              background: transparent;
              color: #ffffff;
              box-shadow: none;
            }
          `}</style>
        </aside>
      </div>

    </section>
  );
}
