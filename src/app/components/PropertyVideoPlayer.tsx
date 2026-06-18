import { resolvePropertyVideoPlayback } from "../lib/embeddableVideo";
import { IFRAME_SANDBOX_ATTR } from "../lib/safeEmbed";
import { cn } from "./ui/utils";

type Props = {
  url: string;
  title?: string;
  className?: string;
  iframeClassName?: string;
  videoClassName?: string;
};

export function PropertyVideoPlayer({
  url,
  title = "Video de la propiedad",
  className,
  iframeClassName,
  videoClassName,
}: Props) {
  const playback = resolvePropertyVideoPlayback(url);
  if (!playback) return null;

  if (playback.kind === "iframe") {
    return (
      <div className={cn("aspect-video w-full overflow-hidden rounded-xl bg-black", className)}>
        <iframe
          title={title}
          src={playback.src}
          sandbox={IFRAME_SANDBOX_ATTR}
          className={cn("h-full w-full", iframeClassName)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <video
      src={playback.src}
      controls
      playsInline
      className={cn("w-full max-h-[min(70vh,480px)] rounded-xl bg-black", videoClassName, className)}
    />
  );
}
