import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { AdminProfileSkeleton } from "../../pages/admin/AdminSectionSkeletons";
import { useAuth, type User, type UserPermission } from "../../contexts/AuthContext";
import { getSupabaseClient } from "../../lib/supabaseClient";
import {
  fetchTokkoUserRow,
  updateAuthUserProfileMetadata,
  updateTokkoUserProfile,
  type TokkoUserProfilePatch,
} from "../../lib/supabaseTokkoUsers";
import { Button } from "../ui/button";
import { ProfileAccessTab } from "./profile/ProfileAccessTab";
import { ProfileIdentityColumn } from "./profile/ProfileIdentityColumn";
import { ProfilePictureCropDialog } from "./profile/ProfilePictureCropDialog";
import { ProfilePersonalTab } from "./profile/ProfilePersonalTab";
import { ProfilePerformanceTab } from "./profile/ProfilePerformanceTab";
import type { Lead, CustomKanbanStage } from "../../data/leads";
import type { AgendaAppointment } from "../../data/agenda";
import type { UserGroup } from "../../lib/userGroups";
import { ProfileStickyActions } from "./profile/ProfileStickyActions";
import { ProfileTabs } from "./profile/ProfileTabs";
import {
  emptyProfileDraft,
  roleLabelByValue,
  type ProfileDraft,
  type ProfileTabId,
} from "./profile/profileTypes";
import {
  profileCard,
  profileCardAccent,
  profileCardBody,
  profileMainColumn,
  profilePageHeader,
  profilePageShell,
  profileTabPanel,
} from "./profile/profileUi";

