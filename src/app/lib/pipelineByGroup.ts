import type { User } from "../contexts/AuthContext";
import {
  LEAD_STATUS_LABEL,
  labelForLeadStatus,
  type CustomKanbanStage,
  type LeadBuiltinStatus,
} from "../data/leads";
import type { UserGroup } from "./userGroups";

export const DEFAULT_PIPELINE_GROUP_ID = "__default__";

export const PIPELINE_BY_GROUP_STORAGE_KEY = "viterra_kanban_pipeline_by_group";

/**
 * Rule that automatically moves a lead from one stage to another after N days.
 * "If a lead stays in `fromStageId` for more than `afterDays` days → move it to `toStageId`."
 */
export type StageAutoMoveRule = {
  /** Pipeline stage the lead must currently be in. */
  fromStageId: string;
  /** Pipeline stage the lead will be moved to when the rule fires. */
  toStageId: string;
  /** Number of days the lead must have been in `fromStageId` before the rule triggers. */
  afterDays: number;
};

export type GroupPipelineSnapshot = {
  customStages: CustomKanbanStage[];
  stageOrder: string[];
  stageColors: Record<string, string>;
  /** Time-based auto-move rules for this pipeline group. */
  stageRules: StageAutoMoveRule[];
};

/** Copia profunda del embudo (etapas, orden, colores y reglas) para asignar a otro `group_id`. */
export function cloneGroupPipelineSnapshot(s: GroupPipelineSnapshot): GroupPipelineSnapshot {
  return {
    customStages: s.customStages.map((c) => ({ id: c.id, label: c.label })),
    stageOrder: [...s.stageOrder],
    stageColors: { ...s.stageColors },
    stageRules: s.stageRules.map((r) => ({ ...r })),
  };
}

export function createEmptyGroupPipelineSnapshot(): GroupPipelineSnapshot {
  return {
    customStages: [],
    stageOrder: [],
    stageColors: {},
    stageRules: [],
  };
}

/** Pipeline por defecto del espacio global (columnas estándar del embudo). */
export function createDefaultBuiltinPipelineSnapshot(): GroupPipelineSnapshot {
  const stageOrder = Object.keys(LEAD_STATUS_LABEL) as LeadBuiltinStatus[];
  return {
    customStages: [],
    stageOrder: [...stageOrder],
    stageColors: {},
    stageRules: [],
  };
}

function isCustomStage(x: unknown): x is CustomKanbanStage {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as CustomKanbanStage).id === "string" &&
    typeof (x as CustomKanbanStage).label === "string"
  );
}

export function normalizeStageOrder(stageOrder: string[], allStageIds: string[]): string[] {
  return [
    ...stageOrder.filter((id) => allStageIds.includes(id)),
    ...allStageIds.filter((id) => !stageOrder.includes(id)),
  ];
}

function findStageDefById(id: string, defs: CustomKanbanStage[]): CustomKanbanStage | undefined {
  return defs.find((s) => s.id === id) ?? defs.find((s) => s.id.toLowerCase() === id.toLowerCase());
}

/**
 * Antes `normalizeStageOrder` solo consideraba ids presentes en `customStages`, así que un
 * `stageOrder` guardado sin filas en `customStages` (o desincronizado) quedaba vacío al cargar
 * y el submódulo Pipeline no mostraba columnas aunque el Kanban sí (por estados en los leads).
 */
function isValidStageAutoMoveRule(x: unknown): x is StageAutoMoveRule {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.fromStageId === "string" &&
    r.fromStageId.trim().length > 0 &&
    typeof r.toStageId === "string" &&
    r.toStageId.trim().length > 0 &&
    typeof r.afterDays === "number" &&
    Number.isFinite(r.afterDays) &&
    r.afterDays >= 0
  );
}

export function parseGroupPipelineConfigFromUnknown(raw: unknown): GroupPipelineSnapshot {
  const empty = createEmptyGroupPipelineSnapshot();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const o = raw as Record<string, unknown>;
  const customStagesFromDb = Array.isArray(o.customStages) ? o.customStages.filter(isCustomStage) : [];
  const stageOrder = Array.isArray(o.stageOrder)
    ? o.stageOrder.filter((x): x is string => typeof x === "string")
    : [];
  const stageColors =
    o.stageColors && typeof o.stageColors === "object" && !Array.isArray(o.stageColors)
      ? (o.stageColors as Record<string, string>)
      : {};
  const stageRules: StageAutoMoveRule[] = Array.isArray(o.stageRules)
    ? o.stageRules.filter(isValidStageAutoMoveRule).map((r) => ({
        fromStageId: (r as StageAutoMoveRule).fromStageId.trim(),
        toStageId: (r as StageAutoMoveRule).toStageId.trim(),
        afterDays: Math.max(0, Math.round((r as StageAutoMoveRule).afterDays)),
      }))
    : [];
  const idsFromStages = customStagesFromDb.map((s) => s.id);
  const idsFromOrder = [...new Set(stageOrder)];
  const allStageIds = [...new Set([...idsFromStages, ...idsFromOrder])];
  const normOrder =
    stageOrder.length > 0
      ? normalizeStageOrder(stageOrder, allStageIds)
      : normalizeStageOrder(customStagesFromDb.map((s) => s.id), allStageIds);

  const mergedCustomStages: CustomKanbanStage[] = normOrder.map((id) => {
    const def = findStageDefById(id, customStagesFromDb);
    const labelTrim = def?.label?.trim() ?? "";
    if (labelTrim) return { id, label: labelTrim };
    return { id, label: labelForLeadStatus(id, customStagesFromDb) };
  });

  return { customStages: mergedCustomStages, stageOrder: normOrder, stageColors, stageRules };
}

