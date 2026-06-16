/**
 * Helpers puros extraídos de `AdminWorkspace` (sin estado ni hooks) para poder testearlos
 * de forma aislada y reducir el tamaño del componente. Ver plan de descomposición.
 */
import type { Lead } from "../../data/leads";
import type { User } from "../../contexts/AuthContext";
import { foldSearchText } from "../../lib/searchText";

/** Saludo según la hora local (mañana/tarde/noche). */
export function dashboardTimeGreetingEs(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Lead asignado al usuario CRM (por id de Auth o por nombre mostrado). */
export function leadAssignedToCrmUser(lead: Lead, u: User): boolean {
  const uid = lead.assignedToUserId?.trim().toLowerCase();
  const crmId = u.id.trim().toLowerCase();
  if (uid && crmId && uid === crmId) return true;
  const at = foldSearchText(lead.assignedTo);
  const nm = foldSearchText(u.name);
  if (!at || !nm) return false;
  return at.includes(nm) || nm.includes(at);
}

/** Asesor o líder activo cuyo nombre o correo coincide con la búsqueda (texto ya normalizado). */
export function teamMemberMatchesFoldedQuery(u: User, q: string): boolean {
  if (u.role !== "asesor" && u.role !== "lider_grupo") return false;
  if (!u.isActive || !q) return false;
  return (
    foldSearchText(u.name).includes(q) ||
    foldSearchText(u.email).includes(q) ||
    foldSearchText(u.email.split("@")[0] ?? "").includes(q)
  );
}

/** Misma base que arriba, pero solo por nombre (filtro «nombre del asesor»). */
export function teamMemberNameMatchesFoldedQuery(u: User, q: string): boolean {
  if (u.role !== "asesor" && u.role !== "lider_grupo") return false;
  if (!u.isActive || !q) return false;
  return foldSearchText(u.name).includes(q);
}
