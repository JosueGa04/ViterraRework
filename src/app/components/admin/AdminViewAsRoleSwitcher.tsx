import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { AdminViewAsRole } from "../../lib/adminViewAsRole";
import type { User } from "../../contexts/AuthContext";
import { foldSearchText } from "../../lib/searchText";
import { cn } from "../ui/utils";

const OPTIONS: { id: AdminViewAsRole; label: string }[] = [
  { id: "admin",       label: "Admin"  },
  { id: "lider_grupo", label: "Líder"  },
  { id: "asesor",      label: "Asesor" },
];

function ViewAsAvatar({ user, size = 22 }: { user: User; size?: number }) {
  const pic = user.profile?.picture?.trim();
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "9999px",
        overflow: "hidden",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.7)",
        fontSize: "9px",
        fontWeight: 700,
        letterSpacing: "0.02em",
      }}
    >
      {pic ? (
        <img src={pic} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </span>
  );
}

type Props = {
  value: AdminViewAsRole;
  onChange: (value: AdminViewAsRole) => void;
  /** Lista de usuarios del equipo para elegir desde quién ver el CRM. */
  users: User[];
  /** Usuario concreto seleccionado para la vista previa (líder/asesor). */
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
};

export function AdminViewAsRoleSwitcher({
  value,
  onChange,
  users,
  selectedUserId,
  onSelectUser,
}: Props) {
  const isPreview = value !== "admin";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const comboRef = useRef<HTMLDivElement | null>(null);

  const roleUsers = useMemo(() => {
    if (value === "admin") return [];
    return users
      .filter((u) => u.role === value && u.isActive)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));
  }, [users, value]);

  const filteredUsers = useMemo(() => {
    const q = foldSearchText(query);
    if (!q) return roleUsers;
    return roleUsers.filter((u) => foldSearchText(`${u.name} ${u.email}`).includes(q));
  }, [roleUsers, query]);

  const selectedUser = useMemo(
    () => roleUsers.find((u) => u.id === selectedUserId) ?? null,
    [roleUsers, selectedUserId],
  );

  // Cerrar el combobox al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Si cambia el rol o se cierra, limpiar la búsqueda.
  useEffect(() => {
    setQuery("");
    setOpen(false);
  }, [value]);

  const roleNoun = value === "lider_grupo" ? "líder" : "asesor";

  return (
    <div
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "0.75rem 1rem",
      }}
      role="region"
      aria-label="Vista previa del CRM por rol"
    >
      {/* Label */}
      <p
        style={{
          fontSize: "10px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 500,
          marginBottom: "0.5rem",
          color: isPreview ? "rgba(251,191,36,0.8)" : "rgba(255,255,255,0.3)",
        }}
      >
        {isPreview ? "Vista previa" : "Ver como"}
      </p>

      {/* Segment control */}
      <div
        role="group"
        aria-label="Rol de vista previa"
        style={{
          display: "flex",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "8px",
          padding: "3px",
          gap: "2px",
        }}
      >
        {OPTIONS.map((opt) => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={isActive}
              className={cn(
                "relative flex-1 rounded-md text-center transition-all duration-150",
                "text-[11px] font-semibold leading-none",
              )}
              style={{
                height: "28px",
                border: "none",
                cursor: "pointer",
                background: isActive
                  ? isPreview
                    ? "rgba(251,191,36,0.18)"
                    : "rgba(255,255,255,0.12)"
                  : "transparent",
                color: isActive
                  ? isPreview
                    ? "rgb(251,191,36)"
                    : "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.35)",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Combobox de usuario concreto (al ver como líder o asesor) */}
      {isPreview && (
        <div ref={comboRef} style={{ position: "relative", marginTop: "0.5rem" }}>
          {roleUsers.length === 0 ? (
            <p
              style={{
                fontSize: "11px",
                lineHeight: 1.4,
                color: "rgba(255,255,255,0.4)",
                padding: "0.25rem 0.125rem",
              }}
            >
              No hay {value === "lider_grupo" ? "líderes" : "asesores"} activos para previsualizar.
            </p>
          ) : (
            <>
              {/* Disparador */}
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                style={{
                  display: "flex",
                  width: "100%",
                  height: "32px",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(251,191,36,0.25)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "0 0.625rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <span style={{ display: "flex", minWidth: 0, flex: 1, alignItems: "center", gap: "0.4rem" }}>
                  {selectedUser && <ViewAsAvatar user={selectedUser} size={20} />}
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedUser?.name ?? `Elegir ${roleNoun}…`}
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(251,191,36,0.7)" }} strokeWidth={2} aria-hidden />
              </button>

              {/* Panel desplegable (hacia arriba para no recortarse) */}
              {open && (
                <div
                  role="listbox"
                  aria-label={`Elegir ${roleNoun}`}
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "#111722",
                    boxShadow: "0 16px 40px -12px rgba(0,0,0,0.7)",
                    overflow: "hidden",
                  }}
                >
                  {/* Buscador */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.5rem 0.625rem",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} strokeWidth={1.75} aria-hidden />
                    <input
                      type="text"
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Buscar ${roleNoun}…`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "rgba(255,255,255,0.92)",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        aria-label="Limpiar búsqueda"
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", display: "flex" }}
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {/* Lista filtrada */}
                  <div style={{ maxHeight: "13rem", overflowY: "auto", padding: "0.25rem" }} className="scrollbar-thin">
                    {filteredUsers.length === 0 ? (
                      <p style={{ padding: "0.625rem", textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                        Sin resultados
                      </p>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSel = u.id === selectedUserId;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            role="option"
                            aria-selected={isSel}
                            onClick={() => {
                              onSelectUser(u.id);
                              setOpen(false);
                              setQuery("");
                            }}
                            style={{
                              display: "flex",
                              width: "100%",
                              alignItems: "center",
                              gap: "0.5rem",
                              borderRadius: "6px",
                              border: "none",
                              background: isSel ? "rgba(251,191,36,0.14)" : "transparent",
                              color: isSel ? "rgb(251,191,36)" : "rgba(255,255,255,0.85)",
                              padding: "0.4rem 0.5rem",
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSel) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <ViewAsAvatar user={u} />
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                {u.name}
                              </span>
                              {u.email && (
                                <span
                                  style={{
                                    display: "block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize: "10px",
                                    color: "rgba(255,255,255,0.4)",
                                  }}
                                >
                                  {u.email}
                                </span>
                              )}
                            </span>
                            {isSel && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
