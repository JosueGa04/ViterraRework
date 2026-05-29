import type { UserRole } from "../contexts/authContextTypes";

/** Asesores / usuarios CRM para asignación de leads en la UI (hasta integrar `tokko_users`). */
export const CRM_ASSIGNEES: {
  id: string;
  name: string;
  email?: string;
  role?: UserRole;
  tokkoUserId?: string;
  picture?: string;
}[] = [
  { id: "1", name: "Admin Viterra" },
  { id: "2", name: "Patricia López" },
  { id: "3", name: "Laura Méndez" },
  { id: "4", name: "María González" },
  { id: "5", name: "Carlos Rodríguez" },
];

export function getAssigneeNameById(id: string): string {
  return CRM_ASSIGNEES.find((a) => a.id === id)?.name ?? "Sin asignar";
}

/** Resuelve nombre para `assigned_to_user_id` (UUID de Supabase o ids legacy del mock). */
export function resolveAssigneeName(
  id: string,
  teamUsers: { id: string; name: string }[]
): string {
  const fromTeam = teamUsers.find((u) => u.id === id)?.name;
  if (fromTeam) return fromTeam;
  return getAssigneeNameById(id);
}
