import { useCallback, useEffect, useMemo, useState, ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useLocation } from "react-router";
import { getSupabaseClient } from "../lib/supabaseClient";
import { withTimeout } from "../lib/withTimeout";
import { toast } from "sonner";
import {
  fetchAllTokkoUsersForDirectory,
  fetchTokkoUserRow,
  upsertTokkoUserAccess,
} from "../lib/supabaseTokkoUsers";
import { AuthContext } from "./authContextInstance";
import type {
  AuthContextType,
  CreateUserInput,
  UpdateUserInput,
  User,
  UserHistoryEntry,
  UserPermission,
  UserProfile,
  UserRole,
} from "./authContextTypes";

export type {
  AuthContextType,
  CreateUserInput,
  UpdateUserInput,
  User,
  UserHistoryEntry,
  UserPermission,
  UserProfile,
  UserRole,
} from "./authContextTypes";

export { useAuth } from "./authContextInstance";

const USERS_STORAGE_KEY = "viterra_admin_users";
const PASSWORDS_STORAGE_KEY = "viterra_admin_passwords";

function toStorageSafeUser(u: User): User {
  return {
    ...u,
    profile: {
      ...u.profile,
      // Evita llenar localStorage con data URLs/base64 grandes.
      picture: "",
      // El historial laboral puede crecer; para sesión basta una muestra corta.
      workHistory: Array.isArray(u.profile.workHistory) ? u.profile.workHistory.slice(0, 10) : [],
    },
    // Historial completo no es crítico para bootstrap de sesión.
    history: Array.isArray(u.history) ? u.history.slice(0, 12) : [],
  };
}

function writeUsersStorage(users: User[]) {
  if (typeof window === "undefined") return;
  const primaryPayload = JSON.stringify(users.map(toStorageSafeUser));
  try {
    localStorage.setItem(USERS_STORAGE_KEY, primaryPayload);
    return;
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[Viterra] localStorage lleno al guardar usuarios; usando payload mínimo.", e);
    }
  }

  // Fallback ultra mínimo para no romper login/autenticación.
  const minimalPayload = JSON.stringify(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      permissions: u.permissions,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      profile: { phone: "", address: "", birthDate: "", workHistory: [], picture: "" },
      history: [],
    }))
  );
  try {
    localStorage.setItem(USERS_STORAGE_KEY, minimalPayload);
  } catch {
    // Último recurso: limpiar key problemática para no bloquear flujo.
    try {
      localStorage.removeItem(USERS_STORAGE_KEY);
    } catch {
      // noop
    }
  }
}

const defaultPermissionsByRole: Record<UserRole, UserPermission[]> = {
  admin: [
    "manage_leads",
    "manage_properties",
    "manage_developments",
    "manage_users",
    "manage_clients",
    "edit_site",
  ],
  lider_grupo: ["manage_leads", "manage_properties", "manage_developments", "manage_clients"],
  asesor: ["manage_leads", "manage_clients"],
};

const newHistoryEntry = (
  type: UserHistoryEntry["type"],
  description: string,
  actorName: string
): UserHistoryEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  description,
  createdAt: new Date().toISOString(),
  actorName,
});

const normalizeRole = (role: string | undefined): UserRole => (role === "agente" ? "asesor" : (role as UserRole)) || "asesor";

const ALL_PERMISSIONS: UserPermission[] = [
  "manage_leads",
  "manage_properties",
  "manage_developments",
  "manage_users",
  "manage_clients",
  "edit_site",
];

