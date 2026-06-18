export type UserRole = "admin" | "lider_grupo" | "asesor";

export type UserPermission =
  | "access_dashboard"
  | "access_kpis"
  | "manage_leads"
  | "access_consultas"
  | "manage_clients"
  | "access_agenda"
  | "manage_properties"
  | "manage_developments"
  | "access_activities"
  | "edit_site"
  | "manage_users";

/** Permisos por defecto al crear o simular un rol (sin asignación explícita en BD). */
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermission[]> = {
  admin: [
    "access_dashboard",
    "access_kpis",
    "manage_leads",
    "access_consultas",
    "manage_clients",
    "access_agenda",
    "manage_properties",
    "manage_developments",
    "access_activities",
    "edit_site",
    "manage_users",
  ],
  lider_grupo: [
    "access_dashboard",
    "access_kpis",
    "manage_leads",
    "manage_clients",
    "access_agenda",
    "manage_properties",
    "manage_developments",
    "access_activities",
    "manage_users",
  ],
  asesor: [
    "access_dashboard",
    "access_kpis",
    "manage_leads",
    "manage_clients",
    "access_agenda",
  ],
};

export interface UserHistoryEntry {
  id: string;
  type: "created" | "updated" | "password_changed" | "permissions_changed" | "archived" | "reactivated";
  description: string;
  createdAt: string;
  actorName: string;
}

export interface UserProfile {
  phone: string;
  address: string;
  birthDate: string;
  workHistory: string[];
  picture?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: UserPermission[];
  profile: UserProfile;
  isActive: boolean;
  /** Id numérico Tokko (`tokko_users.tokko_user_id`); en leads viene en `assigned_to_user_id` desde el sync. */
  tokkoUserId?: string;
  /** Fila `tokko_users.must_change_password`: obliga cambio de contraseña en primer acceso. */
  mustChangePassword?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt: string;
  history: UserHistoryEntry[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  permissions?: UserPermission[];
  profile?: Partial<UserProfile>;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  profile?: Partial<UserProfile>;
}

export interface AuthContextType {
  user: User | null;
  users: User[];
  /** `true` tras resolver la sesión de Supabase (o si no hay cliente). Evita redirigir a login antes de restaurar sesión. */
  authReady: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string; mustChangePassword?: boolean }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  createUser: (input: CreateUserInput, actorName?: string) => Promise<{ ok: boolean; message?: string }>;
  updateUser: (id: string, input: UpdateUserInput, actorName?: string) => void;
  updateUserPassword: (
    id: string,
    newPassword: string,
    actorName?: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  updateUserPermissions: (id: string, role: UserRole, permissions: UserPermission[], actorName?: string) => void;
  archiveUser: (id: string, actorName?: string) => void;
  reactivateUser: (id: string, actorName?: string) => void;
  /** Borra permanentemente el usuario del directorio CRM local y de `tokko_users`. No elimina la sesión en Supabase Auth (requiere service role). */
  deleteUser: (id: string, actorName?: string) => Promise<{ ok: boolean; message?: string }>;
  /** Vuelve a leer la sesión y la fila `tokko_users` (tras editar el perfil en CRM, etc.). */
  refreshUser: () => Promise<void>;
}
