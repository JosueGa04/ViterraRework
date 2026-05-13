import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { SOCIAL_LINKS, type SocialNetworkId } from "../config/socialLinks";
import { XLogoIcon } from "./social/XLogoIcon";
import { cn } from "./ui/utils";

const iconById: Record<Exclude<SocialNetworkId, "x">, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

type SocialFollowStripProps = {
  className?: string;
  /** dark: pie oscuro · light: fondo claro · muted: admin / secundario */
  theme?: "dark" | "light" | "muted";
  /** Sin padding horizontal (p. ej. dentro de un contenedor que ya tiene max-w y px) */
  flush?: boolean;
};

export function SocialFollowStrip({ className, theme = "light", flush = false }: SocialFollowStripProps) {
  const isDark = theme === "dark";
  const isMuted = theme === "muted";

  return (
    <section
      aria-label="Redes sociales"
      className={cn(
        "w-full",
        isDark && "border-b border-white/10 pb-8 mb-10",
        !isDark && !isMuted && "border-t border-brand-navy/10 bg-brand-canvas/80 py-6",
        isMuted && "border-t border-slate-200/80 bg-white/60 py-4",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between",
          !flush && "px-4 sm:px-6 lg:px-8"
        )}
      >
        <p
          className={cn(
            "font-heading text-[10px] font-medium uppercase tracking-[0.28em]",
            isDark && "text-white/90",
            !isDark && !isMuted && "text-brand-navy/80",
            isMuted && "text-slate-600"
          )}
        >
          Síguenos
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {SOCIAL_LINKS.map(({ id, label, href }) => {
            const Lucide = id === "x" ? null : iconById[id as Exclude<SocialNetworkId, "x">];
            return (
              <li key={id}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center transition-colors",
                    isDark &&
                      "bg-slate-800 text-slate-300 hover:bg-primary hover:text-white",
                    !isDark &&
                      !isMuted &&
                      "border border-brand-navy/15 bg-white text-brand-navy hover:border-primary hover:text-primary",
                    isMuted &&
                      "border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary"
                  )}
                >
                  {id === "x" ? (
                    <XLogoIcon className="h-5 w-5" />
                  ) : Lucide ? (
                    <Lucide className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
