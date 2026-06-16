import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "../../contexts/AuthContext";
import type { UserGroup } from "../../lib/userGroups";
import {
  canConfigurePipelineForGroup,
  createDefaultBuiltinPipelineSnapshot,
  DEFAULT_PIPELINE_GROUP_ID,
  getAllowedPipelineGroupIds,
  type GroupPipelineSnapshot,
} from "../../lib/pipelineByGroup";
import type { AdminViewAsRole } from "../../lib/adminViewAsRole";
import { computeVisiblePipelineGroupIds, resolveActivePipeline } from "./pipelineSelection";

export type PipelineConfigState = {
  pipelineByGroup: Record<string, GroupPipelineSnapshot>;
  setPipelineByGroup: Dispatch<SetStateAction<Record<string, GroupPipelineSnapshot>>>;
  /** true tras hidratar el pipeline desde Supabase (y fusionar local legacy). */
  pipelineSourcesHydrated: boolean;
  setPipelineSourcesHydrated: Dispatch<SetStateAction<boolean>>;
  activePipelineGroupId: string;
  setActivePipelineGroupId: Dispatch<SetStateAction<string>>;
  /** Grupos que el usuario efectivo tiene permitido ver. */
  allowedPipelineGroupIds: string[];
  /** Grupos visibles según rol/vista (admin "ver como", líder oculta General, etc.). */
  visiblePipelineGroupIds: string[];
  /** Snapshot del pipeline del grupo activo. */
  activePipeline: GroupPipelineSnapshot;
  customKanbanStages: GroupPipelineSnapshot["customStages"];
  pipelineStageOrder: GroupPipelineSnapshot["stageOrder"];
  stageColumnColors: GroupPipelineSnapshot["stageColors"];
  /** ¿Puede el usuario efectivo configurar el pipeline del grupo activo? */
  canConfigureActivePipeline: boolean;
};

/**
 * Estado y derivaciones de configuración del pipeline (por grupo + grupo activo). NO contiene los
 * efectos de sincronización/persistencia/reset ni los handlers de CRUD de etapas: esos permanecen
 * en AdminWorkspace en su posición original, porque su orden relativo al efecto de carga combinado
 * importa. Este hook concentra el estado y las derivaciones puras (vía `pipelineSelection`).
 */
export function usePipelineConfig(params: {
  user: User | null;
  effectiveUser: User | null;
  isRealAdmin: boolean;
  adminViewAs: AdminViewAsRole;
  isGroupLeader: boolean;
  userGroups: UserGroup[];
}): PipelineConfigState {
  const { user, effectiveUser, isRealAdmin, adminViewAs, isGroupLeader, userGroups } = params;

  const [pipelineByGroup, setPipelineByGroup] = useState<Record<string, GroupPipelineSnapshot>>(
    () => ({ [DEFAULT_PIPELINE_GROUP_ID]: createDefaultBuiltinPipelineSnapshot() }),
  );
  const [pipelineSourcesHydrated, setPipelineSourcesHydrated] = useState(false);
  const [activePipelineGroupId, setActivePipelineGroupId] = useState<string>(DEFAULT_PIPELINE_GROUP_ID);

  const allowedPipelineGroupIds = useMemo(
    () =>
      effectiveUser ? getAllowedPipelineGroupIds(effectiveUser, userGroups) : [DEFAULT_PIPELINE_GROUP_ID],
    [effectiveUser, userGroups],
  );

  const visiblePipelineGroupIds = useMemo(
    () =>
      computeVisiblePipelineGroupIds({
        user,
        isRealAdmin,
        adminViewAs,
        isGroupLeader,
        userGroups,
        allowedPipelineGroupIds,
      }),
    [user, isRealAdmin, adminViewAs, userGroups, isGroupLeader, allowedPipelineGroupIds],
  );

  const activePipeline = useMemo(
    () => resolveActivePipeline(pipelineByGroup, activePipelineGroupId),
    [pipelineByGroup, activePipelineGroupId],
  );
  const customKanbanStages = activePipeline.customStages;
  const pipelineStageOrder = activePipeline.stageOrder;
  const stageColumnColors = activePipeline.stageColors;

  const canConfigureActivePipeline = useMemo(
    () =>
      effectiveUser ? canConfigurePipelineForGroup(effectiveUser, activePipelineGroupId, userGroups) : false,
    [effectiveUser, activePipelineGroupId, userGroups],
  );

  return {
    pipelineByGroup,
    setPipelineByGroup,
    pipelineSourcesHydrated,
    setPipelineSourcesHydrated,
    activePipelineGroupId,
    setActivePipelineGroupId,
    allowedPipelineGroupIds,
    visiblePipelineGroupIds,
    activePipeline,
    customKanbanStages,
    pipelineStageOrder,
    stageColumnColors,
    canConfigureActivePipeline,
  };
}
