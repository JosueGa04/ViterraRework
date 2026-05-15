import { lazy, Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Home,
  MessageSquare,
  TrendingUp,
  Search,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  MapPin,
  LogOut,
  Plus,
  Bed,
  Bath,
  Square,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Target,
  Briefcase,
  Globe2,
  Building2,
  LayoutGrid,
  Table2,
  Filter,
  User as UserIcon,
  Link2,
  Download,
  Calendar,
  Settings,
  Map as MapIcon,
  UserCircle2,
  Star,
  TextSearch,
  Copy,
  Hash,
  History,
  BarChart3,
} from "lucide-react";
import { useAuth, type User } from "../../contexts/AuthContext";
import {
  Lead,
  LEAD_STATUS_LABEL,
  labelForLeadStatus,
  newLeadActivityId,
  newCustomStageId,
  normalizeLeadPipelineStatus,
  type CustomKanbanStage,
} from "../../data/leads";
import { getSupabaseClient, getSupabaseProjectHost, syncSupabaseAuthSession } from "../../lib/supabaseClient";
import { logTableCountHints } from "../../lib/supabaseDiagnostics";
import {
  fetchActiveLeads,
  insertLead,
  updateLead,
  softDeleteLead,
} from "../../lib/supabaseLeads";
import { toast } from "sonner";
import {
  appendClientActivity,
  CLIENTS_STORAGE_KEY,
  findClientForLeadContact,
  newClientId,
  normalizeStoredClient,
  normalizeEmailKey,
  normalizePhoneKey,
  newClientActivityId,
  type CrmClient,
} from "../../data/clients";
import { LeadsKanbanBoard } from "../../components/admin/LeadsKanbanBoard";
import { LeadPriorityBadge } from "../../components/admin/LeadPriorityBadge";
import { AddLeadDialog } from "../../components/admin/AddLeadDialog";
import { LeadDetailDialog } from "../../components/admin/LeadDetailDialog";
import { AdminClientsManager } from "../../components/admin/AdminClientsManager";
import { PropertyFormDialog } from "../../components/admin/PropertyFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { canViewAllLeads, filterLeadsForUser, roleLabelEs } from "../../lib/leadsAccess";
import { copyPublicPageUrl } from "../../lib/copyPublicLink";
import { Property } from "../../components/PropertyCard";
import { useCatalogProperties } from "../../hooks/useCatalogProperties";
import {
  idFromPropertyWriteResult,
  insertProperty,
  softDeleteProperty,
  updateProperty,
  updatePropertyFeatured,
  MAX_FEATURED_PROPERTIES,
} from "../../lib/supabaseProperties";
import {
  sortCatalogProperties,
  CATALOG_PROPERTY_SORT_OPTIONS,
  type CatalogPropertySortKey,
} from "../../lib/catalogPropertySort";
import type { Development } from "../../data/developments";
import {
  fetchDevelopmentsWithUnits,
  upsertDevelopment,
  softDeleteDevelopment,
} from "../../lib/supabaseDevelopments";
import { insertCatalogActivity } from "../../lib/supabaseCatalogActivities";
import {
  buildDevelopmentSaveEvent,
  buildDevelopmentSnapshot,
  buildPropertySaveEvent,
  buildPropertySnapshot,
  isInventoryTimelineAction,
  type CatalogActivityAction,
} from "../../lib/catalogActivityPayload";
import { AdminActivitiesModule } from "../../components/admin/AdminActivitiesModule";
import {
  AGENDA_STORAGE_KEY,
  normalizeStoredAgenda,
  type AgendaAppointment,
} from "../../data/agenda";
import { AdminAgendaModule } from "../../components/admin/AdminAgendaModule";
import { AdminDevelopmentsManager } from "../../components/admin/AdminDevelopmentsManager";
import { AdminCompanySettings } from "../../components/admin/AdminCompanySettings";
import { AdminUsersManager } from "../../components/admin/AdminUsersManager";
import { AdminUserProfilePanel } from "../../components/admin/AdminUserProfilePanel";
import { AdvisorDashboard } from "../../components/admin/AdvisorDashboard";
import { GroupLeaderDashboard } from "../../components/admin/GroupLeaderDashboard";
import { PipelineStageReorderRow } from "../../components/admin/PipelineStageReorderRow";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
const KPIsModule = lazy(() =>
  import("../../components/admin/kpis/KPIsModule").then((m) => ({ default: m.KPIsModule }))
);
const AdminSiteEditor = lazy(() =>
  import("../../components/admin/AdminSiteEditor").then((m) => ({ default: m.AdminSiteEditor }))
);
const PropertyMap = lazy(() =>
  import("../../components/PropertyMap").then((m) => ({ default: m.PropertyMap }))
);
const AdminDashboardCharts = lazy(() =>
  import("./AdminDashboardCharts").then((m) => ({ default: m.AdminDashboardCharts }))
);
import { cn } from "../../components/ui/utils";
import {
  DEFAULT_BUILTIN_STAGE_HEX,
  DEFAULT_CUSTOM_STAGE_HEX,
  LIST_STAGE_HEADER_BUTTON_CLASSES,
  stageHexToChipStyle,
  stageHexToListHeaderStyle,
} from "../../lib/stageColors";
import {
  DEFAULT_PIPELINE_GROUP_ID,
  canConfigurePipelineForGroup,
  cloneGroupPipelineSnapshot,
  createDefaultBuiltinPipelineSnapshot,
  createEmptyGroupPipelineSnapshot,
  getAllowedPipelineGroupIds,
  loadPipelineByGroup,
  normalizeStageOrder,
  pipelineContextStorageKey,
  savePipelineByGroup,
  type GroupPipelineSnapshot,
} from "../../lib/pipelineByGroup";
import { type UserGroup } from "../../lib/userGroups";
import { fetchActiveUserGroups, softDeleteUserGroup, upsertUserGroup } from "../../lib/supabaseUserGroups";
import {
  buildPipelineByGroupFromSources,
  fetchSalesPipelineConfigs,
  persistSalesPipelineConfigs,
} from "../../lib/supabaseSalesPipeline";
import { foldSearchText } from "../../lib/searchText";
import { buildAdminHref, parseAdminPath, type AdminTab, type CompanySubtab } from "./adminNavigation";
import { PdfDownloadDropdown } from "../../components/pdf/PdfDownloadDropdown";
import {
  AdminActivitiesSkeleton,
  AdminChartsRowSkeleton,
  AdminClientsSkeleton,
  AdminCompanySkeleton,
  AdminDashboardSkeleton,
  AdminDevelopmentsSkeleton,
  AdminKpisSkeleton,
  AdminLeadsTabSkeleton,
  AdminPipelineDashboardSkeleton,
  AdminPropertiesSkeleton,
  AdminWorkspaceAuthLoadingShell,
} from "./AdminSectionSkeletons";

type TabType = AdminTab;