export function migrateLegacyPipelineSnapshot(): GroupPipelineSnapshot | null {
  try {
    const stagesRaw = localStorage.getItem("viterra_kanban_custom_stages");
    const orderRaw = localStorage.getItem("viterra_kanban_stage_order");
    const colorsRaw = localStorage.getItem("viterra_kanban_stage_colors");
    let customStages: CustomKanbanStage[] = [];
    if (stagesRaw) {
      const p = JSON.parse(stagesRaw) as unknown;
      if (Array.isArray(p)) customStages = p.filter(isCustomStage);
    }
    let stageOrder: string[] = [];
    if (orderRaw) {
      const p = JSON.parse(orderRaw) as unknown;
      if (Array.isArray(p)) stageOrder = p.filter((x): x is string => typeof x === "string");
    }
    let stageColors: Record<string, string> = {};
    if (colorsRaw) {
      const p = JSON.parse(colorsRaw) as unknown;
      if (p && typeof p === "object" && !Array.isArray(p)) stageColors = p as Record<string, string>;
    }
    if (
      customStages.length === 0 &&
      stageOrder.length === 0 &&
      Object.keys(stageColors).length === 0
    ) {
      return null;
    }
    const allIds = [...new Set([...customStages.map((s) => s.id), ...stageOrder])];
    const normalizedOrder =
      stageOrder.length > 0
        ? normalizeStageOrder(stageOrder, allIds)
        : normalizeStageOrder([], allIds);
    return parseGroupPipelineConfigFromUnknown({
      customStages,
      stageOrder: normalizedOrder,
      stageColors,
    });
  } catch {
    return null;
  }
}

export function loadPipelineByGroup(): Record<string, GroupPipelineSnapshot> {
  try {
    const raw = localStorage.getItem(PIPELINE_BY_GROUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const out: Record<string, GroupPipelineSnapshot> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof k !== "string" || !k) continue;
          out[k] = parseGroupPipelineConfigFromUnknown(v);
        }
        if (Object.keys(out).length > 0) return out;
      }
    }
  } catch {
    /* ignore */
  }
  const migrated = migrateLegacyPipelineSnapshot();
  if (migrated) {
    const initial = { [DEFAULT_PIPELINE_GROUP_ID]: migrated };
    savePipelineByGroup(initial);
    return initial;
  }
  return { [DEFAULT_PIPELINE_GROUP_ID]: createEmptyGroupPipelineSnapshot() };
}

export function savePipelineByGroup(map: Record<string, GroupPipelineSnapshot>): void {
  localStorage.setItem(PIPELINE_BY_GROUP_STORAGE_KEY, JSON.stringify(map));
}

/** Grupos de trabajo cuyo pipeline puede ver el usuario (selector de contexto). */
export function getAllowedPipelineGroupIds(user: User, groups: UserGroup[]): string[] {
  if (user.role === "admin") {
    const out = new Set<string>([DEFAULT_PIPELINE_GROUP_ID]);
    for (const g of groups) out.add(g.id);
    return [...out];
  }
  const memberGroups = groups.filter((g) => g.memberIds.includes(user.id)).map((g) => g.id);
  if (memberGroups.length > 0) return memberGroups;
  return [DEFAULT_PIPELINE_GROUP_ID];
}

/** Solo administrador o líder del grupo (no el bucket legacy por defecto para no-admins). */
export function canConfigurePipelineForGroup(
  user: User,
  groupId: string,
  groups: UserGroup[]
): boolean {
  if (user.role === "admin") return true;
  if (groupId === DEFAULT_PIPELINE_GROUP_ID) return false;
  if (user.role !== "lider_grupo") return false;
  const g = groups.find((x) => x.id === groupId);
  return !!g && g.leaderId === user.id;
}

export function pipelineContextStorageKey(userId: string): string {
  return `viterra_pipeline_context_group_${userId}`;
}