const normalizeUser = (raw: Partial<User>): User => {
  const now = new Date().toISOString();
  const role = normalizeRole(raw.role);
  const profile = raw.profile ?? { phone: "", address: "", birthDate: "", workHistory: [], picture: "" };
  let permissions: UserPermission[] =
    raw.permissions && raw.permissions.length > 0
      ? raw.permissions.filter((p): p is UserPermission => ALL_PERMISSIONS.includes(p as UserPermission))
      : [...defaultPermissionsByRole[role]];
  if (!permissions.includes("manage_clients") && defaultPermissionsByRole[role].includes("manage_clients")) {
    permissions = [...permissions, "manage_clients"];
  }
  return {
    id: raw.id ?? `${Date.now()}`,
    email: raw.email ?? "",
    name: raw.name ?? "",
    role,
    permissions,
    profile: {
      phone: profile.phone ?? "",
      address: profile.address ?? "",
      birthDate: profile.birthDate ?? "",
      workHistory: Array.isArray(profile.workHistory) ? profile.workHistory : [],
      picture: profile.picture ?? "",
    },
    isActive: raw.isActive ?? true,
    tokkoUserId:
      typeof raw.tokkoUserId === "string" && raw.tokkoUserId.trim() ? raw.tokkoUserId.trim() : undefined,
    mustChangePassword: raw.mustChangePassword === true,
    archivedAt: raw.archivedAt,
    archivedBy: raw.archivedBy,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? now,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
};

/** Rol en `user_metadata` o `app_metadata` (Supabase permite ambos). Sin valor → `asesor` (solo ve leads asignados a su UUID). */
function roleStringFromAuthUser(su: Session["user"]): string | undefined {
  const meta = (su.user_metadata ?? {}) as Record<string, unknown>;
  const app = (su.app_metadata ?? {}) as Record<string, unknown>;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return pick(meta.role) ?? pick(app.role);
}

/** Construye el usuario CRM desde la sesión de Supabase Auth (`user_metadata`: name, full_name, role, permissions, etc.). */
function sessionToAppUser(session: Session): User {
  const su = session.user;
  const meta = (su.user_metadata ?? {}) as Record<string, unknown>;
  const appMeta = (su.app_metadata ?? {}) as Record<string, unknown>;
  const email = su.email ?? "";
  const name =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.full_name === "string" && meta.full_name) ||
    email.split("@")[0] ||
    "Usuario";
  const role = normalizeRole(roleStringFromAuthUser(su) ?? "asesor");
  const rawPerms = meta.permissions ?? appMeta.permissions;
  const hasCustomPerms =
    Array.isArray(rawPerms) &&
    rawPerms.some((p) => typeof p === "string" && ALL_PERMISSIONS.includes(p as UserPermission));
  const permissions: UserPermission[] = hasCustomPerms
    ? (rawPerms as unknown[]).filter(
        (p): p is UserPermission => typeof p === "string" && ALL_PERMISSIONS.includes(p as UserPermission)
      )
    : [...defaultPermissionsByRole[role]];
  const now = new Date().toISOString();
  const createdAt = typeof su.created_at === "string" ? su.created_at : now;
  const tokkoUserId =
    typeof meta.tokko_user_id === "string" && meta.tokko_user_id.trim()
      ? meta.tokko_user_id.trim()
      : undefined;
  return normalizeUser({
    id: su.id,
    email,
    name,
    role,
    permissions,
    tokkoUserId,
    profile: {
      phone: String(meta.phone ?? ""),
      address: String(meta.address ?? ""),
      birthDate: String(meta.birth_date ?? meta.birthDate ?? ""),
      workHistory: Array.isArray(meta.work_history)
        ? (meta.work_history as string[])
        : Array.isArray(meta.workHistory)
          ? (meta.workHistory as string[])
          : [],
      picture: String(meta.picture ?? ""),
    },
    isActive: true,
    createdAt,
    updatedAt: now,
    history: [],
  });
}