function dashboardTimeGreetingEs(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "Buenos días";
  if (h >= 12 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Lead asignado al usuario CRM (id o nombre mostrado). */
function leadAssignedToCrmUser(lead: Lead, u: User): boolean {
  const uid = lead.assignedToUserId?.trim().toLowerCase();
  const crmId = u.id.trim().toLowerCase();
  if (uid && crmId && uid === crmId) return true;
  const at = foldSearchText(lead.assignedTo);
  const nm = foldSearchText(u.name);
  if (!at || !nm) return false;
  return at.includes(nm) || nm.includes(at);
}

/** Asesor o líder activo cuyo nombre o correo coincide con la búsqueda (texto ya normalizado). */
function teamMemberMatchesFoldedQuery(u: User, q: string): boolean {
  if (u.role !== "asesor" && u.role !== "lider_grupo") return false;
  if (!u.isActive || !q) return false;
  return (
    foldSearchText(u.name).includes(q) ||
    foldSearchText(u.email).includes(q) ||
    foldSearchText(u.email.split("@")[0] ?? "").includes(q)
  );
}

/** Misma base que arriba, pero solo por nombre (filtro «nombre del asesor»). */
function teamMemberNameMatchesFoldedQuery(u: User, q: string): boolean {
  if (u.role !== "asesor" && u.role !== "lider_grupo") return false;
  if (!u.isActive || !q) return false;
  return foldSearchText(u.name).includes(q);
}

function adminModuleFallback(className?: string) {
  return (
    <div
      className={cn("min-h-[12rem] animate-pulse rounded-2xl border border-slate-200/80 bg-slate-50/90", className)}
      aria-hidden
    />
  );
}

const ADMIN_SIDEBAR_EXPANDED_KEY = "viterra-admin-sidebar-expanded";
/** Debe coincidir con `lg:w-[14.5rem]` del aside para anclar el asa en la unión con el contenido. */
const ADMIN_SIDEBAR_LG_WIDTH = "14.5rem";

function readStoredAdminSidebarExpanded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(ADMIN_SIDEBAR_EXPANDED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function AdminWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tab: activeTab, companySubtab } = useMemo(
    () => parseAdminPath(location.pathname),
    [location.pathname]
  );
  const goTab = useCallback(
    (tab: TabType, sub?: CompanySubtab) => {
      navigate(buildAdminHref(tab, sub ?? "users"));
    },
    [navigate]
  );

  /** Evita pedir catálogo, leads o desarrollos enteros en pestañas que no los usan (mejora mucho el tiempo hasta interactuar). */
  const adminRemoteDataPlan = useMemo(() => {
    const needsLeads =
      activeTab === "dashboard" ||
      activeTab === "kpis" ||
      activeTab === "leads" ||
      activeTab === "clients" ||
      (activeTab === "company" && companySubtab !== "site");

    const needsDevelopments =
      activeTab === "developments" ||
      activeTab === "leads" ||
      activeTab === "clients" ||
      (activeTab === "company" && (companySubtab === "users" || companySubtab === "settings"));

    const needsCatalog =
      activeTab === "dashboard" ||
      activeTab === "kpis" ||
      activeTab === "leads" ||
      activeTab === "clients" ||
      activeTab === "properties" ||
      activeTab === "developments" ||
      (activeTab === "company" && (companySubtab === "users" || companySubtab === "settings"));

    return { needsLeads, needsDevelopments, needsCatalog };
  }, [activeTab, companySubtab]);

  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) return;
    const parsed = parseAdminPath(location.pathname);
    const canonical = buildAdminHref(parsed.tab, parsed.companySubtab);
    const cur = location.pathname.replace(/\/+$/, "") || "/admin";
    const target = canonical.replace(/\/+$/, "");
    if (cur !== target) {
      navigate(target, { replace: true });
    }
  }, [location.pathname, navigate]);

  const {
    user,
    users,
    logout,
    authReady,
    isAuthenticated,
    createUser,
    updateUser,
    updateUserPassword,
    updateUserPermissions,
    archiveUser,
    reactivateUser,
  } = useAuth();
  const [stageDraftLabel, setStageDraftLabel] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const {
    properties,
    loading: catalogPropertiesLoading,
    reload: reloadProperties,
    patchProperty: patchCatalogProperty,
    applySavedProperty,
  } = useCatalogProperties({ enabled: adminRemoteDataPlan.needsCatalog, omitPayload: true });
  const [newPropertyDraftId, setNewPropertyDraftId] = useState(() => crypto.randomUUID());
  const [developments, setDevelopments] = useState<Development[]>([]);
  const [developmentsLoading, setDevelopmentsLoading] = useState(true);
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [focusClient, setFocusClient] = useState<{ id: string; nonce: number } | null>(null);
  const [seedClientFromLead, setSeedClientFromLead] = useState<{ lead: Lead; nonce: number } | null>(
    null
  );
  const [propertySearchQuery, setPropertySearchQuery] = useState("");
  const [propertyReferenceCodeQuery, setPropertyReferenceCodeQuery] = useState("");
  const [propertyOperationFilter, setPropertyOperationFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [propertyLocationFilter, setPropertyLocationFilter] = useState("all");
  /** Misma noción que en desarrollos: todas / solo destacadas (portada) / sin destacar. */
  const [propertyFeaturedFilter, setPropertyFeaturedFilter] = useState<"all" | "featured" | "normal">("all");
  const [propertyCatalogSort, setPropertyCatalogSort] = useState<CatalogPropertySortKey>("newest");
  const [expandedLeaderGroupId, setExpandedLeaderGroupId] = useState<string | null>(null);
  const [propertyInventoryView, setPropertyInventoryView] = useState<"cards" | "list" | "map">("cards");
  const [adminHeaderQuery, setAdminHeaderQuery] = useState("");
  const [adminSidebarExpanded, setAdminSidebarExpanded] = useState(readStoredAdminSidebarExpanded);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_SIDEBAR_EXPANDED_KEY, adminSidebarExpanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [adminSidebarExpanded]);
  /** Ámbito del texto de búsqueda en leads (admin, líder y asesor comparten la misma lógica). */
  const [leadSearchNameScope, setLeadSearchNameScope] = useState<"all" | "client" | "advisor">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createdRangeFilter, setCreatedRangeFilter] = useState<
    "all" | "1m" | "3m" | "6m" | "1y" | "custom"
  >("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [leadsView, setLeadsView] = useState<"kanban" | "table">("kanban");
  /** Vista lista: secciones por estado; true = colapsada */
  const [leadsTableSectionCollapsed, setLeadsTableSectionCollapsed] = useState<Record<string, boolean>>({});
  const [pipelineByGroup, setPipelineByGroup] = useState<Record<string, GroupPipelineSnapshot>>(() => ({
    [DEFAULT_PIPELINE_GROUP_ID]: createDefaultBuiltinPipelineSnapshot(),
  }));
  /** Tras cargar pipeline desde Supabase (y fusionar local legacy si aplica). */
  const [pipelineSourcesHydrated, setPipelineSourcesHydrated] = useState(false);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [activePipelineGroupId, setActivePipelineGroupId] = useState<string>(DEFAULT_PIPELINE_GROUP_ID);
  const [pipelineCopyFrom, setPipelineCopyFrom] = useState<string>("");
  const [pipelineCopyTo, setPipelineCopyTo] = useState<string>("");
  const [leadDialog, setLeadDialog] = useState<{ lead: Lead; mode: "view" | "edit" } | null>(null);
  const [usersPanelFocus, setUsersPanelFocus] = useState<{ id: string; nonce: number } | null>(null);
  /** Si se abrió la ficha desde un lead (CRM), al cerrar restauramos tab y diálogo del lead. */
  const pendingReturnFromUserDetailRef = useRef<{
    tab: TabType;
    companySubtab: "users" | "site" | "leadStages" | "settings";
    leadsView: "kanban" | "table";
    leadDialog: { lead: Lead; mode: "view" | "edit" } | null;
  } | null>(null);
  const [dashboardRouteSearchOpen, setDashboardRouteSearchOpen] = useState(false);
  const [propertyForm, setPropertyForm] = useState<{
    mode: "create" | "edit";
    property: Property | null;
  } | null>(null);
  const [deletePipelineStage, setDeletePipelineStage] = useState<{ id: string; label: string } | null>(
    null
  );
  const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null);
  /** Agenda local (localStorage). Se hidrata para alimentar las métricas de citas en KPI's. */
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const isGroupLeader = user?.role === "lider_grupo";
  const isAdmin = user?.role === "admin";
  const isAdvisor = user?.role === "asesor";
  const canAccessCompanyModule = !isAdvisor;
  const canEditSite = useMemo(
    () => !isAdvisor && (isAdmin || (user?.permissions?.includes("edit_site") ?? false)),
    [isAdvisor, isAdmin, user],
  );
  // Inventario (propiedades/desarrollos) solo editable por administradores.
  const canManageInventory = user?.role === "admin";

  const crmBootstrapReady = pipelineSourcesHydrated;
  /**
   * Dashboard y KPI's esperan pipeline remoto (embudo coherente con Supabase). El tab Leads solo espera la query
   * de leads: el pipeline ya tiene snapshot local por defecto hasta fusionar con la red.
   */
  const crmCoreLoading = leadsLoading || !crmBootstrapReady;
  const dashboardChartsLoading = crmCoreLoading;
  const leadsModuleLoading = leadsLoading;
  const kpisModuleLoading = crmCoreLoading;
  /** Sitio y ajustes no dependen del pipeline; usuarios puede mostrarse con leads aún cargando en segundo plano. */
  const companyModuleLoading =
    (companySubtab === "leadStages" && !crmBootstrapReady) ||
    (companySubtab === "users" && leadsLoading);

  const logCatalogActivity = useCallback(
    async (row: {
      entity_type: "property" | "development";
      entity_id: string;
      action: CatalogActivityAction;
      snapshot: Record<string, unknown>;
      diff?: Record<string, unknown> | null;
    }) => {
      const client = getSupabaseClient();
      if (!client || !user?.id) return;
      const { error } = await insertCatalogActivity(client, {
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        action: row.action,
        actor_user_id: user.id,
        actor_name: user.name,
        source: "admin",
        snapshot: row.snapshot,
        diff: row.diff ?? null,
      });
      if (error && import.meta.env.DEV) {
        console.warn("[Viterra] catalog_activities:", error.message);
      }
    },
    [user]
  );

  // Carga la agenda local para alimentar las métricas de citas en KPI's.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AGENDA_STORAGE_KEY);
      if (!raw) {
        setAppointments([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setAppointments(normalizeStoredAgenda(parsed));
    } catch {
      setAppointments([]);
    }
  }, [activeTab]);

  // Verificar autenticación y cargar datos (grupos + pipeline siempre; leads / desarrollos / catálogo según pestaña).
  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (user?.mustChangePassword) {
      navigate("/admin/cambiar-contrasena", { replace: true });
      return;
    }

    const { needsLeads, needsDevelopments } = adminRemoteDataPlan;

    if (needsLeads) {
      setLeadsLoading(true);
      setLeadsError(null);
    } else {
      setLeadsLoading(false);
      setLeadsError(null);
    }
    if (needsDevelopments) {
      setDevelopmentsLoading(true);
    } else {
      setDevelopmentsLoading(false);
    }

    let cancelled = false;
    (async () => {
      const client = getSupabaseClient();
      if (!client) {
        setLeadsError(
          "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env (el prefijo VITE_ es obligatorio en Vite)."
        );
        setLeads([]);
        setDevelopments([]);
        setLeadsLoading(false);
        setDevelopmentsLoading(false);
        setUserGroups([]);
        setPipelineByGroup(loadPipelineByGroup());
        setPipelineSourcesHydrated(true);
        return;
      }

      const { hasSession } = await syncSupabaseAuthSession(client);
      if (!hasSession) {
        setLeadsError(
          "No hay sesión de Supabase en el cliente. Cierra sesión y vuelve a entrar, o revisa que el dominio no bloquee localStorage."
        );
        setLeads([]);
        setDevelopments([]);
        setLeadsLoading(false);
        setDevelopmentsLoading(false);
        setUserGroups([]);
        setPipelineByGroup(loadPipelineByGroup());
        setPipelineSourcesHydrated(true);
        return;
      }

      const leadsP = needsLeads
        ? fetchActiveLeads(client)
            .then((leadsRes) => {
              if (cancelled) return;
              if (leadsRes.error) {
                setLeadsError(leadsRes.error.message);
                setLeads([]);
              } else {
                setLeads(leadsRes.data);
                if (import.meta.env.DEV && leadsRes.data.length === 0) {
                  void logTableCountHints(client, "leads");
                }
              }
              setLeadsLoading(false);
            })
            .catch((e: unknown) => {
              if (cancelled) return;
              setLeadsError(e instanceof Error ? e.message : "No se pudieron cargar los leads.");
              setLeads([]);
              setLeadsLoading(false);
            })
        : Promise.resolve().then(() => {
            if (cancelled) return;
            setLeadsLoading(false);
          });

      const devP = needsDevelopments
        ? fetchDevelopmentsWithUnits(client, { publicOnly: false }).then((devRes) => {
            if (cancelled) return;
            if (devRes.error) {
              toast.error(devRes.error.message);
              setDevelopments([]);
            } else {
              setDevelopments(devRes.data ?? []);
              if (import.meta.env.DEV && (devRes.data?.length ?? 0) === 0) {
                void logTableCountHints(client, "developments");
              }
            }
            setDevelopmentsLoading(false);
          })
        : Promise.resolve().then(() => {
            if (cancelled) return;
            setDevelopmentsLoading(false);
          });

      const bootstrapP = Promise.all([fetchActiveUserGroups(client), fetchSalesPipelineConfigs(client)]).then(
        ([groupsRes, pipeRes]) => {
          if (cancelled) return;

          let groupsData: UserGroup[] = [];
          if (groupsRes.error) {
            if (import.meta.env.DEV) {
              console.warn("[Viterra] No se pudieron cargar grupos desde DB:", groupsRes.error.message);
            }
            setUserGroups([]);
          } else {
            groupsData = groupsRes.data;
            setUserGroups(groupsRes.data);
          }

          const allowedGroupIds = user
            ? getAllowedPipelineGroupIds(user, groupsData)
            : [DEFAULT_PIPELINE_GROUP_ID];
          const localLegacy = loadPipelineByGroup();
          if (pipeRes.error) {
            if (import.meta.env.DEV) {
              console.warn("[Viterra] sales_pipeline_configs:", pipeRes.error.message);
            }
            setPipelineByGroup(buildPipelineByGroupFromSources([], allowedGroupIds, localLegacy));
          } else {
            setPipelineByGroup(buildPipelineByGroupFromSources(pipeRes.data, allowedGroupIds, localLegacy));
          }
          setPipelineSourcesHydrated(true);

          if (import.meta.env.DEV) {
            const host = getSupabaseProjectHost();
            if (host) {
              console.info(
                "[Viterra] Comprueba que este host coincide con tu proyecto en Supabase Dashboard:",
                host
              );
            }
          }
        }
      );

      await Promise.all([leadsP, devP, bootstrapP]);
    })();

    const savedClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (savedClients) {
      try {
        const parsed = JSON.parse(savedClients) as unknown[];
        if (Array.isArray(parsed)) {
          setClients(parsed.map((row) => normalizeStoredClient(row as Record<string, unknown>)));
        }
      } catch {
        setClients([]);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [
    navigate,
    isAuthenticated,
    authReady,
    user?.mustChangePassword,
    user?.id,
    user?.role,
    adminRemoteDataPlan,
  ]);

  useEffect(() => {
    if (!pipelineSourcesHydrated) return;
    const client = getSupabaseClient();
    const handle = window.setTimeout(() => {
      if (client) {
        void persistSalesPipelineConfigs(client, pipelineByGroup).then((r) => {
          if (r.error) {
            toast.error(`Pipeline: no se pudo guardar en la base (${r.error.message}).`);
            savePipelineByGroup(pipelineByGroup);
          }
        });
      } else {
        savePipelineByGroup(pipelineByGroup);
      }
    }, 500);
    return () => window.clearTimeout(handle);
  }, [pipelineByGroup, pipelineSourcesHydrated]);

  useEffect(() => {
    document.body.classList.add("admin-crm-montserrat");
    return () => {
      document.body.classList.remove("admin-crm-montserrat");
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  }, [clients]);

  const handleUserGroupsChange = useCallback(
    async (nextGroups: UserGroup[]) => {
      const client = getSupabaseClient();
      const prevGroups = userGroups;
      setUserGroups(nextGroups);
      if (!client) return;

      const prevIds = new Set(prevGroups.map((g) => g.id));
      const nextIds = new Set(nextGroups.map((g) => g.id));
      const deletedIds = [...prevIds].filter((id) => !nextIds.has(id));

      const upsertResults = await Promise.all(nextGroups.map((g) => upsertUserGroup(client, g)));
      const deleteResults = await Promise.all(deletedIds.map((id) => softDeleteUserGroup(client, id)));
      const failed = [
        ...upsertResults.filter((r) => !!r.error).map((r) => r.error?.message ?? "upsert_error"),
        ...deleteResults.filter((r) => !!r.error).map((r) => r.error?.message ?? "delete_error"),
      ];
      if (failed.length > 0) {
        setUserGroups(prevGroups);
        toast.error("No se pudieron guardar algunos cambios de grupos en la base de datos.");
        if (import.meta.env.DEV) {
          console.warn("[Viterra] Fallo al persistir grupos:", failed);
        }
        return;
      }

      setPipelineByGroup((prev) => {
        const next = { ...prev };
        for (const id of deletedIds) {
          delete next[id];
        }
        const defaultFromGeneral =
          next[DEFAULT_PIPELINE_GROUP_ID] ?? createDefaultBuiltinPipelineSnapshot();
        for (const g of nextGroups) {
          if (!next[g.id]) next[g.id] = cloneGroupPipelineSnapshot(defaultFromGeneral);
        }
        return next;
      });

      if (nextGroups.length > prevGroups.length) {
        toast.success("Grupo creado y guardado correctamente en la base de datos.");
      } else if (nextGroups.length < prevGroups.length) {
        toast.success("Grupo eliminado y cambios guardados en la base de datos.");
      } else {
        toast.success("Grupo actualizado y guardado en la base de datos.");
      }
    },
    [userGroups]
  );

  const allowedPipelineGroupIds = useMemo(
    () => (user ? getAllowedPipelineGroupIds(user, userGroups) : [DEFAULT_PIPELINE_GROUP_ID]),
    [user, userGroups]
  );
  const visiblePipelineGroupIds = useMemo(
    () =>
      isGroupLeader
        ? allowedPipelineGroupIds.filter((groupId) => groupId !== DEFAULT_PIPELINE_GROUP_ID)
        : allowedPipelineGroupIds,
    [isGroupLeader, allowedPipelineGroupIds]
  );

  useEffect(() => {
    if (!user) return;
    setActivePipelineGroupId((prev) => {
      if (visiblePipelineGroupIds.includes(prev)) return prev;
      const key = pipelineContextStorageKey(user.id);
      const saved = localStorage.getItem(key);
      if (saved && visiblePipelineGroupIds.includes(saved)) return saved;
      return visiblePipelineGroupIds[0] ?? "";
    });
  }, [user, visiblePipelineGroupIds]);

  useEffect(() => {
    if (!user) return;
    if (!activePipelineGroupId) return;
    localStorage.setItem(pipelineContextStorageKey(user.id), activePipelineGroupId);
  }, [user, activePipelineGroupId]);

  useEffect(() => {
    if (!isAdvisor) return;
    if (activeTab !== "company") return;
    navigate(buildAdminHref("dashboard"), { replace: true });
  }, [isAdvisor, activeTab, navigate]);

  useEffect(() => {
    if (!user) return;
    if (canEditSite) return;
    if (activeTab === "sitio" || (activeTab === "company" && companySubtab === "site")) {
      navigate(buildAdminHref("dashboard"), { replace: true });
    }
  }, [user, canEditSite, activeTab, companySubtab, navigate]);

  useEffect(() => {
    if (!activePipelineGroupId) return;
    setPipelineByGroup((prev) => {
      if (prev[activePipelineGroupId]) return prev;
      if (activePipelineGroupId === DEFAULT_PIPELINE_GROUP_ID) {
        return { ...prev, [activePipelineGroupId]: createDefaultBuiltinPipelineSnapshot() };
      }
      const template =
        prev[DEFAULT_PIPELINE_GROUP_ID] ?? createDefaultBuiltinPipelineSnapshot();
      return { ...prev, [activePipelineGroupId]: cloneGroupPipelineSnapshot(template) };
    });
  }, [activePipelineGroupId]);

  const activePipeline = useMemo((): GroupPipelineSnapshot => {
    const cur = pipelineByGroup[activePipelineGroupId];
    if (cur) return cur;
    if (activePipelineGroupId === DEFAULT_PIPELINE_GROUP_ID) {
      return createDefaultBuiltinPipelineSnapshot();
    }
    return cloneGroupPipelineSnapshot(
      pipelineByGroup[DEFAULT_PIPELINE_GROUP_ID] ?? createDefaultBuiltinPipelineSnapshot()
    );
  }, [pipelineByGroup, activePipelineGroupId]);
  const customKanbanStages = activePipeline.customStages;
  const pipelineStageOrder = activePipeline.stageOrder;
  const stageColumnColors = activePipeline.stageColors;

  const leadsForUser = useMemo(() => filterLeadsForUser(leads, user), [leads, user]);

  const leadsInActivePipeline = useMemo(
    () => leadsForUser.filter((l) => l.pipelineGroupId === activePipelineGroupId),
    [leadsForUser, activePipelineGroupId]
  );

  const canConfigureActivePipeline = useMemo(
    () => (user ? canConfigurePipelineForGroup(user, activePipelineGroupId, userGroups) : false),
    [user, activePipelineGroupId, userGroups]
  );

  const allStageIds = useMemo(
    () => [...new Set([...customKanbanStages.map((s) => s.id), ...pipelineStageOrder])],
    [customKanbanStages, pipelineStageOrder]
  );

  useEffect(() => {
    setPipelineByGroup((map) => {
      const id = activePipelineGroupId;
      const cur = map[id] ?? createEmptyGroupPipelineSnapshot();
      const normalized = normalizeStageOrder(cur.stageOrder, allStageIds);
      if (
        normalized.length === cur.stageOrder.length &&
        normalized.every((x, i) => x === cur.stageOrder[i])
      ) {
        return map;
      }
      return { ...map, [id]: { ...cur, stageOrder: normalized } };
    });
  }, [allStageIds, activePipelineGroupId]);

  const pipelineGroupLabel = useCallback(
    (groupId: string) => {
      if (groupId === DEFAULT_PIPELINE_GROUP_ID) return "General (todos los equipos)";
      const g = userGroups.find((x) => x.id === groupId);
      return g?.name ?? groupId;
    },
    [userGroups]
  );

  const pipelineGroupsVisibleToLeader = useMemo(() => {
    if (!isGroupLeader) return [];
    return visiblePipelineGroupIds
      .map((groupId) => userGroups.find((group) => group.id === groupId))
      .filter((group): group is UserGroup => !!group);
  }, [isGroupLeader, visiblePipelineGroupIds, userGroups]);

  const pipelineCopySourceOptions = useMemo(() => {
    if (!user || user.role !== "admin") return [];
    return allowedPipelineGroupIds;
  }, [user, allowedPipelineGroupIds]);

  const pipelineCopyDestOptions = useMemo(() => {
    if (!user) return [];
    return allowedPipelineGroupIds.filter((id) => canConfigurePipelineForGroup(user, id, userGroups));
  }, [user, allowedPipelineGroupIds, userGroups]);

  const canSubmitPipelineCopy = useMemo(
    () =>
      Boolean(
        user &&
          pipelineCopyFrom &&
          pipelineCopyTo &&
          pipelineCopyFrom !== pipelineCopyTo &&
          pipelineCopySourceOptions.includes(pipelineCopyFrom) &&
          pipelineCopyDestOptions.includes(pipelineCopyTo)
      ),
    [user, pipelineCopyFrom, pipelineCopyTo, pipelineCopySourceOptions, pipelineCopyDestOptions]
  );

  const advisorsByGroupId = useMemo(() => {
    const grouped: Record<string, User[]> = {};
    for (const group of pipelineGroupsVisibleToLeader) {
      const advisors = group.memberIds
        .map((memberId) => users.find((member) => member.id === memberId))
        .filter((member): member is User => !!member && member.isActive && member.role === "asesor")
        .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
      grouped[group.id] = advisors;
    }
    return grouped;
  }, [pipelineGroupsVisibleToLeader, users]);

  const allowedLeadAssigneeUserIds = useMemo(() => {
    if (!user || user.role !== "lider_grupo") return undefined;
    if (!activePipelineGroupId) return [];
    const activeGroup = userGroups.find(
      (group) => group.id === activePipelineGroupId && group.leaderId === user.id
    );
    if (!activeGroup) return [];
    const ids = activeGroup.memberIds.filter((memberId) => {
      const member = users.find((u) => u.id === memberId);
      return !!member && member.isActive && member.role === "asesor";
    });
    return ids;
  }, [user, activePipelineGroupId, userGroups, users]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const requestDeleteProperty = (id: string) => {
    if (!canManageInventory) return;
    setDeletePropertyId(id);
  };

  const executeDeleteProperty = useCallback(async () => {
    if (!deletePropertyId) return;
    const deletedSnapshot = properties.find((p) => p.id === deletePropertyId);
    const client = getSupabaseClient();
    if (client) {
      const { error: delErr } = await softDeleteProperty(client, deletePropertyId);
      if (delErr) {
        toast.error(delErr.message);
        return;
      }
    }
    if (deletedSnapshot) {
      void logCatalogActivity({
        entity_type: "property",
        entity_id: deletedSnapshot.id,
        action: "deleted",
        snapshot: buildPropertySnapshot(deletedSnapshot),
        diff: null,
      });
    }
    await reloadProperties();
    setPropertyForm((f) => (f?.property?.id === deletePropertyId ? null : f));
    setDeletePropertyId(null);
  }, [deletePropertyId, logCatalogActivity, properties, reloadProperties]);

  const handleDeleteLead = useCallback(async (id: string) => {
    const client = getSupabaseClient();
    if (client) {
      const { error: delLeadErr } = await softDeleteLead(client, id);
      if (delLeadErr) {
        toast.error(delLeadErr.message);
        return;
      }
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setLeadDialog((d) => (d?.lead.id === id ? null : d));
  }, []);

  const handleDeleteDevelopment = useCallback(
    async (id: string) => {
      const deletedDev = developments.find((d) => d.id === id);
      const client = getSupabaseClient();
      if (client) {
        const { error } = await softDeleteDevelopment(client, id);
        if (error) {
          toast.error(error.message);
          return;
        }
        if (deletedDev) {
          void logCatalogActivity({
            entity_type: "development",
            entity_id: deletedDev.id,
            action: "deleted",
            snapshot: buildDevelopmentSnapshot(deletedDev),
            diff: null,
          });
        }
        const { data, error: fetchErr } = await fetchDevelopmentsWithUnits(client, { publicOnly: false });
        if (fetchErr) toast.error(fetchErr.message);
        else setDevelopments(data ?? []);
        return;
      }
      if (deletedDev) {
        void logCatalogActivity({
          entity_type: "development",
          entity_id: deletedDev.id,
          action: "deleted",
          snapshot: buildDevelopmentSnapshot(deletedDev),
          diff: null,
        });
      }
      setDevelopments((prev) => prev.filter((row) => row.id !== id));
    },
    [developments, logCatalogActivity]
  );

  const handleSaveDevelopment = useCallback(
    async (payload: Development) => {
      const normalizedPayload: Development = {
        ...payload,
        featured: Boolean(payload.featured),
      };
      const prev = developments.find((d) => d.id === normalizedPayload.id);
      const existed = developments.some((d) => d.id === normalizedPayload.id);
      const client = getSupabaseClient();
      if (client) {
        const res = await upsertDevelopment(client, normalizedPayload);
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        const { action, diff } = buildDevelopmentSaveEvent(prev, normalizedPayload, existed);
        if (isInventoryTimelineAction(action)) {
          void logCatalogActivity({
            entity_type: "development",
            entity_id: normalizedPayload.id,
            action,
            snapshot: buildDevelopmentSnapshot(normalizedPayload),
            diff,
          });
        }
        const { data, error: fetchErr } = await fetchDevelopmentsWithUnits(client, { publicOnly: false });
        if (fetchErr) {
          toast.error(fetchErr.message);
          return;
        }
        setDevelopments(data ?? []);
        toast.success(
          existed ? "Desarrollo actualizado correctamente." : "Desarrollo añadido correctamente."
        );
        return;
      }
      const { action, diff } = buildDevelopmentSaveEvent(prev, normalizedPayload, existed);
      if (isInventoryTimelineAction(action)) {
        void logCatalogActivity({
          entity_type: "development",
          entity_id: normalizedPayload.id,
          action,
          snapshot: buildDevelopmentSnapshot(normalizedPayload),
          diff,
        });
      }
      setDevelopments((prevState) => {
        const existsLocal = prevState.some((row) => row.id === normalizedPayload.id);
        return existsLocal
          ? prevState.map((row) => (row.id === normalizedPayload.id ? normalizedPayload : row))
          : [...prevState, normalizedPayload];
      });
      toast.success(
        existed ? "Desarrollo actualizado correctamente." : "Desarrollo añadido correctamente."
      );
    },
    [developments, logCatalogActivity]
  );

  const leadColumnStatuses = useMemo(() => {
    const base =
      pipelineStageOrder.length > 0
        ? [...pipelineStageOrder]
        : [...customKanbanStages.map((s) => s.id)];
    const seen = new Set(base);
    const fromLeads = [
      ...new Set(
        leadsInActivePipeline
          .map((l) => normalizeLeadPipelineStatus(l.status))
          .filter((id) => id.length > 0)
      ),
    ]
      .filter((id) => !seen.has(id))
      .sort();
    return [...base, ...fromLeads];
  }, [pipelineStageOrder, customKanbanStages, leadsInActivePipeline]);

  const statusSelectOptions = useMemo(
    () =>
      leadColumnStatuses.map((id) => ({
        value: id,
        label: labelForLeadStatus(id, customKanbanStages),
      })),
    [leadColumnStatuses, customKanbanStages]
  );

  const defaultLeadStageId = leadColumnStatuses[0] ?? null;

  const effectiveStageColors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of leadColumnStatuses) {
      let hex = stageColumnColors[id];
      if (!hex) {
        const k = Object.keys(stageColumnColors).find((c) => c.toLowerCase() === id.toLowerCase());
        hex = k ? stageColumnColors[k] : undefined;
      }
      if (hex) out[id] = hex;
      else if (DEFAULT_BUILTIN_STAGE_HEX[id]) out[id] = DEFAULT_BUILTIN_STAGE_HEX[id];
      else if (DEFAULT_BUILTIN_STAGE_HEX[id.toLowerCase()])
        out[id] = DEFAULT_BUILTIN_STAGE_HEX[id.toLowerCase()];
      else out[id] = DEFAULT_CUSTOM_STAGE_HEX;
    }
    return out;
  }, [leadColumnStatuses, stageColumnColors]);

  const resolveStageHex = useCallback(
    (stageId: string) =>
      effectiveStageColors[stageId] ??
      DEFAULT_BUILTIN_STAGE_HEX[stageId] ??
      DEFAULT_CUSTOM_STAGE_HEX,
    [effectiveStageColors],
  );

  const resolveStatusLabel = useCallback(
    (s: string) => labelForLeadStatus(s, customKanbanStages),
    [customKanbanStages]
  );

  const handleUpdateLeadStatus = useCallback(
    async (leadId: string, newStatus: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.status === newStatus) return;

      const updatedAt = new Date().toISOString();
      const prevLabel = resolveStatusLabel(lead.status);
      const nextLabel = resolveStatusLabel(newStatus);
      const nextLead: Lead = {
        ...lead,
        status: newStatus,
        updatedAt,
        activity: [
          {
            id: newLeadActivityId(),
            type: "status_change",
            createdAt: updatedAt,
            description: `Se movió de ${prevLabel} a ${nextLabel}`,
          },
          ...(lead.activity ?? []),
        ],
      };

      const client = getSupabaseClient();
      if (client) {
        const { error: updErr } = await updateLead(client, nextLead);
        if (updErr) {
          toast.error(updErr.message);
          return;
        }
      }

      setLeads((prev) => prev.map((l) => (l.id === leadId ? nextLead : l)));
      setLeadDialog((d) =>
        d && d.lead.id === leadId ? { ...d, lead: nextLead } : d
      );
    },
    [leads, resolveStatusLabel]
  );

  const handleAddKanbanStage = useCallback(
    (label: string) => {
      const id = newCustomStageId();
      setPipelineByGroup((map) => {
        const cur = map[activePipelineGroupId] ?? createEmptyGroupPipelineSnapshot();
        return {
          ...map,
          [activePipelineGroupId]: {
            ...cur,
            customStages: [...cur.customStages, { id, label }],
            stageOrder: [...cur.stageOrder, id],
          },
        };
      });
    },
    [activePipelineGroupId]
  );

  const handleDuplicatePipelineToTeam = useCallback(() => {
    if (!user) return;
    const from = pipelineCopyFrom.trim();
    const to = pipelineCopyTo.trim();
    if (!from || !to) {
      toast.error("Selecciona equipo de origen y equipo de destino.");
      return;
    }
    if (from === to) {
      toast.error("Origen y destino deben ser distintos.");
      return;
    }
    if (!pipelineCopySourceOptions.includes(from) || !pipelineCopyDestOptions.includes(to)) {
      toast.error("No puedes copiar con esa combinación (revisa permisos de equipos).");
      return;
    }
    if (!canConfigurePipelineForGroup(user, to, userGroups)) {
      toast.error("No puedes modificar el pipeline del equipo de destino.");
      return;
    }
    const raw = pipelineByGroup[from];
    const sourceSnap: GroupPipelineSnapshot =
      raw ??
      (from === DEFAULT_PIPELINE_GROUP_ID
        ? createDefaultBuiltinPipelineSnapshot()
        : createEmptyGroupPipelineSnapshot());
    setPipelineByGroup((map) => ({
      ...map,
      [to]: cloneGroupPipelineSnapshot(sourceSnap),
    }));
    setActivePipelineGroupId(to);
    setPipelineCopyTo("");
    toast.success(
      `Pipeline copiado de «${pipelineGroupLabel(from)}» a «${pipelineGroupLabel(to)}».`
    );
  }, [
    user,
    pipelineCopyFrom,
    pipelineCopyTo,
    pipelineByGroup,
    userGroups,
    pipelineCopySourceOptions,
    pipelineCopyDestOptions,
    pipelineGroupLabel,
  ]);

  const handleUpdateKanbanStage = useCallback(
    (stageId: string, label: string) => {
      setPipelineByGroup((map) => {
        const cur = map[activePipelineGroupId] ?? createEmptyGroupPipelineSnapshot();
        let matched = false;
        const nextCustom = cur.customStages.map((stage) => {
          if (stage.id === stageId || stage.id.toLowerCase() === stageId.toLowerCase()) {
            matched = true;
            return { ...stage, label };
          }
          return stage;
        });
        if (matched) {
          return {
            ...map,
            [activePipelineGroupId]: { ...cur, customStages: nextCustom },
          };
        }
        const builtinKey = stageId.trim().toLowerCase();
        if (Object.prototype.hasOwnProperty.call(LEAD_STATUS_LABEL, builtinKey)) {
          return map;
        }
        const canon = normalizeLeadPipelineStatus(stageId);
        const stageOrder = cur.stageOrder.map((id) =>
          id === stageId || id.toLowerCase() === stageId.toLowerCase() ? canon : id
        );
        const nextColors = { ...cur.stageColors };
        for (const k of Object.keys(nextColors)) {
          if (k === stageId || k.toLowerCase() === stageId.toLowerCase()) {
            if (k !== canon) {
              if (nextColors[k] && !nextColors[canon]) nextColors[canon] = nextColors[k];
              delete nextColors[k];
            }
          }
        }
        return {
          ...map,
          [activePipelineGroupId]: {
            ...cur,
            customStages: [...cur.customStages, { id: canon, label }],
            stageOrder,
            stageColors: nextColors,
          },
        };
      });
    },
    [activePipelineGroupId]
  );

  const executeDeleteKanbanStage = useCallback(
    (stageId: string, stageLabel: string) => {
      const updatedAt = new Date().toISOString();
      const gid = activePipelineGroupId;
      let fallbackStageId = "";
      setPipelineByGroup((map) => {
        const cur = map[gid] ?? createEmptyGroupPipelineSnapshot();
        const nextColors = { ...cur.stageColors };
        if (Object.prototype.hasOwnProperty.call(nextColors, stageId)) delete nextColors[stageId];
        const nextStageOrder = cur.stageOrder.filter((id) => id !== stageId);
        fallbackStageId = nextStageOrder[0] ?? "";
        return {
          ...map,
          [gid]: {
            ...cur,
            customStages: cur.customStages.filter((item) => item.id !== stageId),
            stageOrder: nextStageOrder,
            stageColors: nextColors,
          },
        };
      });
      setLeads((prev) => {
        const next = prev.map((lead) =>
          lead.status !== stageId || lead.pipelineGroupId !== gid
            ? lead
            : {
                ...lead,
                status: fallbackStageId,
                updatedAt,
                activity: [
                  {
                    id: newLeadActivityId(),
                    type: "status_change" as const,
                    createdAt: updatedAt,
                    description: fallbackStageId
                      ? `La columna ${stageLabel} se eliminó y el lead se movió a ${resolveStatusLabel(fallbackStageId)}`
                      : `La columna ${stageLabel} se eliminó y el lead quedó sin columna asignada`,
                  },
                  ...(lead.activity ?? []),
                ],
              }
        );

        const client = getSupabaseClient();
        if (client) {
          const toSave = next.filter((lead) => {
            const old = prev.find((x) => x.id === lead.id);
            return (
              !!old &&
              old.status === stageId &&
              lead.status === fallbackStageId &&
              lead.pipelineGroupId === gid
            );
          });
          void Promise.all(toSave.map((l) => updateLead(client, l))).then((responses) => {
            const e = responses.find((r) => r.error)?.error;
            if (e) toast.error(e.message);
          });
        }

        return next;
      });
      setLeadDialog((current) =>
        current &&
        current.lead.status === stageId &&
        current.lead.pipelineGroupId === gid
          ? {
              ...current,
              lead: {
                ...current.lead,
                status: fallbackStageId,
                updatedAt,
              },
            }
          : current
      );
    },
    [activePipelineGroupId, resolveStatusLabel]
  );

  const requestDeletePipelineStage = useCallback((stageId: string, label: string) => {
    setDeletePipelineStage({ id: stageId, label });
  }, []);

  const handleReorderPipelineRows = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      setPipelineByGroup((map) => {
        const cur = map[activePipelineGroupId] ?? createEmptyGroupPipelineSnapshot();
        const prev = cur.stageOrder;
        const base = prev.length > 0 ? prev : allStageIds;
        if (
          dragIndex === hoverIndex ||
          dragIndex < 0 ||
          hoverIndex < 0 ||
          dragIndex >= base.length ||
          hoverIndex >= base.length
        ) {
          return map;
        }
        const nextOrder = [...base];
        const [removed] = nextOrder.splice(dragIndex, 1);
        nextOrder.splice(hoverIndex, 0, removed);
        if (nextOrder.length === prev.length && nextOrder.every((id, i) => id === prev[i])) {
          return map;
        }
        return {
          ...map,
          [activePipelineGroupId]: { ...cur, stageOrder: nextOrder },
        };
      });
    },
    [activePipelineGroupId, allStageIds]
  );

  const upsertClientFromLead = useCallback(
    (prev: CrmClient[], lead: Lead): CrmClient[] => {
      const emailKey = normalizeEmailKey(lead.email);
      const phoneKey = normalizePhoneKey(lead.phone);
      if (!emailKey && !phoneKey) return prev;

      const existing = prev.find((c) => {
        if (emailKey && normalizeEmailKey(c.email) === emailKey) return true;
        if (phoneKey && normalizePhoneKey(c.phone) === phoneKey) return true;
        return false;
      });
      const actorName = user?.name?.trim() || "Sistema CRM";
      const leadPropertyIds = lead.relatedPropertyId ? [lead.relatedPropertyId] : [];
      const leadDevelopmentIds = lead.relatedDevelopmentId ? [lead.relatedDevelopmentId] : [];

      if (existing) {
        const nextLinkedLeadIds = existing.linkedLeadIds.includes(lead.id)
          ? existing.linkedLeadIds
          : [...existing.linkedLeadIds, lead.id];
        const nextPropertyIds = [...new Set([...existing.propertyIds, ...leadPropertyIds])];
        const nextDevelopmentIds = [...new Set([...existing.developmentIds, ...leadDevelopmentIds])];
        const changed =
          nextLinkedLeadIds.length !== existing.linkedLeadIds.length ||
          nextPropertyIds.length !== existing.propertyIds.length ||
          nextDevelopmentIds.length !== existing.developmentIds.length;
        if (!changed) return prev;
        const linked = appendClientActivity(
          {
            ...existing,
            linkedLeadIds: nextLinkedLeadIds,
            propertyIds: nextPropertyIds,
            developmentIds: nextDevelopmentIds,
            updatedAt: new Date().toISOString(),
          },
          {
            id: newClientActivityId(),
            type: "link_lead",
            description: `Vinculado automáticamente al lead «${lead.name}»`,
            actorName,
          }
        );
        return prev.map((c) => (c.id === existing.id ? linked : c));
      }

      const now = new Date().toISOString();
      const created = appendClientActivity(
        {
          id: newClientId(),
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          propertyIds: leadPropertyIds,
          developmentIds: leadDevelopmentIds,
          linkedLeadIds: [lead.id],
          primaryOwnerUserId: lead.assignedToUserId || user?.id || "",
          createdAt: now,
          updatedAt: now,
          activity: [],
        },
        {
          id: newClientActivityId(),
          type: "created",
          description: `Cliente creado automáticamente desde lead «${lead.name}»`,
          actorName,
        }
      );

      return [...prev, created];
    },
    [user?.id, user?.name]
  );

  useEffect(() => {
    if (!user) return;
    const visibleLeads = filterLeadsForUser(leads, user);
    if (visibleLeads.length === 0) return;
    setClients((prev) => {
      let next = prev;
      for (const lead of visibleLeads) {
        next = upsertClientFromLead(next, lead);
      }
      return next;
    });
  }, [leads, user, upsertClientFromLead]);

  const handleAddLead = useCallback(async (lead: Lead) => {
    const createdAt = new Date().toISOString();
    const withActivity: Lead = {
      ...lead,
      activity:
        lead.activity && lead.activity.length > 0
          ? lead.activity
          : [
              {
                id: newLeadActivityId(),
                type: "created",
                createdAt,
                description: "Lead creado",
              },
            ],
    };

    const client = getSupabaseClient();
    if (client) {
      const { error: insLeadErr } = await insertLead(client, withActivity);
      if (insLeadErr) {
        toast.error(insLeadErr.message);
        return;
      }
    }
    setLeads((prev) => [...prev, withActivity]);
    setClients((prev) => upsertClientFromLead(prev, withActivity));
  }, [upsertClientFromLead]);

  const handleSaveLead = useCallback(async (updated: Lead) => {
    let merged: Lead | null = null;
    setLeads((prev) => {
      const l = prev.find((x) => x.id === updated.id);
      if (!l) return prev;
      const baseActivity = updated.activity ?? l.activity ?? [];
      const hasNewActivity = baseActivity.length > (l.activity ?? []).length;
      merged = {
        ...updated,
        activity: hasNewActivity
          ? baseActivity
          : [
              {
                id: newLeadActivityId(),
                type: "updated",
                createdAt: new Date().toISOString(),
                description: "Se actualizaron los datos del lead",
              },
              ...baseActivity,
            ],
      };
      return prev.map((row) => (row.id === updated.id ? merged! : row));
    });
    if (!merged) return;

    const client = getSupabaseClient();
    if (client) {
      const { error: saveLeadErr } = await updateLead(client, merged);
      if (saveLeadErr) {
        toast.error(saveLeadErr.message);
        return;
      }
    }
    setLeadDialog((d) =>
      d && d.lead.id === updated.id ? { ...d, lead: merged } : d
    );
  }, []);

  const handleSaveProperty = useCallback(
    async (p: Property) => {
      const normalizedProperty: Property = {
        ...p,
        featured: Boolean(p.featured),
      };
      if (!canManageInventory) return;
      const client = getSupabaseClient();
      if (!client) {
        toast.error("Supabase no configurado.");
        return;
      }
      const { hasSession } = await syncSupabaseAuthSession(client);
      if (!hasSession) {
        toast.error(
          "No hay sesión activa. Las políticas de seguridad (RLS) solo permiten guardar como usuario autenticado — inicia sesión de nuevo e inténtalo."
        );
        return;
      }
      const prev = properties.find((x) => x.id === normalizedProperty.id);
      const wasFeatured = Boolean(prev?.featured);
      const otherFeatured = properties.filter((x) => x.featured && x.id !== normalizedProperty.id).length;
      if (normalizedProperty.featured && !wasFeatured && otherFeatured >= MAX_FEATURED_PROPERTIES) {
        toast.error(
          `Solo pueden destacarse hasta ${MAX_FEATURED_PROPERTIES} propiedades en la portada. Quita una estrella en otra ficha e inténtalo de nuevo.`
        );
        return;
      }
      const exists = properties.some((x) => x.id === normalizedProperty.id);
      let propRes = exists
        ? await updateProperty(client, normalizedProperty)
        : await insertProperty(client, normalizedProperty, normalizedProperty.id);
      if (propRes.error) {
        toast.error(propRes.error.message);
        return;
      }
      let returnedId = idFromPropertyWriteResult(propRes.data);
      if (!returnedId) {
        await syncSupabaseAuthSession(client);
        propRes = exists
          ? await updateProperty(client, normalizedProperty)
          : await insertProperty(client, normalizedProperty, normalizedProperty.id);
        if (propRes.error) {
          toast.error(propRes.error.message);
          return;
        }
        returnedId = idFromPropertyWriteResult(propRes.data);
      }
      // No exigir fila devuelta en el JSON: PostgREST a veces no devuelve cuerpo y `error` sigue siendo null.
      // Refresco en segundo plano: no bloquea la UI; si hubiera discrepancia, el listado silencioso la corrige.
      if (import.meta.env.DEV && !returnedId && !propRes.error) {
        console.warn(
          "[Viterra] Guardado sin id en respuesta; se continúa si no hay error. Revisa políticas RLS si el listado no refleja el cambio."
        );
      }
      applySavedProperty(normalizedProperty);
      const { action, diff } = buildPropertySaveEvent(prev, normalizedProperty, exists);
      if (isInventoryTimelineAction(action)) {
        void logCatalogActivity({
          entity_type: "property",
          entity_id: normalizedProperty.id,
          action,
          snapshot: buildPropertySnapshot(normalizedProperty),
          diff,
        });
      }
      void reloadProperties({ silent: true });
      toast.success(
        exists ? "Propiedad actualizada correctamente." : "Propiedad añadida al catálogo correctamente."
      );
    },
    [applySavedProperty, properties, reloadProperties, canManageInventory, logCatalogActivity]
  );

  const handleTogglePropertyFeatured = useCallback(
    async (property: Property) => {
      const client = getSupabaseClient();
      if (!client) {
        toast.error("Supabase no configurado.");
        return;
      }
      const next = !property.featured;
      if (next) {
        const featuredNow = properties.filter((x) => x.featured).length;
        if (featuredNow >= MAX_FEATURED_PROPERTIES) {
          toast.error(
            `Ya hay ${MAX_FEATURED_PROPERTIES} propiedades destacadas en la portada. Quita una antes de añadir otra.`
          );
          return;
        }
      }
      const prevFeatured = Boolean(property.featured);
      patchCatalogProperty(property.id, { featured: next });
      setPropertyForm((f) =>
        f?.mode === "edit" && f.property?.id === property.id
          ? { ...f, property: { ...f.property, featured: next } }
          : f
      );

      const { error } = await updatePropertyFeatured(client, property.id, next);
      if (error) {
        patchCatalogProperty(property.id, { featured: prevFeatured });
        setPropertyForm((f) =>
          f?.mode === "edit" && f.property?.id === property.id
            ? { ...f, property: { ...f.property, featured: prevFeatured } }
            : f
        );
        toast.error(error.message);
        return;
      }
      applySavedProperty({ ...property, featured: next });
      toast.success(next ? "Propiedad destacada en la portada." : "Propiedad ya no aparece destacada en la portada.");
      void reloadProperties();
    },
    [properties, reloadProperties, patchCatalogProperty, applySavedProperty]
  );

  const openLeadDetail = useCallback(
    (lead: Lead, mode: "view" | "edit") => {
      const full = leads.find((l) => l.id === lead.id) ?? lead;
      setLeadDialog({ lead: full, mode });
    },
    [leads]
  );

  const handleViewTeamMember = useCallback((userId: string, fallbackName?: string) => {
    const normalizedId = userId.trim().toLowerCase();
    let targetUser =
      normalizedId.length > 0
        ? users.find((candidate) => candidate.id.trim().toLowerCase() === normalizedId)
        : undefined;

    if (!targetUser && fallbackName?.trim()) {
      const normalizedNeedle = foldSearchText(fallbackName);
      targetUser = users.find((candidate) => {
        const candidateName = foldSearchText(candidate.name);
        const candidateEmail = foldSearchText(candidate.email);
        const candidateEmailUser = foldSearchText(candidate.email.split("@")[0] ?? "");
        return (
          candidateName === normalizedNeedle ||
          candidateEmail === normalizedNeedle ||
          candidateEmailUser === normalizedNeedle
        );
      });
    }

    if (!targetUser) {
      window.alert("No se encontró el detalle del asesor para este cliente.");
      return;
    }

    pendingReturnFromUserDetailRef.current = {
      tab: activeTab,
      companySubtab,
      leadsView,
      leadDialog: leadDialog ? { lead: leadDialog.lead, mode: leadDialog.mode } : null,
    };
    setUsersPanelFocus({ id: targetUser.id, nonce: Date.now() });
    goTab("company", "users");
    setLeadDialog(null);
  }, [activeTab, companySubtab, leadsView, leadDialog, users, goTab]);

  const handleUserDetailClosed = useCallback(() => {
    const ctx = pendingReturnFromUserDetailRef.current;
    pendingReturnFromUserDetailRef.current = null;
    if (!ctx) return;
    navigate(buildAdminHref(ctx.tab, ctx.companySubtab));
    setLeadsView(ctx.leadsView);
    if (ctx.leadDialog) {
      const fresh = leads.find((l) => l.id === ctx.leadDialog.lead.id) ?? ctx.leadDialog.lead;
      setLeadDialog({ lead: fresh, mode: ctx.leadDialog.mode });
    } else {
      setLeadDialog(null);
    }
  }, [leads, navigate]);

  const handleUsersPanelFocusConsumed = useCallback(() => {
    setUsersPanelFocus(null);
  }, []);

  const canAccessClients = useMemo(
    () => Boolean(user?.permissions?.includes("manage_clients")),
    [user]
  );

  const handleRegisterClientFromLead = useCallback(
    (lead: Lead) => {
      if (user?.role === "asesor") {
        const existing = findClientForLeadContact(clients, lead.email, lead.phone);
        if (existing) {
          setLeadDialog(null);
          goTab("clients");
          setFocusClient({ id: existing.id, nonce: Date.now() });
          return;
        }
        toast.info(
          "Aún no hay ficha de cliente para este contacto. Un administrador o líder de grupo puede crearla desde Clientes."
        );
        return;
      }
      setLeadDialog(null);
      goTab("clients");
      setSeedClientFromLead({ lead, nonce: Date.now() });
    },
    [user?.role, clients]
  );

  const handleFocusClientConsumed = useCallback(() => setFocusClient(null), []);
  const handleSeedClientFromLeadConsumed = useCallback(() => setSeedClientFromLead(null), []);

  // Stats calculations (respetan rol: el asesor solo cuenta sus leads)
  const totalLeads = leadsForUser.length;
  const newLeads = leadsForUser.filter((l) => l.status === "nuevo").length;
  const closedDeals = leadsForUser.filter((l) => l.status === "cerrado").length;

  /** Últimos 6 meses calendario: altas por `createdAt`, cierres por mes de `updatedAt` o `lastContact` (solo status cerrado). */
  const dashboardLeadTrendData = useMemo(() => {
    const monthLabel = (y: number, m0: number) => {
      const d = new Date(y, m0, 1);
      const raw = d.toLocaleDateString("es", { month: "short" });
      const cleaned = raw.replace(/\.$/, "").trim();
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };
    const now = new Date();
    const rows: { month: string; leads: number; conversiones: number }[] = [];
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      monthKeys.push(`${y}-${String(m + 1).padStart(2, "0")}`);
      rows.push({ month: monthLabel(y, m), leads: 0, conversiones: 0 });
    }
    const keyIndex = (yk: string) => monthKeys.indexOf(yk);
    const parseMonthKey = (raw: string | undefined): string | null => {
      if (!raw) return null;
      const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
      if (Number.isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    for (const lead of leadsForUser) {
      const createdKey = parseMonthKey(lead.createdAt);
      if (createdKey !== null) {
        const idx = keyIndex(createdKey);
        if (idx >= 0) rows[idx].leads += 1;
      }
      if (lead.status === "cerrado") {
        const closeKey = parseMonthKey(lead.updatedAt || lead.lastContact);
        if (closeKey !== null) {
          const idx = keyIndex(closeKey);
          if (idx >= 0) rows[idx].conversiones += 1;
        }
      }
    }
    return rows;
  }, [leadsForUser]);

  const totalProperties = properties.length;
  const propertiesForSale = properties.filter(p => p.status === "venta").length;
  const propertiesForRent = properties.filter(p => p.status === "alquiler").length;

  const filteredLeads = leadsInActivePipeline.filter((lead) => {
    const createdAtDate = lead.createdAt ? new Date(lead.createdAt) : null;
    const now = new Date();
    const fromByRange = (() => {
      if (createdRangeFilter === "all" || createdRangeFilter === "custom") return null;
      const d = new Date(now);
      if (createdRangeFilter === "1m") d.setMonth(d.getMonth() - 1);
      if (createdRangeFilter === "3m") d.setMonth(d.getMonth() - 3);
      if (createdRangeFilter === "6m") d.setMonth(d.getMonth() - 6);
      if (createdRangeFilter === "1y") d.setFullYear(d.getFullYear() - 1);
      return d;
    })();
    const customFromDate = createdRangeFilter === "custom" && createdFrom ? new Date(`${createdFrom}T00:00:00`) : null;
    const customToDate = createdRangeFilter === "custom" && createdTo ? new Date(`${createdTo}T23:59:59`) : null;
    const q = foldSearchText(searchQuery);
    const matchesSearch = (() => {
      if (!q) return true;
      if (leadSearchNameScope === "client") {
        return foldSearchText(lead.name).includes(q);
      }
      if (leadSearchNameScope === "advisor") {
        return (
          foldSearchText(lead.assignedTo).includes(q) ||
          users.some((u) => teamMemberNameMatchesFoldedQuery(u, q) && leadAssignedToCrmUser(lead, u))
        );
      }
      return (
        foldSearchText(lead.name).includes(q) ||
        foldSearchText(lead.email).includes(q) ||
        foldSearchText(lead.phone).includes(q) ||
        users.some((u) => teamMemberMatchesFoldedQuery(u, q) && leadAssignedToCrmUser(lead, u))
      );
    })();
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesCreatedRange =
      createdRangeFilter === "all" ||
      (createdAtDate !== null &&
        !Number.isNaN(createdAtDate.getTime()) &&
        ((fromByRange ? createdAtDate >= fromByRange : true) &&
          (customFromDate ? createdAtDate >= customFromDate : true) &&
          (customToDate ? createdAtDate <= customToDate : true)));
    return matchesSearch && matchesStatus && matchesCreatedRange;
  });

  const normalizeStageToken = useCallback((value: string) => {
    return value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s-]+/g, "_")
      .replace(/_+/g, "_");
  }, []);

  const stageAliasToConfiguredId = useMemo(() => {
    const builtinTokens = new Set(
      Object.keys(LEAD_STATUS_LABEL).map((k) => normalizeStageToken(k))
    );
    const out = new Map<string, string>();
    for (const id of leadColumnStatuses) {
      out.set(normalizeStageToken(id), id);
    }
    for (const stage of customKanbanStages) {
      const t = normalizeStageToken(stage.label);
      if (builtinTokens.has(t)) continue;
      if (!out.has(t)) out.set(t, stage.id);
    }
    return out;
  }, [leadColumnStatuses, customKanbanStages, normalizeStageToken]);

  const filteredLeadsForBoard = useMemo(
    () =>
      filteredLeads.map((lead) => {
        if (leadColumnStatuses.includes(lead.status)) return lead;
        const mapped = stageAliasToConfiguredId.get(normalizeStageToken(lead.status));
        return mapped && mapped !== lead.status ? { ...lead, status: mapped } : lead;
      }),
    [filteredLeads, leadColumnStatuses, stageAliasToConfiguredId, normalizeStageToken]
  );

  useEffect(() => {
    if (leadColumnStatuses.length === 0) return;
    const client = getSupabaseClient();
    if (!client) return;

    const toMigrate = leadsInActivePipeline
      .map((lead) => {
        if (!lead.status || leadColumnStatuses.includes(lead.status)) return null;
        const mapped = stageAliasToConfiguredId.get(normalizeStageToken(lead.status));
        if (!mapped || mapped === lead.status) return null;
        const leadKey = lead.status.trim().toLowerCase();
        if (
          Object.prototype.hasOwnProperty.call(LEAD_STATUS_LABEL, leadKey) &&
          mapped.startsWith("custom_")
        ) {
          return null;
        }
        return { lead, mapped };
      })
      .filter((x): x is { lead: Lead; mapped: string } => x !== null);

    if (toMigrate.length === 0) return;

    let cancelled = false;
    void (async () => {
      const responses = await Promise.all(
        toMigrate.map(async ({ lead, mapped }) => {
          const next: Lead = { ...lead, status: mapped, updatedAt: new Date().toISOString() };
          const { error } = await updateLead(client, next);
          return { id: lead.id, mapped, error };
        })
      );
      if (cancelled) return;

      const ok = responses.filter((r) => !r.error);
      const failed = responses.filter((r) => !!r.error);

      if (ok.length > 0) {
        const map = new Map(ok.map((r) => [r.id, r.mapped]));
        setLeads((prev) =>
          prev.map((lead) => {
            const mapped = map.get(lead.id);
            return mapped ? { ...lead, status: mapped } : lead;
          })
        );
        if (import.meta.env.DEV) {
          console.info(`[Viterra] Estados legacy migrados en DB: ${ok.length}`);
        }
      }
      if (failed.length > 0) {
        toast.error("No se pudieron normalizar algunos estados legacy del pipeline.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    leadsInActivePipeline,
    leadColumnStatuses,
    stageAliasToConfiguredId,
    normalizeStageToken,
  ]);

  const leadStatusesForRendering = useMemo(() => {
    const seen = new Set(leadColumnStatuses);
    const extraIds = [...new Set(filteredLeadsForBoard.map((l) => l.status))]
      .filter((id) => !!id && !seen.has(id))
      .sort();
    return [...leadColumnStatuses, ...extraIds];
  }, [leadColumnStatuses, filteredLeadsForBoard]);

  /** Vista tabla: grupos por estado (orden del pipeline), sin columnas fijas que fuercen scroll horizontal */
  const leadsTableGroupedByStatus = useMemo(() => {
    const byStatus = new Map<string, Lead[]>();
    for (const lead of filteredLeadsForBoard) {
      const list = byStatus.get(lead.status) ?? [];
      list.push(lead);
      byStatus.set(lead.status, list);
    }
    const sections: { statusId: string; label: string; leads: Lead[] }[] = [];
    for (const id of leadStatusesForRendering) {
      const list = byStatus.get(id);
      if (list?.length) sections.push({ statusId: id, label: resolveStatusLabel(id), leads: list });
    }
    return sections;
  }, [filteredLeadsForBoard, leadStatusesForRendering, resolveStatusLabel]);

  const toggleLeadsTableSection = useCallback((statusId: string) => {
    setLeadsTableSectionCollapsed((prev) => ({ ...prev, [statusId]: !prev[statusId] }));
  }, []);

  const propertiesMatchingInventoryFilters = useMemo(
    () =>
      properties.filter((property) => {
        const q = foldSearchText(propertySearchQuery);
        const matchesSearch =
          !q ||
          foldSearchText(property.title).includes(q) ||
          foldSearchText(property.location).includes(q) ||
          foldSearchText(property.type).includes(q) ||
          foldSearchText(property.status).includes(q);
        const refQ = foldSearchText(propertyReferenceCodeQuery);
        const matchesReferenceCode =
          !refQ || foldSearchText(property.referenceCode ?? "").includes(refQ);
        const matchesOperation =
          propertyOperationFilter === "all" || property.status === propertyOperationFilter;
        const matchesType =
          propertyTypeFilter === "all" || property.type === propertyTypeFilter;
        const matchesLocation =
          propertyLocationFilter === "all" || property.location === propertyLocationFilter;

        const matchesFeatured =
          propertyFeaturedFilter === "all" ||
          (propertyFeaturedFilter === "featured"
            ? Boolean(property.featured)
            : !property.featured);

        return (
          matchesSearch &&
          matchesReferenceCode &&
          matchesOperation &&
          matchesType &&
          matchesLocation &&
          matchesFeatured
        );
      }),
    [
      properties,
      propertySearchQuery,
      propertyReferenceCodeQuery,
      propertyOperationFilter,
      propertyTypeFilter,
      propertyLocationFilter,
      propertyFeaturedFilter,
    ]
  );

  const filteredProperties = useMemo(
    () => sortCatalogProperties(propertiesMatchingInventoryFilters, propertyCatalogSort),
    [propertiesMatchingInventoryFilters, propertyCatalogSort]
  );
  const propertyTypeOptions = useMemo(
    () => Array.from(new Set(properties.map((p) => p.type).filter(Boolean))),
    [properties]
  );
  const propertyLocationOptions = useMemo(
    () => Array.from(new Set(properties.map((p) => p.location).filter(Boolean))),
    [properties]
  );
  const propertyFeaturedCount = useMemo(
    () => properties.filter((p) => p.featured).length,
    [properties]
  );

  const leadsBySourceData = [
    { name: "Website", value: leadsForUser.filter((l) => l.source === "Website").length },
    { name: "Facebook", value: leadsForUser.filter((l) => l.source === "Facebook").length },
    { name: "Instagram", value: leadsForUser.filter((l) => l.source === "Instagram").length },
    { name: "Google", value: leadsForUser.filter((l) => l.source === "Google").length },
    { name: "Referido", value: leadsForUser.filter((l) => l.source === "Referido").length },
  ];

  const conversionRate = totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) : "0";
  const totalValue = properties.reduce((sum, p) => sum + p.price, 0);
  const avgPropertyPrice = properties.length > 0 ? (totalValue / properties.length).toFixed(0) : "0";
  const [animatedStats, setAnimatedStats] = useState({
    totalLeads: 0,
    conversionRate: 0,
    totalProperties: 0,
    avgPropertyPrice: 0,
  });

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const target = {
      totalLeads,
      conversionRate: Number(conversionRate) || 0,
      totalProperties,
      avgPropertyPrice: parseInt(avgPropertyPrice, 10) || 0,
    };
    const durationMs = 900;
    const start = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedStats({
        totalLeads: target.totalLeads * eased,
        conversionRate: target.conversionRate * eased,
        totalProperties: target.totalProperties * eased,
        avgPropertyPrice: target.avgPropertyPrice * eased,
      });
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [activeTab, totalLeads, conversionRate, totalProperties, avgPropertyPrice]);

  const adminNavigationRoutes = useMemo(
    () => [
      {
        id: "dashboard",
        title: "Dashboard",
        description: "Resumen general del CRM",
        keywords: ["inicio", "resumen", "dashboard", "panel"],
        action: () => goTab("dashboard"),
      },
      {
        id: "kpis",
        title: "KPI's",
        description: "Métricas detalladas, metas y comparativos por rol",
        keywords: ["kpi", "kpis", "reportes", "metricas", "métricas", "indicadores", "meta", "metas", "tendencia"],
        action: () => goTab("kpis"),
      },
      {
        id: "leads",
        title: "Leads",
        description: "Pipeline y seguimiento comercial",
        keywords: ["lead", "clientes", "pipeline", "kanban", "prospectos"],
        action: () => goTab("leads"),
      },
      ...(canAccessClients
        ? [
            {
              id: "clients",
              title: "Clientes",
              description: "Fichas de clientes e historial",
              keywords: ["clientes", "crm", "compradores", "contactos"],
              action: () => goTab("clients"),
            },
          ]
        : []),
      {
        id: "agenda",
        title: "Agenda",
        description: "Calendario semanal de citas",
        keywords: ["agenda", "calendario", "citas", "semana", "horario"],
        action: () => goTab("agenda"),
      },
      {
        id: "properties",
        title: "Propiedades",
        description: "Catálogo y administración de propiedades",
        keywords: ["propiedades", "inmuebles", "venta", "renta"],
        action: () => goTab("properties"),
      },
      {
        id: "developments",
        title: "Desarrollos",
        description: "Gestión de desarrollos propios",
        keywords: ["desarrollos", "proyectos", "desarrollo"],
        action: () => goTab("developments"),
      },
      {
        id: "activities",
        title: "Actividades",
        description: "Timeline del catálogo: propiedades y desarrollos",
        keywords: ["actividades", "timeline", "historial", "cambios", "precio", "inventario"],
        action: () => goTab("activities"),
      },
      ...(canEditSite
        ? [
            {
              id: "sitio-editor",
              title: "Sitio web · Editor",
              description: "Editor visual del contenido público",
              keywords: ["editar sitio", "sitio", "web", "editor", "contenido"],
              action: () => goTab("sitio"),
            },
          ]
        : []),
      ...(canAccessCompanyModule
        ? (isGroupLeader
        ? [
            {
              id: "company-pipeline",
              title: "Pipeline de ventas",
              description: "Grupos asignados y configuración de columnas",
              keywords: ["pipeline", "ventas", "grupos", "columnas", "kanban"],
              action: () => {
                goTab("company", "leadStages");
              },
            },
          ]
        : [
            {
              id: "company-users",
              title: "Mi empresa · Usuarios",
              description: "Administración de usuarios y permisos",
              keywords: ["usuarios", "mi empresa", "permisos", "roles", "equipo"],
              action: () => {
                goTab("company", "users");
              },
            },
            {
              id: "company-pipeline",
              title: "Mi empresa · Pipeline de leads",
              description: "Configura estados y orden del pipeline",
              keywords: ["estados", "columnas", "pipeline de leads", "kanban", "orden"],
              action: () => {
                goTab("company", "leadStages");
              },
            },
            {
              id: "company-settings",
              title: "Mi empresa · Configuración",
              description: "Espacio de trabajo, copias de seguridad y datos locales",
              keywords: ["configuración", "ajustes", "respaldo", "localStorage", "mi empresa"],
              action: () => {
                goTab("company", "settings");
              },
            },
          ])
        : []),
      {
        id: "messages",
        title: "Mensajes",
        description: "Accesos al centro de mensajes",
        keywords: ["mensajes", "contacto", "correo"],
        action: () => goTab("messages"),
      },
      {
        id: "profile",
        title: "Mi perfil",
        description: "Datos en tokko_users, contacto y payload",
        keywords: ["perfil", "cuenta", "datos", "tokko", "correo", "teléfono", "foto"],
        action: () => goTab("profile"),
      },
      {
        id: "site-home",
        title: "Sitio público · Inicio",
        description: "Ir a la página principal del sitio",
        keywords: ["sitio", "home", "inicio público", "web"],
        action: () => navigate("/"),
      },
      {
        id: "site-properties",
        title: "Sitio público · Propiedades",
        description: "Ir al catálogo público de propiedades",
        keywords: ["sitio propiedades", "catálogo", "propiedades públicas"],
        action: () => navigate("/propiedades"),
      },
      {
        id: "site-developments",
        title: "Sitio público · Desarrollos",
        description: "Ir a la página pública de desarrollos",
        keywords: ["sitio desarrollos", "desarrollos públicos"],
        action: () => navigate("/desarrollos"),
      },
      {
        id: "site-contact",
        title: "Sitio público · Contacto",
        description: "Ir al formulario de contacto",
        keywords: ["contacto", "formulario", "mensaje", "sitio contacto"],
        action: () => navigate("/contacto"),
      },
    ],
    [navigate, goTab, canAccessClients, isGroupLeader, canAccessCompanyModule, canEditSite]
  );

  const headerSearchValue = adminHeaderQuery;
  const headerSearchPlaceholder = "Buscar ruta, módulo, sección o usuario…";

  const filteredAdminRoutes = useMemo(() => {
    const query = adminHeaderQuery.trim().toLowerCase();
    if (!query) return adminNavigationRoutes.slice(0, 6);

    return adminNavigationRoutes
      .filter((route) => {
        const haystack = [route.title, route.description, ...route.keywords].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [adminHeaderQuery, adminNavigationRoutes]);

  const filteredDashboardUsers = useMemo(() => {
    const q = adminHeaderQuery.trim().toLowerCase();
    const active = users.filter((u) => u.isActive);
    const sorted = [...active].sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (!q) return sorted.slice(0, 8);
    return sorted
      .filter((u) => {
        const roleLabel = roleLabelEs(u.role).toLowerCase();
        const haystack = [u.name, u.email, roleLabel, u.id].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [adminHeaderQuery, users]);

  const hasDashboardSearchResults =
    filteredAdminRoutes.length > 0 || filteredDashboardUsers.length > 0;

  const handleHeaderSearchChange = (value: string) => {
    setAdminHeaderQuery(value);
  };

  const handleDashboardRouteSelect = (route: (typeof adminNavigationRoutes)[number]) => {
    route.action();
    setAdminHeaderQuery("");
    setDashboardRouteSearchOpen(false);
  };

  const handleDashboardUserSelect = (userId: string) => {
    handleViewTeamMember(userId);
    setAdminHeaderQuery("");
    setDashboardRouteSearchOpen(false);
  };

  if (!user) {
    return <AdminWorkspaceAuthLoadingShell />;
  }

  return (
    <div className="viterra-page viterra-crm min-h-screen bg-gradient-to-b from-[#f7f5f2] via-slate-50 to-slate-100">
      {!adminSidebarExpanded ? (
        <button
          type="button"
          onClick={() => setAdminSidebarExpanded(true)}
          title="Mostrar menú lateral"
          aria-label="Mostrar menú lateral"
          className="fixed left-0 top-1/2 z-[60] hidden h-7 w-[22px] -translate-y-1/2 items-center justify-center rounded-r-md border border-slate-400/30 border-l-0 bg-white/30 pl-px text-brand-navy shadow-sm backdrop-blur-sm transition hover:bg-white/45 hover:shadow active:scale-[0.96] lg:flex"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAdminSidebarExpanded(false)}
          title="Ocultar menú lateral"
          aria-label="Ocultar menú lateral"
          style={{ left: ADMIN_SIDEBAR_LG_WIDTH }}
          className="fixed top-1/2 z-[60] hidden h-7 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-slate-950/40 px-0 text-white shadow-sm backdrop-blur-sm transition hover:border-brand-gold/45 hover:bg-slate-950/55 hover:shadow active:scale-[0.96] lg:flex"
        >
          <ChevronLeft className="h-3.5 w-3.5 drop-shadow-sm" strokeWidth={2.25} aria-hidden />
        </button>
      )}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[14.5rem] lg:flex-col lg:border-r lg:border-brand-gold/20 lg:bg-brand-navy lg:text-white lg:transition-transform lg:duration-200 lg:ease-out",
          !adminSidebarExpanded && "lg:pointer-events-none lg:-translate-x-full"
        )}
        aria-hidden={!adminSidebarExpanded}
      >
        <div className="border-b border-white/15 px-5 py-5">
          <Link
            to="/"
            aria-label="Ir al inicio del sitio público"
            className="group block rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
          >
            <span className="font-heading block font-light leading-tight tracking-[0.22em] text-white sm:text-lg">
              VITERRA
            </span>
            <span className="relative my-2 block h-px max-w-[11rem] overflow-hidden rounded-full" aria-hidden>
              <span className="absolute inset-0 bg-white/50" />
              <span className="absolute inset-0 origin-left bg-[#C8102E]" style={{ transform: "scaleX(0.55)" }} />
            </span>
            <p
              className="text-[10px] font-normal uppercase tracking-[0.26em] text-white/72 group-hover:text-white/88"
              style={{
                fontFamily: 'Perpetua, "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
              }}
            >
              CRM System
            </p>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.14em] text-white/55" style={{ fontWeight: 600 }}>
            Módulos admin
          </p>
          <nav className="space-y-1.5" aria-label="Navegación del panel admin">
                <button
                  type="button"
                  onClick={() => goTab("dashboard")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "dashboard" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" strokeWidth={activeTab === "dashboard" ? 2 : 1.75} />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => goTab("kpis")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "kpis" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" strokeWidth={activeTab === "kpis" ? 2 : 1.75} />
                  KPI's
                </button>
                <button
                  type="button"
                  onClick={() => goTab("leads")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "leads" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Users className="h-4 w-4" strokeWidth={activeTab === "leads" ? 2 : 1.75} />
                  Leads
                </button>
                {canAccessClients && (
                  <button
                    type="button"
                    onClick={() => goTab("clients")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activeTab === "clients"
                        ? "bg-white text-brand-navy"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <UserCircle2 className="h-4 w-4" strokeWidth={activeTab === "clients" ? 2 : 1.75} />
                    Clientes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goTab("agenda")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "agenda" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Calendar className="h-4 w-4" strokeWidth={activeTab === "agenda" ? 2 : 1.75} />
                  Agenda
                </button>
                <button
                  type="button"
                  onClick={() => goTab("properties")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "properties" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Home className="h-4 w-4" strokeWidth={activeTab === "properties" ? 2 : 1.75} />
                  Propiedades
                </button>
                <button
                  type="button"
                  onClick={() => goTab("developments")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "developments" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Building2 className="h-4 w-4" strokeWidth={activeTab === "developments" ? 2 : 1.75} />
                  Desarrollos
                </button>
                <button
                  type="button"
                  onClick={() => goTab("activities")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "activities" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <History className="h-4 w-4" strokeWidth={activeTab === "activities" ? 2 : 1.75} />
                  Actividades
                </button>
                {canEditSite && (
                  <button
                    type="button"
                    onClick={() => goTab("sitio")}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activeTab === "sitio" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Globe2 className="h-4 w-4" strokeWidth={activeTab === "sitio" ? 2 : 1.75} />
                    Sitio web
                  </button>
                )}
                {canAccessCompanyModule && (
                  <button
                    type="button"
                    onClick={() => {
                      goTab("company", isGroupLeader ? "leadStages" : companySubtab);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activeTab === "company" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Briefcase className="h-4 w-4" strokeWidth={activeTab === "company" ? 2 : 1.75} />
                    {isGroupLeader ? "Pipeline de ventas" : "Mi empresa"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goTab("messages")}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    activeTab === "messages" ? "bg-white text-brand-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" strokeWidth={activeTab === "messages" ? 2 : 1.75} />
                  Mensajes
                </button>
          </nav>
        </div>
        <div className="border-t border-white/15 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => goTab("profile")}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/25 bg-white/10 text-white transition hover:bg-white/20",
                activeTab === "profile" && "ring-2 ring-white/40"
              )}
              title="Abrir mi perfil"
              aria-label="Abrir mi perfil"
            >
              {user.profile.picture ? (
                <img
                  src={user.profile.picture}
                  alt={`Foto de ${user.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              onClick={() => goTab("profile")}
              className="min-w-0 flex-1 text-left"
              title="Mi perfil"
            >
              <p className="truncate text-sm text-white" style={{ fontWeight: 600 }}>
                {user.name}
              </p>
              <p className="truncate text-[11px] uppercase tracking-[0.08em] text-white/65">
                {roleLabelEs(user.role)}
              </p>
            </button>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "transform-none px-4 pb-4 pt-4 sm:px-6 sm:pt-4 lg:pr-8 lg:transition-[padding] lg:duration-200 lg:ease-out",
          adminSidebarExpanded ? "lg:pl-[16.5rem]" : "lg:pl-4",
          activeTab === "sitio" && canEditSite && "pb-2 pt-2 sm:pb-2 sm:pt-2 lg:pb-2"
        )}
      >
        {activeTab === "dashboard" && (
          <header
            className="relative z-20 mb-6 overflow-visible rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white/95 via-white/95 to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.22)] ring-1 ring-slate-900/[0.04] backdrop-blur-md"
          >
            <div
              className="h-1.5 w-full shrink-0 bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-16 top-14 h-40 w-40 rounded-full bg-gradient-to-br from-primary/[0.1] to-transparent blur-3xl"
              aria-hidden
            />
            <div className="relative px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary"
                    style={{ fontWeight: 600 }}
                  >
                    Panel Viterra
                  </p>
                  <h2
                    className="font-heading mt-1.5 text-[1.25rem] leading-tight text-brand-navy sm:text-[1.45rem]"
                    style={{ fontWeight: 600 }}
                  >
                    {dashboardTimeGreetingEs()}
                    {user?.name?.trim()
                      ? `, ${user.name.trim().split(/\s+/)[0]}`
                      : ""}
                  </h2>
                  <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm" style={{ fontWeight: 500 }}>
                    {isAdvisor
                      ? "Tu desempeño comercial, embudo de leads e inventario del catálogo."
                      : isGroupLeader
                        ? "Vista de equipo del pipeline activo: ventas por asesor, conversión, inventario y proyección del mes."
                        : "Bienvenido al panel. Aquí ves el resumen de leads, propiedades y el pulso del negocio."}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
                  <Link
                    to="/"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-brand-navy"
                    style={{ fontWeight: 600 }}
                  >
                    <Globe2 className="h-4 w-4" strokeWidth={1.8} />
                    Ir al sitio
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                    style={{ fontWeight: 600 }}
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.8} />
                    Cerrar sesión
                  </button>
                </div>
              </div>

              <div className="relative mt-4 min-w-0">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                <input
                  type="search"
                  value={headerSearchValue}
                  onChange={(e) => handleHeaderSearchChange(e.target.value)}
                  onFocus={() => setDashboardRouteSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (filteredAdminRoutes[0]) {
                        e.preventDefault();
                        handleDashboardRouteSelect(filteredAdminRoutes[0]);
                      } else if (filteredDashboardUsers[0]) {
                        e.preventDefault();
                        handleDashboardUserSelect(filteredDashboardUsers[0].id);
                      }
                    }
                    if (e.key === "Escape") {
                      setDashboardRouteSearchOpen(false);
                    }
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setDashboardRouteSearchOpen(false), 120);
                  }}
                  placeholder={headerSearchPlaceholder}
                  className="h-10 w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3 text-sm text-brand-navy shadow-sm placeholder:text-slate-400 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  aria-label="Buscar rutas, módulos o usuarios del equipo"
                />
                {dashboardRouteSearchOpen && hasDashboardSearchResults && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-[60] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-18px_rgba(20,28,46,0.2)]">
                    <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
                      {filteredAdminRoutes.length > 0 && (
                        <>
                          <div className="sticky top-0 z-[1] border-b border-slate-100 bg-white px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            Rutas sugeridas
                          </div>
                          <div className="py-1.5">
                            {filteredAdminRoutes.map((route) => (
                              <button
                                key={route.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleDashboardRouteSelect(route)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-brand-navy" style={{ fontWeight: 600 }}>
                                    {route.title}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">{route.description}</p>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {filteredDashboardUsers.length > 0 && (
                        <>
                          <div className="sticky top-0 z-[1] border-b border-slate-100 bg-white px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            Usuarios del equipo
                          </div>
                          <div className="py-1.5">
                            {filteredDashboardUsers.map((u) => (
                              <button
                                key={u.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleDashboardUserSelect(u.id)}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <UserIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm text-brand-navy" style={{ fontWeight: 600 }}>
                                      {u.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                                    <p className="truncate text-[11px] text-slate-400">{roleLabelEs(u.role)}</p>
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.8} />
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        <div className="mb-6 rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm lg:hidden">
          <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>
            Módulos admin
          </p>
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Navegación del panel admin">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "kpis", label: "KPI's", icon: BarChart3 },
              { id: "leads", label: "Leads", icon: Users },
              ...(canAccessClients ? [{ id: "clients", label: "Clientes", icon: UserCircle2 }] : []),
              { id: "agenda", label: "Agenda", icon: Calendar },
              { id: "properties", label: "Propiedades", icon: Home },
              { id: "developments", label: "Desarrollos", icon: Building2 },
              { id: "activities", label: "Actividades", icon: History },
              ...(canEditSite ? [{ id: "sitio", label: "Sitio web", icon: Globe2 }] : []),
              ...(canAccessCompanyModule
                ? [{ id: "company", label: isGroupLeader ? "Pipeline de ventas" : "Mi empresa", icon: Briefcase }]
                : []),
              { id: "messages", label: "Mensajes", icon: MessageSquare },
              { id: "profile", label: "Perfil", icon: UserIcon },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "company") {
                    goTab("company", isGroupLeader ? "leadStages" : companySubtab);
                  } else {
                    goTab(item.id as TabType);
                  }
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  activeTab === item.id ? "bg-brand-navy text-white" : "bg-slate-50 text-slate-700"
                }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {dashboardChartsLoading ? (
              isAdvisor || isGroupLeader ? (
                <AdminPipelineDashboardSkeleton />
              ) : (
                <AdminDashboardSkeleton />
              )
            ) : isAdvisor ? (
              <AdvisorDashboard
                leads={leadsForUser}
                properties={properties}
                customStages={customKanbanStages}
              />
            ) : isGroupLeader ? (
              <GroupLeaderDashboard
                leads={leadsInActivePipeline}
                properties={properties}
                customStages={customKanbanStages}
                users={users}
              />
            ) : (
              <>
            {/* Stats Cards - Elegantes y minimalistas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-primary to-brand-burgundy opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>Total Leads</p>
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  {Math.round(animatedStats.totalLeads)}
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>+{newLeads} este mes</p>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-brand-burgundy to-brand-gold opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>Conversión</p>
                  <Activity className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  {animatedStats.conversionRate.toFixed(1)}%
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>{closedDeals} cerrados</p>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-brand-navy to-slate-600 opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>Propiedades</p>
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  {Math.round(animatedStats.totalProperties)}
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>{propertiesForSale} venta · {propertiesForRent} alquiler</p>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-brand-gold to-primary opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>Valor Promedio</p>
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  ${Math.round(animatedStats.avgPropertyPrice).toLocaleString()}
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>por propiedad</p>
              </div>
            </div>

            <Suspense fallback={<AdminChartsRowSkeleton />}>
              <AdminDashboardCharts trendData={dashboardLeadTrendData} sourceData={leadsBySourceData} />
            </Suspense>
              </>
            )}
          </div>
        )}

        {/* KPI's Tab */}
        {activeTab === "kpis" &&
          (kpisModuleLoading ? (
            <AdminKpisSkeleton />
          ) : (
            <Suspense fallback={<AdminKpisSkeleton />}>
              <KPIsModule
                user={user}
                users={users}
                groups={userGroups}
                leads={leads}
                properties={properties}
                appointments={appointments}
                customStages={customKanbanStages}
                stageOrder={pipelineStageOrder}
              />
            </Suspense>
          ))}

        {/* Leads Tab */}
        {activeTab === "leads" &&
          (leadsModuleLoading ? (
            <AdminLeadsTabSkeleton />
          ) : (
          <div className="space-y-6">
            {/* Leads Header */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
              <div
                className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
                aria-hidden
              />
              <div className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] to-transparent blur-3xl" aria-hidden />
              <div className="relative px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
                  <div className="min-w-0 max-w-xl">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary"
                      style={{ fontWeight: 600 }}
                    >
                      Pipeline CRM
                    </p>
                    <h2
                      className="font-heading mt-2 text-[1.65rem] leading-tight text-brand-navy md:text-[1.85rem]"
                      style={{ fontWeight: 600 }}
                    >
                      Gestión de leads
                    </h2>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600" style={{ fontWeight: 500 }}>
                      Administra y da seguimiento a tus clientes potenciales con vista Kanban o tabla.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                    <div
                      className="inline-flex w-full rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-[inset_0_1px_2px_rgba(20,28,46,0.06)] sm:w-auto"
                      role="group"
                      aria-label="Vista de leads"
                    >
                      <button
                        type="button"
                        aria-label="Vista Kanban"
                        onClick={() => setLeadsView("kanban")}
                        className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl transition-all sm:h-10 sm:flex-none sm:w-10 ${
                          leadsView === "kanban"
                            ? "bg-brand-navy text-white shadow-md shadow-brand-navy/25"
                            : "text-slate-600 hover:bg-white/80 hover:text-brand-navy"
                        }`}
                      >
                        <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label="Vista tabla"
                        onClick={() => setLeadsView("table")}
                        className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl transition-all sm:h-10 sm:flex-none sm:w-10 ${
                          leadsView === "table"
                            ? "bg-brand-navy text-white shadow-md shadow-brand-navy/25"
                            : "text-slate-600 hover:bg-white/80 hover:text-brand-navy"
                        }`}
                      >
                        <Table2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAddLeadOpen(true)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:bg-brand-red-hover hover:shadow-xl sm:flex-initial"
                      style={{ fontWeight: 600 }}
                    >
                      <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
                      Nuevo lead
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                    <div className="relative min-h-[2.75rem] min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                        strokeWidth={1.75}
                      />
                      <input
                        type="search"
                        placeholder={
                          leadSearchNameScope === "client"
                            ? "Buscar por nombre del cliente (contacto)…"
                            : leadSearchNameScope === "advisor"
                              ? "Buscar por nombre del asesor o líder asignado…"
                              : "Buscar por contacto, teléfono o asesor / líder…"
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-full min-h-[2.75rem] w-full rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-4 text-sm text-brand-navy shadow-sm transition-all placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                        style={{ fontWeight: 500 }}
                        autoComplete="off"
                      />
                    </div>
                    <div className="relative min-h-[2.75rem] w-full shrink-0 lg:w-[min(100%,19rem)] lg:max-w-[19rem]">
                      <TextSearch
                        className="pointer-events-none absolute left-4 top-1/2 z-[1] h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                        strokeWidth={1.75}
                      />
                      <select
                        aria-label="Ámbito de búsqueda por nombre"
                        value={leadSearchNameScope}
                        onChange={(e) =>
                          setLeadSearchNameScope(e.target.value as "all" | "client" | "advisor")
                        }
                        className="h-full min-h-[2.75rem] w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                        style={{ fontWeight: 500 }}
                      >
                        <option value="all">Todo: contacto, tel. y asesor</option>
                        <option value="client">Nombre del cliente</option>
                        <option value="advisor">Nombre del asesor / líder</option>
                      </select>
                      <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        aria-hidden
                      >
                        <ChevronDown className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row flex-nowrap items-stretch gap-2 overflow-x-auto pb-0.5 sm:gap-3">
                  <div className="relative min-h-[2.75rem] min-w-[12rem] flex-[2] basis-0">
                    <Users
                      className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                    />
                    <select
                      id="crm-pipeline-group"
                      value={activePipelineGroupId}
                      onChange={(e) => setActivePipelineGroupId(e.target.value)}
                      className="h-full min-h-[2.75rem] w-full min-w-0 appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 md:min-w-[22rem]"
                      style={{ fontWeight: 500 }}
                    >
                      {allowedPipelineGroupIds.map((id) => (
                        <option key={id} value={id}>
                          Grupo: {pipelineGroupLabel(id)}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                      <ChevronDown className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>
                  <div className="relative min-w-[10.5rem] flex-1 basis-0">
                    <Calendar
                      className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                    />
                    <select
                      value={createdRangeFilter}
                      onChange={(e) =>
                        setCreatedRangeFilter(e.target.value as "all" | "1m" | "3m" | "6m" | "1y" | "custom")
                      }
                      className="h-full min-h-[2.75rem] w-full min-w-0 appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-10 pr-10 text-sm text-brand-navy shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 md:min-w-[12rem]"
                      style={{ fontWeight: 500 }}
                    >
                      <option value="all">Cualquier fecha</option>
                      <option value="1m">Ultimo mes</option>
                      <option value="3m">Ultimos 3 meses</option>
                      <option value="6m">Ultimos 6 meses</option>
                      <option value="1y">Ultimo ano</option>
                      <option value="custom">Fecha personalizada</option>
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                      <ChevronDown className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>
                  <div className="relative min-w-[10.5rem] flex-1 basis-0">
                    <Filter
                      className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                    />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="h-full min-h-[2.75rem] w-full min-w-0 appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-10 pr-10 text-sm text-brand-navy shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15 md:min-w-[12rem]"
                      style={{ fontWeight: 500 }}
                    >
                      <option value="all">Todos los estados</option>
                      {statusSelectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden>
                      <ChevronDown className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </div>
                  </div>
                  {createdRangeFilter === "custom" && (
                    <div className="grid gap-3 sm:max-w-[460px] sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Desde
                        </label>
                        <input
                          type="date"
                          value={createdFrom}
                          onChange={(e) => setCreatedFrom(e.target.value)}
                          className="h-11 w-full rounded-2xl border border-slate-200/90 bg-white px-4 text-sm text-brand-navy shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                          style={{ fontWeight: 500 }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Hasta
                        </label>
                        <input
                          type="date"
                          value={createdTo}
                          onChange={(e) => setCreatedTo(e.target.value)}
                          className="h-11 w-full rounded-2xl border border-slate-200/90 bg-white px-4 text-sm text-brand-navy shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                          style={{ fontWeight: 500 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <AddLeadDialog
              open={addLeadOpen}
              onOpenChange={setAddLeadOpen}
              allLeads={leads}
              onAddLead={handleAddLead}
              user={user}
              customKanbanStages={customKanbanStages}
              pipelineGroupId={activePipelineGroupId}
              defaultStageId={defaultLeadStageId}
              allowedAssigneeUserIds={allowedLeadAssigneeUserIds}
              properties={properties}
              developments={developments}
            />

            {leadsError && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                style={{ fontWeight: 500 }}
                role="alert"
              >
                {leadsError}
              </div>
            )}

            {!leadsLoading &&
              leadColumnStatuses.length === 0 &&
              customKanbanStages.length === 0 &&
              leadStatusesForRendering.length === 0 && (
                <div
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  style={{ fontWeight: 500 }}
                  role="status"
                >
                  Este pipeline no tiene columnas todavía. Crea la primera en{" "}
                  <code className="text-xs">Mi empresa → Pipeline de ventas</code>.
                </div>
              )}

            {!leadsLoading &&
              user &&
              !canViewAllLeads(user.role) &&
              leads.length > 0 &&
              leadsForUser.length === 0 && (
                <div
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                  style={{ fontWeight: 500 }}
                  role="status"
                >
                  Hay {leads.length} lead{leads.length === 1 ? "" : "s"} en el sistema, pero ninguno coincide con tu
                  usuario ({roleLabelEs(user.role)}). En datos Tokko,{" "}
                  <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">assigned_to_user_id</code> suele ser el{" "}
                  <strong>id Tokko del asesor</strong> (no el UUID de Auth): debe coincidir con{" "}
                  <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">tokko_users.tokko_user_id</code> o con{" "}
                  <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">user_metadata.tokko_user_id</code> en
                  Auth. Un administrador puede poner{" "}
                  <code className="rounded bg-amber-100/80 px-1 py-0.5 text-xs">role: &quot;admin&quot;</code> para ver
                  todos.
                </div>
              )}

            {!leadsLoading && leads.length === 0 && (
              <div
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                style={{ fontWeight: 500 }}
              >
                No hay leads en la base de datos (tabla <code className="text-xs">leads</code>). Si esperabas datos de
                Tokko, revisa el sync; si es entorno nuevo, crea un lead desde aquí.
              </div>
            )}

            {leadsView === "kanban" && (
              <LeadsKanbanBoard
                leads={filteredLeadsForBoard}
                columnStatuses={leadStatusesForRendering}
                columnHexByStatus={effectiveStageColors}
                statusLabel={resolveStatusLabel}
                onStatusChange={handleUpdateLeadStatus}
                onLeadOpen={(l) => openLeadDetail(l, "view")}
              />
            )}

            {/* Leads: vista tabla — agrupada por estado, tarjetas a ancho completo (sin scroll horizontal) */}
            {leadsView === "table" && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_8px_32px_-10px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02]">
              {filteredLeads.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" strokeWidth={1.5} />
                  <p className="text-sm text-slate-500" style={{ fontWeight: 500 }}>
                    No se encontraron leads
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/80">
                  {leadsTableGroupedByStatus.map(({ statusId, label, leads: sectionLeads }) => {
                    const sectionCollapsed = leadsTableSectionCollapsed[statusId] === true;
                    return (
                    <section key={statusId} className="bg-white">
                      <button
                        type="button"
                        onClick={() => toggleLeadsTableSection(statusId)}
                        className={LIST_STAGE_HEADER_BUTTON_CLASSES}
                        style={stageHexToListHeaderStyle(resolveStageHex(statusId))}
                        aria-expanded={!sectionCollapsed}
                        aria-label={
                          sectionCollapsed ? `Expandir sección ${label}, ${sectionLeads.length} leads` : `Contraer sección ${label}`
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ease-out",
                            sectionCollapsed ? "-rotate-90" : "rotate-0",
                          )}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h3
                            className="font-heading inline-block bg-gradient-to-br from-brand-navy via-[#1a2744] to-brand-navy bg-clip-text text-base tracking-tight text-transparent sm:text-[1.125rem]"
                            style={{ fontWeight: 700 }}
                          >
                            {label}
                          </h3>
                          <span
                            className="inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-800 shadow-sm ring-1 ring-slate-200/90 backdrop-blur-sm"
                            style={{ fontWeight: 700 }}
                          >
                            {sectionLeads.length}
                          </span>
                        </div>
                      </button>
                      <div
                        className={cn(
                          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                          sectionCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
                        )}
                      >
                        <div className="min-h-0 overflow-hidden">
                      <ul className="divide-y divide-slate-100 border-t border-slate-100/90 bg-white">
                        {sectionLeads.map((lead) => (
                          <li
                            key={lead.id}
                            className="py-1.5 pl-5 pr-3 transition-colors hover:bg-slate-50/90 sm:pl-8 sm:pr-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                                      <p
                                        className="text-[13.6px] font-semibold leading-none tracking-tight text-slate-900"
                                        style={{ fontWeight: 600 }}
                                      >
                                        {lead.name}
                                      </p>
                                      <span className="text-[10.2px] text-slate-500" style={{ fontWeight: 500 }}>
                                        {lead.source}
                                      </span>
                                    </div>
                                    <p className="mt-px text-[11.9px] leading-tight text-slate-600">
                                      <span className="inline break-words">{lead.email}</span>
                                      <span className="mx-1 text-slate-300">·</span>
                                      <span>{lead.phone}</span>
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2 sm:hidden">
                                    <div className="flex h-8 items-center">
                                      <LeadPriorityBadge stars={lead.priorityStars} size="sm" />
                                    </div>
                                    <div className="flex h-8 items-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => openLeadDetail(lead, "view")}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                        title="Ver"
                                      >
                                        <Eye className="h-6 w-6" strokeWidth={1.5} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openLeadDetail(lead, "edit")}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                        title="Editar"
                                      >
                                        <Edit className="h-6 w-6" strokeWidth={1.5} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm("¿Eliminar este lead?")) {
                                            void handleDeleteLead(lead.id);
                                          }
                                        }}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-6 w-6" strokeWidth={1.5} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <p className="mt-1 min-w-0 text-[11.9px] leading-tight text-slate-600">
                                  <span className="font-semibold capitalize text-slate-800">{lead.interest}</span>
                                  <span className="mx-1 text-slate-300">·</span>
                                  <span>{lead.propertyType}</span>
                                  <span className="mx-1 text-slate-300">·</span>
                                  <span className="font-semibold tabular-nums text-slate-900">${lead.budget.toLocaleString()}</span>
                                  <span className="mx-1 text-slate-300">·</span>
                                  <span className="text-slate-600">{lead.location}</span>
                                </p>
                                <div className="mt-1.5 sm:hidden">
                                  <select
                                    id={`lead-status-${lead.id}`}
                                    value={lead.status}
                                    onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                    className="h-8 w-full min-w-0 max-w-full cursor-pointer rounded-md px-2 py-0 text-[11.9px] font-semibold shadow-sm"
                                    style={{
                                      fontWeight: 600,
                                      ...stageHexToChipStyle(resolveStageHex(lead.status)),
                                    }}
                                    aria-label={`Cambiar estado de ${lead.name}`}
                                  >
                                    {statusSelectOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                                <div className="flex h-8 items-center">
                                  <LeadPriorityBadge stars={lead.priorityStars} size="sm" />
                                </div>
                                <select
                                  value={lead.status}
                                  onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                  className="h-8 min-w-[8.75rem] max-w-full cursor-pointer rounded-md px-2 py-0 text-[11.9px] font-semibold shadow-sm sm:min-w-[9.25rem]"
                                  style={{
                                    fontWeight: 600,
                                    ...stageHexToChipStyle(resolveStageHex(lead.status)),
                                  }}
                                  aria-label={`Cambiar estado de ${lead.name}`}
                                >
                                  {statusSelectOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex h-8 items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openLeadDetail(lead, "view")}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                    title="Ver"
                                  >
                                    <Eye className="h-6 w-6" strokeWidth={1.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openLeadDetail(lead, "edit")}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                    title="Editar"
                                  >
                                    <Edit className="h-6 w-6" strokeWidth={1.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                          if (window.confirm("¿Eliminar este lead?")) {
                                            void handleDeleteLead(lead.id);
                                          }
                                        }}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-6 w-6" strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                        </div>
                      </div>
                    </section>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>
          ))}

        {activeTab === "clients" &&
          canAccessClients &&
          (leadsModuleLoading ? (
            <AdminClientsSkeleton />
          ) : (
          <div className="space-y-6">
            <AdminClientsManager
              currentUser={user}
              users={users}
              userGroups={userGroups}
              clients={clients}
              onSetClients={(updater) => setClients(updater)}
              properties={properties}
              developments={developments}
              leads={leads}
              onViewTeamMember={handleViewTeamMember}
              focusClient={focusClient}
              onFocusClientConsumed={handleFocusClientConsumed}
              seedFromLead={seedClientFromLead}
              onSeedFromLeadConsumed={handleSeedClientFromLeadConsumed}
            />
          </div>
          ))}

        {activeTab === "agenda" && <AdminAgendaModule />}

        {activeTab === "activities" && (
          <AdminActivitiesModule
            onOpenInModule={(entityType) => {
              goTab(entityType === "property" ? "properties" : "developments");
            }}
          />
        )}

        {activeTab === "sitio" && canEditSite && (
          <div className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_16px_48px_-28px_rgba(20,28,46,0.14)] ring-1 ring-black/[0.03] sm:p-2.5 md:p-3 lg:h-[calc(100dvh-0.5rem)] lg:max-h-[calc(100dvh-0.5rem)]">
            <Suspense fallback={adminModuleFallback()}>
              <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                <AdminSiteEditor />
              </div>
            </Suspense>
          </div>
        )}

        {/* Properties Tab */}
        {activeTab === "properties" &&
          (catalogPropertiesLoading ? (
            <AdminPropertiesSkeleton />
          ) : (
          <div className="space-y-6">
            {/* Properties Header */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
              <div
                className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
                aria-hidden
              />
              <div className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1" style={{ fontWeight: 600 }}>Gestión de Propiedades</h2>
                  <p className="text-sm text-slate-600" style={{ fontWeight: 500 }}>
                    Filtra, edita y publica propiedades del catálogo.
                  </p>
                  <p className="mt-2 text-xs text-slate-600" style={{ fontWeight: 500 }}>
                    Portada (inicio):{" "}
                    <span className="font-semibold text-brand-navy">
                      {propertyFeaturedCount}/{MAX_FEATURED_PROPERTIES}
                    </span>{" "}
                    destacadas (máximo {MAX_FEATURED_PROPERTIES}). Usa la estrella en la imagen, en la lista o el checkbox al editar.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                  <div
                    className="inline-flex w-full flex-wrap rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-[inset_0_1px_2px_rgba(20,28,46,0.06)] sm:w-auto"
                    role="group"
                    aria-label="Vista del inventario"
                  >
                    <button
                      type="button"
                      aria-label="Vista de tarjetas"
                      onClick={() => setPropertyInventoryView("cards")}
                      className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl transition-all sm:h-10 sm:flex-none sm:w-10 ${
                        propertyInventoryView === "cards"
                          ? "bg-brand-navy text-white shadow-md shadow-brand-navy/25"
                          : "text-slate-600 hover:bg-white/80 hover:text-brand-navy"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      aria-label="Vista de lista"
                      onClick={() => setPropertyInventoryView("list")}
                      className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl transition-all sm:h-10 sm:flex-none sm:w-10 ${
                        propertyInventoryView === "list"
                          ? "bg-brand-navy text-white shadow-md shadow-brand-navy/25"
                          : "text-slate-600 hover:bg-white/80 hover:text-brand-navy"
                      }`}
                    >
                      <Table2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      aria-label="Vista de mapa"
                      onClick={() => setPropertyInventoryView("map")}
                      className={`inline-flex h-11 flex-1 items-center justify-center rounded-xl transition-all sm:h-10 sm:flex-none sm:w-10 ${
                        propertyInventoryView === "map"
                          ? "bg-brand-navy text-white shadow-md shadow-brand-navy/25"
                          : "text-slate-600 hover:bg-white/80 hover:text-brand-navy"
                      }`}
                    >
                      <MapIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    </button>
                  </div>
                  {canManageInventory && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewPropertyDraftId(crypto.randomUUID());
                        setPropertyForm({ mode: "create", property: null });
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2.5 font-medium text-white transition-all hover:bg-[#a00d25] sm:w-auto"
                      style={{ fontWeight: 600 }}
                    >
                      <Plus className="h-4.5 w-4.5" strokeWidth={2} />
                      Nueva Propiedad
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4 relative">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5">
                  <select
                    value={propertyFeaturedFilter}
                    onChange={(e) =>
                      setPropertyFeaturedFilter(e.target.value as "all" | "featured" | "normal")
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    aria-label="Filtrar por propiedades destacadas en la portada"
                  >
                    <option value="all">Todos</option>
                    <option value="featured">Solo destacadas</option>
                    <option value="normal">No destacadas</option>
                  </select>
                  <select
                    value={propertyOperationFilter}
                    onChange={(e) => setPropertyOperationFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">Operación</option>
                    <option value="venta">Venta</option>
                    <option value="alquiler">Alquiler</option>
                  </select>
                  <select
                    value={propertyTypeFilter}
                    onChange={(e) => setPropertyTypeFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">Tipo de propiedad</option>
                    {propertyTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <select
                    value={propertyLocationFilter}
                    onChange={(e) => setPropertyLocationFilter(e.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value="all">Ubicación</option>
                    {propertyLocationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <select
                    value={propertyCatalogSort}
                    onChange={(e) =>
                      setPropertyCatalogSort(e.target.value as CatalogPropertySortKey)
                    }
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                    aria-label="Ordenar inventario"
                  >
                    {CATALOG_PROPERTY_SORT_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative min-w-0">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.75}
                  />
                  <input
                    type="search"
                    value={propertySearchQuery}
                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                    placeholder="Buscar por título, zona, tipo…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-brand-navy placeholder:text-slate-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    autoComplete="off"
                  />
                </div>
                <div className="relative min-w-0">
                  <Hash
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={propertyReferenceCodeQuery}
                    onChange={(e) => setPropertyReferenceCodeQuery(e.target.value)}
                    placeholder="Código de referencia…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-brand-navy tabular-nums placeholder:text-slate-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Filtrar por código de referencia"
                  />
                </div>
              </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-primary to-brand-burgundy opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>
                    Total propiedades
                  </p>
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  {totalProperties}
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>
                  Inventario en el panel
                </p>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-brand-burgundy to-brand-gold opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>
                    En venta
                  </p>
                  <Activity className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  {propertiesForSale}
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>
                  Listadas como venta
                </p>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-brand-navy to-slate-600 opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>
                    En alquiler
                  </p>
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  {propertiesForRent}
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>
                  Listadas como alquiler
                </p>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_8px_30px_-8px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02] transition-all hover:shadow-[0_12px_40px_-10px_rgba(20,28,46,0.14)]">
                <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-brand-gold to-primary opacity-90" aria-hidden />
                <div className="mb-1.5 flex items-start justify-between gap-2 pl-1">
                  <p className="font-heading min-w-0 text-[11px] uppercase tracking-[0.14em] text-slate-500" style={{ fontWeight: 600 }}>
                    Valor promedio
                  </p>
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-brand-gold/90" strokeWidth={1.5} />
                </div>
                <p className="font-heading pl-1 text-2xl leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                  ${parseInt(avgPropertyPrice, 10).toLocaleString()}
                </p>
                <p className="mt-1 pl-1 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>
                  Por propiedad (precio listado)
                </p>
              </div>
            </div>

            {/* Properties: tarjetas, lista o mapa */}
            {propertyInventoryView === "map" && filteredProperties.length > 0 && (
              <div className="space-y-3">
                {filteredProperties.some((p) => p.coordinates) ? (
                  <Suspense fallback={adminModuleFallback("h-[min(60vh,560px)] min-h-[320px]")}>
                    <PropertyMap
                      properties={filteredProperties}
                      mapHeightClassName="h-[min(60vh,560px)] min-h-[320px]"
                    />
                  </Suspense>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-600" style={{ fontWeight: 500 }}>
                    Ninguna propiedad del listado tiene coordenadas. Edita una ficha y guarda ubicación para verla en el mapa.
                  </div>
                )}
              </div>
            )}

            {propertyInventoryView === "cards" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property) => (
                <div key={property.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-slate-300 transition-all group">
                  {canManageInventory ? (
                    <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPropertyForm({ mode: "edit", property })}
                      className="relative block h-48 w-full cursor-pointer overflow-hidden bg-slate-100 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
                      aria-label={`Abrir ficha: ${property.title}`}
                    >
                      <img
                        src={property.image}
                        alt=""
                        className="pointer-events-none h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/95 backdrop-blur-sm text-slate-900 border border-slate-200" style={{ fontWeight: 600 }}>
                          {property.status.toUpperCase()}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      title={property.featured ? "Quitar de la portada (inicio)" : "Destacar en la portada"}
                      aria-label={property.featured ? "Quitar de la portada" : "Destacar en la portada"}
                      aria-pressed={Boolean(property.featured)}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleTogglePropertyFeatured(property);
                      }}
                      className={`absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md border shadow-sm backdrop-blur-sm transition-colors ${
                        property.featured
                          ? "border-amber-300/90 bg-amber-400/95 text-amber-950 hover:bg-amber-400"
                          : "border-slate-200/90 bg-white/95 text-slate-500 hover:border-amber-200 hover:text-amber-700"
                      }`}
                    >
                      <Star className="h-4 w-4" strokeWidth={2} fill={property.featured ? "currentColor" : "none"} />
                    </button>
                  </div>
                  ) : (
                    <div className="relative block h-48 w-full overflow-hidden bg-slate-100 p-0 text-left">
                      <img
                        src={property.image}
                        alt=""
                        className="pointer-events-none h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/95 backdrop-blur-sm text-slate-900 border border-slate-200" style={{ fontWeight: 600 }}>
                          {property.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5">
                    <span className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2 block" style={{ letterSpacing: '0.05em', fontWeight: 500 }}>
                      {property.type}
                    </span>
                    <h3 className="font-semibold text-slate-900 mb-2" style={{ fontWeight: 600 }}>{property.title}</h3>
                    <p className="text-sm text-slate-600 mb-4 flex items-center gap-1.5" style={{ fontWeight: 500 }}>
                      <MapPin className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                      {property.location}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Bed className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                        <span className="text-sm font-medium" style={{ fontWeight: 500 }}>{property.bedrooms}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Bath className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                        <span className="text-sm font-medium" style={{ fontWeight: 500 }}>{property.bathrooms}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Square className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
                        <span className="text-sm font-medium" style={{ fontWeight: 500 }}>{property.area}m²</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-wide" style={{ letterSpacing: '0.05em', fontWeight: 500 }}>Precio</p>
                        <p className="text-xl font-semibold text-slate-900" style={{ fontWeight: 700 }}>
                          ${property.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyPublicPageUrl(`/propiedades/${property.id}`)}
                          className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                          title="Copiar enlace público"
                          aria-label="Copiar enlace público"
                        >
                          <Link2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        <PdfDownloadDropdown data={property} type="property" />
                        <button
                          type="button"
                          onClick={() => navigate(`/propiedades/${property.id}`)}
                          className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                          title="Ver en el sitio"
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        {canManageInventory && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPropertyForm({ mode: "edit", property })}
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteProperty(property.id)}
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}

            {propertyInventoryView === "list" && filteredProperties.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_8px_32px_-10px_rgba(20,28,46,0.1)] ring-1 ring-black/[0.02]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="border-b border-slate-200/90 bg-gradient-to-r from-slate-50/95 to-white">
                      <tr>
                        <th
                          className="font-heading px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/75 sm:px-6 sm:py-4"
                          style={{ fontWeight: 600 }}
                        >
                          Propiedad
                        </th>
                        <th
                          className="font-heading px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/75 sm:px-6 sm:py-4"
                          style={{ fontWeight: 600 }}
                        >
                          Tipo
                        </th>
                        <th
                          className="font-heading px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/75 sm:px-6 sm:py-4"
                          style={{ fontWeight: 600 }}
                        >
                          Ubicación
                        </th>
                        <th
                          className="font-heading px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/75 sm:px-6 sm:py-4"
                          style={{ fontWeight: 600 }}
                        >
                          Operación
                        </th>
                        <th
                          className="font-heading px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/75 sm:px-6 sm:py-4"
                          style={{ fontWeight: 600 }}
                        >
                          Precio
                        </th>
                        <th
                          className="font-heading px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/75 sm:px-6 sm:py-4"
                          style={{ fontWeight: 600 }}
                        >
                          Inicio
                        </th>
                        <th
                          className="font-heading px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-navy/75 sm:px-6 sm:py-4"
                          style={{ fontWeight: 600 }}
                        >
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredProperties.map((property) => (
                        <tr key={property.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={property.image}
                                alt=""
                                className="h-12 w-16 shrink-0 rounded-lg object-cover"
                              />
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-medium text-slate-900" style={{ fontWeight: 600 }}>
                                  {property.title}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500" style={{ fontWeight: 500 }}>
                                  {property.bedrooms} rec · {property.bathrooms} baños · {property.area} m²
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-800 sm:px-6 sm:py-4" style={{ fontWeight: 500 }}>
                            {property.type}
                          </td>
                          <td className="max-w-[12rem] px-4 py-3 text-sm text-slate-600 sm:px-6 sm:py-4" style={{ fontWeight: 500 }}>
                            <span className="line-clamp-2">{property.location}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                            <span
                              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                                property.status === "venta"
                                  ? "bg-red-50 text-red-800 ring-1 ring-red-200/80"
                                  : "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80"
                              }`}
                              style={{ fontWeight: 600 }}
                            >
                              {property.status === "venta" ? "Venta" : "Alquiler"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-slate-900 sm:px-6 sm:py-4" style={{ fontWeight: 700 }}>
                            ${property.price.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-center sm:px-6 sm:py-4">
                            <button
                              type="button"
                              title={property.featured ? "Quitar de la portada" : "Destacar en la portada"}
                              aria-label={property.featured ? "Quitar de la portada" : "Destacar en la portada"}
                              aria-pressed={Boolean(property.featured)}
                              onClick={() => void handleTogglePropertyFeatured(property)}
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                property.featured
                                  ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                  : "border-slate-200 bg-white text-slate-400 hover:border-amber-200 hover:text-amber-700"
                              }`}
                            >
                              <Star className="h-4 w-4" strokeWidth={2} fill={property.featured ? "currentColor" : "none"} />
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => copyPublicPageUrl(`/propiedades/${property.id}`)}
                                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                title="Copiar enlace público"
                                aria-label="Copiar enlace público"
                              >
                                <Link2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                              <PdfDownloadDropdown data={property} type="property" />
                              <button
                                type="button"
                                onClick={() => navigate(`/propiedades/${property.id}`)}
                                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                title="Ver en el sitio"
                              >
                                <Eye className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                              {canManageInventory && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setPropertyForm({ mode: "edit", property })}
                                    className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                                    title="Editar"
                                  >
                                    <Edit className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteProperty(property.id)}
                                    className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredProperties.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-20 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-6">
                    <Home className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontWeight: 600 }}>
                    {properties.length === 0 ? "No hay propiedades" : "Sin resultados"}
                  </h3>
                  <p className="text-sm text-slate-600 mb-6" style={{ fontWeight: 500 }}>
                    {properties.length === 0
                      ? "Comienza agregando tu primera propiedad al catálogo"
                      : "Prueba con otro término de búsqueda."}
                  </p>
                  {properties.length === 0 && canManageInventory && (
                    <button
                      type="button"
                      onClick={() => {
                      setNewPropertyDraftId(crypto.randomUUID());
                      setPropertyForm({ mode: "create", property: null });
                    }}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-6 py-2.5 font-medium text-white transition-all hover:bg-[#a00d25]"
                      style={{ fontWeight: 600 }}
                    >
                      <Plus className="h-4.5 w-4.5" strokeWidth={2} />
                      Nueva Propiedad
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          ))}

        {activeTab === "developments" &&
          (developmentsLoading ? (
            <AdminDevelopmentsSkeleton />
          ) : (
            <AdminDevelopmentsManager
              developments={developments}
              onSave={handleSaveDevelopment}
              onDelete={handleDeleteDevelopment}
            />
          ))}

        {activeTab === "company" &&
          canAccessCompanyModule &&
          (companyModuleLoading ? (
            <AdminCompanySkeleton />
          ) : (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
              <div
                className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] to-transparent blur-3xl"
                aria-hidden
              />
              <div className="relative px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-7">
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
                  style={{ fontWeight: 600 }}
                >
                  Centro de administración
                </p>
                <h2 className="font-heading mt-2 text-2xl tracking-tight text-brand-navy sm:text-3xl" style={{ fontWeight: 700 }}>
                  {isGroupLeader ? "Pipeline de ventas" : "Mi empresa"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600" style={{ fontWeight: 500 }}>
                  {isGroupLeader
                    ? "Gestiona tus grupos asignados y configura las columnas del pipeline de cada equipo."
                    : isAdmin
                      ? "Equipo, sitio, embudo comercial y ajustes. Como administrador puedes abrir el pipeline de cada grupo y ajustar columnas, orden y colores."
                      : "Equipo, sitio, embudo comercial y ajustes del espacio de trabajo. Elige un área para continuar."}
                </p>
              </div>
            </div>

            {!isGroupLeader && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {(
                [
                  {
                    id: "users" as const,
                    title: "Equipo y accesos",
                    desc: "Usuarios del CRM, roles y permisos.",
                    icon: Users,
                  },
                  {
                    id: "leadStages" as const,
                    title: "Pipeline de ventas",
                    desc: "Como administrador, revisa y edita el embudo de cada equipo; el líder solo el suyo.",
                    icon: LayoutGrid,
                  },
                  {
                    id: "settings" as const,
                    title: "Configuración",
                    desc: "Espacio de trabajo, respaldos y accesos.",
                    icon: Settings,
                  },
                ] as const
              ).map((item) => {
                const active = companySubtab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTab("company", item.id)}
                    className={cn(
                      "group flex w-full flex-row items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200",
                      active
                        ? "border-primary/35 bg-gradient-to-br from-primary/[0.07] via-white to-white shadow-[0_12px_32px_-16px_rgba(200,16,46,0.25)] ring-2 ring-primary/15"
                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        active
                          ? "border-primary/25 bg-primary/10 text-primary"
                          : "border-slate-200/90 bg-slate-50 text-slate-600 group-hover:border-slate-300 group-hover:bg-white",
                      )}
                    >
                      <item.icon className="h-4 w-4" strokeWidth={active ? 2 : 1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-heading text-sm leading-tight",
                          active ? "text-brand-navy" : "text-slate-900",
                        )}
                        style={{ fontWeight: 600 }}
                      >
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500" style={{ fontWeight: 500 }}>
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>}

            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_16px_48px_-28px_rgba(20,28,46,0.14)] ring-1 ring-black/[0.03]">
              {companySubtab === "users" && user && (
                <div className="p-5 md:p-8">
                  <AdminUsersManager
                    currentUser={user}
                    users={users}
                    leads={leads}
                    properties={properties}
                    developments={developments}
                    customKanbanStages={customKanbanStages}
                    userGroups={userGroups}
                    onUserGroupsChange={handleUserGroupsChange}
                    onViewLead={(lead) => {
                      goTab("leads");
                      openLeadDetail(lead, "view");
                    }}
                    onCreateUser={(input) => createUser(input, user.name)}
                    onUpdateUser={(id, input) => updateUser(id, input, user.name)}
                    onUpdatePassword={(id, password) => updateUserPassword(id, password, user.name)}
                    onUpdatePermissions={(id, role, permissions) =>
                      updateUserPermissions(id, role, permissions, user.name)
                    }
                    onArchive={(id) => archiveUser(id, user.name)}
                    onReactivate={(id) => reactivateUser(id, user.name)}
                    focusUser={usersPanelFocus}
                    onFocusUserConsumed={handleUsersPanelFocusConsumed}
                    onUserDetailClosed={handleUserDetailClosed}
                  />
                </div>
              )}
              {companySubtab === "site" && canEditSite && (
                <div className="flex h-[calc(100dvh-1.25rem)] max-h-[calc(100dvh-1.25rem)] min-h-0 w-full flex-col overflow-hidden p-2 sm:p-2.5 md:p-3 lg:h-[calc(100dvh-0.75rem)] lg:max-h-[calc(100dvh-0.75rem)]">
                  <Suspense fallback={adminModuleFallback()}>
                    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                      <AdminSiteEditor />
                    </div>
                  </Suspense>
                </div>
              )}
              {companySubtab === "settings" && (
                <AdminCompanySettings
                  counts={{
                    leads: leads.length,
                    properties: properties.length,
                    developments: developments.length,
                    users: users.length,
                    agenda: (() => {
                      try {
                        const raw = localStorage.getItem(AGENDA_STORAGE_KEY);
                        if (!raw) return 0;
                        const p = JSON.parse(raw) as unknown;
                        return Array.isArray(p) ? p.length : 0;
                      } catch {
                        return 0;
                      }
                    })(),
                  }}
                  onNavigate={(spec) => {
                    if (spec.type === "tab") {
                      goTab(spec.tab);
                    } else {
                      goTab("company", spec.sub);
                    }
                  }}
                />
              )}
              {companySubtab === "leadStages" && (
                <div className="flex flex-col gap-6 p-5 md:p-8">
                  {isAdmin && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-12px_rgba(20,28,46,0.12)] ring-1 ring-black/[0.03]">
                      <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 px-5 py-4 md:px-6">
                        <h4
                          className="flex items-center gap-2 text-base text-brand-navy"
                          style={{ fontWeight: 700 }}
                        >
                          <LayoutGrid className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden />
                          Organización del pipeline por equipo
                        </h4>
                        <p className="mt-1 text-sm text-slate-500" style={{ fontWeight: 500 }}>
                          Selecciona el grupo cuyo embudo quieres revisar o editar. Los cambios se guardan para ese
                          equipo y se reflejan en el CRM cuando ese grupo está activo en la vista de leads.
                        </p>
                      </div>
                      <div className="p-5 md:px-6 md:pb-6">
                        <label
                          htmlFor="admin-pipeline-group-context"
                          className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                        >
                          Equipo / contexto del embudo
                        </label>
                        <div className="relative min-h-[2.75rem]">
                          <Users
                            className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                            strokeWidth={1.75}
                          />
                          <select
                            id="admin-pipeline-group-context"
                            value={activePipelineGroupId}
                            onChange={(e) => setActivePipelineGroupId(e.target.value)}
                            className="h-full min-h-[2.75rem] w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                            style={{ fontWeight: 500 }}
                          >
                            {allowedPipelineGroupIds.map((id) => (
                              <option key={id} value={id}>
                                Grupo: {pipelineGroupLabel(id)}
                              </option>
                            ))}
                          </select>
                          <span
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            aria-hidden
                          >
                            <ChevronDown className="h-4 w-4" strokeWidth={2} />
                          </span>
                        </div>
                      </div>
                    </section>
                  )}

                  {isAdmin && pipelineCopyDestOptions.length > 0 && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-12px_rgba(20,28,46,0.12)] ring-1 ring-black/[0.03]">
                      <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 px-5 py-4 md:px-6">
                        <h4
                          className="flex items-center gap-2 text-base text-brand-navy"
                          style={{ fontWeight: 700 }}
                        >
                          <Copy className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden />
                          Duplicar pipeline entre equipos
                        </h4>
                        <p className="mt-1 text-sm text-slate-500" style={{ fontWeight: 500 }}>
                          Copia etapas, orden y colores de un embudo a otro. Reemplaza la configuración del pipeline del
                          equipo de destino; no mueve ni cambia los leads.
                        </p>
                      </div>
                      <div className="space-y-4 p-5 md:px-6 md:pb-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label
                              htmlFor="pipeline-copy-from"
                              className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                            >
                              Copiar pipeline desde
                            </label>
                            <div className="relative min-h-[2.75rem]">
                              <Copy
                                className="pointer-events-none absolute left-4 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                              <select
                                id="pipeline-copy-from"
                                value={pipelineCopyFrom}
                                onChange={(e) => setPipelineCopyFrom(e.target.value)}
                                className="h-full min-h-[2.75rem] w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                                style={{ fontWeight: 500 }}
                              >
                                <option value="">— Elige el equipo de origen —</option>
                                {pipelineCopySourceOptions.map((id) => (
                                  <option key={id} value={id}>
                                    {pipelineGroupLabel(id)}
                                  </option>
                                ))}
                              </select>
                              <span
                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden
                              >
                                <ChevronDown className="h-4 w-4" strokeWidth={2} />
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label
                              htmlFor="pipeline-copy-to"
                              className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                            >
                              Aplicar en (destino)
                            </label>
                            <div className="relative min-h-[2.75rem]">
                              <Users
                                className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                                strokeWidth={1.75}
                              />
                              <select
                                id="pipeline-copy-to"
                                value={pipelineCopyTo}
                                onChange={(e) => setPipelineCopyTo(e.target.value)}
                                className="h-full min-h-[2.75rem] w-full appearance-none rounded-2xl border border-slate-200/90 bg-white py-3 pl-12 pr-10 text-sm text-brand-navy shadow-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                                style={{ fontWeight: 500 }}
                              >
                                <option value="">— Elige el equipo de destino —</option>
                                {pipelineCopyDestOptions.map((id) => (
                                  <option key={id} value={id}>
                                    {pipelineGroupLabel(id)}
                                  </option>
                                ))}
                              </select>
                              <span
                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden
                              >
                                <ChevronDown className="h-4 w-4" strokeWidth={2} />
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                          <button
                            type="button"
                            onClick={handleDuplicatePipelineToTeam}
                            disabled={!canSubmitPipelineCopy}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ fontWeight: 600 }}
                          >
                            <Copy className="h-4 w-4" strokeWidth={2} />
                            Duplicar pipeline
                          </button>
                          {canSubmitPipelineCopy && (
                            <p className="text-xs text-slate-500 sm:pb-0.5" style={{ fontWeight: 500 }}>
                              Se reemplaza el embudo de «{pipelineGroupLabel(pipelineCopyTo)}».
                            </p>
                          )}
                        </div>
                      </div>
                    </section>
                  )}

                  {isGroupLeader && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_50px_-24px_rgba(20,28,46,0.26)]">
                      <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50/60 px-5 py-4">
                        <h4 className="flex items-center gap-2 text-base text-brand-navy" style={{ fontWeight: 700 }}>
                          <Users className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden />
                          Tus grupos y asesores
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Selecciona un asesor para abrir su detalle o cambia de grupo para configurar su pipeline.
                        </p>
                      </div>
                      {pipelineGroupsVisibleToLeader.length === 0 ? (
                        <div className="p-5">
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                            No tienes grupos asignados por ahora. Contacta a un administrador para vincular grupos.
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3 p-5">
                          {pipelineGroupsVisibleToLeader.map((group) => {
                            const advisors = advisorsByGroupId[group.id] ?? [];
                            const isActiveGroup = activePipelineGroupId === group.id;
                            const isExpanded = expandedLeaderGroupId === group.id;
                            return (
                              <article
                                key={group.id}
                                className={cn(
                                  "rounded-xl border bg-white p-4 transition-shadow",
                                  isActiveGroup
                                    ? "border-primary/40 shadow-[0_14px_30px_-20px_rgba(199,34,56,0.7)] ring-1 ring-primary/20"
                                    : "border-slate-200/80 shadow-[0_8px_24px_-16px_rgba(20,28,46,0.2)]"
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedLeaderGroupId((prev) => (prev === group.id ? null : group.id))
                                    }
                                    className="flex min-w-0 items-center gap-2 text-left"
                                  >
                                    <ChevronDown
                                      className={cn("h-4 w-4 text-slate-500 transition-transform", isExpanded && "rotate-180")}
                                      strokeWidth={1.9}
                                    />
                                    <p className="truncate text-lg text-brand-navy" style={{ fontWeight: 700 }}>
                                      {group.name}
                                    </p>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActivePipelineGroupId(group.id)}
                                    className={cn(
                                      "shrink-0 rounded-md border px-2.5 py-1 text-[11px] transition",
                                      isActiveGroup
                                        ? "border-primary/35 bg-primary/10 text-primary"
                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/25 hover:text-primary"
                                    )}
                                    style={{ fontWeight: 600 }}
                                  >
                                    {isActiveGroup ? "Grupo activo" : "Activar grupo"}
                                  </button>
                                </div>

                                {isExpanded ? (
                                  <div className="mt-3 border-t border-slate-200/80 pt-3">
                                    <p className="mb-2 text-xs text-slate-500" style={{ fontWeight: 600 }}>
                                      {advisors.length} asesor{advisors.length === 1 ? "" : "es"}
                                    </p>
                                    {advisors.length > 0 ? (
                                      <div className="space-y-2">
                                        {advisors.map((advisor) => (
                                          <button
                                            type="button"
                                            key={advisor.id}
                                            onClick={() => handleViewTeamMember(advisor.id, advisor.name)}
                                            className="flex w-full items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                                          >
                                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-[11px] text-primary">
                                              {(advisor.name || advisor.email || "?").trim().charAt(0).toUpperCase()}
                                            </span>
                                            <span className="truncate" style={{ fontWeight: 600 }}>
                                              {advisor.name || advisor.email}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-500">Sin asesores activos en este grupo.</span>
                                    )}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  {!activePipelineGroupId ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                      No hay un grupo de trabajo asignado para configurar pipeline.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-primary" style={{ fontWeight: 600 }}>
                        Embudo comercial
                      </p>
                      <h3 className="mt-1 text-2xl text-brand-navy" style={{ fontWeight: 600 }}>
                        Pipeline de leads
                      </h3>
                      <p className="mt-2 text-sm text-slate-600" style={{ fontWeight: 500 }}>
                        Cada equipo tiene sus propias columnas. El administrador puede crearlas, ordenarlas y colorearlas
                        en cualquier grupo; el líder de grupo solo en los suyos. Los cambios aplican al tablero cuando
                        ese grupo está seleccionado en el CRM (o aquí arriba, si eres administrador).
                      </p>
                    </div>
                    <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-xl">
                      <input
                        type="text"
                        value={stageDraftLabel}
                        onChange={(e) => setStageDraftLabel(e.target.value)}
                        placeholder="Nueva columna del pipeline"
                        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-brand-navy placeholder:text-slate-400 focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15"
                        disabled={!canConfigureActivePipeline}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const label = stageDraftLabel.trim();
                          if (!label) return;
                          handleAddKanbanStage(label);
                          setStageDraftLabel("");
                        }}
                        disabled={!canConfigureActivePipeline || !stageDraftLabel.trim()}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm text-white transition hover:bg-brand-red-hover disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ fontWeight: 600 }}
                      >
                        <Plus className="h-4 w-4" strokeWidth={2} />
                        Agregar columna
                      </button>
                    </div>
                    </div>
                  )}

                  {activePipelineGroupId && <section className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-5">
                    <div>
                      <h4 className="text-base text-brand-navy" style={{ fontWeight: 600 }}>Orden de columnas del pipeline</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Arrastra cada fila para ordenar las columnas del Kanban. Usa el selector de color para el acento de cada columna en el tablero y la vista lista.
                      </p>
                    </div>

                    <DndProvider backend={HTML5Backend}>
                    <div className="mt-4 space-y-3">
                      {leadColumnStatuses.map((stageId, index) => {
                        const stageLabel = resolveStatusLabel(stageId);
                        const isEditing = editingStageId === stageId;
                        const leadsInStage = leads.filter(
                          (lead) =>
                            lead.status === stageId && lead.pipelineGroupId === activePipelineGroupId
                        ).length;

                        return (
                          <PipelineStageReorderRow
                            key={stageId}
                            index={index}
                            moveRow={handleReorderPipelineRows}
                            canDrag={canConfigureActivePipeline}
                          >
                          <div
                            className={`rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 ${
                              canConfigureActivePipeline ? "cursor-grab active:cursor-grabbing" : ""
                            }`}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              {canConfigureActivePipeline && (
                                <div
                                  className="flex shrink-0 items-center justify-center text-slate-400 lg:pt-0.5"
                                  aria-hidden
                                >
                                  <GripVertical className="h-5 w-5" strokeWidth={1.75} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={stageDraftLabel}
                                    onChange={(e) => setStageDraftLabel(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-brand-navy focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15"
                                    disabled={!canConfigureActivePipeline}
                                  />
                                ) : (
                                  <>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm text-brand-navy" style={{ fontWeight: 600 }}>
                                        {stageLabel}
                                      </p>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Clave: {stageId} · {leadsInStage} lead{leadsInStage === 1 ? "" : "s"} en esta etapa
                                    </p>
                                  </>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {canConfigureActivePipeline && !isEditing && (
                                  <label className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm">
                                    Color columna
                                    <input
                                      type="color"
                                      value={resolveStageHex(stageId)}
                                      onChange={(e) => {
                                        const hex = e.target.value;
                                        const colorKey = normalizeLeadPipelineStatus(stageId);
                                        setPipelineByGroup((map) => {
                                          const cur =
                                            map[activePipelineGroupId] ??
                                            createEmptyGroupPipelineSnapshot();
                                          const nextColors = { ...cur.stageColors };
                                          for (const k of Object.keys(nextColors)) {
                                            if (
                                              k !== colorKey &&
                                              k.toLowerCase() === colorKey.toLowerCase()
                                            ) {
                                              delete nextColors[k];
                                            }
                                          }
                                          nextColors[colorKey] = hex;
                                          return {
                                            ...map,
                                            [activePipelineGroupId]: {
                                              ...cur,
                                              stageColors: nextColors,
                                            },
                                          };
                                        });
                                      }}
                                      className="h-8 w-11 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                                      title="Acento visual en Kanban, vista lista y chips de estado"
                                      aria-label={`Color de columna para ${stageLabel}`}
                                    />
                                  </label>
                                )}
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const label = stageDraftLabel.trim();
                                        if (!label) return;
                                        handleUpdateKanbanStage(stageId, label);
                                        setEditingStageId(null);
                                        setStageDraftLabel("");
                                      }}
                                      disabled={!canConfigureActivePipeline || !stageDraftLabel.trim()}
                                      className="inline-flex items-center rounded-lg bg-brand-navy px-3 py-2 text-xs text-white transition hover:bg-[#1e2a45] disabled:cursor-not-allowed disabled:opacity-50"
                                      style={{ fontWeight: 600 }}
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStageId(null);
                                        setStageDraftLabel("");
                                      }}
                                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-50"
                                      style={{ fontWeight: 600 }}
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStageId(stageId);
                                        setStageDraftLabel(stageLabel);
                                      }}
                                      disabled={!canConfigureActivePipeline}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      style={{ fontWeight: 600 }}
                                    >
                                      <Edit className="h-3.5 w-3.5" strokeWidth={1.8} />
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => requestDeletePipelineStage(stageId, stageLabel)}
                                      disabled={!canConfigureActivePipeline}
                                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      style={{ fontWeight: 600 }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                                      Eliminar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          </PipelineStageReorderRow>
                        );
                      })}
                    </div>
                    </DndProvider>
                  </section>}
                </div>
              )}
            </section>
          </div>
          ))}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-12 text-center shadow-[0_8px_32px_-10px_rgba(20,28,46,0.1)] md:p-20">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                <MessageSquare className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
              </div>
              <h3 className="font-heading mb-2 text-lg text-brand-navy" style={{ fontWeight: 600 }}>
                Centro de Mensajes
              </h3>
              <p className="mb-8 text-sm text-slate-600" style={{ fontWeight: 500 }}>
                Los envíos del formulario de contacto del sitio pueden revisarse en la página pública o por correo.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/contacto"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-brand-red-hover"
                  style={{ fontWeight: 600 }}
                >
                  Ir al formulario de contacto
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </Link>
                <a
                  href="mailto:contacto@viterra.com"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-brand-navy transition-colors hover:bg-slate-50"
                  style={{ fontWeight: 600 }}
                >
                  Abrir cliente de correo
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/90 p-6 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.12)] sm:p-8">
            <div
              className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-primary/[0.08] to-transparent blur-2xl"
              aria-hidden
            />
            <AdminUserProfilePanel />
          </div>
        )}

        <LeadDetailDialog
          open={!!leadDialog && activeTab === "leads"}
          onOpenChange={(o) => {
            if (!o) setLeadDialog(null);
          }}
          lead={leadDialog?.lead ?? null}
          defaultMode={leadDialog?.mode ?? "view"}
          statusOptions={statusSelectOptions}
          onStatusChange={handleUpdateLeadStatus}
          onSave={handleSaveLead}
          onDelete={handleDeleteLead}
          teamUsers={users}
          currentUserId={user?.id ?? ""}
          onViewTeamMember={handleViewTeamMember}
          canManageClients={canAccessClients}
          onRegisterClientFromLead={handleRegisterClientFromLead}
          properties={properties}
          developments={developments}
        />

        <AlertDialog
          open={
            !!deletePipelineStage &&
            activeTab === "company" &&
            companySubtab === "leadStages"
          }
          onOpenChange={(open) => {
            if (!open) setDeletePipelineStage(null);
          }}
        >
          <AlertDialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border border-stone-200/90 p-0 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.22)] sm:max-w-md">
            <div
              className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
              aria-hidden
            />
            <div className="px-6 pb-2 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ fontWeight: 600 }}>
                CRM · Pipeline
              </p>
              <AlertDialogHeader className="mt-2 space-y-2 text-left">
                <AlertDialogTitle className="font-heading text-xl text-brand-navy" style={{ fontWeight: 600 }}>
                  ¿Eliminar esta columna?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-slate-600" style={{ fontWeight: 500 }}>
                  Vas a eliminar la columna{" "}
                  <span className="font-semibold text-brand-navy">«{deletePipelineStage?.label}»</span>. Los leads que
                  estén en esta etapa se moverán a la primera columna disponible (si no hay otra, quedarán sin columna
                  asignada).
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <AlertDialogFooter className="flex-col-reverse gap-2 border-t border-stone-200/80 bg-stone-50/90 px-6 py-4 sm:flex-row sm:justify-end">
              <AlertDialogCancel className="mt-0 border-stone-300 bg-white text-slate-700 hover:bg-stone-50 hover:text-slate-800">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-primary text-primary-foreground hover:bg-brand-red-hover"
                style={{ fontWeight: 600 }}
                onClick={() => {
                  if (deletePipelineStage) {
                    executeDeleteKanbanStage(deletePipelineStage.id, deletePipelineStage.label);
                    setDeletePipelineStage(null);
                  }
                }}
              >
                Eliminar columna
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!deletePropertyId && activeTab === "properties"}
          onOpenChange={(open) => {
            if (!open) setDeletePropertyId(null);
          }}
        >
          <AlertDialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl border border-stone-200/90 p-0 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.22)] sm:max-w-md">
            <div
              className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
              aria-hidden
            />
            <div className="px-6 pb-2 pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary" style={{ fontWeight: 600 }}>
                Panel admin · Propiedades
              </p>
              <AlertDialogHeader className="mt-2 space-y-2 text-left">
                <AlertDialogTitle className="font-heading text-xl text-brand-navy" style={{ fontWeight: 600 }}>
                  ¿Eliminar esta propiedad?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed text-slate-600" style={{ fontWeight: 500 }}>
                  {deletePropertyId ? (
                    <>
                      Vas a eliminar{" "}
                      <span className="font-semibold text-brand-navy">
                        «{properties.find((p) => p.id === deletePropertyId)?.title ?? "esta propiedad"}»
                      </span>
                      . Esta acción no se puede deshacer y la ficha dejará de mostrarse en el catálogo público.
                    </>
                  ) : (
                    "Esta acción no se puede deshacer."
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <AlertDialogFooter className="flex-col-reverse gap-2 border-t border-stone-200/80 bg-stone-50/90 px-6 py-4 sm:flex-row sm:justify-end">
              <AlertDialogCancel className="mt-0 border-stone-300 bg-white text-slate-700 hover:bg-stone-50 hover:text-slate-800">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-primary text-primary-foreground hover:bg-brand-red-hover"
                style={{ fontWeight: 600 }}
                onClick={executeDeleteProperty}
              >
                Eliminar propiedad
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PropertyFormDialog
          key={
            propertyForm
              ? `${propertyForm.mode}-${propertyForm.property?.id ?? "new"}`
              : "closed"
          }
          open={!!propertyForm && activeTab === "properties" && canManageInventory}
          onOpenChange={(o) => {
            if (!o) setPropertyForm(null);
          }}
          mode={propertyForm?.mode ?? "create"}
          property={propertyForm?.mode === "edit" ? propertyForm.property : null}
          newId={newPropertyDraftId}
          onSave={handleSaveProperty}
          otherFeaturedCount={
            propertyForm?.mode === "edit" && propertyForm.property
              ? properties.filter((x) => x.featured && x.id !== propertyForm.property.id).length
              : properties.filter((x) => x.featured).length
          }
        />
      </div>

    </div>
  );
}
