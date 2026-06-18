/**
 * Rutas del panel admin (Fase 1). Convención: `/admin/{tab}` y `/admin/company/{sub}`.
 * Fase 2 (opcional): URL con id de lead y estado del diálogo (p. ej. `/admin/leads/:leadId`).
 */
/** Pestañas principales del CRM (coinciden con rutas bajo `/admin/...`). */
export type AdminTab =
  | "dashboard"
  | "kpis"
  | "leads"
  | "consultas"
  | "clients"
  | "agenda"
  | "properties"
  | "developments"
  | "activities"
  | "sitio"
  | "company"
  | "messages"
  | "profile";

/** Subsección de «Mi empresa» / pipeline (ruta anidada `/admin/company/...`). */
export type CompanySubtab = "users" | "site" | "leadStages" | "settings";

const TAB_SEGMENT: Record<AdminTab, string> = {
  dashboard: "dashboard",
  kpis: "kpis",
  leads: "leads",
  consultas: "consultas",
  clients: "clients",
  agenda: "agenda",
  properties: "properties",
  developments: "developments",
  activities: "activities",
  sitio: "sitio",
  company: "company",
  messages: "messages",
  profile: "profile",
};

const COMPANY_SUB_SEGMENT: Record<CompanySubtab, string> = {
  users: "users",
  site: "site",
  leadStages: "lead-stages",
  settings: "settings",
};

const SEGMENT_TO_COMPANY_SUB: Record<string, CompanySubtab> = {
  users: "users",
  site: "site",
  "lead-stages": "leadStages",
  settings: "settings",
};

/** Rutas bajo `/admin` que no son pestañas del CRM (iframe del editor de sitio, etc.). */
export const ADMIN_NON_WORKSPACE_PATHS = new Set(["site-preview-frame"]);

const SEGMENT_TO_TAB: Record<string, AdminTab> = {
  dashboard: "dashboard",
  kpis: "kpis",
  leads: "leads",
  consultas: "consultas",
  clients: "clients",
  agenda: "agenda",
  properties: "properties",
  developments: "developments",
  activities: "activities",
  sitio: "sitio",
  company: "company",
  messages: "messages",
  profile: "profile",
};

export function buildAdminHref(tab: AdminTab, companySubtab: CompanySubtab = "users"): string {
  if (tab === "company") {
    return `/admin/company/${COMPANY_SUB_SEGMENT[companySubtab]}`;
  }
  return `/admin/${TAB_SEGMENT[tab]}`;
}

/** Perfil propio (`/admin/profile`) o ficha de un miembro del equipo (`/admin/profile/:userId`). */
export function buildAdminProfileHref(userId?: string | null): string {
  const id = userId?.trim();
  if (!id) return "/admin/profile";
  return `/admin/profile/${encodeURIComponent(id)}`;
}

export type ParsedAdminPath = {
  tab: AdminTab;
  companySubtab: CompanySubtab;
  profileUserId: string | null;
};

export function buildAdminCanonicalHref(parsed: ParsedAdminPath): string {
  if (parsed.tab === "profile" && parsed.profileUserId) {
    return buildAdminProfileHref(parsed.profileUserId);
  }
  return buildAdminHref(parsed.tab, parsed.companySubtab);
}

export function parseAdminPath(pathname: string): ParsedAdminPath {
  const normalized = pathname.replace(/\/+$/, "");
  const base = "/admin";
  if (!normalized.startsWith(base)) {
    return { tab: "dashboard", companySubtab: "users", profileUserId: null };
  }
  let rest = normalized.slice(base.length);
  if (rest.startsWith("/")) rest = rest.slice(1);
  if (!rest) {
    return { tab: "dashboard", companySubtab: "users", profileUserId: null };
  }

  if (rest.startsWith("company/")) {
    const seg = rest.slice("company/".length).split("/")[0] ?? "";
    const companySubtab = SEGMENT_TO_COMPANY_SUB[seg] ?? "users";
    return { tab: "company", companySubtab, profileUserId: null };
  }

  const parts = rest.split("/").filter(Boolean);
  const seg = parts[0] ?? "";
  if (ADMIN_NON_WORKSPACE_PATHS.has(seg)) {
    return { tab: "dashboard", companySubtab: "users", profileUserId: null };
  }
  if (seg === "profile") {
    const profileUserId = parts[1] ? decodeURIComponent(parts[1]) : null;
    return { tab: "profile", companySubtab: "users", profileUserId };
  }

  const tab = SEGMENT_TO_TAB[seg] ?? "dashboard";
  return { tab, companySubtab: "users", profileUserId: null };
}
