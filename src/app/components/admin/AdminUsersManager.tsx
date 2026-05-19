import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  ArchiveRestore,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Globe2,
  History,
  Home,
  KeyRound,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  UserPlus,
  UserCircle2,
  Users,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { SendMessageDialog } from "./messages/SendMessageDialog";
import { User, UserHistoryEntry, UserPermission, UserRole } from "../../contexts/AuthContext";
import { labelForLeadStatus, type CustomKanbanStage, type Lead } from "../../data/leads";
import type { Development } from "../../data/developments";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../ui/utils";
import type { Property } from "../PropertyCard";
import { foldSearchText } from "../../lib/searchText";
import type { UserGroup } from "../../lib/userGroups";
import { DEFAULT_PIPELINE_GROUP_ID, loadPipelineByGroup } from "../../lib/pipelineByGroup";
import { UserGroupsPanel } from "./UserGroupsPanel";

const userReadonlyFieldClass =
  "w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-2.5 text-sm text-brand-navy";

const permissionCards: Array<{
  value: UserPermission;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  {
    value: "manage_leads",
    label: "Leads",
    description: "CRM, pipeline y seguimiento de clientes",
    Icon: Users,
  },
  {
    value: "manage_properties",
    label: "Propiedades",
    description: "Catálogo y fichas de inmuebles",
    Icon: Home,
  },
  {
    value: "manage_developments",
    label: "Desarrollos",
    description: "Proyectos y desarrollos en el sitio",
    Icon: Building2,
  },
  {
    value: "manage_users",
    label: "Usuarios",
    description: "Alta, permisos y equipo",
    Icon: Shield,
  },
  {
    value: "manage_clients",
    label: "Clientes",
    description: "Fichas de clientes y relación con inventario",
    Icon: UserCircle2,
  },
  {
    value: "edit_site",
    label: "Sitio web",
    description: "Contenido y bloques del sitio público",
    Icon: Globe2,
  },
];

function permissionLabel(value: UserPermission) {
  return permissionCards.find((card) => card.value === value)?.label ?? value;
}

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function historyEventMeta(type: UserHistoryEntry["type"]) {
  const map: Record<
    UserHistoryEntry["type"],
    { title: string; Icon: ComponentType<{ className?: string; strokeWidth?: number }>; iconClass: string; badgeClass: string }
  > = {
    created: {
      title: "Usuario creado",
      Icon: Plus,
      iconClass: "text-emerald-600",
      badgeClass: "bg-emerald-100 text-emerald-700",
    },
    updated: {
      title: "Datos actualizados",
      Icon: History,
      iconClass: "text-amber-700",
      badgeClass: "bg-amber-100 text-amber-700",
    },
    password_changed: {
      title: "Contraseña",
      Icon: KeyRound,
      iconClass: "text-slate-600",
      badgeClass: "bg-slate-100 text-slate-700",
    },
    permissions_changed: {
      title: "Permisos o rol",
      Icon: Shield,
      iconClass: "text-primary",
      badgeClass: "bg-primary/10 text-primary",
    },
    archived: {
      title: "Archivado",
      Icon: ArchiveRestore,
      iconClass: "text-amber-800",
      badgeClass: "bg-amber-100 text-amber-800",
    },
    reactivated: {
      title: "Reactivado",
      Icon: CheckCircle2,
      iconClass: "text-emerald-700",
      badgeClass: "bg-emerald-100 text-emerald-800",
    },
  };
  return map[type];
}

function formatUserHistoryDate(iso: string) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getValidUserPictureSrc(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  const lowered = v.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return "";
  if (v.startsWith("data:image/")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return "";
}

const historyTypeBadgeLabel: Record<UserHistoryEntry["type"], string> = {
  created: "Alta",
  updated: "Actualización",
  password_changed: "Contraseña",
  permissions_changed: "Permisos",
  archived: "Archivo",
  reactivated: "Reactivación",
};

const interestLabel: Record<Lead["interest"], string> = {
  compra: "Compra",
  venta: "Venta",
  alquiler: "Alquiler",
  asesoria: "Asesoría",
};

function formatLeadShortDate(iso: string | undefined) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  currentUser: User;
  users: User[];
  leads: Lead[];
  properties?: Property[];
  developments?: Development[];
  /** Etapas personalizadas del pipeline para mostrar el nombre de etapa en las cards. */
  customKanbanStages?: CustomKanbanStage[];
  userGroups?: UserGroup[];
  onViewLead?: (lead: Lead) => void;
  onUserGroupsChange?: (groups: UserGroup[]) => void;
  onCreateUser: (input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    permissions: UserPermission[];
    profile: { phone: string; address: string; birthDate: string; workHistory: string[] };
  }) => Promise<{ ok: boolean; message?: string }>;
  onUpdateUser: (id: string, input: { name: string; email: string; profile: { phone: string; address: string; birthDate: string; workHistory: string[] } }) => void;
  onUpdatePassword: (id: string, password: string) => void;
  onUpdatePermissions: (id: string, role: UserRole, permissions: UserPermission[]) => void;
  onArchive: (id: string) => void;
  onReactivate: (id: string) => void;
  /** Borrado permanente (limpia `tokko_users` y directorio local). */
  onDelete?: (id: string) => Promise<{ ok: boolean; message?: string }>;
  /** Tras enviar un mensaje desde el perfil, abre la pestaña Mensajes con el peer seleccionado. */
  onSendMessageNavigate?: (peerId: string) => void;
  /** Abre el detalle de un usuario (p. ej. desde un lead); `nonce` fuerza reapertura si es el mismo id. */
  focusUser?: { id: string; nonce: number } | null;
  onFocusUserConsumed?: () => void;
  /** Tras cerrar el detalle de usuario (X, overlay o guardar), p. ej. volver al tab donde se abrió desde un lead. */
  onUserDetailClosed?: () => void;
  /** Ficha a pantalla completa en `/admin/profile/:userId` (sin listado de Mi empresa). */
  embeddedUserId?: string | null;
  onEmbeddedClose?: () => void;
}

