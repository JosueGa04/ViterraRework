import type { ImgHTMLAttributes } from "react";
import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { isHeroBackgroundVideoUrl } from "@/lib/heroBackgroundMedia";

const motionBackdropProps = (reduceMotion: boolean) =>
  ({
    initial: false,
    animate: reduceMotion ? { scale: 1.05 } : { scale: [1.05, 1.07, 1.05] },
    transition: reduceMotion ? { duration: 0 } : { duration: 22, repeat: Infinity, ease: "easeInOut" as const },
  }) as const;

/**
 * Vídeo de fondo: el `transform` de Motion sobre `<video>` rompe la reproducción en varios navegadores;
 * la animación Ken Burns va en un `motion.div` contenedor.
 */
function HeroBackdropVideo({
  url,
  reduceMotion,
  className,
}: {
  url: string;
  reduceMotion: boolean;
  className: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const motionProps = motionBackdropProps(reduceMotion);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    const run = () => {
      void el.play().catch(() => {
        /* autoplay bloqueado en algunos contextos; muted suele bastar */
      });
    };
    run();
    el.addEventListener("loadeddata", run);
    return () => el.removeEventListener("loadeddata", run);
  }, [url]);

  return (
    <motion.div key={url} className="relative h-full w-full overflow-hidden" {...motionProps}>
      <video
        ref={ref}
        src={url}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
      />
    </motion.div>
  );
}

export function HeroBackdropMedia({
  src,
  fallbackSrc,
  reduceMotion,
  className = "h-full w-full object-cover",
  imageProps,
}: {
  src: string;
  fallbackSrc: string;
  reduceMotion: boolean;
  className?: string;
  imageProps?: Pick<ImgHTMLAttributes<HTMLImageElement>, "decoding" | "fetchPriority">;
}) {
  const url = (src?.trim() || fallbackSrc).trim();
  const isVideo = isHeroBackgroundVideoUrl(url);
  const motionProps = motionBackdropProps(reduceMotion);

  if (isVideo) {
    return <HeroBackdropVideo url={url} reduceMotion={reduceMotion} className={className} />;
  }

  return (
    <motion.img key={url} src={url} alt="" className={className} {...motionProps} {...imageProps} />
  );
}
