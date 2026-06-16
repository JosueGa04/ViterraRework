import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Lead } from "../../data/leads";
import type { User } from "../../contexts/AuthContext";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { fetchActiveLeads, fetchAllLeadsForAdmin } from "../../lib/supabaseLeads";
import { filterLeadsForUser } from "../../lib/leadsAccess";
import { effectiveRoleFromView, type AdminViewAsRole } from "../../lib/adminViewAsRole";

export type LeadsData = {
  leads: Lead[];
  setLeads: Dispatch<SetStateAction<Lead[]>>;
  leadsLoading: boolean;
  setLeadsLoading: Dispatch<SetStateAction<boolean>>;
  leadsError: string | null;
  setLeadsError: Dispatch<SetStateAction<string | null>>;
  /** Leads visibles para el usuario efectivo (filtrados por permisos y sin archivados). */
  leadsForUser: Lead[];
  /** Re-carga manual (botón «Refrescar» en Consultas; también al cambiar de vista admin). */
  reloadLeads: () => Promise<void>;
};

/**
 * Estado y carga de leads. Posee `leads`/`leadsLoading`/`leadsError` y deriva `leadsForUser`.
 * Expone los setters porque el efecto de carga combinado y los handlers CRUD viven (por ahora)
 * en AdminWorkspace; este hook concentra la derivación por usuario, la recarga manual y el
 * refetch al cambiar de rol de vista (admin).
 */
export function useLeadsData(params: {
  user: User | null;
  effectiveUser: User | null;
  adminViewAs: AdminViewAsRole;
  isRealAdmin: boolean;
}): LeadsData {
  const { user, effectiveUser, adminViewAs, isRealAdmin } = params;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const leadsForUser = useMemo(
    () =>
      effectiveUser
        ? filterLeadsForUser(leads, effectiveUser).filter(
            (l) => l.crmSoftDeletedAt == null || String(l.crmSoftDeletedAt).trim() === "",
          )
        : [],
    [leads, effectiveUser],
  );

  const reloadLeads = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    setLeadsLoading(true);
    setLeadsError(null);
    const loader =
      user && effectiveRoleFromView(user, adminViewAs) === "admin"
        ? fetchAllLeadsForAdmin
        : fetchActiveLeads;
    try {
      const res = await loader(client);
      if (res.error) {
        setLeadsError(res.error.message);
      } else {
        setLeads(res.data);
      }
    } catch (e: unknown) {
      setLeadsError(e instanceof Error ? e.message : "No se pudieron cargar los leads.");
    } finally {
      setLeadsLoading(false);
    }
  }, [user, adminViewAs]);

  const adminViewAsRef = useRef(adminViewAs);
  useEffect(() => {
    if (!isRealAdmin || !user) return;
    if (adminViewAsRef.current === adminViewAs) return;
    adminViewAsRef.current = adminViewAs;
    void reloadLeads();
  }, [isRealAdmin, user, adminViewAs, reloadLeads]);

  return {
    leads,
    setLeads,
    leadsLoading,
    setLeadsLoading,
    leadsError,
    setLeadsError,
    leadsForUser,
    reloadLeads,
  };
}
