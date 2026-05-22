import { Home, Package, Wrench } from "lucide-react";
import { featureDisplayText, resolveFeatureIcon } from "../lib/featureDisplay";
import { cn } from "./ui/utils";

const CATEGORY_STYLES = {
  amenity: {
    sectionIcon: "text-slate-600",
    cardIcon: "text-slate-500",
  },
  service: {
    sectionIcon: "text-slate-600",
    cardIcon: "text-slate-500",
  },
  extra: {
    sectionIcon: "text-slate-600",
    cardIcon: "text-slate-500",
  },
} as const;

function FeatureRowVisual({
  feature,
  cardIconClass,
}: {
  feature: string;
  cardIconClass: string;
}) {
  const display = featureDisplayText(feature);
  const emojiMatch = feature.trim().match(/^(\p{Extended_Pictographic}+)\s+/u);
  const emoji = emojiMatch ? emojiMatch[1] : null;
  const ItemIcon = emoji ? null : resolveFeatureIcon(feature);

  if (ItemIcon) {
    return (
      <>
        <ItemIcon className={cn("h-4 w-4 shrink-0", cardIconClass)} strokeWidth={1.8} aria-hidden />
        <span>{display}</span>
      </>
    );
  }
  if (emoji) {
    return (
      <>
        <span className="shrink-0 text-lg leading-none" aria-hidden>
          {emoji}
        </span>
        <span>{display}</span>
      </>
    );
  }
  return (
    <>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
      <span>{display}</span>
    </>
  );
}

export function FeatureSection({
  variant,
  title,
  items,
  keyPrefix,
  layout = "grid",
}: {
  variant: keyof typeof CATEGORY_STYLES;
  title: string;
  items: string[];
  keyPrefix: string;
  layout?: "grid" | "list";
}) {
  if (items.length === 0) return null;
  const meta = CATEGORY_STYLES[variant];
  const SectionIcon = variant === "amenity" ? Home : variant === "service" ? Wrench : Package;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <SectionIcon className={cn("h-5 w-5 shrink-0", meta.sectionIcon)} strokeWidth={1.8} aria-hidden />
        <h4 className="text-base font-semibold text-slate-900" style={{ fontWeight: 600 }}>
          {title}
        </h4>
      </div>
      {layout === "list" ? (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {items.map((feature, idx) => (
            <li
              key={`${keyPrefix}-${idx}`}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-900"
            >
              <FeatureRowVisual feature={feature} cardIconClass={meta.cardIcon} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((feature, idx) => {
            const display = featureDisplayText(feature);
            const emojiMatch = feature.trim().match(/^(\p{Extended_Pictographic}+)\s+/u);
            const emoji = emojiMatch ? emojiMatch[1] : null;
            const ItemIcon = emoji ? null : resolveFeatureIcon(feature);
            return (
              <div
                key={`${keyPrefix}-${idx}`}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
                  ItemIcon || emoji ? "flex items-center gap-3" : "block",
                )}
              >
                {ItemIcon ? (
                  <ItemIcon className={cn("h-4.5 w-4.5 shrink-0", meta.cardIcon)} strokeWidth={1.8} />
                ) : emoji ? (
                  <span className="shrink-0 text-xl leading-none" aria-hidden>
                    {emoji}
                  </span>
                ) : null}
                <p
                  className="min-w-0 flex-1 text-sm font-medium leading-normal text-slate-900"
                  style={{ fontWeight: 500 }}
                >
                  {display}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
