import type { LucideIcon } from "lucide-react";
import { parseFeatureLabel } from "./featureDisplay";
import { iconFromFeatureKey } from "./featureIconPicker";
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
  Fence,
  Flame,
  Home,
  Landmark,
  Mountain,
  Package,
  Shield,
  Store,
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

/** Normaliza texto para buscar palabras clave (acentos → ASCII). */
export function foldFeatureLabel(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Icono sugerido según el texto del ítem (amenidad/servicio/extra).
 * Cubre términos frecuentes en español de catálogos Tokko.
 */
export function iconForFeatureLabel(label: string): LucideIcon | null {
  const parsed = parseFeatureLabel(label);
  if (parsed.emoji) return null;
  if (parsed.iconKey) return iconFromFeatureKey(parsed.iconKey);
  const n = foldFeatureLabel(parsed.text || label);
  const rules: { test: RegExp; Icon: LucideIcon }[] = [
    { test: /alberca|piscina|pool/, Icon: Waves },
    { test: /pileta/, Icon: Waves },
    { test: /gimnasio|\bgym\b/, Icon: Dumbbell },
    { test: /seguridad|vigilancia|portero|caseta/, Icon: Shield },
    { test: /cctv|camara|videovigilancia/, Icon: Cctv },
    { test: /parrill|asador|bbq/, Icon: Flame },
    { test: /mascota|pet/, Icon: Dog },
    { test: /wifi|internet|fibra/, Icon: Wifi },
    { test: /agua|cloaca|desague|drenaje|potable/, Icon: Droplets },
    { test: /electric|luz\b|alumbrad/, Icon: Zap },
    { test: /gas\b|natural/, Icon: Flame },
    { test: /aire|acondicionado|climat|minisplit/, Icon: Wind },
    { test: /parque|jardin|verde|arbol|pet park/, Icon: TreePine },
    { test: /estacion|cochera|parking|garage/, Icon: Car },
    { test: /cocina|comedor/, Icon: UtensilsCrossed },
    { test: /spa|hidromas|sauna|jacuzzi/, Icon: Bath },
    { test: /oficina|cowork|escritorio/, Icon: Briefcase },
    { test: /sala de reuniones|reuniones/, Icon: Briefcase },
    { test: /niño|kids|infantil|juego/, Icon: Baby },
    { test: /deport|sport|pickle|padel|cancha|golf|simulador/, Icon: Volleyball },
    { test: /sala de juegos|playroom/, Icon: Volleyball },
    { test: /roof|terraza|balcon|deck/, Icon: Home },
    { test: /patio|jardin/, Icon: TreePine },
    { test: /living|comedor diario/, Icon: Home },
    { test: /vista|panoram|montaña/, Icon: Mountain },
    { test: /sum|salon|eventos/, Icon: Users },
    { test: /centro comercial|plaza|comercial/, Icon: Store },
    { test: /yoga|pilates|meditacion/, Icon: Home },
    { test: /lavander|lavadero|lavado/, Icon: Droplets },
    { test: /vestidor/, Icon: Home },
    { test: /biblioteca/, Icon: Landmark },
    { test: /dependencia|baño de servicio|bano de servicio/, Icon: Bath },
    { test: /baulera|altillo|sotano|deposito/, Icon: Package },
    { test: /paviment|via publica|alumbrad public/, Icon: Fence },
    { test: /escritura|notaria|potencial alto para alquilar/, Icon: Landmark },
    { test: /ilumin|natural|luminosidad/, Icon: Sun },
    { test: /elevador|ascensor/, Icon: Building2 },
  ];
  for (const { test, Icon } of rules) {
    if (test.test(n)) return Icon;
  }
  return null;
}
