import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Command,
  LayoutGrid,
  Search,
  UserRound,
  X,
} from "lucide-react";
import type { User, UserRole } from "../../contexts/AuthContext";
import {
  adminSearchCategoryLabel,
  canFilterUsersByRole,
  canSearchTeamUsers,
  filterSearchableUsers,
  filterSearchRoutes,
  ROLE_CHIP_STYLES,
  ROUTE_CATEGORY_STYLES,
  userInitials,
  type AdminSearchRoute,
  type AdminSearchScope,
  type AdminUserRoleFilter,
} from "../../lib/adminWorkspaceSearch";
import type { KpiScope } from "../../lib/kpiAccess";
import { roleLabelEs } from "../../lib/leadsAccess";
import { cn } from "../ui/utils";

type Props = {
  routes: AdminSearchRoute[];
  allUsers: User[];
  scope: KpiScope;
  viewer: User | null;
  query: string;
  onQueryChange: (value: string) => void;
  onRouteSelect: (route: AdminSearchRoute) => void;
  onUserSelect: (userId: string) => void;
  className?: string;
};

const SCOPE_OPTIONS: { id: AdminSearchScope; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "routes", label: "Módulos" },
  { id: "users", label: "Usuarios" },
];

const ROLE_FILTERS: { id: AdminUserRoleFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "admin", label: "Admin" },
  { id: "lider_grupo", label: "Líder" },
  { id: "asesor", label: "Asesor" },
];

function ScopeTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-[11px] font-semibold transition",
        active
          ? "bg-brand-navy text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-brand-navy",
      )}
    >
      {label}
    </button>
  );
}

function RoleTab({
  role,
  active,
  label,
  onClick,
}: {
  role: UserRole;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const styles = ROLE_CHIP_STYLES[role];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[10px] font-semibold transition",
        active ? styles.active : "border-transparent bg-slate-100/80 text-slate-600 hover:bg-slate-100",
      )}
    >
      {label}
    </button>
  );
}