/** Si existe fila en `tokko_users` (mismo `id` que Supabase Auth), refuerza rol y permisos respecto a `user_metadata`. */
function mergeTokkoRowIntoUser(base: User, row: Record<string, unknown>): User {
  const roleRaw =
    (typeof row.role === "string" && row.role) ||
    (typeof row.user_role === "string" && row.user_role) ||
    base.role;
  const role = normalizeRole(roleRaw);

  const nameFromRow =
    (typeof row.full_name === "string" && row.full_name.trim()) ||
    (typeof row.name === "string" && row.name.trim()) ||
    (typeof row.display_name === "string" && row.display_name.trim()) ||
    base.name;

  const rawPerms = row.permissions ?? row.app_permissions;
  const hasCustomPerms =
    Array.isArray(rawPerms) &&
    rawPerms.some((p) => typeof p === "string" && ALL_PERMISSIONS.includes(p as UserPermission));
  const permissions: UserPermission[] = hasCustomPerms
    ? (rawPerms as unknown[]).filter(
        (p): p is UserPermission => typeof p === "string" && ALL_PERMISSIONS.includes(p as UserPermission)
      )
    : role !== base.role
      ? [...defaultPermissionsByRole[role]]
      : base.permissions;

  const phone = typeof row.phone === "string" ? row.phone : base.profile.phone;
  const address = typeof row.address === "string" ? row.address : base.profile.address;
  const birthDate =
    (typeof row.birth_date === "string" && row.birth_date) ||
    (typeof row.birthdate === "string" && row.birthdate) ||
    base.profile.birthDate;
  const picture = typeof row.picture === "string" ? row.picture : base.profile.picture;

  const rawMust = row.must_change_password;
  let mustChangePassword = base.mustChangePassword === true;
  if (rawMust === true || rawMust === "true" || rawMust === "t" || rawMust === 1) {
    mustChangePassword = true;
  } else if (rawMust === false || rawMust === "false" || rawMust === "f" || rawMust === 0) {
    mustChangePassword = false;
  }

  const tokkoUserIdFromRow =
    typeof row.tokko_user_id === "string" && row.tokko_user_id.trim()
      ? row.tokko_user_id.trim()
      : base.tokkoUserId;

  return normalizeUser({
    ...base,
    name: nameFromRow,
    role,
    permissions,
    tokkoUserId: tokkoUserIdFromRow,
    mustChangePassword,
    profile: {
      ...base.profile,
      phone,
      address,
      birthDate,
      picture,
    },
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Refuerza rol/permisos desde `tokko_users`. Reintenta: la primera lectura tras login o un timeout
 * previo puede devolver vacío y sin esto el JWT (sin `role` en metadata) deja al usuario como asesor.
 */
async function loadUserWithTokkoMerge(client: SupabaseClient, session: Session): Promise<User> {
  let appUser = sessionToAppUser(session);
  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await fetchTokkoUserRow(client, session.user.id);
    if (!error && data) {
      return mergeTokkoRowIntoUser(appUser, data as Record<string, unknown>);
    }
    if (import.meta.env.DEV && error) {
      console.warn(`[Viterra] fetchTokkoUserRow intento ${attempt + 1}/${maxAttempts}:`, error.message);
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  return appUser;
}

/** Fila `tokko_users` → usuario del directorio CRM (misma lógica que el refuerzo por sesión). */
function directoryUserFromTokkoRow(row: Record<string, unknown>): User {
  const id = String(row.id ?? "");
  const email = String(row.email ?? "").trim();
  const base = normalizeUser({
    id,
    email,
    name: email.split("@")[0] || "Usuario",
    role: "asesor",
    permissions: [],
    profile: { phone: "", address: "", birthDate: "", workHistory: [], picture: "" },
    isActive: true,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
    history: [],
  });
  const merged = mergeTokkoRowIntoUser(base, row);
  const isArchived =
    (row.archived_at != null && String(row.archived_at).trim().length > 0) ||
    row.is_active === false ||
    row.is_active === "false";
  if (isArchived) {
    return normalizeUser({
      ...merged,
      isActive: false,
      archivedAt:
        typeof row.archived_at === "string" && row.archived_at.trim()
          ? row.archived_at
          : merged.archivedAt,
    });
  }
  return merged;
}

/** Directorio CRM (`tokko_users`): solo en panel admin — la landing no debe consultar esta tabla. */
function tokkoDbNeededForPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const location = useLocation();

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved) as Partial<User>[];
      return parsed.map(normalizeUser);
    } catch {
      return [];
    }
  });

  const [passwordByUserId, setPasswordByUserId] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    if (!saved) return {};
    try {
      return JSON.parse(saved) as Record<string, string>;
    } catch {
      return {};
    }
  });

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const TOKKO_DIRECTORY_MS = 6_000;

  const mergeSessionUserIntoDirectory = useCallback((appUser: User) => {
    setUsers((prev) => {
      const email = appUser.email.toLowerCase();
      const i = prev.findIndex((u) => u.email.toLowerCase() === email);
      let next: User[];
      if (i === -1) {
        next = [...prev, appUser];
      } else {
        next = [...prev];
        next[i] = {
          ...prev[i],
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
          role: appUser.role,
          permissions: appUser.permissions,
          profile: appUser.profile,
          tokkoUserId: appUser.tokkoUserId,
          mustChangePassword: appUser.mustChangePassword,
          updatedAt: appUser.updatedAt,
        };
      }
      writeUsersStorage(next);
      return next;
    });
  }, []);

  const syncDirectoryAccessToTokkoUsers = useCallback(async (directory: User[]) => {
    const client = getSupabaseClient();
    if (!client) return;
    const activeUsers = directory.filter((u) => u.isActive);
    if (activeUsers.length === 0) return;
    const results = await Promise.all(
      activeUsers.map((u) =>
        upsertTokkoUserAccess(client, {
          userId: u.id,
          email: u.email,
          role: u.role,
          permissions: u.permissions,
        })
      )
    );
    const failed = results.filter((r) => r.error);
    if (failed.length > 0 && import.meta.env.DEV) {
      console.warn(
        `[Viterra] Backfill de rol/permisos en tokko_users con fallas: ${failed.length}/${results.length}`
      );
    }
  }, []);

  const hydrateTokkoDirectory = useCallback(
    async (appUser: User) => {
      const c = getSupabaseClient();
      if (!c) return;

      let listRes: Awaited<ReturnType<typeof fetchAllTokkoUsersForDirectory>>;
      try {
        listRes = await withTimeout(
          fetchAllTokkoUsersForDirectory(c),
          TOKKO_DIRECTORY_MS,
          "tokko_users (equipo)"
        );
      } catch {
        mergeSessionUserIntoDirectory(appUser);
        return;
      }

      if (!listRes.error && Array.isArray(listRes.data)) {
        const activeRows = (listRes.data as Record<string, unknown>[]).filter((rec) => {
          const del = rec.deleted_at;
          return del == null || String(del).trim() === "";
        });

        let merged: User[];
        if (activeRows.length === 0) {
          merged = [appUser];
        } else {
          const directory = activeRows.map((rec) => directoryUserFromTokkoRow(rec));
          const byId = new Map(directory.map((u) => [u.id, u]));
          byId.set(appUser.id, appUser);
          merged = Array.from(byId.values()).sort((a, b) =>
            a.name.localeCompare(b.name, "es", { sensitivity: "base" })
          );
        }
        setUsers(merged);
        writeUsersStorage(merged);
        void syncDirectoryAccessToTokkoUsers(merged);
      } else {
        mergeSessionUserIntoDirectory(appUser);
      }
    },
    [TOKKO_DIRECTORY_MS, mergeSessionUserIntoDirectory, syncDirectoryAccessToTokkoUsers]
  );

  const loadTokkoProfileAndDirectory = useCallback(async () => {
    if (!tokkoDbNeededForPath(location.pathname)) return;
    const client = getSupabaseClient();
    if (!client) return;
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session?.user) return;

    const appUser = await loadUserWithTokkoMerge(client, session);
    setUser(appUser);
    void hydrateTokkoDirectory(appUser);
  }, [location.pathname, hydrateTokkoDirectory]);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setAuthReady(true);
      return;
    }

    const applySession = async (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      const c = getSupabaseClient();
      if (c) {
        /**
         * Refuerzo con `tokko_users` + reintentos.
         * OJO: En rutas públicas esto no aporta valor, pero sí puede sumar segundos (queries + backoff).
         * Solo lo hacemos en `/admin/*` para mejorar la consistencia de carga del sitio.
         */
        const appUser = tokkoDbNeededForPath(location.pathname)
          ? await loadUserWithTokkoMerge(c, session)
          : sessionToAppUser(session);
        setUser(appUser);
      } else {
        const appUser = sessionToAppUser(session);
        mergeSessionUserIntoDirectory(appUser);
        setUser(appUser);
      }
    };

    void client.auth
      .getSession()
      .then(({ data: { session } }) => applySession(session))
      .finally(() => {
        setAuthReady(true);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, mergeSessionUserIntoDirectory]);

  useEffect(() => {
    if (!tokkoDbNeededForPath(location.pathname)) return;
    void loadTokkoProfileAndDirectory();
  }, [location.pathname, loadTokkoProfileAndDirectory]);

  const persistUsers = (next: User[]) => {
    setUsers(next);
    writeUsersStorage(next);
    if (user) {
      const refreshed = next.find((u) => u.id === user.id);
      if (!refreshed || !refreshed.isActive) {
        void getSupabaseClient()?.auth.signOut();
        setUser(null);
      }
    }
  };

  const persistPasswords = (next: Record<string, string>) => {
    setPasswordByUserId(next);
    try {
      localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn("[Viterra] No se pudo persistir contraseñas locales por cuota:", e);
      }
    }
  };

  const appendHistory = (target: User, entry: UserHistoryEntry): User => ({
    ...target,
    updatedAt: entry.createdAt,
    history: [entry, ...target.history],
  });

  const login: AuthContextType["login"] = async (email, password) => {
    const client = getSupabaseClient();
    if (!client) {
      return { ok: false, message: "Supabase no está configurado (variables VITE_SUPABASE_*)." };
    }
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { ok: false, message: error.message };
    }
    const {
      data: { session },
    } = await client.auth.getSession();
    const uid = session?.user?.id;
    if (!uid || !session?.user) {
      return { ok: true, mustChangePassword: false };
    }
    let flagRow: { must_change_password?: unknown } | null = null;
    const byId = await client.from("tokko_users").select("must_change_password").eq("id", uid).maybeSingle();
    if (!byId.error && byId.data) {
      flagRow = byId.data as { must_change_password?: unknown };
    } else if (session.user.email?.trim()) {
      const byEmail = await client
        .from("tokko_users")
        .select("must_change_password")
        .ilike("email", session.user.email.trim())
        .maybeSingle();
      if (!byEmail.error && byEmail.data) {
        flagRow = byEmail.data as { must_change_password?: unknown };
      }
    }
    const appUser = await loadUserWithTokkoMerge(client, session);
    setUser(appUser);

    if (!flagRow) {
      return { ok: true, mustChangePassword: false };
    }
    const v = flagRow.must_change_password;
    const mustChangePassword =
      v === true || v === "true" || v === "t" || v === 1;
    return { ok: true, mustChangePassword };
  };

  const logout: AuthContextType["logout"] = async () => {
    const client = getSupabaseClient();
    await client?.auth.signOut();
    setUser(null);
  };

  /**
   * Creación local del directorio (localStorage). En producción, altas reales de cuentas
   * suelen hacerse con Supabase Dashboard o una Edge Function con service role.
   */
  const createUser: AuthContextType["createUser"] = (input, actorName = "Admin") => {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return { ok: false, message: "Ya existe un usuario con ese correo." };
    }
    const now = new Date().toISOString();
    const id = `${Date.now()}`;
    const created = normalizeUser({
      id,
      name: input.name.trim(),
      email: normalizedEmail,
      role: input.role,
      permissions: input.permissions?.length ? input.permissions : defaultPermissionsByRole[input.role],
      profile: {
        phone: input.profile?.phone ?? "",
        address: input.profile?.address ?? "",
        birthDate: input.profile?.birthDate ?? "",
        workHistory: input.profile?.workHistory ?? [],
        picture: input.profile?.picture ?? "",
      },
      isActive: true,
      createdAt: now,
      updatedAt: now,
      history: [newHistoryEntry("created", "Usuario creado", actorName)],
    });
    persistUsers([...users, created]);
    persistPasswords({ ...passwordByUserId, [id]: input.password });
    return { ok: true };
  };

  const updateUser: AuthContextType["updateUser"] = (id, input, actorName = "Admin") => {
    persistUsers(
      users.map((item) => {
        if (item.id !== id) return item;
        const next = normalizeUser({
          ...item,
          ...input,
          profile: { ...item.profile, ...(input.profile ?? {}) },
        });
        return appendHistory(next, newHistoryEntry("updated", "Perfil actualizado", actorName));
      })
    );
  };

  const updateUserPassword: AuthContextType["updateUserPassword"] = (id, newPassword, actorName = "Admin") => {
    persistPasswords({ ...passwordByUserId, [id]: newPassword });
    persistUsers(
      users.map((item) =>
        item.id === id
          ? appendHistory(item, newHistoryEntry("password_changed", "Contraseña actualizada", actorName))
          : item
      )
    );
  };

  const updateUserPermissions: AuthContextType["updateUserPermissions"] = (id, role, permissions, actorName = "Admin") => {
    const target = users.find((u) => u.id === id);
    persistUsers(
      users.map((item) => {
        if (item.id !== id) return item;
        const next = normalizeUser({ ...item, role, permissions });
        return appendHistory(next, newHistoryEntry("permissions_changed", "Permisos o rol actualizados", actorName));
      })
    );
    if (!target) return;
    const client = getSupabaseClient();
    if (!client) return;
    void upsertTokkoUserAccess(client, {
      userId: target.id,
      email: target.email,
      role,
      permissions,
    }).then((res) => {
      if (res.error) {
        toast.error("No se pudieron guardar rol/permisos en la base de datos (RLS).");
        if (import.meta.env.DEV) {
          console.warn("[Viterra] No se pudo persistir rol/permisos en tokko_users:", res.error.message);
        }
        return;
      }
      toast.success("Rol y permisos actualizados en base de datos.");
    });
  };

  const archiveUser: AuthContextType["archiveUser"] = (id, actorName = "Admin") => {
    const now = new Date().toISOString();
    persistUsers(
      users.map((item) => {
        if (item.id !== id || !item.isActive) return item;
        const next = { ...item, isActive: false, archivedAt: now, archivedBy: actorName };
        return appendHistory(next, newHistoryEntry("archived", "Usuario archivado", actorName));
      })
    );
  };

  const reactivateUser: AuthContextType["reactivateUser"] = (id, actorName = "Admin") => {
    persistUsers(
      users.map((item) => {
        if (item.id !== id || item.isActive) return item;
        const next = { ...item, isActive: true, archivedAt: undefined, archivedBy: undefined };
        return appendHistory(next, newHistoryEntry("reactivated", "Usuario reactivado", actorName));
      })
    );
  };

  const refreshUser = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session?.user) {
      setUser(null);
      return;
    }
    const appUser = await loadUserWithTokkoMerge(client, session);
    setUser(appUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      users,
      authReady,
      login,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      createUser,
      updateUser,
      updateUserPassword,
      updateUserPermissions,
      archiveUser,
      reactivateUser,
      refreshUser,
    }),
    [user, users, authReady, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
