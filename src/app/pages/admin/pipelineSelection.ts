import type { User } from "../../contexts/AuthContext";
import type { UserGroup } from "../../lib/userGroups";
import {
  cloneGroupPipelineSnapshot,
  createDefaultBuiltinPipelineSnapshot,
  DEFAULT_PIPELINE_GROUP_ID,
  type GroupPipelineSnapshot,
} from "../../lib/pipelineByGroup";
import { getVisiblePipelineGroupIdsForView, type AdminViewAsRole } from "../../lib/adminViewAsRole";

/**
 * Grupos de pipeline visibles según el rol/vista. Para un admin en "ver como", delega en la
 * lógica de vista; para un líder, oculta el grupo "General"; en otro caso, los grupos permitidos.
 */
export function computeVisiblePipelineGroupIds(params: {
  user: User | null;
  isRealAdmin: boolean;
  adminViewAs: AdminViewAsRole;
  isGroupLeader: boolean;
  userGroups: UserGroup[];
  allowedPipelineGroupIds: string[];
}): string[] {
  const { user, isRealAdmin, adminViewAs, isGroupLeader, userGroups, allowedPipelineGroupIds } = params;
  if (!user) return [DEFAULT_PIPELINE_GROUP_ID];
  if (isRealAdmin && adminViewAs !== "admin") {
    return getVisiblePipelineGroupIdsForView(user, adminViewAs, userGroups);
  }
  return isGroupLeader
    ? allowedPipelineGroupIds.filter((groupId) => groupId !== DEFAULT_PIPELINE_GROUP_ID)
    : allowedPipelineGroupIds;
}

/**
 * Snapshot del pipeline del grupo activo. Si no existe, devuelve el builtin por defecto (para
 * "General") o un clon del builtin/General (para un grupo concreto aún sin configuración propia).
 */
export function resolveActivePipeline(
  pipelineByGroup: Record<string, GroupPipelineSnapshot>,
  activeGroupId: string,
): GroupPipelineSnapshot {
  const cur = pipelineByGroup[activeGroupId];
  if (cur) return cur;
  if (activeGroupId === DEFAULT_PIPELINE_GROUP_ID) {
    return createDefaultBuiltinPipelineSnapshot();
  }
  return cloneGroupPipelineSnapshot(
    pipelineByGroup[DEFAULT_PIPELINE_GROUP_ID] ?? createDefaultBuiltinPipelineSnapshot(),
  );
}