function UserAvatar({ user }: { user: User }) {
  const picture = user.profile?.picture?.trim();
  if (picture) {
    return (
      <img
        src={picture}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-xs font-semibold text-white ring-2 ring-white border border-slate-600/20 shadow-sm">
      {userInitials(user.name)}
    </span>
  );
}

export function AdminWorkspaceSearch({
  routes,
  allUsers,
  scope,
  viewer,
  query,
  onQueryChange,
  onRouteSelect,
  onUserSelect,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<AdminSearchScope>("all");
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>("all");

  const showUserScope = canSearchTeamUsers(viewer, scope);

  const availableScopes = useMemo(() => {
    if (showUserScope) return SCOPE_OPTIONS;
    return SCOPE_OPTIONS.filter((s) => s.id !== "users");
  }, [showUserScope]);

  const effectiveScope: AdminSearchScope =
    scopeFilter === "users" && !showUserScope ? "all" : scopeFilter;

  const showRoleFilters =
    canFilterUsersByRole(viewer) && showUserScope && effectiveScope === "users";

  const trimmedQuery = query.trim();

  const filteredRoutes = useMemo(() => {
    if (effectiveScope === "users") return [];
    return filterSearchRoutes(routes, {
      query: trimmedQuery,
      limit: trimmedQuery ? 10 : 8,
    });
  }, [routes, trimmedQuery, effectiveScope]);

  const filteredUsers = useMemo(() => {
    if (effectiveScope === "routes" || !showUserScope) return [];
    return filterSearchableUsers(allUsers, scope, {
      roleFilter: showRoleFilters ? roleFilter : "all",
      query: trimmedQuery,
      limit: trimmedQuery ? 10 : 6,
    });
  }, [allUsers, scope, effectiveScope, showUserScope, showRoleFilters, roleFilter, trimmedQuery]);

  const hasResults = filteredRoutes.length > 0 || filteredUsers.length > 0;
  const showPanel = open;

  const hasActiveFilters =
    effectiveScope !== "all" || roleFilter !== "all" || trimmedQuery.length > 0;

  const clearFilters = useCallback(() => {
    setScopeFilter("all");
    setRoleFilter("all");
    onQueryChange("");
    inputRef.current?.focus();
  }, [onQueryChange]);

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.blur();
  }, []);

  const selectRoute = useCallback(
    (route: AdminSearchRoute) => {
      onRouteSelect(route);
      close();
    },
    [onRouteSelect, close],
  );

  const selectUser = useCallback(
    (userId: string) => {
      onUserSelect(userId);
      close();
    },
    [onUserSelect, close],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  const placeholder =
    effectiveScope === "users"
      ? "Buscar por nombre, correo o rol…"
      : effectiveScope === "routes"
        ? "Ir a un módulo del CRM…"
        : "Módulos, usuarios, secciones…";

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-white px-3 shadow-sm transition-[border-color,box-shadow]",
          open
            ? "border-primary/35 shadow-[0_8px_30px_-12px_rgba(196,30,58,0.25)] ring-2 ring-primary/10"
            : "border-slate-200/90 hover:border-slate-300",
        )}
      >
        <Search
          className={cn("h-4 w-4 shrink-0 transition-colors", open ? "text-primary" : "text-slate-400")}
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (filteredRoutes[0]) {
                e.preventDefault();
                selectRoute(filteredRoutes[0]);
              } else if (filteredUsers[0]) {
                e.preventDefault();
                selectUser(filteredUsers[0].id);
              }
            }
          }}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-brand-navy placeholder:text-slate-400 focus:outline-none"
          aria-label="Buscar en el CRM"
          aria-expanded={open}
          aria-controls="admin-workspace-search-panel"
          autoComplete="off"
          spellCheck={false}
        />
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Limpiar búsqueda y filtros"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-flex">
            <Command className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
            <span>K</span>
          </kbd>
        )}
      </div>

      {showPanel && (
        <div
          id="admin-workspace-search-panel"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[70] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-16px_rgba(15,23,42,0.28)]"
        >
          <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
            {availableScopes.map((opt) => (
              <ScopeTab
                key={opt.id}
                label={opt.label}
                active={effectiveScope === opt.id}
                onClick={() => {
                  setScopeFilter(opt.id);
                  if (opt.id !== "users") setRoleFilter("all");
                  inputRef.current?.focus();
                }}
              />
            ))}
            {showRoleFilters && (
              <>
                <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />
                {ROLE_FILTERS.map((opt) =>
                  opt.id === "all" ? (
                    <ScopeTab
                      key={opt.id}
                      label={opt.label}
                      active={roleFilter === "all"}
                      onClick={() => setRoleFilter("all")}
                    />
                  ) : (
                    <RoleTab
                      key={opt.id}
                      role={opt.id}
                      label={opt.label}
                      active={roleFilter === opt.id}
                      onClick={() => setRoleFilter(opt.id)}
                    />
                  ),
                )}
              </>
            )}
          </div>

          <div className="max-h-[min(26rem,58vh)] overflow-y-auto overscroll-contain">
            {!hasResults ? (
              <div className="px-4 py-8 text-center">
                <LayoutGrid className="mx-auto h-7 w-7 text-slate-300" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-medium text-slate-600">Sin coincidencias</p>
                <p className="mt-0.5 text-xs text-slate-500">Prueba otro término o cambia el filtro.</p>
              </div>
            ) : (
              <>
                {!trimmedQuery && filteredRoutes.length > 0 && effectiveScope !== "users" && (
                  <p className="px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Acceso rápido
                  </p>
                )}

                {filteredRoutes.length > 0 && (
                  <section className="p-1.5 pt-1">
                    {(trimmedQuery || effectiveScope === "routes") && (
                      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Módulos
                      </p>
                    )}
                    <ul className="space-y-0.5">
                      {filteredRoutes.map((route) => {
                        const Icon = route.icon;
                        const catStyle = ROUTE_CATEGORY_STYLES[route.category];
                        return (
                          <li key={route.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectRoute(route)}
                              className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
                            >
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                  catStyle.iconWrap,
                                )}
                              >
                                <Icon className={cn("h-3.5 w-3.5", catStyle.icon)} strokeWidth={1.75} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-brand-navy">{route.title}</p>
                                <p className="truncate text-[11px] text-slate-500">{route.description}</p>
                              </div>
                              <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 group-hover:inline">
                                {adminSearchCategoryLabel(route.category)}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {filteredUsers.length > 0 && (
                  <section className={cn("p-1.5", filteredRoutes.length > 0 && "border-t border-slate-100")}>
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {viewer?.role === "admin" ? "Equipo" : "Tu equipo"}
                    </p>
                    <ul className="space-y-0.5">
                      {filteredUsers.map((u) => {
                        const roleStyle = ROLE_CHIP_STYLES[u.role];
                        return (
                          <li key={u.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectUser(u.id)}
                              className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
                            >
                              <UserAvatar user={u} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-brand-navy">{u.name}</p>
                                <p className="truncate text-[11px] text-slate-500">{u.email}</p>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                  roleStyle.idle,
                                )}
                              >
                                {roleLabelEs(u.role)}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
            <p className="flex min-w-0 items-center gap-1.5 truncate text-[10px] text-slate-500">
              <UserRound className="h-3 w-3 shrink-0" strokeWidth={2} />
              {viewer ? roleLabelEs(viewer.role) : "Sesión"}
              {showUserScope && effectiveScope !== "routes" ? " · equipo visible" : " · solo módulos"}
            </p>
            <p className="shrink-0 text-[10px] text-slate-400">
              <kbd className="rounded border border-slate-200 bg-white px-1 font-sans">↵</kbd> abrir ·{" "}
              <kbd className="rounded border border-slate-200 bg-white px-1 font-sans">esc</kbd> cerrar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
