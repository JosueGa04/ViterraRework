import type { Lead } from "../../data/leads";

export type LeadTableSection = { statusId: string; label: string; leads: Lead[] };

/**
 * Leads visibles en el grupo de pipeline activo. Si el grupo activo es el "General"
 * (`defaultGroupId`), devuelve los leads de TODOS los grupos permitidos (vista agregada);
 * si no, solo los del grupo activo.
 */
export function filterLeadsByActiveGroup(
  leads: Lead[],
  activeGroupId: string,
  allowedGroupIds: string[],
  defaultGroupId: string,
): Lead[] {
  if (activeGroupId === defaultGroupId) {
    const allowed = new Set(allowedGroupIds);
    return leads.filter((l) => allowed.has(l.pipelineGroupId));
  }
  return leads.filter((l) => l.pipelineGroupId === activeGroupId);
}

/**
 * Orden de estados para renderizar: las columnas configuradas del pipeline, más cualquier
 * estado presente en los leads que no esté en ellas (deduplicado y ordenado alfabéticamente).
 */
export function computeLeadStatusesForRendering(columnStatuses: string[], leads: Lead[]): string[] {
  const seen = new Set(columnStatuses);
  const extraIds = [...new Set(leads.map((l) => l.status))]
    .filter((id) => !!id && !seen.has(id))
    .sort();
  return [...columnStatuses, ...extraIds];
}

/**
 * Agrupa leads por estado en secciones (para la vista tabla), siguiendo el orden de
 * `orderedStatusIds` y omitiendo secciones vacías. `resolveLabel` traduce el id a etiqueta.
 */
export function groupLeadsByStatus(
  leads: Lead[],
  orderedStatusIds: string[],
  resolveLabel: (id: string) => string,
): LeadTableSection[] {
  const byStatus = new Map<string, Lead[]>();
  for (const lead of leads) {
    const list = byStatus.get(lead.status) ?? [];
    list.push(lead);
    byStatus.set(lead.status, list);
  }
  const sections: LeadTableSection[] = [];
  for (const id of orderedStatusIds) {
    const list = byStatus.get(id);
    if (list?.length) sections.push({ statusId: id, label: resolveLabel(id), leads: list });
  }
  return sections;
}
