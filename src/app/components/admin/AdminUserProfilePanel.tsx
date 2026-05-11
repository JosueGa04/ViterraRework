import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Briefcase,
  Copy,
  FileJson2,
  Globe2,
  Hash,
  Home,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  Smartphone,
  UserCircle2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AdminProfileSkeleton } from "../../pages/admin/AdminSectionSkeletons";
import { useAuth, type UserPermission } from "../../contexts/AuthContext";
import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  fetchTokkoUserRow,
  updateAuthUserProfileMetadata,
  updateTokkoUserProfile,
  type TokkoUserProfilePatch,
} from "../../lib/supabaseTokkoUsers";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";

function strVal(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function formatTs(v: unknown): string {
  const s = strVal(v);
  if (!s) return "-";
  const d = Date.parse(s);
  if (Number.isNaN(d)) return s;
  return new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function hasPerm(permissions: UserPermission[] | undefined, p: UserPermission) {
  return permissions?.includes(p) ?? false;
}

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-brand-navy ring-2 ring-transparent transition-[color,box-shadow] placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15";

const readClass = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700";

type Draft = {
  name: string;
  email: string;
  phone: string;
  cellphone: string;
  position: string;
  picture: string;
  branch_tokko_id: string;
  payloadJson: string;
};

const emptyDraft: Draft = {
  name: "",
  email: "",
  phone: "",
  cellphone: "",
  position: "",
  picture: "",
  branch_tokko_id: "",
  payloadJson: "{}",
};

type ProfileCacheEntry = {
  row: Record<string, unknown>;
  draft: Draft;
};

function displayRowFromAuthUser(u: { id: string; role: string; permissions: UserPermission[]; tokkoUserId?: string; updatedAt: string }): Record<string, unknown> {
  return {
    id: u.id,
    role: u.role,
    permissions: u.permissions,
    tokko_user_id: u.tokkoUserId ?? "",
    synced_at: null,
    updated_at: u.updatedAt,
    deleted_at: null,
  };
}

const profileCache = new Map<string, ProfileCacheEntry>();

const profilePermissionCards: Array<{
  value: UserPermission;
  label: string;
  description: string;
  Icon: LucideIcon;
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

const roleLabelByValue: Record<string, string> = {
  admin: "Administrador",
  lider_grupo: "Líder de grupo",
  asesor: "Asesor",
};

export function AdminUserProfilePanel() {
  const { user, isAdmin, refreshUser, logout } = useAuth();
  const canEditSensitive = isAdmin || hasPerm(user?.permissions, "manage_users");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [initial, setInitial] = useState<Draft>(emptyDraft);

  const hasTokkoDirectoryRow = row !== null;
  const displayRow = useMemo(() => {
    if (row) return row;
    if (!user) return null;
    return displayRowFromAuthUser(user);
  }, [row, user]);

  const copyField = async (label: string, value: string) => {
    const text = value.trim();
    if (!text) {
      toast.error(`No hay ${label} para copiar.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`No se pudo copiar ${label}.`);
    }
  };

  const load = useCallback(async () => {
    if (!user) return;
    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await fetchTokkoUserRow(client, user.id);
    if (error) {
      toast.error(error.message);
      setRow(null);
      setLoading(false);
      return;
    }
    if (!data) {
      profileCache.delete(user.id);
      setRow(null);
      const { data: authData } = await client.auth.getUser();
      const meta = (authData.user?.user_metadata ?? {}) as Record<string, unknown>;
      const d: Draft = {
        name: strVal(meta.name || meta.full_name) || user.name,
        email: user.email,
        phone: strVal(meta.phone) || user.profile.phone,
        cellphone: strVal(meta.cellphone),
        position: strVal(meta.position),
        picture: strVal(meta.picture) || user.profile.picture,
        branch_tokko_id: "",
        payloadJson: "{}",
      };
      setDraft(d);
      setInitial(d);
      setLoading(false);
      return;
    }

    const r = data as Record<string, unknown>;
    setRow(r);
    const p = r.payload;
    let payloadJson = "{}";
    try {
      payloadJson = JSON.stringify(p && typeof p === "object" ? p : {}, null, 2);
    } catch {
      payloadJson = "{}";
    }

    const d: Draft = {
      name: strVal(r.name) || user.name,
      email: strVal(r.email) || user.email,
      phone: strVal(r.phone),
      cellphone: strVal(r.cellphone),
      position: strVal(r.position),
      picture: strVal(r.picture),
      branch_tokko_id: strVal(r.branch_tokko_id),
      payloadJson,
    };
    setDraft(d);
    setInitial(d);
    profileCache.set(user.id, { row: r, draft: d });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const cached = profileCache.get(user.id);
    if (cached) {
      setRow(cached.row);
      setDraft(cached.draft);
      setInitial(cached.draft);
      setLoading(false);
      return;
    }
    void load();
  }, [user, load]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);

  const onPictureFileChange = async (file: File | null) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(file.type)) {
      toast.error("Solo se permiten archivos PNG o JPEG.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("La imagen excede 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        toast.error("No se pudo leer el archivo.");
        return;
      }
      setDraft((d) => ({ ...d, picture: result }));
    };
    reader.onerror = () => toast.error("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  };

  const buildPatch = (): TokkoUserProfilePatch | null => {
    if (!user) return null;
    const patch: TokkoUserProfilePatch = {};

    if (draft.name.trim() !== initial.name.trim()) {
      if (!draft.name.trim()) {
        toast.error("El nombre es obligatorio.");
        return null;
      }
      patch.name = draft.name.trim();
    }

    if (row && canEditSensitive && draft.email.trim() !== initial.email.trim()) {
      patch.email = draft.email.trim() || null;
    }

    const baseFields: Array<keyof Pick<Draft, "phone" | "cellphone" | "position" | "picture">> = [
      "phone",
      "cellphone",
      "position",
      "picture",
    ];
    for (const k of baseFields) {
      if (draft[k].trim() !== initial[k].trim()) {
        patch[k] = draft[k].trim() || null;
      }
    }

    if (row && canEditSensitive) {
      if (draft.branch_tokko_id.trim() !== initial.branch_tokko_id.trim()) {
        patch.branch_tokko_id = draft.branch_tokko_id.trim() || null;
      }
      if (draft.payloadJson.trim() !== initial.payloadJson.trim()) {
        try {
          patch.payload = JSON.parse(draft.payloadJson || "{}") as Record<string, unknown>;
        } catch {
          toast.error("El JSON de payload no es válido.");
          return null;
        }
      }
    }

    return Object.keys(patch).length > 0 ? patch : null;
  };

  const save = async () => {
    if (!user) return;
    const patch = buildPatch();
    if (!patch) {
      if (dirty) toast.error("Revisa los campos obligatorios o los permisos de edición.");
      else toast.info("No hay cambios que guardar.");
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      toast.error("Supabase no está configurado.");
      return;
    }

    setSaving(true);
    if (!row) {
      const { error } = await updateAuthUserProfileMetadata(client, {
        name: patch.name,
        phone: patch.phone,
        cellphone: patch.cellphone,
        position: patch.position,
        picture: patch.picture,
      });
      setSaving(false);
      if (error) {
        toast.error(error.message || "No se pudo guardar el perfil.");
        return;
      }
      toast.success("Perfil actualizado en tu cuenta (Auth).");
      await refreshUser();
      await load();
      return;
    }

    const res = await updateTokkoUserProfile(client, user.id, patch);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }

    toast.success("Perfil actualizado en tokko_users.");
    await refreshUser();
    await load();
  };

  const clearField = async (key: keyof TokkoUserProfilePatch) => {
    if (!user) return;
    if (key === "name" || (key === "email" && !canEditSensitive)) return;
    const client = getSupabaseClient();
    if (!client) {
      toast.error("Supabase no está configurado.");
      return;
    }

    setSaving(true);
    if (!row) {
      if (key === "email") {
        setSaving(false);
        toast.info("El correo solo se gestiona con una fila en directorio CRM o desde Auth.");
        return;
      }
      const metaPatch: Parameters<typeof updateAuthUserProfileMetadata>[1] = {};
      if (key === "phone") metaPatch.phone = "";
      else if (key === "cellphone") metaPatch.cellphone = "";
      else if (key === "position") metaPatch.position = "";
      else if (key === "picture") metaPatch.picture = "";
      else {
        setSaving(false);
        return;
      }
      const { error } = await updateAuthUserProfileMetadata(client, metaPatch);
      setSaving(false);
      if (error) {
        toast.error(error.message || "No se pudo limpiar el campo.");
        return;
      }
      toast.success("Campo eliminado.");
      await refreshUser();
      await load();
      return;
    }

    const res = await updateTokkoUserProfile(client, user.id, { [key]: null } as TokkoUserProfilePatch);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }

    toast.success("Campo eliminado.");
    await refreshUser();
    await load();
  };

  if (!user) return null;

  if (loading) {
    return <AdminProfileSkeleton />;
  }

  if (!displayRow) return null;

  const roRole = roleLabelByValue[strVal(displayRow.role)] || strVal(displayRow.role) || "-";
  const roPerms = Array.isArray(displayRow.permissions) ? (displayRow.permissions as string[]).filter(Boolean) : [];

  return (
    <div className="space-y-3">
      {!hasTokkoDirectoryRow ? (
        <div
          className="rounded-2xl border border-slate-200 bg-slate-50/95 p-4 text-sm text-slate-700 shadow-sm"
          style={{ fontWeight: 500 }}
        >
          No hay fila en <span className="font-mono">tokko_users</span> para este usuario (p. ej. CRM sin Tokko). Puedes ver y editar
          nombre, contacto y foto desde tu cuenta de Supabase Auth; rol y permisos siguen viniendo de la sesión. Si más adelante
          sincronizas Tokko, el directorio CRM puede enlazarse por el mismo <span className="font-mono">id</span> que Auth.
        </div>
      ) : null}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/90 shadow-[0_24px_60px_-18px_rgba(20,28,46,0.14)] ring-1 ring-slate-900/[0.04]">
        <div
          className="h-1.5 w-full bg-gradient-to-r from-brand-gold via-primary to-brand-burgundy"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-gradient-to-br from-primary/[0.07] to-transparent blur-3xl"
          aria-hidden
        />
        <div className="relative px-5 pb-6 pt-6 md:px-8 md:pb-7 md:pt-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-slate-900">Mi perfil</h2>
              <p className="mt-1 truncate text-sm text-slate-600" style={{ fontWeight: 500 }}>
                {draft.name || "Sin nombre"} · {draft.email || "Sin correo"}
              </p>
            </div>
            <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void logout()}>
              Cerrar sesión
            </Button>
              <Button type="button" size="sm" className="bg-primary" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Información personal</h3>
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <label className="group relative flex min-h-[18.4rem] h-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {draft.picture ? (
                <img src={draft.picture} alt="Vista previa" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
                  <span className="text-xs">Subir foto de perfil</span>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-brand-navy/0 transition group-hover:bg-brand-navy/12 group-active:bg-brand-navy/20" />
              <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-md bg-white/90 px-2 py-1 text-center text-[11px] text-slate-700 opacity-85 backdrop-blur">
                Haz clic para cargar PNG o JPG
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(e) => void onPictureFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-slate-600">Nombre completo</Label>
              <input className={inputClass} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex min-h-7 items-center justify-between gap-2">
                <Label className="min-w-0 text-xs text-slate-600">
                  <Mail className="mb-0.5 mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
                  Correo
                </Label>
                <div className="flex h-7 w-16 shrink-0 items-center justify-end sm:w-20" aria-hidden={!(canEditSensitive && hasTokkoDirectoryRow && draft.email.trim())}>
                  {canEditSensitive && hasTokkoDirectoryRow && draft.email.trim() ? (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={saving} onClick={() => void clearField("email")}>
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>
              <input
                className={cn(inputClass, (!canEditSensitive || !hasTokkoDirectoryRow) && "bg-slate-50 text-slate-600")}
                readOnly={!canEditSensitive || !hasTokkoDirectoryRow}
                title={!hasTokkoDirectoryRow ? "El correo se gestiona en Auth; para cambiarlo usa el flujo de Supabase o crea la fila en directorio CRM." : undefined}
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex min-h-7 items-center justify-between gap-2">
                <Label className="min-w-0 text-xs text-slate-600">
                  <Phone className="mb-0.5 mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
                  Teléfono
                </Label>
                <div className="flex h-7 w-16 shrink-0 items-center justify-end sm:w-20" aria-hidden={!draft.phone}>
                  {draft.phone ? (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={saving} onClick={() => void clearField("phone")}>
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>
              <input className={inputClass} value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <div className="flex min-h-7 items-center justify-between gap-2">
                <Label className="min-w-0 text-xs text-slate-600">
                  <Smartphone className="mb-0.5 mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
                  Celular
                </Label>
                <div className="flex h-7 w-16 shrink-0 items-center justify-end sm:w-20" aria-hidden={!draft.cellphone}>
                  {draft.cellphone ? (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={saving} onClick={() => void clearField("cellphone")}>
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>
              <input className={inputClass} value={draft.cellphone} onChange={(e) => setDraft((d) => ({ ...d, cellphone: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <div className="flex min-h-7 items-center justify-between gap-2">
                <Label className="min-w-0 text-xs text-slate-600">
                  <Briefcase className="mb-0.5 mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
                  Puesto
                </Label>
                <div className="flex h-7 w-16 shrink-0 items-center justify-end sm:w-20" aria-hidden={!draft.position.trim()}>
                  {draft.position.trim() ? (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" disabled={saving} onClick={() => void clearField("position")}>
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>
              <input className={inputClass} value={draft.position} onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <div className="flex min-h-7 items-center justify-between gap-2">
                <Label className="min-w-0 text-xs text-slate-600">
                  <Shield className="mb-0.5 mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
                  Rol
                </Label>
                <div className="h-7 w-16 shrink-0 sm:w-20" aria-hidden />
              </div>
              <p className={cn(readClass, "min-h-9")}>{roRole}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Permisos</h3>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Módulos</Label>
            {(() => {
              const enabledCards = profilePermissionCards.filter(({ value }) => roPerms.includes(value));
              if (enabledCards.length === 0) {
                return (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Sin módulos asignados
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 gap-2">
                  {enabledCards.map(({ value, label, Icon }) => (
                    <div key={value} className="relative rounded-xl border border-primary/35 bg-primary/[0.04] p-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                          <Icon className="h-4.5 w-4.5" strokeWidth={1.7} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-900" style={{ fontWeight: 700 }}>
                            {label}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Identificación</h3>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-slate-600">
                <Hash className="mb-0.5 mr-1 inline h-3.5 w-3.5" strokeWidth={1.5} />
                ID (UUID)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500"
                onClick={() => void copyField("ID", strVal(displayRow.id))}
              >
                <Copy className="mr-1 h-3.5 w-3.5" strokeWidth={1.7} />
                Copiar
              </Button>
            </div>
            <p className={readClass}>{strVal(displayRow.id) || "-"}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs text-slate-600">tokko_user_id</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500"
                onClick={() => void copyField("tokko_user_id", strVal(displayRow.tokko_user_id))}
              >
                <Copy className="mr-1 h-3.5 w-3.5" strokeWidth={1.7} />
                Copiar
              </Button>
            </div>
            <div className={cn(readClass, "overflow-x-auto whitespace-nowrap font-mono text-xs")}>
              {strVal(displayRow.tokko_user_id) || "-"}
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Auditoría</h3>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">synced_at</Label>
            <p className={readClass}>{formatTs(displayRow.synced_at)}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">updated_at</Label>
            <p className={readClass}>{formatTs(displayRow.updated_at)}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">deleted_at</Label>
            <p className={readClass}>
              {displayRow.deleted_at == null || strVal(displayRow.deleted_at) === "" ? "-" : formatTs(displayRow.deleted_at)}
            </p>
          </div>
        </section>
      </div>

    </div>
  );
}
