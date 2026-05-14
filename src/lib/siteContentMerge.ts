import {
  DEFAULT_SITE_CONTENT,
  CONTACT_SOCIAL_PLATFORMS,
  DEFAULT_SERVICE_CARD_CONTACT_LINKS,
  SERVICE_ICON_KEYS,
  type ContactInfoIcon,
  type ContactInfoItem,
  type ContactSocialLinkItem,
  type ContactSocialPlatform,
  type ServiceCardContactLink,
  type ServiceCardContent,
  type ServiceDetailBlock,
  type ServiceDetailCanvasLayout,
  type ServiceIconKey,
  type HeaderNavSocialLink,
  type SiteContent,
} from "../data/siteContent";
import { HEADER_SOCIAL_PLATFORM_OPTIONS } from "../app/config/socialLinks";
import { deepMerge } from "./deepMerge";
import { sanitizePrimaryListingHref } from "./serviceCardPrimaryHref";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

const CONTACT_INFO_ICONS: readonly ContactInfoIcon[] = [
  "map",
  "phone",
  "mail",
  "clock",
  "building",
  "message",
];

function sanitizeContactInfoIcon(v: unknown): ContactInfoIcon {
  return typeof v === "string" && (CONTACT_INFO_ICONS as readonly string[]).includes(v)
    ? (v as ContactInfoIcon)
    : "message";
}

function isContactInfoItem(v: unknown): v is ContactInfoItem {
  if (!isPlainObject(v)) return false;
  return typeof v.title === "string" && typeof v.body === "string";
}

/** Payload antiguo: ocho campos en lugar de `infoItems`. */
function contactInfoItemsFromLegacy(raw: Record<string, unknown>, def: SiteContent["contact"]): ContactInfoItem[] {
  const a = raw.addressTitle;
  const b = raw.addressLines;
  const c = raw.phoneTitle;
  const d = raw.phoneLines;
  const e = raw.emailTitle;
  const f = raw.emailLines;
  const g = raw.hoursTitle;
  const h = raw.hoursLines;
  if (
    typeof a === "string" &&
    typeof b === "string" &&
    typeof c === "string" &&
    typeof d === "string" &&
    typeof e === "string" &&
    typeof f === "string" &&
    typeof g === "string" &&
    typeof h === "string"
  ) {
    return [
      { icon: "map", title: a, body: b },
      { icon: "phone", title: c, body: d },
      { icon: "mail", title: e, body: f },
      { icon: "clock", title: g, body: h },
    ];
  }
  return def.infoItems;
}

function normalizeContactInfoItemsArray(raw: unknown[]): ContactInfoItem[] {
  const out: ContactInfoItem[] = [];
  for (const row of raw) {
    if (!isContactInfoItem(row)) continue;
    out.push({
      title: row.title,
      body: row.body,
      icon: sanitizeContactInfoIcon((row as ContactInfoItem).icon),
    });
  }
  return out;
}

function hasFullLegacyContact(merged: Record<string, unknown>): boolean {
  return (
    typeof merged.addressTitle === "string" &&
    typeof merged.addressLines === "string" &&
    typeof merged.phoneTitle === "string" &&
    typeof merged.phoneLines === "string" &&
    typeof merged.emailTitle === "string" &&
    typeof merged.emailLines === "string" &&
    typeof merged.hoursTitle === "string" &&
    typeof merged.hoursLines === "string"
  );
}

function resolveContactInfoItems(mergedRecord: Record<string, unknown>, def: SiteContent["contact"]): ContactInfoItem[] {
  if (hasFullLegacyContact(mergedRecord)) {
    return contactInfoItemsFromLegacy(mergedRecord, def);
  }
  const rawItems = mergedRecord.infoItems;
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    const normalized = normalizeContactInfoItemsArray(rawItems);
    if (normalized.length > 0) return normalized;
  }
  return def.infoItems;
}

const LEGACY_CONTACT_KEYS = [
  "addressTitle",
  "addressLines",
  "phoneTitle",
  "phoneLines",
  "emailTitle",
  "emailLines",
  "hoursTitle",
  "hoursLines",
] as const;

function stripLegacyContactFields<T extends Record<string, unknown>>(obj: T): T {
  const next = { ...obj };
  for (const k of LEGACY_CONTACT_KEYS) {
    delete next[k];
  }
  delete next.social;
  return next;
}

