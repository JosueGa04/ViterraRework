import type { Lead } from "../data/leads";
import type { GroupPipelineSnapshot } from "./pipelineByGroup";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Returns the number of whole days elapsed since the lead was last moved to its
 * current stage.  Uses `updatedAt` (resets on every manual move) and falls back
 * to `createdAt` when `updatedAt` is absent or unparseable.
 */
function daysInCurrentStage(lead: Lead, nowMs: number): number {
  const raw = lead.updatedAt ?? lead.createdAt ?? "";
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return 0;
  return Math.floor((nowMs - ts) / MS_PER_DAY);
}

export type AutoMoveTrigger = {
  leadId: string;
  fromStageId: string;
  toStageId: string;
};

/**
 * Evaluates all `stageRules` across every pipeline group and returns the set of
 * moves that should be applied right now.
 *
 * Rules on the same `fromStageId`:
 *   - Only the rule with the **smallest** `afterDays` that has already elapsed fires.
 *   - This prevents jumping multiple stages in a single evaluation pass.
 *
 * @param leads          Full lead list to evaluate.
 * @param pipelineByGroup  Current pipeline snapshot map (group id → snapshot).
 * @param nowMs          Optional override for "now" (defaults to `Date.now()`). Useful for tests.
 */
export function computeAutoMoveTriggers(
  leads: Lead[],
  pipelineByGroup: Record<string, GroupPipelineSnapshot>,
  nowMs: number = Date.now()
): AutoMoveTrigger[] {
  const results: AutoMoveTrigger[] = [];

  for (const lead of leads) {
    // Skip archived / deleted leads.
    if (lead.crmSoftDeletedAt || lead.deletedAt) continue;

    const snapshot = pipelineByGroup[lead.pipelineGroupId];
    if (!snapshot || !snapshot.stageRules || snapshot.stageRules.length === 0) continue;

    // Find all rules that match the lead's current stage.
    const matchingRules = snapshot.stageRules.filter(
      (r) => r.fromStageId === lead.status && r.toStageId !== lead.status
    );
    if (matchingRules.length === 0) continue;

    const days = daysInCurrentStage(lead, nowMs);

    // Only rules whose threshold has been reached.
    const eligibleRules = matchingRules.filter((r) => days >= r.afterDays);
    if (eligibleRules.length === 0) continue;

    // Pick the rule with the smallest afterDays (earliest trigger) to avoid
    // skipping stages.
    const bestRule = eligibleRules.reduce((best, r) =>
      r.afterDays < best.afterDays ? r : best
    );

    results.push({
      leadId: lead.id,
      fromStageId: lead.status,
      toStageId: bestRule.toStageId,
    });
  }

  return results;
}
