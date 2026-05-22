import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  Globe2,
  History,
  Home,
  LayoutDashboard,
  Shield,
  UserCircle2,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { UserPermission } from "../contexts/authContextTypes";

/** Tarjetas de permisos (orden = menú lateral del CRM). */
export const MODULE_PERMISSION_CARDS: Array<{
  value: UserPermission;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }> | LucideIcon;
}> = [
  {
    value: "access_dashboard",
    label: "Dashboard",
    description: "Inicio operativo y accesos rápidos",
    Icon: LayoutDashboard,
  },
  {
    value: "access_kpis",
    label: "KPI's",
    description: "Reportes, metas y comparativos",
    Icon: BarChart3,
  },
  {
    value: "manage_leads",
    label: "Leads",
    description: "CRM, pipeline y seguimiento comercial",
    Icon: Users,
  },
  {
    value: "access_consultas",
    label: "Consultas",
    description: "Bandeja de leads para administración",
    Icon: ClipboardList,
  },
  {
    value: "manage_clients",
    label: "Clientes",
    description: "Fichas de clientes e historial",
    Icon: UserCircle2,
  },
  {
    value: "access_agenda",
    label: "Agenda",
    description: "Calendario y citas",
    Icon: Calendar,
  },
  {
    value: "manage_properties",
    label: "Propiedades",
    description: "Catálogo y fichas de inmuebles",
    Icon: Home,
  },
  {
    value: "manage_developments",
    label: "Desarrollos",
    description: "Proyectos y desarrollos",
    Icon: Building2,
  },
  {
    value: "access_activities",
    label: "Actividades",
    description: "Timeline del catálogo",
    Icon: History,
  },
  {
    value: "edit_site",
    label: "Sitio web",
    description: "Contenido del sitio público",
    Icon: Globe2,
  },
  {
    value: "manage_users",
    label: "Mi empresa",
    description: "Equipo, usuarios y configuración",
    Icon: Briefcase,
  },
];

export const ALL_MODULE_PERMISSIONS: UserPermission[] = MODULE_PERMISSION_CARDS.map((c) => c.value);

export function permissionLabel(value: UserPermission): string {
  return MODULE_PERMISSION_CARDS.find((c) => c.value === value)?.label ?? value;
}

/**
 * Compatibilidad con listas guardadas antes de permisos por módulo del menú.
 * No añade módulos que el admin desmarcó explícitamente (p. ej. desarrollos).
 */
export function expandLegacyPermissions(permissions: UserPermission[]): UserPermission[] {
  const set = new Set<UserPermission>(permissions);
  if (set.has("manage_leads")) set.add("access_agenda");
  if (set.has("manage_properties") || set.has("manage_developments")) {
    set.add("access_activities");
  }
  return ALL_MODULE_PERMISSIONS.filter((p) => set.has(p));
}
