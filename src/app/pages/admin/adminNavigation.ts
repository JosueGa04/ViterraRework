/**
 * Rutas del panel admin (Fase 1). Convención: `/admin/{tab}` y `/admin/company/{sub}`.
 * Fase 2 (opcional): URL con id de lead y estado del diálogo (p. ej. `/admin/leads/:leadId`).
 */
/** Pestañas principales del CRM (coinciden con rutas bajo `/admin/...`). */
export type AdminTab =
  | "dashboard"
  | "kpis"
  | "leads"
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

const SEGMENT_TO_TAB: Record<string, AdminTab> = {
  dashboard: "dashboard",
  kpis: "kpis",
  leads: "leads",
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

export function parseAdminPath(pathname: string): { tab: AdminTab; companySubtab: CompanySubtab } {
  const normalized = pathname.replace(/\/+$/, "");
  const base = "/admin";
  if (!normalized.startsWith(base)) {
    return { tab: "dashboard", companySubtab: "users" };
  }
  let rest = normalized.slice(base.length);
  if (rest.startsWith("/")) rest = rest.slice(1);
  if (!rest) {
    return { tab: "dashboard", companySubtab: "users" };
  }

  if (rest.startsWith("company/")) {
    const seg = rest.slice("company/".length).split("/")[0] ?? "";
    const companySubtab = SEGMENT_TO_COMPANY_SUB[seg] ?? "users";
    return { tab: "company", companySubtab };
  }

  const seg = rest.split("/")[0] ?? "";
  const tab = SEGMENT_TO_TAB[seg] ?? "dashboard";
  return { tab, companySubtab: "users" };
}
