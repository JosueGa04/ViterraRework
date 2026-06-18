import { useMemo } from "react";
import { Link } from "react-router";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Building2,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useSiteContent } from "../../contexts/SiteContentContext";
import { CONTACT_SOCIAL_LABELS, type ContactInfoIcon, type FooterNavLink } from "../../data/siteContent";
import { footerServiceLinksFromCards } from "../../lib/footerSiteLinks";
import { mergeSiteSection } from "../../lib/siteContentMerge";
import { ContactSocialGlyph } from "./ContactSocialGlyph";
import { usePreviewCanvas, usePreviewLayout } from "../../contexts/PreviewCanvasContext";
import { PreviewSectionChrome } from "./admin/siteEditor/PreviewSectionChrome";
import { PreviewFieldPulse } from "./admin/siteEditor/PreviewFieldPulse";
import { cn } from "./ui/utils";

const CONTACT_ICONS: Record<ContactInfoIcon, LucideIcon> = {
  map: MapPin,
  phone: Phone,
  mail: Mail,
  clock: Clock,
  building: Building2,
  message: MessageCircle,
};

function firstLine(text: string) {
  return text.split("\n")[0]?.trim() ?? "";
}

function telHref(phoneLines: string) {
  const digits = firstLine(phoneLines).replace(/\D/g, "");
  return digits ? `tel:${digits}` : "#";
}

function mailHref(emailLines: string) {
  const line = firstLine(emailLines);
  if (!line) return "#";
  return line.includes("@") ? `mailto:${line}` : "#";
}

function normalizeExternalHref(raw: string): string {
  const t = raw.trim();
  if (!t || t === "#") return t || "#";
  if (/^https?:\/\//i.test(t) || t.startsWith("/") || t.startsWith("#") || t.startsWith("mailto:") || t.startsWith("tel:"))
    return t;
  return `https://${t}`;
}

function resolveFooterCopyright(line: string) {
  const year = String(new Date().getFullYear());
  if (line.includes("{year}")) return line.replace(/\{year\}/g, year);
  return line;
}

function FooterNavItem({ link }: { link: FooterNavLink }) {
  const href = link.href.trim() || "#";
  const className =
    "hover:text-white hover:translate-x-1 transition-all duration-200 inline-block";
  const style = { fontWeight: 400 } as const;

  if (href.startsWith("/")) {
    return (
      <Link to={href} className={className} style={style}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={normalizeExternalHref(href)} className={className} style={style}>
      {link.label}
    </a>
  );
}

function FooterContactRow({
  icon,
  body,
  fieldKey,
}: {
  icon: ContactInfoIcon;
  body: string;
  fieldKey: string;
}) {
  const Icon = CONTACT_ICONS[icon] ?? MessageCircle;
  const display = body.trim();
  if (!display) return null;

  const isPhone = icon === "phone";
  const isMail = icon === "mail";
  const inner = (
    <span className="group-hover:text-white transition-colors whitespace-pre-line" style={{ fontWeight: 400 }}>
      {display}
    </span>
  );

  return (
    <li className={cn("flex gap-3 group", isPhone ? "items-center" : "items-start")}>
      <Icon
        className="w-5 h-5 text-slate-400 group-hover:text-white flex-shrink-0 mt-0.5 transition-colors"
        strokeWidth={1.5}
      />
      <PreviewFieldPulse blockId="footer-contact" fieldKey={fieldKey}>
        {isPhone ? (
          <a href={telHref(body)} className="hover:text-white transition-colors">
            {inner}
          </a>
        ) : isMail ? (
          <a href={mailHref(body)} className="hover:text-white transition-colors">
            {inner}
          </a>
        ) : (
          inner
        )}
      </PreviewFieldPulse>
    </li>
  );
}

export function Footer() {
  const reduceMotion = useReducedMotion();
  const inPreview = usePreviewCanvas();
  const pl = usePreviewLayout();
  const { content } = useSiteContent();
  const f = mergeSiteSection("footer", content.footer);
  const services = mergeSiteSection("services", content.services);
  const serviceLinks = useMemo(
    () => footerServiceLinksFromCards(services.cards),
    [services.cards]
  );

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
          <PreviewSectionChrome blockId="footer-brand" label="Marca" hideLabel hideStripe surface="dark">
            <div>
              <div className="inline-flex flex-col items-stretch self-start min-w-[11rem] mb-6">
                <PreviewFieldPulse blockId="footer-brand" fieldKey="footer-brand-title">
                  <h3 className="font-semibold text-lg text-white tracking-tight" style={{ fontWeight: 600 }}>
                    {f.brandTitle}
                  </h3>
                </PreviewFieldPulse>
                <span className="h-px w-full bg-primary shrink-0 my-2.5" aria-hidden />
                <PreviewFieldPulse blockId="footer-brand" fieldKey="footer-brand-subtitle">
                  <p
                    className="text-xs text-primary uppercase tracking-widest font-medium"
                    style={{ letterSpacing: "0.12em" }}
                  >
                    {f.brandSubtitle}
                  </p>
                </PreviewFieldPulse>
              </div>
              <PreviewFieldPulse blockId="footer-brand" fieldKey="footer-brand-description">
                <p className="text-sm leading-relaxed not-italic" style={{ fontWeight: 400 }}>
                  {f.brandDescription}
                </p>
              </PreviewFieldPulse>
            </div>
          </PreviewSectionChrome>

          <PreviewSectionChrome blockId="footer-quick" label="Enlaces rápidos" hideLabel hideStripe surface="dark">
            <div>
              <PreviewFieldPulse blockId="footer-quick" fieldKey="footer-quick-title">
                <h4 className="text-[10px] uppercase tracking-[0.28em] text-white/90 mb-6 font-heading font-medium">
                  {f.quickLinksTitle}
                </h4>
              </PreviewFieldPulse>
              <ul className="space-y-3 text-sm">
                {f.quickLinks.map((link, i) => (
                  <li key={`quick-${i}-${link.label}`}>
                    <PreviewFieldPulse blockId="footer-quick" fieldKey={`footer-quick-${i}-label`} layout="inline">
                      <FooterNavItem link={link} />
                    </PreviewFieldPulse>
                  </li>
                ))}
              </ul>
            </div>
          </PreviewSectionChrome>

          <PreviewSectionChrome blockId="footer-services" label="Servicios" hideLabel hideStripe surface="dark">
            <div>
              <PreviewFieldPulse blockId="footer-services" fieldKey="footer-services-title">
                <h4 className="text-[10px] uppercase tracking-[0.28em] text-white/90 mb-6 font-heading font-medium">
                  {f.servicesTitle}
                </h4>
              </PreviewFieldPulse>
              <ul className="space-y-3 text-sm">
                {serviceLinks.map((link, i) => (
                  <li key={`svc-${i}-${link.href}-${link.label}`}>
                    <FooterNavItem link={link} />
                  </li>
                ))}
              </ul>
            </div>
          </PreviewSectionChrome>

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

        <PreviewSectionChrome blockId="footer-legal" label="Copyright" hideLabel hideStripe surface="dark">
          <div className="border-t border-white/10 mt-12 pt-8 text-sm text-center">
            <PreviewFieldPulse blockId="footer-legal" fieldKey="footer-legal-copyright">
              <p className="text-slate-400 not-italic" style={{ fontWeight: 400 }}>
                {resolveFooterCopyright(f.copyrightLine)}
              </p>
            </PreviewFieldPulse>
          </div>
        </PreviewSectionChrome>
      </div>
    </motion.footer>
  );
}
