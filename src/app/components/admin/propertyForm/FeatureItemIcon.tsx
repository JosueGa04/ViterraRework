import { Circle } from "lucide-react";
import { cn } from "../../ui/utils";
import { featureDisplayText, resolveFeatureIcon } from "../../../lib/featureDisplay";

type Props = {
  label: string;
  className?: string;
  iconClassName?: string;
};

export function FeatureItemIcon({ label, className, iconClassName }: Props) {
  const Icon = resolveFeatureIcon(label);
  const { emoji } = (() => {
    const m = label.trim().match(/^(\p{Extended_Pictographic}+)\s+/u);
    return { emoji: m ? m[1] : null };
  })();

  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-navy ring-1 ring-stone-200/90",
        className,
      )}
    >
      {emoji ? (
        <span className="text-lg leading-none" aria-hidden>
          {emoji}
        </span>
      ) : Icon ? (
        <Icon className={cn("h-4 w-4 text-primary", iconClassName)} strokeWidth={1.75} aria-hidden />
      ) : (
        <Circle className="h-3 w-3 fill-stone-300 text-stone-300" aria-hidden />
      )}
    </span>
  );
}
