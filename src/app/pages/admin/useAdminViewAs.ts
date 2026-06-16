import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "../../contexts/AuthContext";
import {
  contextUserForViewAs,
  effectiveRoleFromView,
  loadAdminViewAsRole,
  type AdminViewAsRole,
} from "../../lib/adminViewAsRole";

export type AdminViewAsState = {
  /** Rol previsualizado por el admin (admin/líder/asesor). Persiste vía sessionStorage. */
  adminViewAs: AdminViewAsRole;
  setAdminViewAs: Dispatch<SetStateAction<AdminViewAsRole>>;
  /** El usuario real es admin (controla si el switcher se muestra). */
  isRealAdmin: boolean;
  /** Rol efectivo: el real, o el previsualizado si el admin está "viendo como". */
  effectiveRole: AdminViewAsRole;
  /** Usuario efectivo para permisos/filtros (admin con el rol cambiado, misma identidad). */
  effectiveUser: User | null;
  isAdmin: boolean;
  isGroupLeader: boolean;
  isAdvisor: boolean;
};

/**
 * Encapsula la "vista por rol" del admin. NO cambia de identidad: solo deriva el rol/permisos
 * efectivos desde la propia cuenta del admin. El guardado y la navegación al cambiar de rol
 * se manejan en el componente (acoplados a goTab/activeTab).
 */
export function useAdminViewAs(user: User | null): AdminViewAsState {
  const [adminViewAs, setAdminViewAs] = useState<AdminViewAsRole>(loadAdminViewAsRole);
  const isRealAdmin = user?.role === "admin";
  const effectiveRole = effectiveRoleFromView(user, adminViewAs);
  const effectiveUser = useMemo(
    () => contextUserForViewAs(user, adminViewAs),
    [user, adminViewAs],
  );
  return {
    adminViewAs,
    setAdminViewAs,
    isRealAdmin,
    effectiveRole,
    effectiveUser,
    isAdmin: effectiveRole === "admin",
    isGroupLeader: effectiveRole === "lider_grupo",
    isAdvisor: effectiveRole === "asesor",
  };
}