function strVal(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

type ProfileCacheEntry = {
  row: Record<string, unknown>;
  draft: ProfileDraft;
};

function displayRowFromAuthUser(u: {
  id: string;
  role: string;
  permissions: UserPermission[];
  tokkoUserId?: string;
  updatedAt: string;
}): Record<string, unknown> {
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

type ProfileWorkspaceContext = {
  leads: Lead[];
  users: User[];
  userGroups: UserGroup[];
  appointments: AgendaAppointment[];
  customKanbanStages: CustomKanbanStage[];
  stageOrder: string[];
  leadsLoading?: boolean;
  onOpenKpis?: () => void;
};

export function AdminUserProfilePanel({
  leads = [],
  users = [],
  userGroups = [],
  appointments = [],
  customKanbanStages = [],
  stageOrder = [],
  leadsLoading = false,
  onOpenKpis,
}: Partial<ProfileWorkspaceContext> = {}) {
  const { user, refreshUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [initial, setInitial] = useState<ProfileDraft>(emptyProfileDraft);
  const [profileTab, setProfileTab] = useState<ProfileTabId>("personal");

  /** Mi perfil es solo consulta; los cambios los hace un administrador desde Mi empresa. */
  const readOnly = true;
  const isRealAdmin = user?.role === "admin";
  const canEditEmail = !readOnly && isRealAdmin;
  const canEditPosition = !readOnly && (user?.role === "admin" || user?.role === "lider_grupo");
  const hasTokkoDirectoryRow = row !== null;
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const displayRow = useMemo(() => {
    if (row) return row;
    if (!user) return null;
    return displayRowFromAuthUser(user);
  }, [row, user]);

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
      const d: ProfileDraft = {
        name: strVal(meta.name || meta.full_name) || user.name,
        email: user.email,
        phone: strVal(meta.phone) || user.profile.phone,
        cellphone: strVal(meta.cellphone),
        position: strVal(meta.position),
        picture: strVal(meta.picture) || user.profile.picture,
      };
      setDraft(d);
      setInitial(d);
      setLoading(false);
      return;
    }

    const r = data as Record<string, unknown>;
    setRow(r);
    const d: ProfileDraft = {
      name: strVal(r.name) || user.name,
      email: strVal(r.email) || user.email,
      phone: strVal(r.phone),
      cellphone: strVal(r.cellphone),
      position: strVal(r.position),
      picture: strVal(r.picture),
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
  const cellphoneDirty = useMemo(
    () => draft.cellphone.trim() !== initial.cellphone.trim(),
    [draft.cellphone, initial.cellphone],
  );
  const showSaveBar = profileTab === "personal" && (readOnly ? cellphoneDirty : dirty);

  const onPictureFileChange = (file: File | null) => {
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
      setCropImageSrc(result);
      setCropOpen(true);
    };
    reader.onerror = () => toast.error("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  };

  const onCropConfirm = (dataUrl: string) => {
    setDraft((d) => ({ ...d, picture: dataUrl }));
    setCropImageSrc(null);
    toast.success("Foto lista. Pulsa «Guardar cambios» para aplicarla.");
  };

  const buildPatch = (): TokkoUserProfilePatch | null => {
    if (!user) return null;
    const patch: TokkoUserProfilePatch = {};

    if (readOnly) {
      if (draft.cellphone.trim() !== initial.cellphone.trim()) {
        const v = draft.cellphone.trim() || null;
        patch.cellphone = v;
        patch.phone = v;
      }
      return Object.keys(patch).length > 0 ? patch : null;
    }

    if (draft.name.trim() !== initial.name.trim()) {
      if (!draft.name.trim()) {
        toast.error("El nombre es obligatorio.");
        return null;
      }
      patch.name = draft.name.trim();
    }

    if (canEditEmail && row && draft.email.trim() !== initial.email.trim()) {
      patch.email = draft.email.trim() || null;
    }

    const baseFields: Array<keyof Pick<ProfileDraft, "phone" | "cellphone" | "picture">> = [
      "phone",
      "cellphone",
      "picture",
    ];
    for (const k of baseFields) {
      if (draft[k].trim() !== initial[k].trim()) {
        patch[k] = draft[k].trim() || null;
      }
    }

    if (
      canEditPosition &&
      draft.position.trim() !== initial.position.trim()
    ) {
      patch.position = draft.position.trim() || null;
    }

    return Object.keys(patch).length > 0 ? patch : null;
  };

  const save = async () => {
    if (!user) return;
    const patch = buildPatch();
    if (!patch) {
      if (readOnly ? cellphoneDirty : dirty) {
        toast.error("Revisa los campos obligatorios o los permisos de edición.");
      } else {
        toast.info("No hay cambios que guardar.");
      }
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      toast.error("Supabase no está configurado.");
      return;
    }

    setSaving(true);
    if (!row) {
      const metaPatch: Parameters<typeof updateAuthUserProfileMetadata>[1] = readOnly
        ? { cellphone: patch.cellphone, phone: patch.phone }
        : {
            name: patch.name,
            phone: patch.phone,
            cellphone: patch.cellphone,
            position: canEditPosition ? patch.position : undefined,
            picture: patch.picture,
          };
      const { error } = await updateAuthUserProfileMetadata(client, metaPatch);
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
    if (key === "name" || (key === "email" && !canEditEmail) || (key === "position" && !canEditPosition)) {
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      toast.error("Supabase no está configurado.");
      return;
    }

    setSaving(true);
    if (!row) {
      if (key === "email") {
        setSaving(false);
        toast.info("El correo se actualiza cuando tu usuario tiene fila en el directorio CRM (tokko_users).");
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
    <div className={profilePageShell}>
      <header className={profilePageHeader}>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Cuenta</p>
          <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight text-brand-navy sm:text-[1.65rem]">
            Mi perfil
          </h1>
          <p className="mt-1 max-w-lg text-sm text-slate-600">
            Consulta tus datos, equipo, metas KPI y rendimiento. Solo puedes editar tu celular; el resto lo
            gestiona un administrador.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          className="shrink-0 border-slate-200/90 text-slate-700"
          onClick={() => void logout()}
        >
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Cerrar sesión
        </Button>
      </header>

      <section className={profileCard}>
        <div className={profileCardAccent} aria-hidden />
        <div className={profileCardBody}>
          <ProfileIdentityColumn
            draft={draft}
            setDraft={setDraft}
            roleLabel={roRole}
            saving={saving}
            readOnly={readOnly}
            canEditEmail={canEditEmail}
            hasTokkoDirectoryRow={hasTokkoDirectoryRow}
            onPictureFileChange={(file) => void onPictureFileChange(file)}
            onClearField={(key) => void clearField(key)}
          />

          <div className={profileMainColumn}>
            <div className="border-b border-slate-200/80 px-5 py-4 sm:px-7 md:px-8">
              <ProfileTabs activeTab={profileTab} onTabChange={setProfileTab} />
            </div>

            <div className={profileTabPanel}>
              {profileTab === "personal" ? (
                <ProfilePersonalTab
                  draft={draft}
                  setDraft={setDraft}
                  saving={saving}
                  readOnly={readOnly}
                  canEditPosition={canEditPosition}
                  onClearField={(key) => void clearField(key)}
                />
              ) : null}
              {profileTab === "performance" && user ? (
                <ProfilePerformanceTab
                  user={user}
                  users={users}
                  userGroups={userGroups}
                  leads={leads}
                  appointments={appointments}
                  customStages={customKanbanStages}
                  stageOrder={stageOrder}
                  leadsLoading={leadsLoading}
                  onOpenKpis={onOpenKpis}
                />
              ) : null}
              {profileTab === "access" ? (
                <ProfileAccessTab roleLabel={roRole} enabledPermissions={roPerms} />
              ) : null}
            </div>

            {showSaveBar ? (
              <ProfileStickyActions
                saving={saving}
                dirty={readOnly ? cellphoneDirty : dirty}
                onSave={() => void save()}
              />
            ) : null}
          </div>
        </div>
      </section>

      {!readOnly ? (
        <ProfilePictureCropDialog
          open={cropOpen}
          imageSrc={cropImageSrc}
          onOpenChange={(open) => {
            setCropOpen(open);
            if (!open) setCropImageSrc(null);
          }}
          onConfirm={onCropConfirm}
        />
      ) : null}
    </div>
  );
}
