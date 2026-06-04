import type { User, UserRole } from "../contexts/AuthContext";
import { DEFAULT_PERMISSIONS_BY_ROLE } from "../contexts/authContextTypes";
import type { Lead } from "../data/leads";
import type { UserGroup } from "./userGroups";
import { filterLeadsForUser } from "./leadsAccess";
import { DEFAULT_PIPELINE_GROUP_ID, getAllowedPipelineGroupIds } from "./pipelineByGroup";

export type AdminViewAsRole = "admin" | UserRole;

const STORAGE_KEY = "viterra_admin_view_as";
const LEGACY_STORAGE_KEY = "viterra_admin_dashboard_view_as";
const USER_STORAGE_KEY = "viterra_admin_view_as_user";

/** Id del usuario concreto desde cuya perspectiva ve el admin (al ver como líder o asesor). */
export function loadAdminViewAsUserId(): string | null {
  try {
    return sessionStorage.getItem(USER_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function saveAdminViewAsUserId(id: string | null): void {
  try {
    if (id) sessionStorage.setItem(USER_STORAGE_KEY, id);
    else sessionStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadAdminViewAsRole(): AdminViewAsRole {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw === "lider_grupo" || raw === "asesor") return raw;
  } catch {
    /* ignore */
  }
  return "admin";
}

export function saveAdminViewAsRole(value: AdminViewAsRole): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

/** Usuario efectivo para permisos y filtros (solo cambia rol si eres admin en vista previa). */
export function contextUserForViewAs(user: User | null, viewAs: AdminViewAsRole): User | null {
  if (!user) return null;
  if (user.role !== "admin" || viewAs === "admin") return user;
  return {
    ...user,
    role: viewAs,
    permissions: [...DEFAULT_PERMISSIONS_BY_ROLE[viewAs]],
  };
}

export function effectiveRoleFromView(user: User | null, viewAs: AdminViewAsRole): AdminViewAsRole {
  if (!user) return "asesor";
  if (user.role !== "admin") return user.role;
  return viewAs;
}

export function getVisiblePipelineGroupIdsForView(
  user: User,
  viewAs: AdminViewAsRole,
  groups: UserGroup[],
): string[] {
  const ctx = contextUserForViewAs(user, viewAs)!;
  const allowed = getAllowedPipelineGroupIds(ctx, groups);

  if (viewAs === "lider_grupo" || ctx.role === "lider_grupo") {
    const teamIds = allowed.filter((id) => id !== DEFAULT_PIPELINE_GROUP_ID);
    if (user.role === "admin" && viewAs === "lider_grupo" && teamIds.length === 0) {
      const fromGroups = groups.map((g) => g.id);
      return fromGroups.length > 0 ? fromGroups : allowed;
    }
    return teamIds.length > 0 ? teamIds : allowed;
  }

  return allowed;
}

export function filterLeadsForView(
  leads: Lead[],
  user: User,
  viewAs: AdminViewAsRole,
): Lead[] {
  const ctx = contextUserForViewAs(user, viewAs)!;
  return filterLeadsForUser(leads, ctx).filter(
    (l) => l.crmSoftDeletedAt == null || String(l.crmSoftDeletedAt).trim() === "",
  );
}

export function filterLeadsInPipelineForView(
  leadsForView: Lead[],
  activePipelineGroupId: string,
  visibleGroupIds: string[],
): Lead[] {
  if (activePipelineGroupId === DEFAULT_PIPELINE_GROUP_ID) {
    const allowed = new Set(visibleGroupIds);
    return leadsForView.filter((l) => allowed.has(l.pipelineGroupId));
  }
  return leadsForView.filter((l) => l.pipelineGroupId === activePipelineGroupId);
}