function sanitizeContactSocialPlatform(v: unknown): ContactSocialPlatform {
  return typeof v === "string" && (CONTACT_SOCIAL_PLATFORMS as readonly string[]).includes(v)
    ? (v as ContactSocialPlatform)
    : "website";
}

function normalizeSocialLinksArray(raw: unknown[]): ContactSocialLinkItem[] {
  const out: ContactSocialLinkItem[] = [];
  for (const row of raw) {
    if (!isPlainObject(row) || typeof row.url !== "string") continue;
    const rawPlat = row.platform;
    if (rawPlat === "x" || rawPlat === "twitter") continue;
    out.push({
      platform: sanitizeContactSocialPlatform(rawPlat),
      url: row.url,
    });
  }
  return out;
}

function legacySocialHasUrls(s: unknown): boolean {
  if (!isPlainObject(s)) return false;
  return (["facebook", "instagram", "twitter", "linkedin", "youtube"] as const).some(
    (k) => typeof s[k] === "string" && (s[k] as string).trim().length > 0
  );
}

function socialLinksFromLegacy(raw: Record<string, unknown>, def: SiteContent["contact"]): ContactSocialLinkItem[] {
  const s = raw.social;
  if (!isPlainObject(s)) return def.socialLinks;
  const items: ContactSocialLinkItem[] = [];
  const add = (platform: ContactSocialPlatform, v: unknown) => {
    if (typeof v === "string" && v.trim()) items.push({ platform, url: v.trim() });
  };
  add("facebook", s.facebook);
  add("instagram", s.instagram);
  add("linkedin", s.linkedin);
  add("youtube", s.youtube);
  return items.length > 0 ? items : def.socialLinks;
}

function resolveSocialLinks(mergedRecord: Record<string, unknown>, def: SiteContent["contact"]): ContactSocialLinkItem[] {
  if (legacySocialHasUrls(mergedRecord.social)) {
    return socialLinksFromLegacy(mergedRecord, def);
  }
  const raw = mergedRecord.socialLinks;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return [];
    const normalized = normalizeSocialLinksArray(raw);
    return normalized.length > 0 ? normalized : def.socialLinks;
  }
  return def.socialLinks;
}

function sanitizeContactHeroSectionDensity(v: unknown): "default" | "compact" | "airy" | undefined {
  if (v === "default" || v === "compact" || v === "airy") return v;
  return undefined;
}

function sanitizeHomeExperienceMediaPosition(v: unknown): "left" | "right" | undefined {
  if (v === "left" || v === "right") return v;
  return undefined;
}

