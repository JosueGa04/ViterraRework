import { iconFromFeatureKey } from "./featureIconPicker";
import type { LucideIcon } from "lucide-react";
import { iconForFeatureLabel } from "./featureIcons";

const ICON_PREFIX_RE = /^#([a-z0-9_-]+):(.+)$/i;

/** Separa prefijo de icono Lucide, emoji legacy o texto plano. */
export function parseFeatureLabel(label: string): {
  emoji: string | null;
  iconKey: string | null;
  text: string;
} {
  const trimmed = label.trim();
  const iconMatch = trimmed.match(ICON_PREFIX_RE);
  if (iconMatch) {
    return { emoji: null, iconKey: iconMatch[1].toLowerCase(), text: iconMatch[2].trim() };
  }
  const emojiMatch = trimmed.match(/^(\p{Extended_Pictographic}+)\s+(.+)$/u);
  if (emojiMatch) {
    return { emoji: emojiMatch[1], iconKey: null, text: emojiMatch[2].trim() };
  }
  return { emoji: null, iconKey: null, text: trimmed };
}

export function formatFeatureWithIconKey(iconKey: string, text: string): string {
  const t = text.trim();
  if (!t) return "";
  return `#${iconKey}:${t}`;
}

/** @deprecated Usar formatFeatureWithIconKey */
export function formatFeatureLabel(emoji: string | null, text: string): string {
  const t = text.trim();
  if (!t) return "";
  const e = emoji?.trim();
  return e ? `${e} ${t}` : t;
}

export function featureLabelHasEmojiPrefix(label: string): boolean {
  return parseFeatureLabel(label).emoji != null;
}

export function featureDisplayText(label: string): string {
  return parseFeatureLabel(label).text || label;
}

export function resolveFeatureIcon(label: string): LucideIcon | null {
  const { iconKey, text, emoji } = parseFeatureLabel(label);
  if (emoji) return null;
  if (iconKey) return iconFromFeatureKey(iconKey);
  return iconForFeatureLabel(text || label);
}
