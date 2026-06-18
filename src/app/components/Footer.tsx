import { Link } from "react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePreviewCanvas, usePreviewLayout } from "../../contexts/PreviewCanvasContext";
import { cn } from "./ui/utils";

export function Footer() {
  const reduceMotion = useReducedMotion();
  const inPreview = usePreviewCanvas();
  const pl = usePreviewLayout();

  return (
    <motion.footer
      initial={inPreview || reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={inPreview || reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -32px 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="bg-brand-navy pb-[env(safe-area-inset-bottom,0px)] text-slate-300"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className={cn("grid gap-12", pl.gridCols("grid-cols-1 md:grid-cols-2 lg:grid-cols-4"))}>
          {/* Company Info */}
          <div>
            <div className="inline-flex flex-col items-stretch self-start min-w-[11rem] mb-6">
              <h3 className="font-semibold text-lg text-white tracking-tight" style={{ fontWeight: 600 }}>
                VITERRA
              </h3>
              <span className="h-px w-full bg-primary shrink-0 my-2.5" aria-hidden />
              <p
                className="text-xs text-primary uppercase tracking-widest font-medium"
                style={{ letterSpacing: "0.12em" }}
              >
                Grupo Inmobiliario
              </p>
            </div>
            <p className="text-sm leading-relaxed not-italic" style={{ fontWeight: 400 }}>
              Tu socio de confianza en bienes raíces. Más de 15 años ayudando a personas a encontrar su hogar ideal.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.28em] text-white/90 mb-6 font-heading font-medium">
              Enlaces rápidos
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/renta" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Propiedades
                </Link>
              </li>
              <li>
                <Link to="/desarrollos" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Desarrollos
                </Link>
              </li>
              <li>
                <Link to="/nosotros" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Nosotros
                </Link>
              </li>
              <li>
                <Link to="/contacto" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.28em] text-white/90 mb-6 font-heading font-medium">Servicios</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Compra de Propiedades
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Venta de Propiedades
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Alquiler
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Asesoría Legal
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white hover:translate-x-1 transition-all duration-200 inline-block" style={{ fontWeight: 400 }}>
                  Evaluación de Propiedades
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.28em] text-white/90 mb-6 font-heading font-medium">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 group">
                <MapPin className="w-5 h-5 text-slate-400 group-hover:text-white flex-shrink-0 mt-0.5 transition-colors" strokeWidth={1.5} />
                <span className="group-hover:text-white transition-colors" style={{ fontWeight: 400 }}>Av Terranova 1455 local 102, Providencia 4a Secc., 44639 Zapopan, Jal.</span>
              </li>
              <li className="flex items-center gap-3 group">
                <Phone className="w-5 h-5 text-slate-400 group-hover:text-white flex-shrink-0 transition-colors" strokeWidth={1.5} />
                <a href="tel:+523336297122" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>
                  33 3629-7122
                </a>
              </li>
              <li className="flex items-center gap-3 group">
                <Mail className="w-5 h-5 text-slate-400 group-hover:text-white flex-shrink-0 transition-colors" strokeWidth={1.5} />
                <a href="mailto:contacto@viterrainmobiliaria.com" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>
                  contacto@viterrainmobiliaria.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-sm text-center">
          <p className="text-slate-400 not-italic" style={{ fontWeight: 400 }}>&copy; {new Date().getFullYear()} Viterra Inmobiliaria. Todos los derechos reservados.</p>
        </div>
      </div>
    </motion.footer>
  );
}