function randomBlockId(): string {
  try {
    return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  } catch {
    return `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function slugifyTitle(title: string, index: number): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const s = base || `servicio-${index + 1}`;
  return s;
}

function sanitizeServiceIconKey(v: unknown, fallbackIndex: number): ServiceIconKey {
  if (typeof v === "string" && (SERVICE_ICON_KEYS as readonly string[]).includes(v)) {
    return v as ServiceIconKey;
  }
  const cycle = SERVICE_ICON_KEYS[fallbackIndex % SERVICE_ICON_KEYS.length]!;
  return cycle;
}

function normalizeBullets(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    const out = raw.filter((x): x is string => typeof x === "string");
    return out.length > 0 ? out : [""];
  }
  if (isPlainObject(raw) && "0" in raw) {
    const t = raw as Record<string, unknown>;
    const a = [t["0"], t["1"], t["2"]].map((x) => (typeof x === "string" ? x : ""));
    return a.some((s) => s.length > 0) ? a : [""];
  }
  return [""];
}

function normalizeContactInfoItemsForBlock(raw: unknown): ContactInfoItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ContactInfoItem[] = [];
  for (const row of raw) {
    if (!isPlainObject(row) || typeof row.title !== "string" || typeof row.body !== "string") continue;
    out.push({
      title: row.title,
      body: row.body,
      icon: sanitizeContactInfoIcon((row as ContactInfoItem).icon),
    });
  }
  return out;
}

function clampLayoutPct(n: unknown, fallback: number): number {
  const v =
    typeof n === "number" && !Number.isNaN(n)
      ? n
      : typeof n === "string"
        ? parseFloat(n)
        : fallback;
  if (Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(100, v));
}

function readDetailLayout(row: Record<string, unknown>): ServiceDetailCanvasLayout | undefined {
  const L = row.layout;
  if (!isPlainObject(L)) return undefined;
  return {
    x: clampLayoutPct(L.x, 0),
    y: clampLayoutPct(L.y, 0),
    w: clampLayoutPct(L.w, 40),
    h: clampLayoutPct(L.h, 18),
  };
}

function withLayout<T extends ServiceDetailBlock>(row: Record<string, unknown>, block: T): T {
  const layout = readDetailLayout(row);
  if (!layout) return block;
  return { ...block, layout };
}

function normalizeDetailBlock(row: unknown): ServiceDetailBlock | null {
  if (!isPlainObject(row) || typeof row.type !== "string") return null;
  const id = typeof row.id === "string" && row.id.trim() ? row.id : randomBlockId();
  switch (row.type) {
    case "heading":
      return withLayout(row, { id, type: "heading", text: typeof row.text === "string" ? row.text : "" });
    case "subheading":
      return withLayout(row, { id, type: "subheading", text: typeof row.text === "string" ? row.text : "" });
    case "paragraph":
      return withLayout(row, { id, type: "paragraph", text: typeof row.text === "string" ? row.text : "" });
    case "contactParagraph":
      return withLayout(row, {
        id,
        type: "contactParagraph",
        text: typeof row.text === "string" ? row.text : "",
        phone: typeof row.phone === "string" ? row.phone : "",
        email: typeof row.email === "string" ? row.email.trim() : "",
      });
    case "quote": {
      const attribution = typeof row.attribution === "string" ? row.attribution : "";
      return withLayout(row, {
        id,
        type: "quote",
        text: typeof row.text === "string" ? row.text : "",
        ...(attribution.trim() ? { attribution } : {}),
      });
    }
    case "callout":
      return withLayout(row, { id, type: "callout", text: typeof row.text === "string" ? row.text : "" });
    case "bulletList": {
      const rawItems = Array.isArray(row.items) ? row.items : [];
      const items = rawItems.filter((x): x is string => typeof x === "string").map((s) => s.trimEnd());
      return withLayout(row, { id, type: "bulletList", items: items.length > 0 ? items : [""] });
    }
    case "image":
      return withLayout(row, {
        id,
        type: "image",
        src: typeof row.src === "string" ? row.src : "",
        alt: typeof row.alt === "string" ? row.alt : "",
      });
    case "twoColumn":
      return withLayout(row, {
        id,
        type: "twoColumn",
        text: typeof row.text === "string" ? row.text : "",
        imageSrc: typeof row.imageSrc === "string" ? row.imageSrc : "",
        imageAlt: typeof row.imageAlt === "string" ? row.imageAlt : "",
      });
    case "embedVideo": {
      const caption = typeof row.caption === "string" ? row.caption : "";
      return withLayout(
        row,
        {
          id,
          type: "embedVideo",
          url: typeof row.url === "string" ? row.url : "",
          ...(caption.trim() ? { caption } : {}),
        },
      );
    }
    case "spacer": {
      const size = row.size === "sm" || row.size === "lg" ? row.size : "md";
      return withLayout(row, { id, type: "spacer", size });
    }
    case "contact":
      return withLayout(row, { id, type: "contact", items: normalizeContactInfoItemsForBlock(row.items) });
    case "cta": {
      const variant = row.variant === "secondary" ? "secondary" : "primary";
      return withLayout(row, {
        id,
        type: "cta",
        label: typeof row.label === "string" ? row.label : "",
        href: typeof row.href === "string" ? row.href : "",
        variant,
      });
    }
    case "divider":
      return withLayout(row, { id, type: "divider" });
    case "faqBlock": {
      const rawFaq = Array.isArray(row.items) ? row.items : [];
      const faqItems: { question: string; answer: string }[] = [];
      for (const it of rawFaq) {
        if (!isPlainObject(it)) continue;
        faqItems.push({
          question: typeof it.question === "string" ? it.question : "",
          answer: typeof it.answer === "string" ? it.answer : "",
        });
      }
      return withLayout(row, {
        id,
        type: "faqBlock",
        items: faqItems.length > 0 ? faqItems : [{ question: "", answer: "" }],
      });
    }
    case "gallery": {
      const rawIm = Array.isArray(row.images) ? row.images : [];
      const images: { src: string; alt: string }[] = [];
      for (const im of rawIm.slice(0, 4)) {
        if (!isPlainObject(im)) continue;
        images.push({
          src: typeof im.src === "string" ? im.src : "",
          alt: typeof im.alt === "string" ? im.alt : "",
        });
      }
      return withLayout(row, {
        id,
        type: "gallery",
        images: images.length > 0 ? images : [{ src: "", alt: "" }],
      });
    }
    case "iconCard":
      return withLayout(row, {
        id,
        type: "iconCard",
        iconKey: sanitizeServiceIconKey(row.iconKey, 0),
        title: typeof row.title === "string" ? row.title : "",
        body: typeof row.body === "string" ? row.body : "",
      });
    case "widthBand": {
      const mode = row.mode === "full" ? "full" : "content";
      const label = typeof row.label === "string" ? row.label : "";
      return withLayout(row, {
        id,
        type: "widthBand",
        mode,
        ...(label.trim() ? { label } : {}),
      });
    }
    default:
      return null;
  }
}

function normalizeDetailBlocks(raw: unknown): ServiceDetailBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: ServiceDetailBlock[] = [];
  for (const row of raw) {
    const b = normalizeDetailBlock(row);
    if (b) out.push(b);
  }
  return out;
}

function sanitizeServiceCardContactLinkIcon(v: unknown): ServiceCardContactLink["icon"] {
  if (v === "messageCircle" || v === "mail" || v === "phone" || v === "link") return v;
  return "link";
}

/** `undefined`/no array: plantilla por tarjeta. Array vacío: sin enlaces. */
function normalizeServiceCardContactLinks(raw: unknown, fallbackRow: ServiceCardContent | undefined): ServiceCardContactLink[] {
  const fallback =
    fallbackRow?.contactLinks && fallbackRow.contactLinks.length > 0
      ? fallbackRow.contactLinks.map((l) => ({ ...l }))
      : DEFAULT_SERVICE_CARD_CONTACT_LINKS.map((l) => ({ ...l }));
  if (raw === undefined || raw === null) return [...fallback];
  if (!Array.isArray(raw)) return [...fallback];
  if (raw.length === 0) return [];
  const out: ServiceCardContactLink[] = [];
  for (const item of raw) {
    if (!isPlainObject(item)) continue;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const href = typeof item.href === "string" ? item.href.trim() : "";
    if (!href) continue;
    out.push({
      label: label || "Enlace",
      href,
      icon: sanitizeServiceCardContactLinkIcon(item.icon),
    });
  }
  return out.length > 0 ? out.slice(0, 12) : [];
}

const HEADER_SOCIAL_IDS = new Set<string>(HEADER_SOCIAL_PLATFORM_OPTIONS.map((o) => o.id));

function normalizeHeaderNavSocial(raw: unknown, def: HeaderNavSocialLink[]): HeaderNavSocialLink[] {
  if (!Array.isArray(raw)) {
    return def.map((d) => ({ ...d }));
  }
  /** Lista guardada vacía: sin iconos en barra (el editor puede volver a añadir). */
  if (raw.length === 0) {
    return [];
  }
  const out: HeaderNavSocialLink[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!isPlainObject(row)) continue;
    const id = typeof row.id === "string" ? row.id : "";
    if (!HEADER_SOCIAL_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    const defRow = def.find((d) => d.id === id);
    const label =
      typeof row.label === "string" ? row.label : defRow?.label ?? HEADER_SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === id)?.label ?? id;
    const href = typeof row.href === "string" ? row.href : "";
    out.push({ id: id as HeaderNavSocialLink["id"], label, href });
  }
  /** JSON inválido o solo filas rechazadas: volver a plantilla por defecto. */
  return out.length > 0 ? out : def.map((d) => ({ ...d }));
}

function normalizeServiceCards(rawCards: unknown[], fallback: ServiceCardContent[]): ServiceCardContent[] {
  const list: ServiceCardContent[] = [];
  const usedSlugs = new Set<string>();

  for (let i = 0; i < rawCards.length; i += 1) {
    const row = rawCards[i];
    if (!isPlainObject(row)) continue;
    const title = typeof row.title === "string" ? row.title : fallback[i]?.title ?? "Servicio";
    const description = typeof row.description === "string" ? row.description : fallback[i]?.description ?? "";
    const bullets = normalizeBullets(row.bullets);
    const linkLabel =
      typeof row.linkLabel === "string" ? row.linkLabel : fallback[i]?.linkLabel ?? "Conocer más";
    const tag = typeof row.tag === "string" ? row.tag : fallback[i]?.tag;
    const iconKey = sanitizeServiceIconKey(row.iconKey, i);

    let primaryListingHref = sanitizePrimaryListingHref(row.primaryListingHref);
    if (!primaryListingHref && typeof row.linkTo === "string") {
      primaryListingHref = sanitizePrimaryListingHref(row.linkTo);
    }

    let slug = typeof row.slug === "string" ? row.slug.trim().toLowerCase() : "";

    if (primaryListingHref) {
      slug = "";
    } else {
      if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        slug = slugifyTitle(title, i);
      }
      let unique = slug;
      let n = 2;
      while (usedSlugs.has(unique)) {
        unique = `${slug}-${n}`;
        n += 1;
      }
      usedSlugs.add(unique);
      slug = unique;
    }

    const detailBlocks = primaryListingHref ? [] : normalizeDetailBlocks(row.detailBlocks);

    const base: ServiceCardContent = {
      title,
      description,
      bullets,
      linkLabel,
      slug,
      tag,
      iconKey,
      contactLinks: normalizeServiceCardContactLinks(row.contactLinks, fallback[i]),
      detailBlocks,
    };
    if (primaryListingHref) {
      base.primaryListingHref = primaryListingHref;
    }
    list.push(base);
  }

  return list.length > 0 ? list : fallback;
}

/** Garantiza que una sección tenga todos los campos de DEFAULT (listas, textos, etc.). */
export function mergeSiteSection<K extends keyof SiteContent>(key: K, section: unknown): SiteContent[K] {
  const patch: Record<string, unknown> = isPlainObject(section) ? section : {};
  const merged = deepMerge(
    DEFAULT_SITE_CONTENT[key] as unknown as Record<string, unknown>,
    patch
  ) as SiteContent[K];

  if (key === "services") {
    const svc = merged as SiteContent["services"];
    const fallback = DEFAULT_SITE_CONTENT.services.cards;
    if (!Array.isArray(svc.cards)) {
      return { ...svc, cards: fallback } as SiteContent[K];
    }
    const cards = normalizeServiceCards(svc.cards as unknown[], fallback);
    return { ...svc, cards } as SiteContent[K];
  }

  if (key === "contact") {
    const def = DEFAULT_SITE_CONTENT.contact;
    const mergedRecord = merged as unknown as Record<string, unknown>;
    const infoItems = resolveContactInfoItems(mergedRecord, def);
    const socialLinks = resolveSocialLinks(mergedRecord, def);
    const stripped = stripLegacyContactFields(mergedRecord);
    const co = stripped as unknown as SiteContent["contact"];
    const faq = Array.isArray(co.faq)
      ? co.faq.filter(
          (it): it is { question: string; answer: string } =>
            isPlainObject(it) && typeof it.question === "string" && typeof it.answer === "string"
        )
      : def.faq;
    const faqSafe = faq.length > 0 ? faq : def.faq;
    const deepLinks =
      co.deepLinks && typeof co.deepLinks === "object"
        ? { ...def.deepLinks, ...co.deepLinks }
        : def.deepLinks;
    const mergedContact = { ...def, ...co, infoItems, socialLinks, faq: faqSafe, deepLinks } as SiteContent["contact"];
    const heroSectionDensity = sanitizeContactHeroSectionDensity(mergedContact.heroSectionDensity);
    if (heroSectionDensity === undefined) {
      const { heroSectionDensity: _drop, ...rest } = mergedContact;
      return rest as SiteContent[K];
    }
    return { ...mergedContact, heroSectionDensity } as SiteContent[K];
  }

  if (key === "home") {
    const hm = merged as SiteContent["home"];
    const pos = sanitizeHomeExperienceMediaPosition(hm.experienceMediaPosition);
    if (pos === undefined) {
      const { experienceMediaPosition: _drop, ...rest } = hm;
      return rest as SiteContent[K];
    }
    return { ...hm, experienceMediaPosition: pos } as SiteContent[K];
  }

  if (key === "header") {
    const def = DEFAULT_SITE_CONTENT.header;
    const mergedRecord = merged as unknown as Record<string, unknown>;
    const navSocial = normalizeHeaderNavSocial(mergedRecord.navSocial, def.navSocial);
    const h = merged as SiteContent["header"];
    return { ...def, ...h, navSocial } as SiteContent[K];
  }

  return merged;
}
