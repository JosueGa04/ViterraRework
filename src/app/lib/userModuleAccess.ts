import type { UserPermission, UserRole } from "../contexts/authContextTypes";
import type { User } from "../contexts/AuthContext";

type AccessUser = Pick<User, "role" | "permissions"> | null | undefined;

/** Acceso a módulos según `permissions` (también para administradores con lista explícita en BD). */
export function userHasPermission(user: AccessUser, permission: UserPermission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function canAccessDashboardModule(user: AccessUser): boolean {
  return userHasPermission(user, "access_dashboard");
}

export function canAccessKpisModule(user: AccessUser): boolean {
  return userHasPermission(user, "access_kpis");
}

export function canAccessLeadsModule(user: AccessUser): boolean {
  return userHasPermission(user, "manage_leads");
}

export function canAccessConsultasModule(user: AccessUser): boolean {
  return userHasPermission(user, "access_consultas");
}

export function canAccessAgendaModule(user: AccessUser): boolean {
  return userHasPermission(user, "access_agenda");
}

export function canAccessPropertiesModule(user: AccessUser): boolean {
  return userHasPermission(user, "manage_properties");
}

export function canAccessDevelopmentsModule(user: AccessUser): boolean {
  return userHasPermission(user, "manage_developments");
}

export function canAccessActivitiesModule(user: AccessUser): boolean {
  return userHasPermission(user, "access_activities");
}

export function canAccessClientsModule(user: AccessUser): boolean {
  return userHasPermission(user, "manage_clients");
}

export function canAccessCompanyUsersModule(_user: AccessUser, _role: UserRole): boolean {
  return userHasPermission(_user, "manage_users");
}

export function canEditSiteModule(user: AccessUser, role: UserRole): boolean {
  if (role === "asesor") return false;
  return userHasPermission(user, "edit_site");
}
