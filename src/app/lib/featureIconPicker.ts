import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Bath,
  Briefcase,
  Building2,
  Car,
  Cctv,
  Dog,
  Droplets,
  Dumbbell,
  Flame,
  Home,
  Shield,
  Sun,
  TreePine,
  Users,
  UtensilsCrossed,
  Volleyball,
  Waves,
  Wifi,
  Wind,
  Zap,
} from "lucide-react";

export type FeatureIconPickerOption = {
  key: string;
  label: string;
  Icon: LucideIcon;
};

/** Iconos alineados al catálogo de amenidades (mismo estilo Lucide que el listado). */
export const FEATURE_ICON_PICKER_OPTIONS: FeatureIconPickerOption[] = [
  { key: "waves", label: "Alberca", Icon: Waves },
  { key: "gym", label: "Gimnasio", Icon: Dumbbell },
  { key: "shield", label: "Seguridad", Icon: Shield },
  { key: "cctv", label: "Vigilancia", Icon: Cctv },
  { key: "tree", label: "Jardín", Icon: TreePine },
  { key: "car", label: "Estacionamiento", Icon: Car },
  { key: "flame", label: "Parrilla", Icon: Flame },
  { key: "dog", label: "Mascotas", Icon: Dog },
  { key: "wifi", label: "Internet", Icon: Wifi },
  { key: "water", label: "Agua", Icon: Droplets },
  { key: "power", label: "Luz", Icon: Zap },
  { key: "ac", label: "Clima", Icon: Wind },
  { key: "kitchen", label: "Cocina", Icon: UtensilsCrossed },
  { key: "spa", label: "Spa", Icon: Bath },
  { key: "office", label: "Oficina", Icon: Briefcase },
  { key: "kids", label: "Infantil", Icon: Baby },
  { key: "sport", label: "Deportes", Icon: Volleyball },
  { key: "home", label: "Terraza", Icon: Home },
  { key: "sum", label: "Salón", Icon: Users },
  { key: "building", label: "Edificio", Icon: Building2 },
  { key: "sun", label: "Luz natural", Icon: Sun },
];

const ICON_BY_KEY = Object.fromEntries(
  FEATURE_ICON_PICKER_OPTIONS.map((o) => [o.key, o.Icon]),
) as Record<string, LucideIcon>;

export function iconFromFeatureKey(key: string | null | undefined): LucideIcon | null {
  if (!key) return null;
  return ICON_BY_KEY[key] ?? null;
}