type RoleOption = UserRole;

const roleOptions: Array<{ value: RoleOption; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "lider_grupo", label: "Líder de grupo" },
  { value: "asesor", label: "Asesor" },
];

export function AdminUsersManager({
  currentUser,
  users,
  leads,
  properties = [],
  developments = [],
  customKanbanStages = [],
  userGroups = [],
  onViewLead,
  onUserGroupsChange,
  onCreateUser,
  onUpdateUser,
  onUpdatePassword,
  onUpdatePermissions,
  onArchive,
  onReactivate,
  onDelete,
  onSendMessageNavigate,
  focusUser,
  onFocusUserConsumed,
  onUserDetailClosed,
  embeddedUserId,
  onEmbeddedClose,
}: Props) {
  const [managementTab, setManagementTab] = useState<"users" | "groups">("users");
  const [showArchived, setShowArchived] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [userGroupFilter, setUserGroupFilter] = useState<"all" | string>("all");
  const [userPermissionFilter, setUserPermissionFilter] = useState<"all" | UserPermission>("all");
  const [userPhoneFilter, setUserPhoneFilter] = useState<"all" | "with" | "without">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  /** Solo `true` al abrir desde el icono de editar; desde el nombre es vista de solo lectura. */
  const [userDetailEditMode, setUserDetailEditMode] = useState(false);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [passwordModal, setPasswordModal] = useState<User | null>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<User | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    birthDate: "",
    workHistory: "",
    password: "",
    role: "asesor" as UserRole,
    permissions: ["manage_leads", "manage_clients"] as UserPermission[],
  });

  const canManageUsers = currentUser.role === "admin";

  const adminExtraFiltersOn =
    canManageUsers &&
    (userGroupFilter !== "all" || userPermissionFilter !== "all" || userPhoneFilter !== "all");

  const filteredUsers = useMemo(() => {
    let list = users.filter((u) => (showArchived ? !u.isActive : u.isActive));
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (canManageUsers) {
      if (userGroupFilter !== "all") {
        const g = userGroups.find((x) => x.id === userGroupFilter);
        if (g) {
          const member = new Set(g.memberIds);
          list = list.filter((u) => member.has(u.id));
        } else {
          list = [];
        }
      }
      if (userPermissionFilter !== "all") {
        list = list.filter((u) => u.permissions.includes(userPermissionFilter));
      }
      if (userPhoneFilter === "with") {
        list = list.filter((u) => Boolean(u.profile.phone?.trim()));
      } else if (userPhoneFilter === "without") {
        list = list.filter((u) => !u.profile.phone?.trim());
      }
    }
    const q = userSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const teamNames = userGroups
          .filter((g) => g.memberIds.includes(u.id))
          .map((g) => g.name)
          .join(" ");
        const permLabels = u.permissions
          .map((p) => permissionCards.find((c) => c.value === p)?.label ?? p)
          .join(" ");
        const blob = [
          u.name,
          u.email,
          u.profile.phone,
          u.profile.address,
          roleOptions.find((r) => r.value === u.role)?.label ?? "",
          teamNames,
          permLabels,
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [
    users,
    showArchived,
    roleFilter,
    userSearchQuery,
    canManageUsers,
    userGroupFilter,
    userPermissionFilter,
    userPhoneFilter,
    userGroups,
  ]);

  const closeUserDetail = () => {
    setUserDetailEditMode(false);
    setSelectedUser(null);
    if (embeddedUserId) {
      onEmbeddedClose?.();
      return;
    }
    onUserDetailClosed?.();
  };

  useEffect(() => {
    if (!embeddedUserId) return;
    const targetId = embeddedUserId.trim().toLowerCase();
    const u = users.find((x) => x.id.trim().toLowerCase() === targetId);
    if (u) {
      setUserDetailEditMode(false);
      setSelectedUser(u);
    }
  }, [embeddedUserId, users]);

  useEffect(() => {
    if (!focusUser) return;
    const targetId = focusUser.id.trim().toLowerCase();
    const u = users.find((x) => x.id.trim().toLowerCase() === targetId);
    if (u) {
      setUserDetailEditMode(false);
      setSelectedUser(u);
      onFocusUserConsumed?.();
      return;
    }
    // Si la lista aún no está hidratada, esperamos al próximo render para no perder el foco.
    if (users.length === 0) return;
    onFocusUserConsumed?.();
  }, [focusUser?.nonce, focusUser?.id, users, onFocusUserConsumed]);

  const sortedUserHistory = useMemo(() => {
    if (!selectedUser) return [];
    return [...selectedUser.history].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [selectedUser]);

  const selectedUserAssignedLeads = useMemo(() => {
    if (!selectedUser) return [];
    const selectedId = selectedUser.id.trim().toLowerCase();
    const coveredUserIds = new Set<string>([selectedId]);
    if (selectedUser.role === "lider_grupo") {
      for (const group of userGroups) {
        if (group.leaderId !== selectedUser.id) continue;
        for (const memberId of group.memberIds) {
          const normalizedMemberId = memberId.trim().toLowerCase();
          if (normalizedMemberId) coveredUserIds.add(normalizedMemberId);
        }
      }
    }

    const matchIds = new Set<string>();
    for (const userId of coveredUserIds) {
      matchIds.add(userId);
      const matchedUser = users.find((u) => u.id.trim().toLowerCase() === userId);
      const tok = matchedUser?.tokkoUserId?.trim().toLowerCase();
      if (tok) matchIds.add(tok);
    }

    const aliases = new Set<string>();
    for (const userId of coveredUserIds) {
      const matchedUser = users.find((u) => u.id.trim().toLowerCase() === userId);
      const baseName = foldSearchText(matchedUser?.name ?? "");
      const baseEmail = foldSearchText(matchedUser?.email ?? "");
      const emailUser = foldSearchText((matchedUser?.email ?? "").split("@")[0] ?? "");
      if (baseName) aliases.add(baseName);
      if (baseEmail) aliases.add(baseEmail);
      if (emailUser) aliases.add(emailUser);
    }

    return leads
      .filter((lead) => {
        const leadAssignedId = lead.assignedToUserId?.trim().toLowerCase();
        if (leadAssignedId && matchIds.has(leadAssignedId)) return true;

        const assignedByName = foldSearchText(lead.assignedTo);
        if (!assignedByName) return false;
        if (aliases.has(assignedByName)) return true;
        // Fallback flexible para datos históricos con nombre incompleto o variaciones.
        for (const alias of aliases) {
          if (assignedByName.includes(alias) || alias.includes(assignedByName)) return true;
        }
        return false;
      })
      .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  }, [selectedUser, leads, userGroups, users]);

  const selectedUserGroups = useMemo(() => {
    if (!selectedUser) return [];
    return userGroups
      .filter((group) => group.memberIds.includes(selectedUser.id))
      .map((group) => ({
        ...group,
        isLeader: group.leaderId === selectedUser.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [selectedUser, userGroups]);

  const pipelineByGroup = useMemo(() => loadPipelineByGroup(), []);
  const propertyById = useMemo(() => new Map(properties.map((p) => [p.id, p] as const)), [properties]);
  const developmentById = useMemo(() => new Map(developments.map((d) => [d.id, d] as const)), [developments]);

  const resolveLeadVisualImage = useCallback(
    (lead: Lead): string => {
      if (lead.relatedPropertyId) {
        const property = propertyById.get(lead.relatedPropertyId);
        const propertyImage = (property?.image ?? "").trim();
        if (propertyImage) return propertyImage;
        const galleryImage = (property?.galleryImages?.[0] ?? property?.images?.[0] ?? "").trim();
        if (galleryImage) return galleryImage;
      }
      if (lead.relatedDevelopmentId) {
        const development = developmentById.get(lead.relatedDevelopmentId);
        const developmentImage = (development?.image ?? "").trim();
        if (developmentImage) return developmentImage;
        const galleryImage = development?.images?.[0]?.trim() ?? "";
        if (galleryImage) return galleryImage;
      }
      return "";
    },
    [propertyById, developmentById]
  );

  const resolveLeadStatusLabel = useCallback(
    (lead: Lead) => {
      const customStagesForLead =
        pipelineByGroup[lead.pipelineGroupId]?.customStages ??
        pipelineByGroup[DEFAULT_PIPELINE_GROUP_ID]?.customStages ??
        customKanbanStages;
      const label = labelForLeadStatus(lead.status, customStagesForLead);
      // Prevent exposing raw internal ids such as `custom_xxx`.
      if (label === lead.status && lead.status.startsWith("custom_")) {
        return "Columna personalizada";
      }
      return label;
    },
    [customKanbanStages, pipelineByGroup]
  );

  const leadsCarouselRef = useRef<HTMLDivElement>(null);
  const scrollLeadsCarousel = useCallback((dir: "prev" | "next") => {
    const el = leadsCarouselRef.current;
    if (!el) return;
    const amount = Math.min(420, Math.max(240, el.clientWidth * 0.78));
    el.scrollBy({ left: dir === "next" ? amount : -amount, behavior: "smooth" });
  }, []);

  const [creatingSubmitting, setCreatingSubmitting] = useState(false);

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingSubmitting) return;
    setError("");
    setCreatingSubmitting(true);
    try {
      const result = await onCreateUser({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        permissions: createForm.permissions,
        profile: {
          phone: createForm.phone,
          address: createForm.address,
          birthDate: createForm.birthDate,
          workHistory: createForm.workHistory
            .split("\n")
            .map((row) => row.trim())
            .filter(Boolean),
        },
      });
      if (!result.ok) {
        setError(result.message || "No se pudo crear el usuario.");
        toast.error(result.message || "No se pudo crear el usuario.");
        return;
      }
      toast.success(`Usuario ${createForm.name} creado correctamente.`);
      setCreatingOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        birthDate: "",
        workHistory: "",
        password: "",
        role: "asesor",
        permissions: ["manage_leads", "manage_clients"],
      });
    } finally {
      setCreatingSubmitting(false);
    }
  };

  const isEditingUserDetail = canManageUsers && userDetailEditMode;
  const isEmbeddedProfile = Boolean(embeddedUserId?.trim());

  return (
    <>
      {isEmbeddedProfile && !selectedUser ? (
        <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-slate-200/80 bg-white">
          <p className="text-sm text-slate-500">Cargando perfil del usuario…</p>
        </div>
      ) : null}
      {!isEmbeddedProfile ? (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div
          className="mb-5 inline-flex max-w-full flex-wrap gap-0.5 rounded-2xl bg-slate-100/95 p-1 ring-1 ring-slate-200/80 ring-inset"
          role="tablist"
          aria-label="Secciones de equipo y accesos"
        >
          <button
            type="button"
            role="tab"
            aria-selected={managementTab === "users"}
            onClick={() => setManagementTab("users")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 sm:px-4 sm:py-2.5",
              managementTab === "users"
                ? "bg-white text-brand-navy shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/90"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            )}
          >
            <Users className="h-4 w-4" strokeWidth={managementTab === "users" ? 2 : 1.75} />
            Usuarios
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={managementTab === "groups"}
            onClick={() => setManagementTab("groups")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 sm:px-4 sm:py-2.5",
              managementTab === "groups"
                ? "bg-white text-brand-navy shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/90"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            )}
          >
            <Building2 className="h-4 w-4" strokeWidth={managementTab === "groups" ? 2 : 1.75} />
            Equipos
          </button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-900">
              {managementTab === "users" ? "Mi empresa · Usuarios" : "Mi empresa · Equipos"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {managementTab === "users"
                ? "Gestiona usuarios, permisos y consulta historial de usuarios archivados."
                : "Organiza equipos, líderes y miembros para controlar accesos por grupo."}
            </p>
          </div>
          {managementTab === "users" && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowArchived((p) => !p)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {showArchived ? "Ver activos" : "Ver archivados"}
              </button>
              {canManageUsers && (
                <button
                  type="button"
                  onClick={() => setCreatingOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-hover"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear usuario
                </button>
              )}
            </div>
          )}
        </div>

        {managementTab === "users" && (
          <div className="mt-6 space-y-3 border-t border-slate-200/80 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="relative min-h-[2.75rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  type="search"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={
                    canManageUsers
                      ? "Buscar por nombre, correo, teléfono, rol, permiso o equipo…"
                      : "Buscar por nombre, correo, teléfono o rol…"
                  }
                  className="h-full min-h-[2.75rem] w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-11 pr-4 text-sm text-brand-navy shadow-sm transition-all placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                  style={{ fontWeight: 500 }}
                  autoComplete="off"
                  aria-label="Buscar usuarios"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => setRoleFilter(v as "all" | UserRole)}
              >
                <SelectTrigger className="h-[2.75rem] w-full rounded-xl border-slate-200/90 bg-white shadow-sm sm:w-[min(100%,220px)]">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManageUsers && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Filter className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    Filtros adicionales
                  </p>
                  {adminExtraFiltersOn && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserGroupFilter("all");
                        setUserPermissionFilter("all");
                        setUserPhoneFilter("all");
                      }}
                      className="text-xs font-medium text-primary decoration-primary/30 hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Equipo de trabajo</Label>
                    <Select
                      value={userGroupFilter}
                      onValueChange={(v) => setUserGroupFilter(v as "all" | string)}
                    >
                      <SelectTrigger className="h-[2.75rem] w-full rounded-xl border-slate-200/90 bg-white shadow-sm">
                        <SelectValue placeholder="Equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los equipos</SelectItem>
                        {userGroups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">Permiso</Label>
                    <Select
                      value={userPermissionFilter}
                      onValueChange={(v) => setUserPermissionFilter(v as "all" | UserPermission)}
                    >
                      <SelectTrigger className="h-[2.75rem] w-full rounded-xl border-slate-200/90 bg-white shadow-sm">
                        <SelectValue placeholder="Permiso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Cualquiera</SelectItem>
                        {permissionCards.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-medium text-slate-600">Teléfono en ficha</Label>
                    <Select
                      value={userPhoneFilter}
                      onValueChange={(v) => setUserPhoneFilter(v as "all" | "with" | "without")}
                    >
                      <SelectTrigger className="h-[2.75rem] w-full rounded-xl border-slate-200/90 bg-white shadow-sm">
                        <SelectValue placeholder="Teléfono" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="with">Con teléfono</SelectItem>
                        <SelectItem value="without">Sin teléfono</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {managementTab === "users" ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Permisos</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border-t border-slate-100 px-4 py-14 text-center text-sm text-slate-500" style={{ fontWeight: 500 }}>
                    No hay usuarios que coincidan con la búsqueda o los filtros.
                  </td>
                </tr>
              ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      title="Ver detalle"
                      onClick={() => {
                        setUserDetailEditMode(false);
                        setSelectedUser(user);
                      }}
                      className="flex items-center gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-navy text-xs font-semibold text-white shadow-sm ring-1 ring-slate-200">
                        {user.profile.picture ? (
                          <img src={user.profile.picture} alt="" className="h-full w-full object-cover" />
                        ) : (
                          userInitials(user.name)
                        )}
                      </span>
                      <span className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">
                          {user.isActive ? "Activo" : `Archivado ${new Date(user.archivedAt || "").toLocaleDateString()}`}
                        </p>
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <p>{user.email}</p>
                    <p className="text-xs text-slate-500">{user.profile.phone || "Sin teléfono"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{roleOptions.find((r) => r.value === user.role)?.label}</td>
                  <td className="px-4 py-3">
                    {user.permissions.length === 0 ? (
                      <span className="text-xs text-slate-400">Sin permisos</span>
                    ) : (
                      <div className="flex max-w-md flex-wrap gap-1.5">
                        {user.permissions.map((permission) => (
                          <span
                            key={permission}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] leading-none text-slate-700"
                            style={{ fontWeight: 600 }}
                          >
                            {permissionLabel(permission)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDetailEditMode(true);
                          setSelectedUser(user);
                        }}
                        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        title="Editar usuario"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {canManageUsers && (
                        <button type="button" onClick={() => setPasswordModal(user)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" title="Cambiar contraseña">
                          <KeyRound className="h-4 w-4" />
                        </button>
                      )}
                      {canManageUsers && user.id !== currentUser.id && (
                        user.isActive ? (
                          <button
                            type="button"
                            onClick={() => setArchiveCandidate(user)}
                            className="rounded-md p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                            title="Archivar"
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        ) : (
                          <button type="button" onClick={() => onReactivate(user.id)} className="rounded-md p-2 text-slate-500 hover:bg-green-50 hover:text-green-700" title="Reactivar">
                            <ArchiveRestore className="h-4 w-4" />
                          </button>
                        )
                      )}
                      {canManageUsers && user.id !== currentUser.id && onDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(user)}
                          className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                          title="Borrar cuenta"
                          aria-label={`Borrar cuenta de ${user.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <UserGroupsPanel
          users={users}
          canManageGroups={canManageUsers}
          groups={userGroups}
          onGroupsChange={onUserGroupsChange}
        />
      )}

      <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
        <DialogContent className="w-full max-w-2xl border-slate-200 bg-white p-6">
          <div className="mb-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-semibold text-slate-900">Crear usuario</DialogTitle>
            </DialogHeader>
          </div>
            <form onSubmit={submitCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Nombre" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
              <input required type="email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Correo" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
              <input required type="password" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Contraseña" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Teléfono" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
              <input className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" placeholder="Dirección" value={createForm.address} onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))} />
              <input type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={createForm.birthDate} onChange={(e) => setCreateForm((p) => ({ ...p, birthDate: e.target.value }))} />
              <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <textarea className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" rows={3} placeholder="Historial de trabajo (una línea por puesto)" value={createForm.workHistory} onChange={(e) => setCreateForm((p) => ({ ...p, workHistory: e.target.value }))} />
              <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Permisos</p>
                <div className="grid grid-cols-2 gap-2">
                  {permissionCards.map((permission) => (
                    <label key={permission.value} className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={createForm.permissions.includes(permission.value)}
                        onChange={(e) => {
                          setCreateForm((prev) => ({
                            ...prev,
                            permissions: e.target.checked
                              ? [...prev.permissions, permission.value]
                              : prev.permissions.filter((item) => item !== permission.value),
                          }));
                        }}
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreatingOpen(false)}
                  disabled={creatingSubmitting}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-hover disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {creatingSubmitting ? "Creando…" : "Guardar usuario"}
                </button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveCandidate} onOpenChange={(open) => !open && setArchiveCandidate(null)}>
        <DialogContent className="w-full max-w-md border-slate-200 bg-white p-6">
          {archiveCandidate && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-semibold text-slate-900">Archivar usuario</DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  Esta acción moverá a <span className="font-semibold text-slate-800">{archiveCandidate.name}</span> al historial de usuarios archivados.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Puedes reactivarlo después desde “Ver archivados”.
              </div>
              <DialogFooter className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setArchiveCandidate(null)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-brand-red-hover"
                  onClick={() => {
                    onArchive(archiveCandidate.id);
                    setArchiveCandidate(null);
                  }}
                >
                  Archivar usuario
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCandidate} onOpenChange={(open) => !open && !deletingUser && setDeleteCandidate(null)}>
        <DialogContent className="w-full max-w-md border-slate-200 bg-white p-6">
          {deleteCandidate && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-semibold text-slate-900">Borrar cuenta permanentemente</DialogTitle>
                <DialogDescription className="text-sm text-slate-600">
                  Estás por borrar la cuenta de <span className="font-semibold text-slate-800">{deleteCandidate.name}</span> ({deleteCandidate.email}).
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-2">
                <div className="rounded-lg border border-red-200/70 bg-red-50 px-3 py-2.5 text-xs text-red-800">
                  Esta acción no se puede deshacer. Se eliminará el usuario del directorio CRM y de la base de datos.
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  La cuenta de acceso (Supabase Auth) no se elimina desde aquí; si quieres revocar el login, hazlo también en el panel de Supabase.
                </p>
              </div>
              <DialogFooter className="mt-5 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deletingUser}
                  onClick={() => setDeleteCandidate(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={deletingUser || !onDelete}
                  onClick={async () => {
                    if (!onDelete) return;
                    setDeletingUser(true);
                    const result = await onDelete(deleteCandidate.id);
                    setDeletingUser(false);
                    if (!result.ok) {
                      toast.error(result.message || "No se pudo borrar el usuario.");
                      return;
                    }
                    toast.success(`Cuenta de ${deleteCandidate.name} borrada.`);
                    setDeleteCandidate(null);
                  }}
                >
                  {deletingUser ? "Borrando…" : "Borrar cuenta"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
      ) : null}

      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) closeUserDetail();
        }}
        key={selectedUser?.id ?? "user-detail"}
      >
        <DialogContent
          hideCloseButton
          className={cn(
            "!fixed !inset-0 !left-0 !top-0 z-50 flex !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:!zoom-in-100 data-[state=closed]:!zoom-out-100 sm:!max-w-none"
          )}
        >
          {selectedUser && (
            <>
              <div className="h-0.5 shrink-0 bg-gradient-to-r from-brand-gold/90 via-primary to-brand-burgundy/90" aria-hidden />
              <div className="shrink-0 border-b border-stone-200/80 bg-stone-50/90 px-4 py-4 sm:px-5">
                <DialogHeader className="gap-0 p-0 text-left">
                  <p className="text-[11px] text-slate-500" style={{ fontWeight: 500 }}>
                    <span className="text-primary/90">
                      {isEmbeddedProfile ? "Perfil del equipo" : "Mi empresa"}
                    </span>
                    <span className="text-slate-400"> · </span>
                    {isEmbeddedProfile ? "Ficha personal" : "Detalle de usuario"}
                  </p>
                  <div className="mt-3 flex flex-col gap-4 min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:justify-between min-[1100px]:gap-6">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      {getValidUserPictureSrc(selectedUser.profile.picture) ? (
                        <img
                          src={getValidUserPictureSrc(selectedUser.profile.picture)}
                          alt={`Foto de ${selectedUser.name}`}
                          className="h-20 w-20 shrink-0 rounded-xl border border-stone-200/90 bg-white object-cover shadow-sm"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <DialogTitle
                          className="font-heading truncate text-3xl leading-tight tracking-tight text-brand-navy sm:text-4xl"
                          style={{ fontWeight: 700, textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}
                        >
                          {selectedUser.name}
                        </DialogTitle>
                        {isEditingUserDetail ? (
                          <div className="mt-1.5 max-w-[16rem]">
                            <select
                              value={selectedUser.role}
                              onChange={(e) => {
                                const nextRole = e.target.value as UserRole;
                                setSelectedUser((prev) => (prev ? { ...prev, role: nextRole } : prev));
                              }}
                              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-brand-navy transition-colors focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/15"
                              style={{ fontWeight: 600 }}
                              aria-label="Rol del usuario"
                            >
                              {roleOptions.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <p className="mt-1.5 text-sm text-slate-600" style={{ fontWeight: 600 }}>
                            {roleOptions.find((r) => r.value === selectedUser.role)?.label ?? selectedUser.role}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-2 min-[1100px]:w-auto min-[1100px]:flex-row min-[1100px]:items-center min-[1100px]:justify-end min-[1100px]:gap-3">
                      {selectedUser.id !== currentUser.id && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-fit shrink-0 border-primary/40 bg-primary/[0.06] px-4 text-primary hover:bg-primary/10 hover:text-primary"
                          style={{ fontWeight: 600 }}
                          onClick={() => setSendMessageOpen(true)}
                        >
                          <MessageSquare className="mr-1.5 h-4 w-4" strokeWidth={1.9} />
                          Enviar mensaje
                        </Button>
                      )}
                      <DialogClose asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-fit shrink-0 border-stone-300 bg-white px-4 text-slate-700 hover:bg-stone-50 hover:text-slate-800"
                          style={{ fontWeight: 600 }}
                        >
                          Regresar
                        </Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 w-fit shrink-0 border-stone-300 bg-white px-4 text-slate-700 hover:bg-stone-50 hover:text-slate-800"
                          style={{ fontWeight: 600 }}
                        >
                          Cerrar
                        </Button>
                      </DialogClose>
                      {isEditingUserDetail && (
                        <Button
                          type="button"
                          className="h-10 w-full min-w-[10rem] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-brand-red-hover min-[1100px]:w-auto"
                          onClick={() => {
                            if (!selectedUser) return;
                            onUpdateUser(selectedUser.id, {
                              name: selectedUser.name,
                              email: selectedUser.email,
                              profile: selectedUser.profile,
                            });
                            onUpdatePermissions(selectedUser.id, selectedUser.role, selectedUser.permissions);
                            closeUserDetail();
                          }}
                        >
                          Guardar cambios
                        </Button>
                      )}
                    </div>
                  </div>
                  <DialogDescription className="sr-only">
                    Usuario {selectedUser.name}, rol {roleOptions.find((r) => r.value === selectedUser.role)?.label}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-stone-100/95 to-stone-100/80">
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                  <div className="mx-auto w-full max-w-[min(100%,88rem)]">
                    <div className="space-y-8">
                      {isEditingUserDetail ? (
                        <section className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-brand-navy" strokeWidth={1.75} />
                            <h3 className="text-sm text-slate-700" style={{ fontWeight: 600 }}>
                              Configurar permisos y módulos
                            </h3>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Solo puedes editar rol y permisos de módulos para este usuario.
                          </p>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {permissionCards.map((card) => {
                              const on = selectedUser.permissions.includes(card.value);
                              const CardIcon = card.Icon;
                              return (
                                <button
                                  key={card.value}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUser((prev) => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        permissions: on
                                          ? prev.permissions.filter((p) => p !== card.value)
                                          : [...prev.permissions, card.value],
                                      };
                                    });
                                  }}
                                  className={cn(
                                    "relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                                    on
                                      ? "border-primary/45 bg-primary/[0.05] ring-1 ring-primary/20"
                                      : "border-stone-200/90 bg-stone-50/30 hover:border-stone-300 hover:bg-white"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                                      on
                                        ? "bg-primary/15 text-primary ring-primary/20"
                                        : "bg-stone-100 text-slate-600 ring-stone-200/80"
                                    )}
                                  >
                                    <CardIcon className="h-4 w-4" strokeWidth={1.75} />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-brand-navy" style={{ fontWeight: 700 }}>
                                      {card.label}
                                    </p>
                                  </div>
                                  {on ? (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </span>
                                  ) : (
                                    <span className="h-6 w-6 shrink-0 rounded-full border border-stone-200 bg-white" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ) : (
                      <>
                      <div className="grid grid-cols-1 gap-8 text-sm lg:grid-cols-12 lg:items-stretch lg:gap-8 xl:gap-10">
                        <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
                          <section className="h-full w-full self-start rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6">
                            <h3 className="text-sm text-slate-700" style={{ fontWeight: 600 }}>
                              Contacto y datos personales
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              Medios de contacto e identificación del usuario en el sistema.
                            </p>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                              <div className="group rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white via-white to-primary/[0.04] p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-start gap-4">
                                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
                                    <Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      Correo
                                    </p>
                                    <a
                                      href={`mailto:${encodeURIComponent(selectedUser.email)}`}
                                      className="mt-1 block break-all text-[15px] text-primary transition-colors hover:underline"
                                      style={{ fontWeight: 600 }}
                                    >
                                      {selectedUser.email}
                                    </a>
                                  </div>
                                </div>
                              </div>
                              <div className="group rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white via-white to-brand-navy/[0.06] p-5 shadow-sm transition-shadow hover:shadow-md">
                                <div className="flex items-start gap-4">
                                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 text-brand-navy ring-1 ring-brand-navy/15">
                                    <Phone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                      Teléfono
                                    </p>
                                    {selectedUser.profile.phone ? (
                                      <a
                                        href={`tel:${selectedUser.profile.phone.replace(/\s/g, "")}`}
                                        className="mt-1 block text-[15px] text-brand-navy transition-colors group-hover:text-primary"
                                        style={{ fontWeight: 600 }}
                                      >
                                        {selectedUser.profile.phone}
                                      </a>
                                    ) : (
                                      <p className="mt-1 text-[15px] text-slate-400" style={{ fontWeight: 500 }}>
                                        Sin capturar
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 border-t border-stone-200/80 pt-6">
                              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Identificación y domicilio
                              </p>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                                    Dirección
                                  </Label>
                                  <div className={userReadonlyFieldClass} style={{ fontWeight: 500 }}>
                                    {selectedUser.profile.address || "—"}
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-slate-500" style={{ fontWeight: 500 }}>
                                    Fecha de nacimiento
                                  </Label>
                                  <div className={userReadonlyFieldClass} style={{ fontWeight: 500 }}>
                                    {selectedUser.profile.birthDate || "—"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </section>

                          {isEditingUserDetail && (
                            <section className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-brand-navy" strokeWidth={1.75} />
                                <h3 className="text-sm text-slate-700" style={{ fontWeight: 600 }}>
                                  Configurar módulos
                                </h3>
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Activa o desactiva el acceso a cada módulo. Recuerda guardar con el botón superior.
                              </p>
                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                {permissionCards.map((card) => {
                                  const on = selectedUser.permissions.includes(card.value);
                                  const CardIcon = card.Icon;
                                  return (
                                    <button
                                      key={card.value}
                                      type="button"
                                      onClick={() => {
                                        setSelectedUser((prev) => {
                                          if (!prev) return prev;
                                          return {
                                            ...prev,
                                            permissions: on
                                              ? prev.permissions.filter((p) => p !== card.value)
                                              : [...prev.permissions, card.value],
                                          };
                                        });
                                      }}
                                      className={cn(
                                        "relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                                        on
                                          ? "border-primary/45 bg-primary/[0.05] ring-1 ring-primary/20"
                                          : "border-stone-200/90 bg-stone-50/30 hover:border-stone-300 hover:bg-white"
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                                          on
                                            ? "bg-primary/15 text-primary ring-primary/20"
                                            : "bg-stone-100 text-slate-600 ring-stone-200/80"
                                        )}
                                      >
                                        <CardIcon className="h-4 w-4" strokeWidth={1.75} />
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm text-brand-navy" style={{ fontWeight: 700 }}>
                                          {card.label}
                                        </p>
                                      </div>
                                      {on ? (
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        </span>
                                      ) : (
                                        <span className="h-6 w-6 shrink-0 rounded-full border border-stone-200 bg-white" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </section>
                          )}
                        </div>

                        <aside className="min-w-0 lg:sticky lg:top-2 lg:col-span-5 lg:self-start">
                          <section className="h-full w-full rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-brand-navy" strokeWidth={1.75} />
                              <h3 className="text-sm text-slate-700" style={{ fontWeight: 600 }}>
                                Rol, permisos y equipos
                              </h3>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                              Resumen de accesos y equipos del usuario seleccionado.
                            </p>

                            <div className="mt-5">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Módulos con acceso
                              </p>
                              {selectedUser.permissions.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-6 text-sm text-slate-500">
                                  Sin permisos adicionales.
                                </p>
                              ) : (
                                <ul className="grid gap-3 md:grid-cols-2">
                                  {selectedUser.permissions.map((perm) => {
                                    const meta = permissionCards.find((c) => c.value === perm);
                                    const CardIcon = meta?.Icon ?? Shield;
                                    return (
                                      <li
                                        key={perm}
                                        className="rounded-xl border border-primary/35 bg-white px-4 py-3 shadow-sm"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-primary/35 bg-primary/[0.04] text-primary">
                                            <CardIcon className="h-5 w-5" strokeWidth={1.9} />
                                          </span>
                                          <div className="min-w-0">
                                            <p className="text-[1.05rem] leading-tight text-brand-navy" style={{ fontWeight: 700 }}>
                                              {meta?.label ?? perm}
                                            </p>
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            {selectedUser.role !== "admin" && (
                              <div className="mt-6 border-t border-stone-200/80 pt-5">
                                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                  Equipos del usuario
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                  {selectedUserGroups.length === 0
                                    ? "No pertenece a ningún grupo."
                                    : `Pertenece a ${selectedUserGroups.length} grupo${selectedUserGroups.length === 1 ? "" : "s"}.`}
                                </p>
                                {selectedUserGroups.length === 0 ? (
                                  <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center text-sm text-slate-500">
                                    Sin equipos asignados.
                                  </p>
                                ) : (
                                  <ul className="mt-4 space-y-2">
                                    {selectedUserGroups.map((group) => (
                                      <li
                                        key={group.id}
                                        className="rounded-xl border border-stone-200/90 bg-stone-50/40 px-4 py-3 text-sm text-slate-800 ring-1 ring-stone-100"
                                      >
                                        <p className="text-sm text-brand-navy" style={{ fontWeight: 700 }}>
                                          {group.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {group.isLeader ? "Líder del grupo" : "Miembro"}
                                        </p>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </section>
                        </aside>
                      </div>

                      <section className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="flex items-center gap-2 text-sm text-slate-700" style={{ fontWeight: 600 }}>
                              <Users className="h-4 w-4 text-primary" strokeWidth={1.9} aria-hidden />
                              Leads asignados
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                              Total: {selectedUserAssignedLeads.length} lead{selectedUserAssignedLeads.length === 1 ? "" : "s"}.
                            </p>
                          </div>
                          {selectedUserAssignedLeads.length > 0 ? (
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-lg border-stone-200"
                                onClick={() => scrollLeadsCarousel("prev")}
                                aria-label="Ver leads anteriores"
                              >
                                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-lg border-stone-200"
                                onClick={() => scrollLeadsCarousel("next")}
                                aria-label="Ver leads siguientes"
                              >
                                <ChevronRight className="h-4 w-4" strokeWidth={2} />
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        {selectedUserAssignedLeads.length === 0 ? (
                          <p className="mt-4 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-10 text-center text-sm text-slate-500">
                            Este usuario no tiene leads asignados.
                          </p>
                        ) : (
                          <div className="relative mt-4">
                            <div
                              ref={leadsCarouselRef}
                              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pl-0.5 pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300/90"
                            >
                              {selectedUserAssignedLeads.map((lead) => {
                                const statusLabel = resolveLeadStatusLabel(lead);
                                const leadVisualImage = resolveLeadVisualImage(lead);
                                const body = (
                                  <>
                                    {leadVisualImage ? (
                                      <div className="mb-3 overflow-hidden rounded-lg border border-stone-200/90">
                                        <img
                                          src={leadVisualImage}
                                          alt={`Relacionado con ${lead.name}`}
                                          className="h-24 w-full object-cover"
                                          loading="lazy"
                                        />
                                      </div>
                                    ) : null}
                                    <p className="line-clamp-2 min-h-[2.5rem] text-sm text-brand-navy" style={{ fontWeight: 700 }}>
                                      {lead.name}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-slate-600">{lead.email || "—"}</p>
                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                      {lead.phone || "Sin teléfono"}
                                    </p>
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex max-w-full items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                        {statusLabel}
                                      </span>
                                      <span className="inline-flex items-center rounded-md border border-stone-200/90 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                        {interestLabel[lead.interest]}
                                      </span>
                                    </div>
                                    <p className="mt-3 text-[10px] text-slate-400">
                                      Actualizado {formatLeadShortDate(lead.updatedAt || lead.lastContact || lead.createdAt)}
                                    </p>
                                  </>
                                );
                                return (
                                  <div
                                    key={lead.id}
                                    className="w-[min(100%,18rem)] shrink-0 snap-start"
                                  >
                                    {onViewLead ? (
                                      <button
                                        type="button"
                                        onClick={() => onViewLead(lead)}
                                        className="flex h-full w-full flex-col rounded-xl border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/50 p-4 text-left shadow-sm ring-1 ring-stone-100 transition hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/25"
                                        title="Abrir detalle del lead"
                                      >
                                        {body}
                                      </button>
                                    ) : (
                                      <div className="flex h-full w-full flex-col rounded-xl border border-stone-200/90 bg-stone-50/40 p-4 ring-1 ring-stone-100">
                                        {body}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </section>
                    </>
                      )}
                  </div>
                </div>
              </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!passwordModal} onOpenChange={(open) => !open && setPasswordModal(null)}>
        <DialogContent className="w-full max-w-md border-slate-200 bg-white p-6">
          {passwordModal && (
            <>
            <h3 className="text-lg font-semibold text-slate-900">Cambiar contraseña</h3>
            <p className="mt-1 text-sm text-slate-600">{passwordModal.name}</p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Nueva contraseña"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button
                type="button"
                onClick={() => {
                  if (newPassword.trim().length < 4) return;
                  onUpdatePassword(passwordModal.id, newPassword.trim());
                  setPasswordModal(null);
                  setNewPassword("");
                }}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red-hover"
              >
                Actualizar
              </button>
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <SendMessageDialog
        open={sendMessageOpen}
        onOpenChange={setSendMessageOpen}
        sender={currentUser}
        recipient={selectedUser}
        onSent={(peerId) => {
          if (onSendMessageNavigate) {
            closeUserDetail();
            onSendMessageNavigate(peerId);
          }
        }}
      />
    </>
  );
}
